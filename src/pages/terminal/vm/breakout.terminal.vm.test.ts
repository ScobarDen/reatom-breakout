import { context } from "@reatom/core";

import type * as BreakoutModule from "@/modules/breakout";

import type * as TerminalInput from "./breakout.terminal.vm.ts";

type Breakout = typeof BreakoutModule;

interface Fixture {
  readonly breakout: Breakout;
  readonly input: TerminalInput.BreakoutTerminalInput;
  readonly clock: { nowMs: number };
  readonly situationLabel: () => string;
}

async function freshInput(): Promise<Fixture> {
  context.reset();
  vi.resetModules();

  const breakout = await import("@/modules/breakout");
  const { breakoutTerminalInput, situationLabel } = await import("./breakout.terminal.vm.ts");
  const clock = { nowMs: 0 };

  return { breakout, input: breakoutTerminalInput(() => clock.nowMs), clock, situationLabel };
}

describe("direction keys", () => {
  test("follow the latest held key and fall back to the one still held", async () => {
    const { breakout, input } = await freshInput();

    input.press({ name: "a", repeat: false });
    input.press({ name: "right", repeat: false });

    expect(breakout.paddleDirection()).toBe("right");

    input.release("right");

    expect(breakout.paddleDirection()).toBe("left");

    input.release("a");

    expect(breakout.paddleDirection()).toBe("none");
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

describe("event keys", () => {
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

  test("do nothing on a key repeat", async () => {
    const { breakout, input } = await freshInput();

    input.press({ name: "space", repeat: true });
    breakout.advance(16);

    expect(breakout.situation()).toBe("serve");
  });
});

describe("the situation label", () => {
  test("prompts the launch on a serve and the resume on a pause", async () => {
    const { breakout, input, situationLabel } = await freshInput();

    expect(situationLabel()).toBe("Serve: Space to launch");

    input.press({ name: "p", repeat: false });
    breakout.advance(16);

    expect(situationLabel()).toBe("Paused: R to resume");
  });

  test("stays empty while the ball flies", async () => {
    const { breakout, input, situationLabel } = await freshInput();

    input.press({ name: "space", repeat: false });
    breakout.advance(16);

    expect(situationLabel()).toBe("");
  });
});
