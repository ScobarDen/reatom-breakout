import { context } from "@reatom/core";

import type * as BreakoutModule from "@/modules/breakout";

import type * as TerminalScreen from "./breakout.terminal.vm.ts";

type Breakout = typeof BreakoutModule;

interface Screen {
  readonly breakout: Breakout;
  readonly input: TerminalScreen.BreakoutTerminalInput;
  readonly clock: { nowMs: number };
  readonly situationLabel: () => string;
}

async function freshScreen(): Promise<Screen> {
  context.reset();
  vi.resetModules();

  const breakout = await import("@/modules/breakout");
  const { breakoutTerminalInput, situationLabel } = await import("./breakout.terminal.vm.ts");
  const clock = { nowMs: 0 };

  return { breakout, input: breakoutTerminalInput(() => clock.nowMs), clock, situationLabel };
}

describe("direction keys", () => {
  test("follow the latest held key and fall back to the one still held", async () => {
    const { breakout, input } = await freshScreen();

    input.press("a", false);
    input.press("right", false);

    expect(breakout.paddleDirection()).toBe("right");

    input.release("right");

    expect(breakout.paddleDirection()).toBe("left");

    input.release("a");

    expect(breakout.paddleDirection()).toBe("none");
  });
});

describe("a terminal that reports no releases", () => {
  test("lets a key go once the first key repeat is overdue", async () => {
    const { breakout, input, clock } = await freshScreen();

    input.press("left", false);
    clock.nowMs = 599;
    input.letGoSilentKeys();

    expect(breakout.paddleDirection()).toBe("left");

    clock.nowMs = 600;
    input.letGoSilentKeys();

    expect(breakout.paddleDirection()).toBe("none");
  });

  test("keeps a key while its repeats keep coming", async () => {
    const { breakout, input, clock } = await freshScreen();

    input.press("left", false);
    clock.nowMs = 550;
    input.press("left", true);
    clock.nowMs = 649;
    input.letGoSilentKeys();

    expect(breakout.paddleDirection()).toBe("left");

    clock.nowMs = 650;
    input.letGoSilentKeys();

    expect(breakout.paddleDirection()).toBe("none");
  });

  test("falls back to the key still held when the latest one goes silent", async () => {
    const { breakout, input, clock } = await freshScreen();

    input.press("a", false);
    clock.nowMs = 10;
    input.press("d", false);
    clock.nowMs = 20;
    input.press("a", true);
    clock.nowMs = 120;
    input.letGoSilentKeys();

    expect(breakout.paddleDirection()).toBe("right");
  });
});

describe("a terminal that reports releases", () => {
  test("holds a key until its release however long it stays silent", async () => {
    const { breakout, input, clock } = await freshScreen();

    input.press("left", false);
    input.press("right", false);
    input.release("right");
    clock.nowMs = 60_000;
    input.letGoSilentKeys();

    expect(breakout.paddleDirection()).toBe("left");
  });
});

describe("event keys", () => {
  test("space launches the serve", async () => {
    const { breakout, input } = await freshScreen();

    input.press("space", false);
    breakout.advance(16);

    expect(breakout.situation()).toBe("flight");
  });

  test("p pauses and r resumes", async () => {
    const { breakout, input } = await freshScreen();

    input.press("p", false);
    breakout.advance(16);

    expect(breakout.situation()).toBe("paused-serve");

    input.press("r", false);
    breakout.advance(16);

    expect(breakout.situation()).toBe("serve");
  });

  test("n starts a new match", async () => {
    const { breakout, input } = await freshScreen();

    input.press("space", false);
    breakout.advance(16);
    input.press("n", false);
    breakout.advance(16);

    expect(breakout.situation()).toBe("serve");
  });

  test("do nothing on a key repeat", async () => {
    const { breakout, input } = await freshScreen();

    input.press("space", true);
    breakout.advance(16);

    expect(breakout.situation()).toBe("serve");
  });
});

describe("the situation label", () => {
  test("prompts the launch on a serve and the resume on a pause", async () => {
    const { breakout, input, situationLabel } = await freshScreen();

    expect(situationLabel()).toBe("Serve: Space to launch");

    input.press("p", false);
    breakout.advance(16);

    expect(situationLabel()).toBe("Paused: R to resume");
  });

  test("stays empty while the ball flies", async () => {
    const { breakout, input, situationLabel } = await freshScreen();

    input.press("space", false);
    breakout.advance(16);

    expect(situationLabel()).toBe("");
  });
});
