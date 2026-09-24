import { context } from "@reatom/core";

import type * as BreakoutModule from "@/modules/breakout";

import type * as TerminalInput from "./breakout.terminal.vm.ts";

type Breakout = typeof BreakoutModule;

interface Fixture {
  readonly breakout: Breakout;
  readonly input: TerminalInput.BreakoutTerminalInput;
  readonly clock: { nowMs: number };
}

async function freshInput(): Promise<Fixture> {
  context.reset();
  vi.resetModules();

  const breakout = await import("@/modules/breakout");
  const { breakoutTerminalInput } = await import("./breakout.terminal.vm.ts");
  const clock = { nowMs: 0 };

  return { breakout, input: breakoutTerminalInput(() => clock.nowMs), clock };
}

describe("the terminal layout", () => {
  test.each([
    ["left", "left"],
    ["a", "left"],
    ["right", "right"],
    ["d", "right"],
  ])("%s steers the paddle %s", async (name, direction) => {
    const { breakout, input } = await freshInput();

    input.press({ name, repeat: false });

    expect(breakout.paddleDirection()).toBe(direction);

    input.release(name);

    expect(breakout.paddleDirection()).toBe("none");
  });

  test("space launches the serve", async () => {
    const { breakout, input } = await freshInput();

    input.press({ name: "space", repeat: false });
    breakout.advance(16);

    expect(breakout.situation()).toBe("flight");
  });

  test("p pauses and r resumes", async () => {
    const { breakout, input } = await freshInput();

    input.press({ name: "p", repeat: false });
    breakout.advance(16);

    expect(breakout.situation()).toBe("paused-serve");

    input.press({ name: "r", repeat: false });
    breakout.advance(16);

    expect(breakout.situation()).toBe("serve");
  });

  test("n starts a new match", async () => {
    const { breakout, input } = await freshInput();

    input.press({ name: "space", repeat: false });
    breakout.advance(16);
    input.press({ name: "n", repeat: false });
    breakout.advance(16);

    expect(breakout.situation()).toBe("serve");
  });

  test("an unbound key leaves the paddle alone", async () => {
    const { breakout, input } = await freshInput();

    input.press({ name: "left", repeat: false });
    input.press({ name: "q", repeat: false });
    input.release("q");

    expect(breakout.paddleDirection()).toBe("left");
  });
});

describe("a terminal that reports no releases", () => {
  test("lets a key go once the first key repeat is overdue", async () => {
    const { breakout, input, clock } = await freshInput();

    input.press({ name: "left", repeat: false });
    clock.nowMs = 599;
    input.letGoSilentKeys();

    expect(breakout.paddleDirection()).toBe("left");

    clock.nowMs = 600;
    input.letGoSilentKeys();

    expect(breakout.paddleDirection()).toBe("none");
  });

  test("keeps a key while its repeats keep coming", async () => {
    const { breakout, input, clock } = await freshInput();

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

  test("falls back to the key still held when the latest one goes silent", async () => {
    const { breakout, input, clock } = await freshInput();

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
  test("holds a key until its release however long it stays silent", async () => {
    const { breakout, input, clock } = await freshInput();

    input.press({ name: "left", repeat: false });
    input.press({ name: "right", repeat: false });
    input.release("right");
    clock.nowMs = 60_000;
    input.letGoSilentKeys();

    expect(breakout.paddleDirection()).toBe("left");
  });
});
