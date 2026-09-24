import { type Computed, action, atom, computed, reatomEnum } from "@reatom/core";

import { columns, rows } from "../breakout.config.ts";
import { type Match, type Situation, openingMatch } from "../model/match.model.ts";
import { type MatchEvent, type PaddleDirection, step } from "../model/step.model.ts";

const maxElapsedMs = 100;

const match = atom(openingMatch, "_match");
const pendingEvents = atom<readonly MatchEvent[]>([], "_pendingEvents");

function samePoint(left: Match["ball"], right: Match["ball"]): boolean {
  return left.x === right.x && left.y === right.y;
}

export const ball: Computed<Match["ball"]> = computed((shown?: Match["ball"]) => {
  const next = match().ball;

  return shown !== undefined && samePoint(shown, next) ? shown : next;
}, "ball");
export const paddle: Computed<number> = computed(() => match().paddle, "paddle");
export const score: Computed<number> = computed(() => match().score, "score");
export const lives: Computed<number> = computed(() => match().lives, "lives");
export const situation: Computed<Situation> = computed(() => match().situation, "situation");

const brickCells = Array.from({ length: columns }, (_cells, column) =>
  Array.from({ length: rows }, (_cell, row) =>
    computed(() => match().bricks[column][row], `brick.${column}.${row}`),
  ),
);

export function brickAt(column: number, row: number): Computed<boolean> {
  return brickCells[column][row];
}

const directions = ["none", "left", "right"] as const satisfies readonly PaddleDirection[];

export const paddleSteering = reatomEnum(directions, "paddleDirection");
export const paddleDirection: Computed<PaddleDirection> = paddleSteering;

function queue(event: MatchEvent): void {
  pendingEvents.set((events) => [...events, event]);
}

export const launch = action(() => {
  queue("launch");
}, "launch");
export const pause = action(() => {
  queue("pause");
}, "pause");
export const resume = action(() => {
  queue("resume");
}, "resume");
export const newMatch = action(() => {
  queue("new-match");
}, "newMatch");

export function advance(elapsedMs: number): void {
  const events = pendingEvents();

  pendingEvents.set([]);
  match.set(
    step(match(), {
      direction: paddleDirection(),
      events,
      elapsedMs: Math.min(elapsedMs, maxElapsedMs),
    }),
  );
}
