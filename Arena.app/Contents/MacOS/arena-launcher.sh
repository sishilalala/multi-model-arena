#!/bin/bash
ARENA_PATH=$(which arena 2>/dev/null)
if [ -z "$ARENA_PATH" ]; then
  for p in /usr/local/bin/arena "$HOME/.npm-global/bin/arena" "$HOME/.nvm/versions/node/*/bin/arena"; do
    if [ -x "$p" ]; then
      ARENA_PATH="$p"
      break
    fi
  done
fi
if [ -z "$ARENA_PATH" ]; then
  osascript -e 'display dialog "Arena not found. Run: npm install -g multi-model-arena" buttons {"OK"} default button "OK"'
  exit 1
fi
osascript -e "tell application \"Terminal\"
  activate
  do script \"$ARENA_PATH\"
end tell"
