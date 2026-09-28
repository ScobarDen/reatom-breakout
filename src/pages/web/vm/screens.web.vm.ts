import { computed, reatomRoute, urlAtom } from "@reatom/core";

import { type Screen, type ScreenPort, isScreen } from "@/modules/screens";

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

export function screenHref(screen: Screen): string {
  const search = new URLSearchParams(searchOf(screen)).toString();
  const { pathname } = urlAtom();

  return search === "" ? pathname : `${pathname}?${search}`;
}

export function webScreenPort(): ScreenPort {
  return {
    screen: computed(() => screenRoute()?.screen ?? "match", "webScreen"),
    open(next) {
      screenRoute.go({ screen: next });
    },
  };
}
