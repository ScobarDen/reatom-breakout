import { type Computed, context, sleep } from "@reatom/core";

import { columns, paddleWidth, rows } from "../breakout.config.ts";
import { openingMatch } from "../model/match.model.ts";
import type * as ViewModel from "./breakout.vm.ts";

type Breakout = typeof ViewModel;
type Spy = ReturnType<typeof vi.fn>;

const everyCell = Array.from({ length: columns }, (_cells, column) =>
  Array.from({ length: rows }, (_cell, row): [number, number] => [column, row]),
).flat();

function freshBreakout(): Promise<Breakout> {
  context.reset();
  vi.resetModules();

  return import("./breakout.vm.ts");
}

function brickPicture(breakout: Breakout): boolean[][] {
  return Array.from({ length: columns }, (_cells, column) =>
    Array.from({ length: rows }, (_cell, row) => breakout.brickAt(column, row)()),
  );
}

function watch(target: Computed<unknown>): Spy {
  const spy = vi.fn();

  target.subscribe(spy);
  spy.mockClear();

  return spy;
}

function wokenBricks(breakout: Breakout): () => [number, number][] {
  const spies = everyCell.map(([column, row]) => watch(breakout.brickAt(column, row)));

  return () => everyCell.filter((_cell, index) => spies[index].mock.calls.length > 0);
}

function launchServe(breakout: Breakout): void {
  breakout.launch();
  breakout.advance(0);
}

function playUntilScore(breakout: Breakout): void {
  for (let frame = 0; frame < 500 && breakout.score() === 0; frame++) {
    breakout.advance(16);
  }
}

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
  test("holds the opening serve", async () => {
    const breakout = await freshBreakout();
    const opening = openingMatch();

    expect(breakout.situation()).toBe("serve");
    expect(breakout.lives()).toBe(opening.lives);
    expect(breakout.score()).toBe(0);
    expect(breakout.paddle()).toBe(opening.paddle);
    expect(breakout.ball()).toEqual(opening.ball);
    expect(brickPicture(breakout)).toEqual(opening.bricks);
  });
});

describe("the batch", () => {
  test("waits for the tick before the step plays it", async () => {
    const breakout = await freshBreakout();

    breakout.launch();
    await sleep(0);

    expect(breakout.situation()).toBe("serve");

    breakout.advance(16);

    expect(breakout.situation()).toBe("flight");
  });

  test("keeps the calls in order for the step", async () => {
    const breakout = await freshBreakout();

    breakout.pause();
    breakout.launch();
    breakout.advance(16);

    expect(breakout.situation()).toBe("paused-serve");

    breakout.resume();
    breakout.launch();
    breakout.advance(16);

    expect(breakout.situation()).toBe("flight");
  });

  test("drops what the new match threw away", async () => {
    const breakout = await freshBreakout();

    breakout.launch();
    breakout.newMatch();
    breakout.advance(16);
    breakout.advance(16);

    expect(breakout.situation()).toBe("serve");
  });

  test("plays an event in one frame only", async () => {
    const breakout = await freshBreakout();

    breakout.newMatch();
    breakout.advance(16);
    breakout.launch();
    breakout.advance(16);

    expect(breakout.situation()).toBe("flight");
  });

  test("puts an event raised by a subscriber into the next frame", async () => {
    const breakout = await freshBreakout();

    breakout.situation.subscribe((current) => {
      if (current === "flight") {
        breakout.pause();
      }
    });
    launchServe(breakout);
    await sleep(0);

    expect(breakout.situation()).toBe("flight");

    breakout.advance(16);

    expect(breakout.situation()).toBe("paused-flight");
  });
});

describe("the picture diff", () => {
  test("a frame that changes nothing wakes no subscriber", async () => {
    const breakout = await freshBreakout();
    const woken = [
      watch(breakout.ball),
      watch(breakout.paddle),
      watch(breakout.score),
      watch(breakout.lives),
      watch(breakout.situation),
    ];

    breakout.advance(16);
    await sleep(0);

    expect(woken.map((spy) => spy.mock.calls.length)).toEqual([0, 0, 0, 0, 0]);
  });

  test("writes the moved paddle and ball before advance returns", async () => {
    const breakout = await freshBreakout();
    const opening = openingMatch();

    breakout.paddleSteering.setRight();
    breakout.advance(16);

    expect(breakout.paddle()).toBeGreaterThan(opening.paddle);
    expect(breakout.ball()).toEqual({ x: breakout.paddle(), y: opening.ball.y });
  });

  test("wakes the moved pieces once, on a microtask after advance", async () => {
    const breakout = await freshBreakout();
    const moved = [watch(breakout.ball), watch(breakout.paddle)];
    const still = [watch(breakout.score), watch(breakout.lives), watch(breakout.situation)];
    const bricks = wokenBricks(breakout);

    breakout.paddleSteering.setRight();
    breakout.advance(16);

    expect(moved.map((spy) => spy.mock.calls.length)).toEqual([0, 0]);

    await sleep(0);

    expect(moved.map((spy) => spy.mock.calls.length)).toEqual([1, 1]);
    expect(still.map((spy) => spy.mock.calls.length)).toEqual([0, 0, 0]);
    expect(bricks()).toEqual([]);
  });

  test("a flight frame that only moves the ball leaves the bricks asleep", async () => {
    const breakout = await freshBreakout();

    launchServe(breakout);

    const flown = watch(breakout.ball);
    const bricks = wokenBricks(breakout);

    breakout.advance(16);
    await sleep(0);

    expect(flown).toHaveBeenCalledOnce();
    expect(bricks()).toEqual([]);
  });

  test("a destroyed brick wakes only its own cell", async () => {
    const breakout = await freshBreakout();

    launchServe(breakout);

    const bricks = wokenBricks(breakout);

    playUntilScore(breakout);
    await sleep(0);

    const fallen = everyCell.filter(
      ([column, row]) => openingMatch().bricks[column][row] && !breakout.brickAt(column, row)(),
    );

    expect(breakout.score()).toBeGreaterThan(0);
    expect(fallen.length).toBeGreaterThan(0);
    expect(bricks()).toEqual(fallen);
  });

  test("keeps the held paddle direction across ticks", async () => {
    const breakout = await freshBreakout();

    breakout.paddleSteering.setLeft();

    const direction = watch(breakout.paddleDirection);

    breakout.advance(16);
    breakout.advance(16);
    await sleep(0);

    expect(direction).not.toHaveBeenCalled();
    expect(breakout.paddleDirection()).toBe("left");
  });
});

describe("the paddle direction", () => {
  test("starts with no direction", async () => {
    const breakout = await freshBreakout();

    expect(breakout.paddleDirection()).toBe("none");
  });

  test("moves the paddle while held and stops it once released", async () => {
    const breakout = await freshBreakout();
    const opening = openingMatch();

    breakout.paddleSteering.setRight();
    breakout.advance(16);

    const held = breakout.paddle();

    breakout.paddleSteering.setNone();
    breakout.advance(16);

    expect(held).toBeGreaterThan(opening.paddle);
    expect(breakout.paddle()).toBe(held);
  });
});

describe("a new match", () => {
  test("writes the opening layout into the same brick atoms", async () => {
    const breakout = await freshBreakout();
    const before = everyCell.map(([column, row]) => breakout.brickAt(column, row));

    launchServe(breakout);
    playUntilScore(breakout);

    expect(breakout.score()).toBeGreaterThan(0);

    const fallen = everyCell.filter(
      ([column, row]) => openingMatch().bricks[column][row] && !breakout.brickAt(column, row)(),
    );
    const bricks = wokenBricks(breakout);

    breakout.newMatch();
    breakout.advance(16);
    await sleep(0);

    const after = everyCell.map(([column, row]) => breakout.brickAt(column, row));

    expect(after.every((brick, index) => brick === before[index])).toBe(true);
    expect(bricks()).toEqual(fallen);
    expect(brickPicture(breakout)).toEqual(openingMatch().bricks);
    expect(breakout.score()).toBe(0);
    expect(breakout.situation()).toBe("serve");
  });
});

describe("the tick", () => {
  async function paddleAfter(elapsedMs: number): Promise<number> {
    const breakout = await freshBreakout();

    breakout.paddleSteering.setLeft();
    breakout.advance(elapsedMs);

    return breakout.paddle();
  }

  test("never plays more than 100 ms in one frame", async () => {
    const capped = await paddleAfter(100);
    const stalled = await paddleAfter(60_000);
    const shorter = await paddleAfter(99);

    expect(stalled).toBe(capped);
    expect(shorter).toBeGreaterThan(capped);
    expect(stalled).toBeGreaterThan(paddleWidth / 2);
  });
});
