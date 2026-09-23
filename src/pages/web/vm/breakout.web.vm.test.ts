import { context } from "@reatom/core";

import type * as BreakoutModule from "@/modules/breakout";

import type * as WebScreen from "./breakout.web.vm.ts";

type Breakout = typeof BreakoutModule;

interface Screen {
  readonly breakout: Breakout;
  readonly input: WebScreen.BreakoutWebInput;
  readonly situationLabel: () => string;
}

async function freshScreen(): Promise<Screen> {
  context.reset();
  vi.resetModules();

  const breakout = await import("@/modules/breakout");
  const { breakoutWebInput, situationLabel } = await import("./breakout.web.vm.ts");

  return { breakout, input: breakoutWebInput(), situationLabel };
}

describe("direction keys", () => {
  test("hold the paddle direction while pressed", async () => {
    const { breakout, input } = await freshScreen();

    input.press("ArrowLeft", false);

    expect(breakout.paddleDirection()).toBe("left");
  });

  test("follow the latest held key and fall back to the one still held", async () => {
    const { breakout, input } = await freshScreen();

    input.press("KeyA", false);
    input.press("ArrowRight", false);

    expect(breakout.paddleDirection()).toBe("right");

    input.release("ArrowRight");

    expect(breakout.paddleDirection()).toBe("left");

    input.release("KeyA");

    expect(breakout.paddleDirection()).toBe("none");
  });

  test("are all let go when the screen loses focus", async () => {
    const { breakout, input } = await freshScreen();

    input.press("ArrowLeft", false);
    input.press("KeyD", false);
    input.letGo();

    expect(breakout.paddleDirection()).toBe("none");

    input.release("KeyD");

    expect(breakout.paddleDirection()).toBe("none");
  });
});

describe("event keys", () => {
  test("Space launches the serve", async () => {
    const { breakout, input } = await freshScreen();

    input.press("Space", false);
    breakout.advance(16);

    expect(breakout.situation()).toBe("flight");
  });

  test("P pauses and R resumes", async () => {
    const { breakout, input } = await freshScreen();

    input.press("KeyP", false);
    breakout.advance(16);

    expect(breakout.situation()).toBe("paused-serve");

    input.press("KeyR", false);
    breakout.advance(16);

    expect(breakout.situation()).toBe("serve");
  });

  test("N starts a new match", async () => {
    const { breakout, input } = await freshScreen();

    input.press("Space", false);
    breakout.advance(16);
    input.press("KeyN", false);
    breakout.advance(16);

    expect(breakout.situation()).toBe("serve");
  });

  test.each([
    ["a direction key", "ArrowLeft", false, true],
    ["a repeated direction key", "KeyD", true, true],
    ["an event key", "Space", false, true],
    ["a repeated event key", "Space", true, false],
    ["an unbound key", "KeyQ", false, false],
  ])("claim %s: %s repeat=%s → %s", async (_name, code, isRepeat, claimed) => {
    const { input } = await freshScreen();

    expect(input.press(code, isRepeat)).toBe(claimed);
  });

  test("do nothing on a key repeat", async () => {
    const { breakout, input } = await freshScreen();

    input.press("Space", true);
    breakout.advance(16);

    expect(breakout.situation()).toBe("serve");
  });
});

describe("the situation label", () => {
  test("prompts the launch on a serve and the resume on a pause", async () => {
    const { breakout, input, situationLabel } = await freshScreen();

    expect(situationLabel()).toBe("Serve: Space to launch");

    input.press("KeyP", false);
    breakout.advance(16);

    expect(situationLabel()).toBe("Paused: R to resume");
  });

  test("stays empty while the ball flies", async () => {
    const { breakout, input, situationLabel } = await freshScreen();

    input.press("Space", false);
    breakout.advance(16);

    expect(situationLabel()).toBe("");
  });
});
