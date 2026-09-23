import { type Atom, type Computed, action, atom } from "@reatom/core";

import { type Match, columns, openingMatch, rows, step } from "./domain/index.ts";

type Frame = Parameters<typeof step>[1];
type MatchEvent = Frame["events"][number];

const maxElapsedMs = 100;

let match = openingMatch();
let pending: MatchEvent[] = [];

const ballAtom = atom(match.ball, "ball");
const paddleAtom = atom(match.paddle, "paddle");
const scoreAtom = atom(match.score, "score");
const livesAtom = atom(match.lives, "lives");
const situationAtom = atom(match.situation, "situation");
const brickAtoms = Array.from({ length: columns }, (_cells, column) =>
  Array.from({ length: rows }, (_cell, row) =>
    atom(match.bricks[column][row], `brick.${column}.${row}`),
  ),
);

export const ball: Computed<Match["ball"]> = ballAtom;
export const paddle: Computed<number> = paddleAtom;
export const score: Computed<number> = scoreAtom;
export const lives: Computed<number> = livesAtom;
export const situation: Computed<Match["situation"]> = situationAtom;

export function brickAt(column: number, row: number): Computed<boolean> {
  return brickAtoms[column][row];
}

export const paddleDirection = atom<Frame["direction"]>("none", "paddleDirection");

export const launch = action(() => {
  pending.push("launch");
}, "launch");
export const pause = action(() => {
  pending.push("pause");
}, "pause");
export const resume = action(() => {
  pending.push("resume");
}, "resume");
export const newMatch = action(() => {
  pending.push("new-match");
}, "newMatch");

function show<State>(target: Atom<State>, value: State): void {
  if (!Object.is(target(), value)) {
    target.set(value);
  }
}

function publish(next: Match): void {
  const shown = ballAtom();

  if (shown.x !== next.ball.x || shown.y !== next.ball.y) {
    ballAtom.set(next.ball);
  }
  show(paddleAtom, next.paddle);
  show(scoreAtom, next.score);
  show(livesAtom, next.lives);
  show(situationAtom, next.situation);
  for (const [column, cells] of brickAtoms.entries()) {
    for (const [row, brick] of cells.entries()) {
      show(brick, next.bricks[column][row]);
    }
  }
}

export function advance(elapsedMs: number): void {
  const events = pending;

  pending = [];
  match = step(match, {
    direction: paddleDirection(),
    events,
    elapsedMs: Math.min(elapsedMs, maxElapsedMs),
  });
  publish(match);
}
