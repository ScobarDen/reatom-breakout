import { context } from "@reatom/core";

import * as breakout from "@/modules/breakout";

import { breakoutWebInput } from "./breakout.web.vm.ts";

beforeEach(() => {
  context.reset();
});

describe("the web layout", () => {
  test.each([
    ["ArrowLeft", "left"],
    ["KeyA", "left"],
    ["ArrowRight", "right"],
    ["KeyD", "right"],
  ])("%s steers the paddle %s", (code, direction) => {
    const input = breakoutWebInput();

    input.press({ code, repeat: false });

    expect(breakout.paddleDirection()).toBe(direction);

    input.release(code);

    expect(breakout.paddleDirection()).toBe("none");
  });

  test("Space launches the serve", () => {
    const input = breakoutWebInput();

    input.press({ code: "Space", repeat: false });
    breakout.advance(16);

    expect(breakout.situation()).toBe("flight");
  });

  test("KeyP pauses and KeyR resumes", () => {
    const input = breakoutWebInput();

    input.press({ code: "KeyP", repeat: false });
    breakout.advance(16);

    expect(breakout.situation()).toBe("paused-serve");

    input.press({ code: "KeyR", repeat: false });
    breakout.advance(16);

    expect(breakout.situation()).toBe("serve");
  });

  test("KeyN starts a new match", () => {
    const input = breakoutWebInput();

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
  ])("%s: %s repeat=%s is %s", (_name, code, repeat, outcome) => {
    const input = breakoutWebInput();

    expect(input.press({ code, repeat })).toBe(outcome);
  });
});

describe("losing focus", () => {
  test("lets every held key go", () => {
    const input = breakoutWebInput();

    input.press({ code: "ArrowLeft", repeat: false });
    input.press({ code: "KeyD", repeat: false });
    input.letGo();

    expect(breakout.paddleDirection()).toBe("none");
  });
});
