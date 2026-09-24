import {
  ballRadius,
  boardHeight,
  boardWidth,
  columns,
  paddleHeight,
  paddleWidth,
  paddleY,
  rows,
} from "../breakout.config.ts";
import type { Vector } from "./match.model.ts";

export interface Box {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

export const board = { width: boardWidth, height: boardHeight } as const;

const brickWidth = boardWidth / columns;
const brickHeight = boardHeight / rows;

export function brickBox(column: number, row: number): Box {
  return {
    left: column * brickWidth,
    right: (column + 1) * brickWidth,
    top: row * brickHeight,
    bottom: (row + 1) * brickHeight,
  };
}

export function keepPaddleOnBoard(paddle: number): number {
  return Math.min(Math.max(paddle, paddleWidth / 2), boardWidth - paddleWidth / 2);
}

export function paddleBox(paddle: number): Box {
  return {
    left: paddle - paddleWidth / 2,
    right: paddle + paddleWidth / 2,
    top: paddleY - paddleHeight / 2,
    bottom: paddleY + paddleHeight / 2,
  };
}

export function servedBall(paddle: number): Vector {
  return { x: paddle, y: paddleBox(paddle).top - ballRadius };
}
