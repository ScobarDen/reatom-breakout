import { type Computed, effect, reatomEnum } from "@reatom/core";

import { pauseMatch } from "@/modules/breakout";

import { type Screen, screens } from "../model/screen.model.ts";

export interface ScreenPort {
  readonly screen: Computed<Screen>;
  readonly open: (next: Screen) => void;
}

export const screenLabels: Record<Screen, string> = {
  match: "Match",
  player: "Player",
  results: "Results",
};

export function reatomScreen(): ScreenPort {
  const screen = reatomEnum(screens, "screen");

  return {
    screen,
    open(next) {
      screen.set(next);
    },
  };
}

export function screenNavigation(port: ScreenPort): ScreenPort {
  let shown: Screen = "match";

  effect(() => {
    const next = port.screen();

    if (shown === "match" && next !== "match") {
      pauseMatch();
    }
    shown = next;
  }, "pauseOnLeavingMatch");

  return port;
}
