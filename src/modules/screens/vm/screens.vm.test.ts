import { context, noop, sleep, urlAtom } from "@reatom/core";

import { advance, matchControls, situation } from "@/modules/breakout";

import type { Screen } from "../model/screen.model.ts";
import { type ScreenNavigation, screenNavigation } from "./screens.vm.ts";

function visit(href: string): void {
  urlAtom.sync.set(() => noop);
  urlAtom.syncFromSource(new URL(href));
}

function launchServe(): void {
  matchControls().press("space", false);
  advance(16);
}

function loseMatch(): void {
  const controls = matchControls();

  controls.press("left", false);
  for (let frame = 0; frame < 10_000 && situation() !== "lost"; frame++) {
    if (situation() === "serve") {
      controls.press("space", false);
    }
    advance(16);
  }
}

async function open(navigation: ScreenNavigation, next: Screen): Promise<void> {
  navigation.open(next);
  await sleep(0);
}

async function leaveFor(navigation: ScreenNavigation, next: "player" | "results"): Promise<void> {
  await open(navigation, next);
  advance(16);
}

beforeEach(() => {
  context.reset();
  visit("https://example.test/reatom-breakout/");
});

describe("the screen switch", () => {
  test("opens on the match and goes to another screen and back", async () => {
    const navigation = screenNavigation();

    expect(navigation.screen()).toBe("match");

    await open(navigation, "results");

    expect(navigation.screen()).toBe("results");

    await open(navigation, "match");

    expect(navigation.screen()).toBe("match");
  });
});

describe("the screen in the address", () => {
  test("opens the screen named in the search", () => {
    visit("https://example.test/reatom-breakout/?screen=results");

    expect(screenNavigation().screen()).toBe("results");
  });

  test("opens the match for an unknown screen", () => {
    visit("https://example.test/?screen=boss");

    expect(screenNavigation().screen()).toBe("match");
  });

  test("keeps the pathname and drops the search for the match", async () => {
    visit("https://example.test/reatom-breakout/?screen=player");
    const navigation = screenNavigation();

    await open(navigation, "results");

    expect(urlAtom().href).toBe("https://example.test/reatom-breakout/?screen=results");

    await open(navigation, "match");

    expect(urlAtom().href).toBe("https://example.test/reatom-breakout/");
  });

  test("links each screen on the same pathname", () => {
    visit("https://example.test/reatom-breakout/?screen=results");
    const navigation = screenNavigation();

    expect([navigation.href("match"), navigation.href("player")]).toEqual([
      "/reatom-breakout/",
      "/reatom-breakout/?screen=player",
    ]);
  });
});

describe("leaving the match screen", () => {
  test("pauses the serve", async () => {
    await leaveFor(screenNavigation(), "player");

    expect(situation()).toBe("paused-serve");
  });

  test("pauses the flight", async () => {
    const navigation = screenNavigation();

    launchServe();
    await leaveFor(navigation, "results");

    expect(situation()).toBe("paused-flight");
  });

  test("pauses a match that opens on another screen", async () => {
    visit("https://example.test/reatom-breakout/?screen=results");
    screenNavigation();
    await sleep(0);
    advance(16);

    expect(situation()).toBe("paused-serve");
  });

  test("leaves a lost match lost", async () => {
    const navigation = screenNavigation();

    loseMatch();

    expect(situation()).toBe("lost");

    await leaveFor(navigation, "player");

    expect(situation()).toBe("lost");
  });
});

describe("coming back to the match screen", () => {
  test("keeps the pause", async () => {
    const navigation = screenNavigation();

    await leaveFor(navigation, "player");
    await open(navigation, "match");
    advance(16);

    expect(situation()).toBe("paused-serve");
  });
});
