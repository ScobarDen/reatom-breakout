import {
  boardWidth,
  brickRowCount,
  columns,
  firstBrickRow,
  rows,
  startingLives,
} from "../breakout.config.ts";
import { servedBall } from "./board.model.ts";

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

export type Situation = Match["situation"];

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
