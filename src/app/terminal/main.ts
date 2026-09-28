import "../logger.ts";
import { type KeyEvent, createCliRenderer } from "@opentui/core";

import { advance } from "@/modules/breakout";
import { reatomScreen, screenNavigation } from "@/modules/screens";
import { mountScreens } from "@/pages/terminal";

const isDevelopment = import.meta.env.MODE === "development";

const renderer = await createCliRenderer({
  exitOnCtrlC: true,
  targetFps: 60,
  useKittyKeyboard: { events: true },
});
const screen = mountScreens(renderer, screenNavigation(reatomScreen()));
let isConsoleFocused = false;

function routeKeyToConsoleOrScreen(key: KeyEvent): void {
  if (key.name === "`") {
    renderer.console.toggle();
    isConsoleFocused = !isConsoleFocused;
  } else if (isConsoleFocused) {
    isConsoleFocused = key.name !== "escape";
  } else {
    screen.press(key);
  }
}

if (isDevelopment) {
  renderer.configureDebugOverlay({ enabled: true });
}

renderer.keyInput.on("keypress", isDevelopment ? routeKeyToConsoleOrScreen : screen.press);
renderer.keyInput.on("keyrelease", screen.release);
renderer.setFrameCallback((deltaTime) => {
  advance(deltaTime);
  screen.paint();

  return Promise.resolve();
});
renderer.start();
