import { type Atom, type Computed, action, atom, reatomEnum } from "@reatom/core";

import { columns, rows } from "../breakout.config.ts";
import { type Match, type Situation, openingMatch } from "../model/match.model.ts";
import { type MatchEvent, type PaddleDirection, step } from "../model/step.model.ts";

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
export const situation: Computed<Situation> = situationAtom;

export function brickAt(column: number, row: number): Computed<boolean> {
  return brickAtoms[column][row];
}

const directions = ["none", "left", "right"] as const satisfies readonly PaddleDirection[];

export const paddleSteering = reatomEnum(directions, "paddleDirection");
export const paddleDirection: Computed<PaddleDirection> = paddleSteering;

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

function samePoint(left: Match["ball"], right: Match["ball"]): boolean {
  return left.x === right.x && left.y === right.y;
}

function show<State>(
  target: Atom<State>,
  value: State,
  same: (left: State, right: State) => boolean = Object.is,
): void {
  if (!same(target(), value)) {
    target.set(value);
  }
}

function publish(next: Match): void {
  show(ballAtom, next.ball, samePoint);
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
