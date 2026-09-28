import {
  BoxRenderable,
  type CliRenderer,
  type KeyEvent,
  TabSelectRenderable,
  TextRenderable,
} from "@opentui/core";

import { type Screen, type ScreenPort, screenLabels, screens } from "@/modules/screens";

import { matchView } from "./breakout.terminal.view.ts";
import { breakoutTerminalInput } from "./vm/breakout.terminal.vm.ts";

export interface TerminalScreens {
  paint: () => void;
  press: (key: KeyEvent) => void;
  release: (key: KeyEvent) => void;
}

export function mountScreens(renderer: CliRenderer, navigation: ScreenPort): TerminalScreens {
  const input = breakoutTerminalInput(() => performance.now(), navigation);
  const tabs = new TabSelectRenderable(renderer, {
    width: 48,
    options: screens.map((screen) => ({ name: screenLabels[screen], description: "" })),
    showDescription: false,
  });
  const match = matchView(renderer);
  const stub = new TextRenderable(renderer, { content: "" });
  const layout = new BoxRenderable(renderer, {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
    gap: 1,
  });

  layout.add(tabs);
  layout.add(match.layout);
  layout.add(stub);
  renderer.root.add(layout);

  let shown: Screen | undefined = undefined;

  function show(screen: Screen): void {
    shown = screen;
    tabs.setSelectedIndex(screens.indexOf(screen));
    match.layout.visible = screen === "match";
    stub.visible = screen !== "match";
    stub.content = `${screenLabels[screen]} — coming soon`;
  }

  return {
    paint() {
      const screen = navigation.screen();

      input.letGoSilentKeys();
      if (screen !== shown) {
        show(screen);
      }
      if (screen === "match") {
        match.paint();
      }
    },
    press(key) {
      input.press({
        name: key.name,
        repeat: key.eventType === "repeat" || key.repeated === true,
        shift: key.shift,
      });
    },
    release(key) {
      input.release(key.name);
    },
  };
}
