#!/usr/bin/env node
import("tsx/esm/api").then(({ register }) => {
  register();
  import("../src/terminal/index.tsx");
}).catch((err) => {
  console.error("Failed to start Arena:", err.message);
  process.exit(1);
});
