import { type Computed, context, sleep } from "@reatom/core";

import { columns, paddleWidth, rows } from "../breakout.config.ts";
import { openingMatch } from "../model/match.model.ts";
import * as vm from "./breakout.vm.ts";

type Spy = ReturnType<typeof vi.fn>;

const everyCell = Array.from({ length: columns }, (_cells, column) =>
  Array.from({ length: rows }, (_cell, row): [number, number] => [column, row]),
).flat();

function brickPicture(): boolean[][] {
  return Array.from({ length: columns }, (_cells, column) =>
    Array.from({ length: rows }, (_cell, row) => vm.brickAt(column, row)()),
  );
}

function watch(target: Computed<unknown>): Spy {
  const spy = vi.fn();

  target.subscribe(spy);
  spy.mockClear();

  return spy;
}

function wokenBricks(): () => [number, number][] {
  const spies = everyCell.map(([column, row]) => watch(vm.brickAt(column, row)));

  return () => everyCell.filter((_cell, index) => spies[index].mock.calls.length > 0);
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

  return vm.paddle();
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
      "ballRadius",
      "boardHeight",
      "boardWidth",
      "brickAt",
      "columns",
      "controlsHint",
      "lives",
      "matchControls",
      "paddle",
      "paddleDirection",
      "paddleHeight",
      "paddleWidth",
      "paddleY",
      "rows",
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
    expect(vm.paddle()).toBe(opening.paddle);
    expect(vm.ball()).toEqual(opening.ball);
    expect(brickPicture()).toEqual(opening.bricks);
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

    expect(vm.paddle()).toBeGreaterThan(opening.paddle);
    expect(vm.ball()).toEqual({ x: vm.paddle(), y: opening.ball.y });
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

    const fallen = everyCell.filter(
      ([column, row]) => openingMatch().bricks[column][row] && !vm.brickAt(column, row)(),
    );

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

    const held = vm.paddle();

    vm.paddleSteering.setNone();
    vm.advance(16);

    expect(held).toBeGreaterThan(opening.paddle);
    expect(vm.paddle()).toBe(held);
  });
});

describe("a new match", () => {
  test("writes the opening layout into the same brick atoms", async () => {
    const before = everyCell.map(([column, row]) => vm.brickAt(column, row));

    launchServe();
    playUntilScore();

    expect(vm.score()).toBeGreaterThan(0);

    const fallen = everyCell.filter(
      ([column, row]) => openingMatch().bricks[column][row] && !vm.brickAt(column, row)(),
    );
    const bricks = wokenBricks();

    vm.newMatch();
    vm.advance(16);
    await sleep(0);

    const after = everyCell.map(([column, row]) => vm.brickAt(column, row));

    expect(after.every((brick, index) => brick === before[index])).toBe(true);
    expect(bricks()).toEqual(fallen);
    expect(brickPicture()).toEqual(openingMatch().bricks);
    expect(vm.score()).toBe(0);
    expect(vm.situation()).toBe("serve");
  });
});

describe("the tick", () => {
  test("never plays more than 100 ms in one frame", () => {
    const capped = paddleAfter(100);
    const stalled = paddleAfter(60_000);
    const shorter = paddleAfter(99);

    expect(stalled).toBe(capped);
    expect(shorter).toBeGreaterThan(capped);
    expect(stalled).toBeGreaterThan(paddleWidth / 2);
  });
});
