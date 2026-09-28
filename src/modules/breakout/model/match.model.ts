import { boardWidth, brickRowCount, columns, firstBrickRow, rows } from "../breakout.config.ts";
import { servedBall } from "./board.model.ts";
import type { Rules } from "./rules.model.ts";

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
  readonly rules: Rules;
}

export type Match = MatchCommon &
  (
    | { readonly situation: "serve" | "paused-serve" | "won" | "lost" }
    | { readonly situation: "flight" | "paused-flight"; readonly velocity: Vector }
  );

export type Situation = Match["situation"];

export function openingBricks(): Bricks {
  return Array.from({ length: columns }, () =>
    Array.from(
      { length: rows },
      (_cell, row) => row >= firstBrickRow && row < firstBrickRow + brickRowCount,
    ),
  );
}

export function openingMatch(rules: Rules): Match {
  const paddle = boardWidth / 2;

  return {
    situation: "serve",
    bricks: openingBricks(),
    paddle,
    ball: servedBall(paddle),
    lives: rules.lives,
    score: 0,
    rules,
  };
}
