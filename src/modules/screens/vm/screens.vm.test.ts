import { context, sleep } from "@reatom/core";

import { advance, matchControls, situation } from "@/modules/breakout";

import { type ScreenPort, reatomScreen, screenNavigation } from "./screens.vm.ts";

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

async function leaveFor(navigation: ScreenPort, next: "player" | "results"): Promise<void> {
  navigation.open(next);
  await sleep(0);
  advance(16);
}

beforeEach(() => {
  context.reset();
});

describe("the screen switch", () => {
  test("opens on the match and goes to another screen and back", () => {
    const navigation = screenNavigation(reatomScreen());

    expect(navigation.screen()).toBe("match");

    navigation.open("results");

    expect(navigation.screen()).toBe("results");

    navigation.open("match");

    expect(navigation.screen()).toBe("match");
  });
});

describe("leaving the match screen", () => {
  test("pauses the serve", async () => {
    await leaveFor(screenNavigation(reatomScreen()), "player");

    expect(situation()).toBe("paused-serve");
  });

  test("pauses the flight", async () => {
    const navigation = screenNavigation(reatomScreen());

    launchServe();
    await leaveFor(navigation, "results");

    expect(situation()).toBe("paused-flight");
  });

  test("pauses a match that opens on another screen", async () => {
    const port = reatomScreen();

    port.open("results");
    screenNavigation(port);
    await sleep(0);
    advance(16);

    expect(situation()).toBe("paused-serve");
  });

  test("leaves a lost match lost", async () => {
    const navigation = screenNavigation(reatomScreen());

    loseMatch();

    expect(situation()).toBe("lost");

    await leaveFor(navigation, "player");

    expect(situation()).toBe("lost");
  });
});

describe("coming back to the match screen", () => {
  test("keeps the pause", async () => {
    const navigation = screenNavigation(reatomScreen());

    await leaveFor(navigation, "player");
    navigation.open("match");
    await sleep(0);
    advance(16);

    expect(situation()).toBe("paused-serve");
  });
});
