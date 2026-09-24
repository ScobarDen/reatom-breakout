import { context } from "@reatom/core";

import type * as BreakoutModule from "../index.ts";

type Breakout = typeof BreakoutModule;

interface Fixture {
  readonly breakout: Breakout;
  readonly controls: BreakoutModule.MatchControls;
}

async function freshControls(): Promise<Fixture> {
  context.reset();
  vi.resetModules();

  const breakout = await import("../index.ts");

  return { breakout, controls: breakout.matchControls() };
}

describe("direction keys", () => {
  test("hold the paddle direction while pressed", async () => {
    const { breakout, controls } = await freshControls();

    controls.press("left", false);

    expect(breakout.paddleDirection()).toBe("left");
  });

  test("follow the latest held key and fall back to the one still held", async () => {
    const { breakout, controls } = await freshControls();

    controls.press("a", false);
    controls.press("right", false);

    expect(breakout.paddleDirection()).toBe("right");

    controls.release("right");

    expect(breakout.paddleDirection()).toBe("left");

    controls.release("a");

    expect(breakout.paddleDirection()).toBe("none");
  });

  test("keep the direction while another key for it is still held", async () => {
    const { breakout, controls } = await freshControls();

    controls.press("left", false);
    controls.press("a", false);
    controls.release("left");

    expect(breakout.paddleDirection()).toBe("left");
  });

  test("are all let go at once", async () => {
    const { breakout, controls } = await freshControls();

    controls.press("left", false);
    controls.press("d", false);
    controls.releaseAll();

    expect(breakout.paddleDirection()).toBe("none");

    controls.release("d");

    expect(breakout.paddleDirection()).toBe("none");
  });
});

describe("event keys", () => {
  test("space launches the serve", async () => {
    const { breakout, controls } = await freshControls();

    controls.press("space", false);
    breakout.advance(16);

    expect(breakout.situation()).toBe("flight");
  });

  test("p pauses and r resumes", async () => {
    const { breakout, controls } = await freshControls();

    controls.press("p", false);
    breakout.advance(16);

    expect(breakout.situation()).toBe("paused-serve");

    controls.press("r", false);
    breakout.advance(16);

    expect(breakout.situation()).toBe("serve");
  });

  test("n starts a new match", async () => {
    const { breakout, controls } = await freshControls();

    controls.press("space", false);
    breakout.advance(16);
    controls.press("n", false);
    breakout.advance(16);

    expect(breakout.situation()).toBe("serve");
  });

  test("do nothing on a key repeat", async () => {
    const { breakout, controls } = await freshControls();

    controls.press("space", true);
    breakout.advance(16);

    expect(breakout.situation()).toBe("serve");
  });
});

describe("a press", () => {
  test.each([
    ["a direction key", "left", false, true],
    ["a repeated direction key", "d", true, true],
    ["an event key", "space", false, true],
    ["a repeated event key", "space", true, false],
  ] as const)("reports whether %s (%s, repeat=%s) acted: %s", async (_name, key, repeat, acted) => {
    const { controls } = await freshControls();

    expect(controls.press(key, repeat)).toBe(acted);
  });
});

describe("the situation label", () => {
  test("prompts the launch on a serve and the resume on a pause", async () => {
    const { breakout, controls } = await freshControls();

    expect(breakout.situationLabel()).toBe("Serve: Space to launch");

    controls.press("p", false);
    breakout.advance(16);

    expect(breakout.situationLabel()).toBe("Paused: R to resume");
  });

  test("stays empty while the ball flies", async () => {
    const { breakout, controls } = await freshControls();

    controls.press("space", false);
    breakout.advance(16);

    expect(breakout.situationLabel()).toBe("");
  });
});
