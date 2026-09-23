import {
  ballRadius,
  boardWidth,
  brickRowCount,
  columns,
  firstBrickRow,
  paddleHeight,
  paddleY,
  rows,
  startingLives,
} from "./constants.ts";

export interface Vector {
  readonly x: number;
  readonly y: number;
}

export type Bricks = readonly (readonly boolean[])[];

interface MatchCommon {
  readonly bricks: Bricks;
  readonly paddle: number;
  readonly ball: Vector;
  readonly lives: number;
  readonly score: number;
}

export type Match = MatchCommon &
  (
    | { readonly situation: "serve" | "paused-serve" | "won" | "lost" }
    | { readonly situation: "flight" | "paused-flight"; readonly velocity: Vector }
  );

export function servedBall(paddle: number): Vector {
  return { x: paddle, y: paddleY - paddleHeight / 2 - ballRadius };
}

export function openingMatch(): Match {
  const paddle = boardWidth / 2;

  return {
    situation: "serve",
    bricks: Array.from({ length: columns }, () =>
      Array.from(
        { length: rows },
        (_cell, row) => row >= firstBrickRow && row < firstBrickRow + brickRowCount,
      ),
    ),
    paddle,
    ball: servedBall(paddle),
    lives: startingLives,
    score: 0,
  };
}
