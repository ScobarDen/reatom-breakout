import {
  ballRadius,
  boardHeight,
  boardWidth,
  columns,
  openingMatch,
  paddleHeight,
  paddleWidth,
  paddleY,
  rows,
  step,
  type Match,
} from "./index.ts";

const cellWidth = boardWidth / columns;
const cellHeight = boardHeight / rows;
const servedBallY = paddleY - paddleHeight / 2 - ballRadius;

function standingCells(match: Match): [number, number][] {
  return match.bricks.flatMap((column, c) =>
    column.flatMap((standing, r): [number, number][] => (standing ? [[c, r]] : [])),
  );
}

type Frame = Parameters<typeof step>[1];

function frame(overrides: Partial<Frame> = {}): Frame {
  return { direction: "none", events: [], elapsedMs: 16, ...overrides };
}

function stepFrames(match: Match, frames: number, overrides: Partial<Frame> = {}): Match {
  let next = match;
  for (let i = 0; i < frames; i++) next = step(next, frame(overrides));
  return next;
}

describe("openingMatch", () => {
  test("starts a serve with three lives and no score", () => {
    const match = openingMatch();

    expect(match.situation).toBe("serve");
    expect(match.lives).toBe(3);
    expect(match.score).toBe(0);
  });

  test("lays out a solid rectangle of bricks on the fixed grid", () => {
    const match = openingMatch();
    const cells = standingCells(match);
    const cellColumns = cells.map(([c]) => c);
    const cellRows = cells.map(([, r]) => r);
    const width = Math.max(...cellColumns) - Math.min(...cellColumns) + 1;
    const height = Math.max(...cellRows) - Math.min(...cellRows) + 1;

    expect(match.bricks).toHaveLength(columns);
    expect(match.bricks.every((column) => column.length === rows)).toBe(true);
    expect(cells.length).toBeGreaterThan(0);
    expect(cells.length).toBe(width * height);
  });

  test("keeps the ball glued on top of the paddle", () => {
    const match = openingMatch();

    expect(match.ball).toEqual({ x: match.paddle, y: servedBallY });
  });
});

describe("serve", () => {
  test("moves the paddle by the elapsed time and carries the ball along", () => {
    const opening = openingMatch();

    const short = step(opening, frame({ direction: "right", elapsedMs: 10 }));
    const long = step(opening, frame({ direction: "right", elapsedMs: 20 }));

    expect(short.paddle).toBeGreaterThan(opening.paddle);
    expect(long.paddle - opening.paddle).toBeCloseTo(2 * (short.paddle - opening.paddle));
    expect(long.ball).toEqual({ x: long.paddle, y: servedBallY });
    expect(long.situation).toBe("serve");
  });

  test("keeps the paddle still without a direction", () => {
    const opening = openingMatch();

    expect(step(opening, frame()).paddle).toBe(opening.paddle);
  });

  test("stops the paddle at the side walls", () => {
    const left = stepFrames(openingMatch(), 200, { direction: "left", elapsedMs: 100 });
    const right = stepFrames(openingMatch(), 200, { direction: "right", elapsedMs: 100 });

    expect(left.paddle).toBe(paddleWidth / 2);
    expect(left.ball.x).toBe(paddleWidth / 2);
    expect(right.paddle).toBe(boardWidth - paddleWidth / 2);
    expect(right.ball.x).toBe(boardWidth - paddleWidth / 2);
  });
});

function heading(from: Match, to: Match): { x: number; y: number } {
  const dx = to.ball.x - from.ball.x;
  const dy = to.ball.y - from.ball.y;
  const length = Math.hypot(dx, dy);
  return { x: dx / length, y: dy / length };
}

function launched(match: Match, direction: Frame["direction"] = "none"): Match {
  return step(match, frame({ events: ["launch"], direction }));
}

describe("launch", () => {
  test("releases the ball up and slightly to the side", () => {
    const released = launched(openingMatch());
    const flying = step(released, frame({ elapsedMs: 10 }));
    const toward = heading(released, flying);

    expect(released.situation).toBe("flight");
    expect(toward.y).toBeLessThan(0);
    expect(toward.x).not.toBe(0);
    expect(Math.abs(toward.x)).toBeLessThan(Math.abs(toward.y));
  });

  test("uses the same heading wherever the paddle is and whichever way it moves", () => {
    const fromCenter = launched(openingMatch());
    const fromLeftWall = launched(
      stepFrames(openingMatch(), 20, { direction: "left", elapsedMs: 100 }),
      "left",
    );
    const movingRight = launched(openingMatch(), "right");

    const reference = heading(fromCenter, step(fromCenter, frame()));
    expect(heading(fromLeftWall, step(fromLeftWall, frame()))).toEqual({
      x: expect.closeTo(reference.x),
      y: expect.closeTo(reference.y),
    });
    expect(heading(movingRight, step(movingRight, frame()))).toEqual({
      x: expect.closeTo(reference.x),
      y: expect.closeTo(reference.y),
    });
  });
});

describe("flight", () => {
  test("moves the ball along a fixed heading by the elapsed time", () => {
    const released = launched(openingMatch());
    const short = step(released, frame({ elapsedMs: 10 }));
    const long = step(released, frame({ elapsedMs: 20 }));
    const chained = step(short, frame({ elapsedMs: 10 }));

    expect(long.ball.x - released.ball.x).toBeCloseTo(2 * (short.ball.x - released.ball.x));
    expect(long.ball.y - released.ball.y).toBeCloseTo(2 * (short.ball.y - released.ball.y));
    expect(chained.ball.x).toBeCloseTo(long.ball.x);
    expect(chained.ball.y).toBeCloseTo(long.ball.y);
  });

  test("ignores the paddle direction when steering the ball", () => {
    const released = launched(openingMatch());

    const still = step(released, frame({ elapsedMs: 20 }));
    const steered = step(released, frame({ elapsedMs: 20, direction: "left" }));

    expect(steered.ball).toEqual(still.ball);
    expect(steered.paddle).toBeLessThan(still.paddle);
  });
});

function bricksAt(...cells: [number, number][]): boolean[][] {
  return Array.from({ length: columns }, (_, c) =>
    Array.from({ length: rows }, (_, r) =>
      cells.some(([column, row]) => column === c && row === r),
    ),
  );
}

const farBrick: [number, number] = [0, 14];

function flight(
  ball: { x: number; y: number },
  velocity: { x: number; y: number },
  overrides: Partial<Pick<Match, "bricks" | "paddle" | "lives" | "score">> = {},
): Match {
  return {
    ...openingMatch(),
    bricks: bricksAt(farBrick),
    paddle: boardWidth - paddleWidth / 2,
    ...overrides,
    situation: "flight",
    ball,
    velocity,
  };
}

describe("walls", () => {
  test("mirror the ball off the left wall", () => {
    const next = step(flight({ x: 10, y: 150 }, { x: -0.1, y: -0.05 }), frame({ elapsedMs: 100 }));

    expect(next.ball.x).toBeCloseTo(10);
    expect(next.ball.y).toBeCloseTo(145);
  });

  test("mirror the ball off the right wall", () => {
    const next = step(
      flight({ x: boardWidth - 10, y: 150 }, { x: 0.1, y: -0.05 }, { paddle: paddleWidth / 2 }),
      frame({ elapsedMs: 100 }),
    );

    expect(next.ball.x).toBeCloseTo(boardWidth - 10);
    expect(next.ball.y).toBeCloseTo(145);
  });

  test("mirror the ball off the top wall", () => {
    const next = step(flight({ x: 200, y: 10 }, { x: 0.05, y: -0.1 }), frame({ elapsedMs: 100 }));

    expect(next.ball.x).toBeCloseTo(205);
    expect(next.ball.y).toBeCloseTo(10);
  });
});

describe("bricks", () => {
  test("a hit on the bottom face destroys the brick and mirrors the ball", () => {
    const next = step(
      flight(
        { x: 220, y: 7 * cellHeight + cellHeight + ballRadius + 10 },
        { x: 0.05, y: -0.1 },
        {
          bricks: bricksAt(farBrick, [5, 7]),
        },
      ),
      frame({ elapsedMs: 200 }),
    );

    expect(next.bricks[5]![7]).toBe(false);
    expect(next.bricks[0]![14]).toBe(true);
    expect(next.ball.x).toBeCloseTo(230);
    expect(next.ball.y).toBeCloseTo(8 * cellHeight + ballRadius + 10);
    expect(next.score).toBeGreaterThan(0);
  });

  test("a hit on the side face destroys the brick and mirrors the ball", () => {
    const next = step(
      flight(
        { x: 5 * cellWidth - ballRadius - 10, y: 150 },
        { x: 0.1, y: 0.02 },
        {
          bricks: bricksAt(farBrick, [5, 7]),
        },
      ),
      frame({ elapsedMs: 200 }),
    );

    expect(next.bricks[5]![7]).toBe(false);
    expect(next.ball.x).toBeCloseTo(5 * cellWidth - ballRadius - 10);
    expect(next.ball.y).toBeCloseTo(154);
  });

  test("every brick is worth the same", () => {
    const low = step(
      flight({ x: 220, y: 175 }, { x: 0, y: -0.1 }, { bricks: bricksAt(farBrick, [5, 7]) }),
      frame({ elapsedMs: 200 }),
    );
    const high = step(
      flight({ x: 60, y: 55 }, { x: 0, y: -0.1 }, { bricks: bricksAt(farBrick, [1, 1]) }),
      frame({ elapsedMs: 200 }),
    );

    expect(low.bricks[5]![7]).toBe(false);
    expect(high.bricks[1]![1]).toBe(false);
    expect(high.score).toBe(low.score);
  });

  test("a hit on the seam of two bricks destroys both, scores both and bounces once", () => {
    const single = step(
      flight({ x: 220, y: 175 }, { x: 0.05, y: -0.1 }, { bricks: bricksAt(farBrick, [5, 7]) }),
      frame({ elapsedMs: 200 }),
    );
    const next = step(
      flight(
        { x: 5 * cellWidth - 5, y: 175 },
        { x: 0.05, y: -0.1 },
        {
          bricks: bricksAt(farBrick, [4, 7], [5, 7]),
        },
      ),
      frame({ elapsedMs: 200 }),
    );

    expect(next.bricks[4]![7]).toBe(false);
    expect(next.bricks[5]![7]).toBe(false);
    expect(next.score).toBe(2 * single.score);
    expect(next.ball.x).toBeCloseTo(5 * cellWidth + 5);
    expect(next.ball.y).toBeCloseTo(175);
  });

  test("a hit into the inner corner of two bricks destroys both and bounces back once", () => {
    const next = step(
      flight(
        { x: 185, y: 175 },
        { x: 0.1, y: -0.1 },
        {
          bricks: bricksAt(farBrick, [4, 7], [5, 8]),
        },
      ),
      frame({ elapsedMs: 200 }),
    );

    expect(next.bricks[4]![7]).toBe(false);
    expect(next.bricks[5]![8]).toBe(false);
    expect(next.ball.x).toBeCloseTo(185);
    expect(next.ball.y).toBeCloseTo(175);
  });
});

function speedAfter(match: Match): number {
  const later = step(match, frame({ elapsedMs: 10 }));
  return Math.hypot(later.ball.x - match.ball.x, later.ball.y - match.ball.y) / 10;
}

function bounceOffPaddle(contactX: number, velocity = { x: 0, y: 0.1 }): Match {
  const paddleTop = paddleY - paddleHeight / 2 - ballRadius;
  return step(
    flight({ x: contactX - velocity.x * 100, y: paddleTop - velocity.y * 100 }, velocity, {
      paddle: 200,
    }),
    frame({ elapsedMs: 100 }),
  );
}

function headingAfter(match: Match): { x: number; y: number } {
  return heading(match, step(match, frame({ elapsedMs: 10 })));
}

describe("paddle", () => {
  test("sends the ball straight up from the center", () => {
    const toward = headingAfter(bounceOffPaddle(200));

    expect(toward.x).toBeCloseTo(0);
    expect(toward.y).toBeCloseTo(-1);
  });

  test("angles the ball toward the side of the contact, more so near the edge", () => {
    const nearRight = headingAfter(bounceOffPaddle(210));
    const farRight = headingAfter(bounceOffPaddle(230));
    const farLeft = headingAfter(bounceOffPaddle(170));

    expect(nearRight.y).toBeLessThan(0);
    expect(nearRight.x).toBeGreaterThan(0);
    expect(farRight.x).toBeGreaterThan(nearRight.x);
    expect(farLeft.x).toBeCloseTo(-farRight.x);
  });

  test("picks the new angle from the contact point, not from the incoming angle", () => {
    const straight = headingAfter(bounceOffPaddle(210, { x: 0, y: 0.1 }));
    const slanted = headingAfter(bounceOffPaddle(210, { x: -0.06, y: 0.08 }));

    expect(slanted.x).toBeCloseTo(straight.x);
    expect(slanted.y).toBeCloseTo(straight.y);
  });

  test("keeps the ball speed", () => {
    expect(speedAfter(bounceOffPaddle(225, { x: -0.06, y: 0.08 }))).toBeCloseTo(0.1);
  });

  test("treats a hit on the paddle end as the same bounce", () => {
    const paddleLeftEnd = 200 - paddleWidth / 2 - ballRadius;
    const velocity = { x: 0.1, y: 0.01 };
    const next = step(
      flight({ x: paddleLeftEnd - 10, y: paddleY - 1 }, velocity, { paddle: 200 }),
      frame({ elapsedMs: 100 }),
    );
    const toward = headingAfter(next);

    expect(next.situation).toBe("flight");
    expect(toward.y).toBeLessThan(0);
    expect(toward.x).toBeLessThan(0);
    expect(speedAfter(next)).toBeCloseTo(Math.hypot(velocity.x, velocity.y));
  });
});

const everyInput: Frame[] = [
  frame({ events: ["launch"] }),
  frame({ events: ["pause"] }),
  frame({ events: ["resume"] }),
  frame({ direction: "left", elapsedMs: 50 }),
  frame({ direction: "right", events: ["resume", "launch"], elapsedMs: 50 }),
];

describe("bottom", () => {
  test("takes one life, keeps bricks and score and returns to the serve", () => {
    const before = flight(
      { x: 100, y: 290 },
      { x: 0, y: 0.1 },
      {
        bricks: bricksAt(farBrick, [3, 3]),
        score: 30,
      },
    );

    const next = step(before, frame({ elapsedMs: 100 }));

    expect(next.situation).toBe("serve");
    expect(next.lives).toBe(2);
    expect(next.score).toBe(30);
    expect(next.bricks).toEqual(before.bricks);
    expect(next.ball).toEqual({ x: next.paddle, y: servedBallY });
  });

  test("losing the last life loses the match", () => {
    const next = step(
      flight({ x: 100, y: 290 }, { x: 0, y: 0.1 }, { lives: 1 }),
      frame({ elapsedMs: 100 }),
    );

    expect(next.situation).toBe("lost");
    expect(next.lives).toBe(0);
  });
});

describe("won", () => {
  test("comes as soon as the last brick falls", () => {
    const next = step(
      flight({ x: 220, y: 175 }, { x: 0.05, y: -0.1 }, { bricks: bricksAt([5, 7]) }),
      frame({ elapsedMs: 200 }),
    );

    expect(next.situation).toBe("won");
    expect(next.bricks.flat().some(Boolean)).toBe(false);
    expect(next.ball.x).toBeCloseTo(225);
    expect(next.ball.y).toBeCloseTo(8 * cellHeight + ballRadius);
  });

  test("the last brick and the bottom in one hit is a win without losing a life", () => {
    const next = step(
      flight(
        { x: 5 * cellWidth - ballRadius - 10, y: boardHeight - ballRadius - 10 },
        { x: 0.1, y: 0.1 },
        {
          bricks: bricksAt([5, rows - 1]),
          paddle: paddleWidth / 2,
        },
      ),
      frame({ elapsedMs: 150 }),
    );

    expect(next.situation).toBe("won");
    expect(next.lives).toBe(3);
  });
});

describe("after the match ends", () => {
  const won = step(
    flight({ x: 220, y: 175 }, { x: 0.05, y: -0.1 }, { bricks: bricksAt([5, 7]) }),
    frame({ elapsedMs: 200 }),
  );
  const lost = step(
    flight({ x: 100, y: 290 }, { x: 0, y: 0.1 }, { lives: 1 }),
    frame({ elapsedMs: 100 }),
  );

  test.each([
    ["won", won],
    ["lost", lost],
  ])("%s ignores launch, pause, resume and direction", (_, ended) => {
    for (const input of everyInput) {
      expect(step(ended, input)).toEqual(ended);
    }
  });

  test.each([
    ["won", won],
    ["lost", lost],
  ])("%s still listens to a new match", (_, ended) => {
    expect(step(ended, frame({ events: ["new-match"] }))).toEqual(openingMatch());
  });
});

describe("pause", () => {
  const flying = step(launched(openingMatch()), frame({ elapsedMs: 50 }));

  test("pauses a serve and a flight", () => {
    expect(step(openingMatch(), frame({ events: ["pause"] })).situation).toBe("paused-serve");
    expect(step(flying, frame({ events: ["pause"] })).situation).toBe("paused-flight");
  });

  test("holds the ball and the paddle against elapsed time and direction", () => {
    const pausedServe = step(openingMatch(), frame({ events: ["pause"] }));
    const pausedFlight = step(flying, frame({ events: ["pause"] }));

    expect(step(pausedServe, frame({ direction: "left", elapsedMs: 100 }))).toEqual(pausedServe);
    expect(step(pausedFlight, frame({ direction: "left", elapsedMs: 100 }))).toEqual(pausedFlight);
  });

  test("holds the ball and the paddle in the frame it is set", () => {
    const paused = step(flying, frame({ events: ["pause"], direction: "right", elapsedMs: 100 }));

    expect(paused.ball).toEqual(flying.ball);
    expect(paused.paddle).toBe(flying.paddle);
  });

  test("keeps the ball on the paddle when paused with a launch", () => {
    const paused = step(openingMatch(), frame({ events: ["pause", "launch"] }));
    const stillPaused = step(paused, frame({ events: ["launch"] }));

    expect(paused.situation).toBe("paused-serve");
    expect(stillPaused.situation).toBe("paused-serve");
  });
});

describe("resume", () => {
  const flying = step(launched(openingMatch()), frame({ elapsedMs: 50 }));
  const pausedFlight = step(flying, frame({ events: ["pause"] }));
  const pausedServe = step(openingMatch(), frame({ events: ["pause"] }));

  test("continues the flight for the rest of the frame", () => {
    const resumed = step(pausedFlight, frame({ events: ["resume"], elapsedMs: 20 }));

    expect(resumed.situation).toBe("flight");
    expect(resumed.ball).toEqual(step(flying, frame({ elapsedMs: 20 })).ball);
  });

  test("lets the paddle move for the rest of the frame", () => {
    const resumed = step(
      pausedServe,
      frame({ events: ["resume"], direction: "right", elapsedMs: 20 }),
    );

    expect(resumed.situation).toBe("serve");
    expect(resumed.paddle).toBeGreaterThan(pausedServe.paddle);
  });

  test("releases the ball when resumed together with a launch", () => {
    expect(step(pausedServe, frame({ events: ["resume", "launch"] })).situation).toBe("flight");
    expect(step(pausedServe, frame({ events: ["launch", "resume"] })).situation).toBe("flight");
  });

  test("wins over a pause in the same frame", () => {
    expect(step(pausedServe, frame({ events: ["resume", "pause"] })).situation).toBe("serve");
    expect(step(openingMatch(), frame({ events: ["pause", "resume"] })).situation).toBe("serve");
    expect(step(flying, frame({ events: ["pause", "resume"] })).situation).toBe("flight");
  });
});

describe("new match", () => {
  const flying = step(launched(openingMatch()), frame({ elapsedMs: 50 }));

  test.each([
    ["serve", stepFrames(openingMatch(), 3, { direction: "left" })],
    ["flight", flying],
    ["paused flight", step(flying, frame({ events: ["pause"] }))],
  ])("starts over from a %s", (_, match) => {
    expect(step(match, frame({ events: ["new-match"] }))).toEqual(openingMatch());
  });

  test("throws away the rest of the frame", () => {
    const next = step(
      flying,
      frame({ events: ["launch", "new-match", "pause"], direction: "left", elapsedMs: 50 }),
    );

    expect(next).toEqual(openingMatch());
  });
});
