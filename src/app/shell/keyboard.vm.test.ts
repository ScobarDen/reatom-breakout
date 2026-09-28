import { atom, context, sleep } from "@reatom/core";

import * as breakout from "@/modules/breakout";

import { matchKeyboard } from "./keyboard.vm.ts";

beforeEach(() => {
  context.reset();
});

describe("the keyboard layout", () => {
  test.each([
    ["ArrowLeft", "left"],
    ["KeyA", "left"],
    ["ArrowRight", "right"],
    ["KeyD", "right"],
  ])("%s steers the paddle %s", (code, direction) => {
    const keyboard = matchKeyboard();

    keyboard.press({ code, repeat: false });

    expect(breakout.paddleDirection()).toBe(direction);

    keyboard.release(code);

    expect(breakout.paddleDirection()).toBe("none");
  });

  test("Space launches the serve", () => {
    const keyboard = matchKeyboard();

    keyboard.press({ code: "Space", repeat: false });
    breakout.advance(16);

    expect(breakout.situation()).toBe("flight");
  });

  test("KeyP pauses and KeyR resumes", () => {
    const keyboard = matchKeyboard();

    keyboard.press({ code: "KeyP", repeat: false });
    breakout.advance(16);

    expect(breakout.situation()).toBe("paused-serve");

    keyboard.press({ code: "KeyR", repeat: false });
    breakout.advance(16);

    expect(breakout.situation()).toBe("serve");
  });

  test("KeyN starts a new match", () => {
    const keyboard = matchKeyboard();

    keyboard.press({ code: "Space", repeat: false });
    breakout.advance(16);
    keyboard.press({ code: "KeyN", repeat: false });
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
    expect(matchKeyboard().press({ code, repeat })).toBe(outcome);
  });
});

describe("losing focus", () => {
  test("lets every held key go", () => {
    const keyboard = matchKeyboard();

    keyboard.press({ code: "ArrowLeft", repeat: false });
    keyboard.press({ code: "KeyD", repeat: false });
    keyboard.letGo();

    expect(breakout.paddleDirection()).toBe("none");
  });
});

describe("while the match is hidden", () => {
  test("lets go of the held keys once the match is hidden", async () => {
    const isMatchShown = atom(true);
    const keyboard = matchKeyboard(isMatchShown);

    keyboard.letGoOffMatch();
    keyboard.press({ code: "ArrowLeft", repeat: false });
    isMatchShown.set(false);
    await sleep(0);

    expect(breakout.paddleDirection()).toBe("none");
  });

  test("leaves the match keys to the browser", () => {
    const keyboard = matchKeyboard(() => false);

    expect(keyboard.press({ code: "ArrowLeft", repeat: false })).toBe("ignored");
    expect(breakout.paddleDirection()).toBe("none");
  });
});
