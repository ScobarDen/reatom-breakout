import { context, sleep } from "@reatom/core";

import * as breakout from "@/modules/breakout";
import { type ScreenPort, reatomScreen, screenNavigation } from "@/modules/screens";

import { type BreakoutTerminalInput, breakoutTerminalInput } from "./breakout.terminal.vm.ts";

interface Fixture {
  readonly input: BreakoutTerminalInput;
  readonly clock: { nowMs: number };
  readonly navigation: ScreenPort;
}

function inputWithClock(): Fixture {
  const clock = { nowMs: 0 };
  const navigation = screenNavigation(reatomScreen());

  return { input: breakoutTerminalInput(() => clock.nowMs, navigation), clock, navigation };
}

beforeEach(() => {
  context.reset();
});

describe("the terminal layout", () => {
  test.each([
    ["left", "left"],
    ["a", "left"],
    ["right", "right"],
    ["d", "right"],
  ])("%s steers the paddle %s", (name, direction) => {
    const { input } = inputWithClock();

    input.press({ name, repeat: false });

    expect(breakout.paddleDirection()).toBe(direction);

    input.release(name);

    expect(breakout.paddleDirection()).toBe("none");
  });

  test("space launches the serve", () => {
    const { input } = inputWithClock();

    input.press({ name: "space", repeat: false });
    breakout.advance(16);

    expect(breakout.situation()).toBe("flight");
  });

  test("p pauses and r resumes", () => {
    const { input } = inputWithClock();

    input.press({ name: "p", repeat: false });
    breakout.advance(16);

    expect(breakout.situation()).toBe("paused-serve");

    input.press({ name: "r", repeat: false });
    breakout.advance(16);

    expect(breakout.situation()).toBe("serve");
  });

  test("n starts a new match", () => {
    const { input } = inputWithClock();

    input.press({ name: "space", repeat: false });
    breakout.advance(16);
    input.press({ name: "n", repeat: false });
    breakout.advance(16);

    expect(breakout.situation()).toBe("serve");
  });

  test("an unbound key leaves the paddle alone", () => {
    const { input } = inputWithClock();

    input.press({ name: "left", repeat: false });
    input.press({ name: "q", repeat: false });
    input.release("q");

    expect(breakout.paddleDirection()).toBe("left");
  });
});

describe("a terminal that reports no releases", () => {
  test("lets a key go once the first key repeat is overdue", () => {
    const { input, clock } = inputWithClock();

    input.press({ name: "left", repeat: false });
    clock.nowMs = 599;
    input.letGoSilentKeys();

    expect(breakout.paddleDirection()).toBe("left");

    clock.nowMs = 600;
    input.letGoSilentKeys();

    expect(breakout.paddleDirection()).toBe("none");
  });

  test("keeps a key while its repeats keep coming", () => {
    const { input, clock } = inputWithClock();

    input.press({ name: "left", repeat: false });
    clock.nowMs = 550;
    input.press({ name: "left", repeat: true });
    clock.nowMs = 649;
    input.letGoSilentKeys();

    expect(breakout.paddleDirection()).toBe("left");

    clock.nowMs = 650;
    input.letGoSilentKeys();

    expect(breakout.paddleDirection()).toBe("none");
  });

  test("falls back to the key still held when the latest one goes silent", () => {
    const { input, clock } = inputWithClock();

    input.press({ name: "a", repeat: false });
    clock.nowMs = 10;
    input.press({ name: "d", repeat: false });
    clock.nowMs = 20;
    input.press({ name: "a", repeat: true });
    clock.nowMs = 120;
    input.letGoSilentKeys();

    expect(breakout.paddleDirection()).toBe("right");
  });
});

describe("a terminal that reports releases", () => {
  test("holds a key until its release however long it stays silent", () => {
    const { input, clock } = inputWithClock();

    input.press({ name: "left", repeat: false });
    input.press({ name: "right", repeat: false });
    input.release("right");
    clock.nowMs = 60_000;
    input.letGoSilentKeys();

    expect(breakout.paddleDirection()).toBe("left");
  });
});

describe("the screen tabs", () => {
  test("tab walks the screens forward and shift+tab walks them back", () => {
    const { input, navigation } = inputWithClock();
    const visited: string[] = [];

    for (let press = 0; press < 3; press++) {
      input.press({ name: "tab", repeat: false });
      visited.push(navigation.screen());
    }
    input.press({ name: "tab", repeat: false, shift: true });
    visited.push(navigation.screen());

    expect(visited).toEqual(["player", "results", "match", "results"]);
  });

  test("a held tab stays on the screen it turned to", () => {
    const { input, navigation } = inputWithClock();

    input.press({ name: "tab", repeat: false });
    input.press({ name: "tab", repeat: true });

    expect(navigation.screen()).toBe("player");
  });

  test("leaving the match lets go of the held paddle keys", () => {
    const { input } = inputWithClock();

    input.press({ name: "left", repeat: false });
    input.press({ name: "tab", repeat: false });

    expect(breakout.paddleDirection()).toBe("none");
  });

  test("match keys do nothing off the match screen", async () => {
    const { input } = inputWithClock();

    input.press({ name: "tab", repeat: false });
    await sleep(0);
    breakout.advance(16);
    input.press({ name: "r", repeat: false });
    input.press({ name: "left", repeat: false });
    breakout.advance(16);

    expect(breakout.situation()).toBe("paused-serve");
    expect(breakout.paddleDirection()).toBe("none");
  });
});
