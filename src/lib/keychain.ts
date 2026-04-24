import keytar from "keytar";

const SERVICE_NAME = "multi-model-arena";

export async function getApiKey(providerId: string): Promise<string | null> {
  return keytar.getPassword(SERVICE_NAME, providerId);
}

export async function setApiKey(providerId: string, apiKey: string): Promise<void> {
  await keytar.setPassword(SERVICE_NAME, providerId, apiKey);
}

export async function deleteApiKey(providerId: string): Promise<boolean> {
  return keytar.deletePassword(SERVICE_NAME, providerId);
}
