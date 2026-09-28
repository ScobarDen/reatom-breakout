import { type Computed, computed, effect, reatomRoute, urlAtom } from "@reatom/core";

import { pauseMatch } from "@/modules/breakout";

import { type Screen, isScreen } from "../model/screen.model.ts";

export interface ScreenNavigation {
  readonly screen: Computed<Screen>;
  readonly open: (next: Screen) => void;
  readonly href: (screen: Screen) => string;
}

export const screenLabels: Record<Screen, string> = {
  match: "Match",
  player: "Player",
  results: "Results",
};

type ScreenSearch = Partial<Record<"screen", string>>;

function searchOf(screen: Screen): ScreenSearch {
  return screen === "match" ? {} : { screen };
}

const screenRoute = reatomRoute(
  {
    search: {
      decode: ({ screen }: ScreenSearch): { screen: Screen } => ({
        screen: isScreen(screen) ? screen : "match",
      }),
      encode: ({ screen }: { screen: Screen }): ScreenSearch => searchOf(screen),
    },
  },
  "screenRoute",
);

export function screenNavigation(): ScreenNavigation {
  const screen = computed(() => screenRoute()?.screen ?? "match", "screen");
  let shown: Screen = "match";

  effect(() => {
    const next = screen();

    if (shown === "match" && next !== "match") {
      pauseMatch();
    }
    shown = next;
  }, "pauseOnLeavingMatch");

  return {
    screen,
    open(next) {
      screenRoute.go({ screen: next });
    },
    href(target) {
      const search = new URLSearchParams(searchOf(target)).toString();
      const { pathname } = urlAtom();

      return search === "" ? pathname : `${pathname}?${search}`;
    },
  };
}
