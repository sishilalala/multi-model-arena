import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { readConfig, writeConfig } from "../../lib/config.js";
import type { ProviderConfig } from "../../lib/config.js";
import { getApiKey, setApiKey, deleteApiKey } from "../../lib/keychain.js";
import { getAllModels } from "../../lib/models.js";
import { moveConversationsFolder } from "../../lib/conversations.js";

interface SettingsScreenProps {
  onBack: () => void;
}

type SubScreen = "main" | "add-provider";

type AddProviderField = "preset" | "name" | "url" | "key";

interface ProviderPreset {
  label: string;
  name: string;
  type: ProviderConfig["type"];
  baseUrl: string;
}

const PROVIDER_PRESETS: ProviderPreset[] = [
  { label: "1. OpenRouter", name: "OpenRouter", type: "openrouter", baseUrl: "https://openrouter.ai/api/v1" },
  { label: "2. OpenAI", name: "OpenAI", type: "openai", baseUrl: "https://api.openai.com/v1" },
  { label: "3. Anthropic", name: "Anthropic", type: "anthropic", baseUrl: "https://api.anthropic.com" },
  { label: "4. Google", name: "Google", type: "google", baseUrl: "https://generativelanguage.googleapis.com" },
  { label: "5. Custom", name: "", type: "custom", baseUrl: "" },
];

export function SettingsScreen({ onBack }: SettingsScreenProps): React.ReactElement {
  const [subScreen, setSubScreen] = useState<SubScreen>("main");
  const [config, setConfig] = useState(readConfig());
  const [providerStatuses, setProviderStatuses] = useState<Record<string, boolean>>({});

  // Add-provider form state
  const [addName, setAddName] = useState("");
  const [addUrl, setAddUrl] = useState("");
  const [addKey, setAddKey] = useState("");
  const [addField, setAddField] = useState<AddProviderField>("preset");
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);

  // Main screen cursor
  const [cursor, setCursor] = useState(0);

  // Check keychain for all providers on mount and config change
  useEffect(() => {
    async function checkKeys() {
      const statuses: Record<string, boolean> = {};
      for (const provider of config.providers) {
        const key = await getApiKey(provider.id);
        statuses[provider.id] = key !== null && key !== "";
      }
      setProviderStatuses(statuses);
    }
    checkKeys();
  }, [config.providers]);

  // --- Main screen input ---
  useInput(
    (input, key) => {
      if (subScreen !== "main") return;

      if (key.escape) {
        onBack();
        return;
      }

      if (key.upArrow) {
        setCursor((prev) => Math.max(0, prev - 1));
        return;
      }
      if (key.downArrow) {
        // We'll compute max cursor dynamically
        setCursor((prev) => prev + 1);
        return;
      }

      // Provider section shortcuts
      if (input === "a" || input === "A") {
        // Add provider
        setAddName("");
        setAddUrl("");
        setAddKey("");
        setSelectedPreset(null);
        setAddField("preset");
        setSubScreen("add-provider");
        return;
      }

      if (input === "e" || input === "E") {
        // Edit key for focused provider (if cursor is in provider section)
        const providers = config.providers;
        if (cursor < providers.length) {
          const provider = providers[cursor];
          if (provider) {
            // Prompt to edit key inline - for simplicity, open add-provider with name pre-filled
            setAddName(provider.name);
            setAddUrl(provider.baseUrl);
            setAddKey("");
            setSelectedPreset(null);
            setAddField("key");
            setSubScreen("add-provider");
          }
        }
        return;
      }

      if (input === "r" || input === "R") {
        // Remove key for focused provider
        const providers = config.providers;
        if (cursor < providers.length) {
          const provider = providers[cursor];
          if (provider) {
            deleteApiKey(provider.id).then(() => {
              setProviderStatuses((prev) => ({ ...prev, [provider.id]: false }));
            });
          }
        }
        return;
      }

      // General settings shortcuts
      if (input === "t" || input === "T") {
        // Toggle debate style
        const newStyle = config.debateStyle === "collaborative" ? "adversarial" : "collaborative";
        const updated = writeConfig({ debateStyle: newStyle });
        setConfig(updated);
        return;
      }

      if (key.leftArrow) {
        // Decrease temperature
        const newTemp = Math.max(0, Math.round((config.temperature - 0.1) * 10) / 10);
        const updated = writeConfig({ temperature: newTemp });
        setConfig(updated);
        return;
      }

      if (key.rightArrow) {
        // Increase temperature
        const newTemp = Math.min(2, Math.round((config.temperature + 0.1) * 10) / 10);
        const updated = writeConfig({ temperature: newTemp });
        setConfig(updated);
        return;
      }

      if (input === "m" || input === "M") {
        // Toggle memory
        const updated = writeConfig({ memoryEnabled: !config.memoryEnabled });
        setConfig(updated);
        return;
      }
    },
    { isActive: subScreen === "main" }
  );

  // --- Add-provider screen input ---
  useInput(
    (input, key) => {
      if (subScreen !== "add-provider") return;

      if (key.escape) {
        setSubScreen("main");
        return;
      }

      if (addField === "preset") {
        // Number keys 1-5 for presets
        const presetIdx = parseInt(input, 10);
        if (presetIdx >= 1 && presetIdx <= 5) {
          const preset = PROVIDER_PRESETS[presetIdx - 1];
          if (preset) {
            setSelectedPreset(presetIdx - 1);
            setAddName(preset.name);
            setAddUrl(preset.baseUrl);
            // Jump to key field
            setAddField("key");
          }
          return;
        }

        if (key.tab || key.return) {
          setAddField("name");
          return;
        }
      }

      // Tab/Enter to move between fields (for non-TextInput fields)
    },
    { isActive: subScreen === "add-provider" && addField === "preset" }
  );

  const handleAddProviderKeySubmit = async () => {
    if (!addKey.trim()) {
      setSubScreen("main");
      return;
    }

    // Determine provider id from name
    const id = addName.toLowerCase().replace(/\s+/g, "-") || `custom-${Date.now()}`;
    const type: ProviderConfig["type"] =
      selectedPreset !== null
        ? (PROVIDER_PRESETS[selectedPreset]?.type ?? "custom")
        : "custom";

    // Save key to keychain
    await setApiKey(id, addKey.trim());

    // Check if provider already exists
    const existing = config.providers.find((p) => p.id === id || p.name === addName);
    if (!existing) {
      const newProvider: ProviderConfig = {
        id,
        name: addName || id,
        type,
        baseUrl: addUrl,
        isDefault: false,
      };
      const updated = writeConfig({ providers: [...config.providers, newProvider] });
      setConfig(updated);
    } else {
      // Just update the keychain (already done above)
      setProviderStatuses((prev) => ({ ...prev, [existing.id]: true }));
    }

    setSubScreen("main");
  };

  const allModels = getAllModels(config.customModels);

  // ====== Render: Add Provider Sub-Screen ======
  if (subScreen === "add-provider") {
    return (
      <Box flexDirection="column" padding={2}>
        <Box marginBottom={1}>
          <Text bold color="cyan">Add / Edit Provider</Text>
          <Text dimColor>  (Esc to cancel)</Text>
        </Box>

        {/* Preset selection */}
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>Quick Presets:</Text>
          {PROVIDER_PRESETS.map((preset, idx) => (
            <Box key={preset.label}>
              <Text color={selectedPreset === idx ? "cyan" : undefined}>
                {preset.label}
              </Text>
            </Box>
          ))}
          <Text dimColor>Press 1-5 to auto-fill, or Tab/Enter to skip to manual entry</Text>
        </Box>

        {/* Name field */}
        <Box marginBottom={1}>
          <Text bold>Name: </Text>
          <TextInput
            value={addName}
            onChange={setAddName}
            onSubmit={() => setAddField("url")}
            placeholder="Provider name"
            focus={addField === "name"}
          />
        </Box>

        {/* URL field */}
        <Box marginBottom={1}>
          <Text bold>Base URL: </Text>
          <TextInput
            value={addUrl}
            onChange={setAddUrl}
            onSubmit={() => setAddField("key")}
            placeholder="https://..."
            focus={addField === "url"}
          />
        </Box>

        {/* Key field */}
        <Box marginBottom={1}>
          <Text bold>API Key: </Text>
          <TextInput
            value={addKey}
            onChange={setAddKey}
            onSubmit={handleAddProviderKeySubmit}
            placeholder="sk-..."
            mask="●"
            focus={addField === "key"}
          />
        </Box>

        <Box>
          <Text dimColor>Tab through fields · Enter on key field to save · Esc to cancel</Text>
        </Box>
      </Box>
    );
  }

  // ====== Render: Main Settings Screen ======
  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box borderStyle="single" borderColor="#444444" paddingX={1} marginBottom={1}>
        <Text bold color="yellow">⚙  Settings</Text>
        <Text dimColor>  Esc to go back</Text>
      </Box>

      {/* Section 1: API Providers */}
      <Box flexDirection="column" marginBottom={1}>
        <Box marginBottom={0}>
          <Text bold color="cyan">── API Providers ──</Text>
          <Text dimColor>  [A]dd  [E]dit key  [R]emove key</Text>
        </Box>

        {config.providers.length === 0 ? (
          <Text dimColor>  No providers configured</Text>
        ) : (
          config.providers.map((provider, idx) => {
            const hasKey = providerStatuses[provider.id] === true;
            const isCursor = cursor === idx;
            return (
              <Box key={provider.id}>
                <Text inverse={isCursor} color={isCursor ? undefined : undefined}>
                  {isCursor ? "▸ " : "  "}
                  <Text bold>{provider.name}</Text>
                  <Text dimColor>  ({provider.type})</Text>
                  {"  "}
                  {hasKey ? (
                    <Text color="green">● key set</Text>
                  ) : (
                    <Text color="red">○ no key</Text>
                  )}
                  {provider.isDefault && <Text dimColor>  [default]</Text>}
                </Text>
              </Box>
            );
          })
        )}
      </Box>

      {/* Section 2: Model Routing */}
      <Box flexDirection="column" marginBottom={1}>
        <Box marginBottom={0}>
          <Text bold color="cyan">── Model Routing ──</Text>
        </Box>

        {allModels.slice(0, 8).map((model) => {
          const provider = config.providers.find((p) => p.id === model.providerId);
          return (
            <Box key={model.id}>
              <Text dimColor>  </Text>
              <Text>{model.name}</Text>
              <Text dimColor>  →  </Text>
              <Text color={provider ? "green" : "red"}>
                {provider ? provider.name : model.providerId + " (not configured)"}
              </Text>
            </Box>
          );
        })}
        {allModels.length > 8 && (
          <Text dimColor>  ... and {allModels.length - 8} more</Text>
        )}
      </Box>

      {/* Section 3: General Settings */}
      <Box flexDirection="column" marginBottom={1}>
        <Box marginBottom={0}>
          <Text bold color="cyan">── General Settings ──</Text>
        </Box>

        {/* Moderator Model */}
        <Box>
          <Text dimColor>  Moderator model: </Text>
          <Text>{config.moderatorModel}</Text>
        </Box>

        {/* Debate Style */}
        <Box>
          <Text dimColor>  Debate style:    </Text>
          <Text color="yellow">{config.debateStyle}</Text>
          <Text dimColor>  [T]oggle</Text>
        </Box>

        {/* Temperature */}
        <Box>
          <Text dimColor>  Temperature:     </Text>
          <Text color="yellow">{config.temperature.toFixed(1)}</Text>
          <Text dimColor>  [←][→] adjust</Text>
        </Box>

        {/* Memory */}
        <Box>
          <Text dimColor>  Memory:          </Text>
          <Text color={config.memoryEnabled ? "green" : "red"}>
            {config.memoryEnabled ? "enabled" : "disabled"}
          </Text>
          <Text dimColor>  [M]emory toggle</Text>
        </Box>

        {/* Conversations Folder */}
        <Box>
          <Text dimColor>  Conversations:   </Text>
          <Text>{config.conversationsFolder}</Text>
        </Box>
      </Box>

      {/* Footer */}
      <Box borderStyle="single" borderColor="#444444" paddingX={1}>
        <Text dimColor>Esc: back  ↑↓: navigate providers  A: add  E: edit key  R: remove key  T: toggle style  ←→: temperature  M: memory</Text>
      </Box>
    </Box>
  );
}
