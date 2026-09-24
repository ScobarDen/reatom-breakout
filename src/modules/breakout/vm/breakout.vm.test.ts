import { type Computed, context, sleep } from "@reatom/core";

import { paddleBox } from "../model/board.model.ts";
import { openingMatch } from "../model/match.model.ts";
import * as vm from "./breakout.vm.ts";

type Spy = ReturnType<typeof vi.fn>;

function fallenBricks(): vm.Brick[] {
  return vm.bricks.filter((brick) => !brick.standing());
}

function watch(target: Computed<unknown>): Spy {
  const spy = vi.fn();

  target.subscribe(spy);
  spy.mockClear();

  return spy;
}

function wokenBricks(): () => vm.Brick[] {
  const spies = vm.bricks.map((brick) => watch(brick.standing));

  return () => vm.bricks.filter((_brick, index) => spies[index].mock.calls.length > 0);
}

function launchServe(): void {
  vm.launch();
  vm.advance(0);
}

function playUntilScore(): void {
  for (let frame = 0; frame < 500 && vm.score() === 0; frame++) {
    vm.advance(16);
  }
}

function paddleAfter(elapsedMs: number): number {
  context.reset();
  vm.paddleSteering.setLeft();
  vm.advance(elapsedMs);

  return vm.paddle().left;
}

function paddleCentre(): number {
  const { left, right } = vm.paddle();

  return (left + right) / 2;
}

beforeEach(() => {
  context.reset();
});

describe("the public surface", () => {
  test("exposes the picture, the input and the tick, and no match", async () => {
    const breakout = await import("../index.ts");

    expect(Object.keys(breakout).toSorted()).toEqual([
      "advance",
      "ball",
      "board",
      "bricks",
      "controlsHint",
      "lives",
      "matchControls",
      "paddle",
      "paddleDirection",
      "score",
      "situation",
      "situationLabel",
    ]);
  });
});

describe("before the first frame", () => {
  test("holds the opening serve", () => {
    const opening = openingMatch();

    expect(vm.situation()).toBe("serve");
    expect(vm.lives()).toBe(opening.lives);
    expect(vm.score()).toBe(0);
    expect(vm.paddle()).toEqual(paddleBox(opening.paddle));
    expect(vm.ball()).toMatchObject(opening.ball);
    expect(vm.bricks).toHaveLength(50);
    expect(fallenBricks()).toEqual([]);
  });
});

describe("the batch", () => {
  test("waits for the tick before the step plays it", async () => {
    vm.launch();
    await sleep(0);

    expect(vm.situation()).toBe("serve");

    vm.advance(16);

    expect(vm.situation()).toBe("flight");
  });

  test("keeps the calls in order for the step", () => {
    vm.pause();
    vm.launch();
    vm.advance(16);

    expect(vm.situation()).toBe("paused-serve");

    vm.resume();
    vm.launch();
    vm.advance(16);

    expect(vm.situation()).toBe("flight");
  });

  test("drops what the new match threw away", () => {
    vm.launch();
    vm.newMatch();
    vm.advance(16);
    vm.advance(16);

    expect(vm.situation()).toBe("serve");
  });

  test("plays an event in one frame only", () => {
    vm.newMatch();
    vm.advance(16);
    vm.launch();
    vm.advance(16);

    expect(vm.situation()).toBe("flight");
  });

  test("puts an event raised by a subscriber into the next frame", async () => {
    vm.situation.subscribe((current) => {
      if (current === "flight") {
        vm.pause();
      }
    });
    launchServe();
    await sleep(0);

    expect(vm.situation()).toBe("flight");

    vm.advance(16);

    expect(vm.situation()).toBe("paused-flight");
  });
});

describe("the picture diff", () => {
  test("a frame that changes nothing wakes no subscriber", async () => {
    const woken = [
      watch(vm.ball),
      watch(vm.paddle),
      watch(vm.score),
      watch(vm.lives),
      watch(vm.situation),
    ];

    vm.advance(16);
    await sleep(0);

    expect(woken.map((spy) => spy.mock.calls.length)).toEqual([0, 0, 0, 0, 0]);
  });

  test("writes the moved paddle and ball before advance returns", () => {
    const opening = openingMatch();

    vm.paddleSteering.setRight();
    vm.advance(16);

    expect(paddleCentre()).toBeGreaterThan(opening.paddle);
    expect(vm.ball()).toMatchObject({ x: paddleCentre(), y: opening.ball.y });
  });

  test("wakes the moved pieces once, on a microtask after advance", async () => {
    const moved = [watch(vm.ball), watch(vm.paddle)];
    const still = [watch(vm.score), watch(vm.lives), watch(vm.situation)];
    const bricks = wokenBricks();

    vm.paddleSteering.setRight();
    vm.advance(16);

    expect(moved.map((spy) => spy.mock.calls.length)).toEqual([0, 0]);

    await sleep(0);

    expect(moved.map((spy) => spy.mock.calls.length)).toEqual([1, 1]);
    expect(still.map((spy) => spy.mock.calls.length)).toEqual([0, 0, 0]);
    expect(bricks()).toEqual([]);
  });

  test("a flight frame that only moves the ball leaves the bricks asleep", async () => {
    launchServe();

    const flown = watch(vm.ball);
    const bricks = wokenBricks();

    vm.advance(16);
    await sleep(0);

    expect(flown).toHaveBeenCalledOnce();
    expect(bricks()).toEqual([]);
  });

  test("a destroyed brick wakes only its own cell", async () => {
    launchServe();

    const bricks = wokenBricks();

    playUntilScore();
    await sleep(0);

    const fallen = fallenBricks();

    expect(vm.score()).toBeGreaterThan(0);
    expect(fallen.length).toBeGreaterThan(0);
    expect(bricks()).toEqual(fallen);
  });

  test("keeps the held paddle direction across ticks", async () => {
    vm.paddleSteering.setLeft();

    const direction = watch(vm.paddleDirection);

    vm.advance(16);
    vm.advance(16);
    await sleep(0);

    expect(direction).not.toHaveBeenCalled();
    expect(vm.paddleDirection()).toBe("left");
  });
});

describe("the paddle direction", () => {
  test("starts with no direction", () => {
    expect(vm.paddleDirection()).toBe("none");
  });

  test("moves the paddle while held and stops it once released", () => {
    const opening = openingMatch();

    vm.paddleSteering.setRight();
    vm.advance(16);

    const held = paddleCentre();

    vm.paddleSteering.setNone();
    vm.advance(16);

    expect(held).toBeGreaterThan(opening.paddle);
    expect(paddleCentre()).toBe(held);
  });
});

describe("a new match", () => {
  test("stands the fallen bricks up again and wakes only them", async () => {
    launchServe();
    playUntilScore();

    expect(vm.score()).toBeGreaterThan(0);

    const fallen = fallenBricks();
    const bricks = wokenBricks();

    vm.newMatch();
    vm.advance(16);
    await sleep(0);

    expect(bricks()).toEqual(fallen);
    expect(fallenBricks()).toEqual([]);
    expect(vm.score()).toBe(0);
    expect(vm.situation()).toBe("serve");
  });
});

describe("the drawn board", () => {
  test("bounces the ball off the drawn bottom of a brick", () => {
    const lowest = Math.max(...vm.bricks.map((brick) => brick.box.bottom));
    const target = vm.bricks.find((brick) => brick.box.bottom === lowest)!;
    const x = (target.box.left + target.box.right) / 2;

    vm.match.set({
      ...openingMatch(),
      situation: "flight",
      ball: { x, y: target.box.bottom + vm.ball().radius + 5 },
      velocity: { x: 0, y: -0.1 },
    });
    vm.advance(100);

    expect(target.standing()).toBe(false);
    expect(vm.ball().y).toBeCloseTo(target.box.bottom + vm.ball().radius + 5);
  });

  test("bounces the ball off the drawn side of a brick", () => {
    const target = vm.bricks.find((brick) => brick.box.left === 0 && brick.row === 6)!;
    const y = (target.box.top + target.box.bottom) / 2;

    vm.match.set({
      ...openingMatch(),
      situation: "flight",
      bricks: openingMatch().bricks.map((cells, column) =>
        cells.map((_laid, row) => row === 6 && (column === 0 || column === 9)),
      ),
      ball: { x: target.box.right + vm.ball().radius + 5, y },
      velocity: { x: -0.1, y: 0 },
    });
    vm.advance(100);

    expect(target.standing()).toBe(false);
    expect(vm.ball().x).toBeCloseTo(target.box.right + vm.ball().radius + 5);
  });

  test("bounces the ball off the drawn top of the paddle", () => {
    const { top } = vm.paddle();
    const x = paddleCentre();

    vm.match.set({
      ...openingMatch(),
      situation: "flight",
      ball: { x, y: top - vm.ball().radius - 5 },
      velocity: { x: 0, y: 0.1 },
    });
    vm.advance(100);

    expect(vm.situation()).toBe("flight");
    expect(vm.ball().y).toBeCloseTo(top - vm.ball().radius - 5);
  });
});

describe("the tick", () => {
  test("never plays more than 100 ms in one frame", () => {
    const capped = paddleAfter(100);
    const stalled = paddleAfter(60_000);
    const shorter = paddleAfter(99);

    expect(stalled).toBe(capped);
    expect(shorter).toBeGreaterThan(capped);
    expect(stalled).toBeGreaterThan(0);
  });
});
