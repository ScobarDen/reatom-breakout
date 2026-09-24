import { context } from "@reatom/core";

import type * as BreakoutModule from "@/modules/breakout";

import type * as WebInput from "./breakout.web.vm.ts";

type Breakout = typeof BreakoutModule;

interface Fixture {
  readonly breakout: Breakout;
  readonly input: WebInput.BreakoutWebInput;
}

async function freshInput(): Promise<Fixture> {
  context.reset();
  vi.resetModules();

  const breakout = await import("@/modules/breakout");
  const { breakoutWebInput } = await import("./breakout.web.vm.ts");

  return { breakout, input: breakoutWebInput() };
}

describe("the web layout", () => {
  test.each([
    ["ArrowLeft", "left"],
    ["KeyA", "left"],
    ["ArrowRight", "right"],
    ["KeyD", "right"],
  ])("%s steers the paddle %s", async (code, direction) => {
    const { breakout, input } = await freshInput();

    input.press({ code, repeat: false });

    expect(breakout.paddleDirection()).toBe(direction);

    input.release(code);

    expect(breakout.paddleDirection()).toBe("none");
  });

  test("Space launches the serve", async () => {
    const { breakout, input } = await freshInput();

    input.press({ code: "Space", repeat: false });
    breakout.advance(16);

    expect(breakout.situation()).toBe("flight");
  });

  test("KeyP pauses and KeyR resumes", async () => {
    const { breakout, input } = await freshInput();

    input.press({ code: "KeyP", repeat: false });
    breakout.advance(16);

    expect(breakout.situation()).toBe("paused-serve");

    input.press({ code: "KeyR", repeat: false });
    breakout.advance(16);

    expect(breakout.situation()).toBe("serve");
  });

  test("KeyN starts a new match", async () => {
    const { breakout, input } = await freshInput();

    input.press({ code: "Space", repeat: false });
    breakout.advance(16);
    input.press({ code: "KeyN", repeat: false });
    breakout.advance(16);

    expect(breakout.situation()).toBe("serve");
  });

  test.each([
    ["a direction key", "ArrowLeft", false, "claimed"],
    ["a repeated direction key", "KeyD", true, "claimed"],
    ["an event key", "Space", false, "claimed"],
    ["a repeated event key", "Space", true, "ignored"],
    ["an unbound key", "KeyQ", false, "ignored"],
  ])("%s: %s repeat=%s is %s", async (_name, code, repeat, outcome) => {
    const { input } = await freshInput();

    expect(input.press({ code, repeat })).toBe(outcome);
  });
});

describe("losing focus", () => {
  test("lets every held key go", async () => {
    const { breakout, input } = await freshInput();

    input.press({ code: "ArrowLeft", repeat: false });
    input.press({ code: "KeyD", repeat: false });
    input.letGo();

    expect(breakout.paddleDirection()).toBe("none");
  });
});
