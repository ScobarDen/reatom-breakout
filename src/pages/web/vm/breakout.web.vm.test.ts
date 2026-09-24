import { context } from "@reatom/core";

import type * as BreakoutModule from "@/modules/breakout";

import type * as WebInput from "./breakout.web.vm.ts";

type Breakout = typeof BreakoutModule;

interface Fixture {
  readonly breakout: Breakout;
  readonly input: WebInput.BreakoutWebInput;
  readonly situationLabel: () => string;
}

async function freshInput(): Promise<Fixture> {
  context.reset();
  vi.resetModules();

  const breakout = await import("@/modules/breakout");
  const { breakoutWebInput, situationLabel } = await import("./breakout.web.vm.ts");

  return { breakout, input: breakoutWebInput(), situationLabel };
}

describe("direction keys", () => {
  test("hold the paddle direction while pressed", async () => {
    const { breakout, input } = await freshInput();

    input.press({ code: "ArrowLeft", repeat: false });

    expect(breakout.paddleDirection()).toBe("left");
  });

  test("follow the latest held key and fall back to the one still held", async () => {
    const { breakout, input } = await freshInput();

    input.press({ code: "KeyA", repeat: false });
    input.press({ code: "ArrowRight", repeat: false });

    expect(breakout.paddleDirection()).toBe("right");

    input.release("ArrowRight");

    expect(breakout.paddleDirection()).toBe("left");

    input.release("KeyA");

    expect(breakout.paddleDirection()).toBe("none");
  });

  test("are all let go when the screen loses focus", async () => {
    const { breakout, input } = await freshInput();

    input.press({ code: "ArrowLeft", repeat: false });
    input.press({ code: "KeyD", repeat: false });
    input.letGo();

    expect(breakout.paddleDirection()).toBe("none");

    input.release("KeyD");

    expect(breakout.paddleDirection()).toBe("none");
  });
});

describe("event keys", () => {
  test("Space launches the serve", async () => {
    const { breakout, input } = await freshInput();

    input.press({ code: "Space", repeat: false });
    breakout.advance(16);

    expect(breakout.situation()).toBe("flight");
  });

  test("P pauses and R resumes", async () => {
    const { breakout, input } = await freshInput();

    input.press({ code: "KeyP", repeat: false });
    breakout.advance(16);

    expect(breakout.situation()).toBe("paused-serve");

    input.press({ code: "KeyR", repeat: false });
    breakout.advance(16);

    expect(breakout.situation()).toBe("serve");
  });

  test("N starts a new match", async () => {
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

  test("do nothing on a key repeat", async () => {
    const { breakout, input } = await freshInput();

    input.press({ code: "Space", repeat: true });
    breakout.advance(16);

    expect(breakout.situation()).toBe("serve");
  });
});

describe("the situation label", () => {
  test("prompts the launch on a serve and the resume on a pause", async () => {
    const { breakout, input, situationLabel } = await freshInput();

    expect(situationLabel()).toBe("Serve: Space to launch");

    input.press({ code: "KeyP", repeat: false });
    breakout.advance(16);

    expect(situationLabel()).toBe("Paused: R to resume");
  });

  test("stays empty while the ball flies", async () => {
    const { breakout, input, situationLabel } = await freshInput();

    input.press({ code: "Space", repeat: false });
    breakout.advance(16);

    expect(situationLabel()).toBe("");
  });
});
