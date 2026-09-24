import { type Computed, action, atom, computed, reatomEnum } from "@reatom/core";

import { ballRadius } from "../breakout.config.ts";
import { type Box, brickBox, paddleBox } from "../model/board.model.ts";
import { type Situation, type Vector, openingMatch } from "../model/match.model.ts";
import { type MatchEvent, type PaddleDirection, step } from "../model/step.model.ts";

const maxElapsedMs = 100;

export interface Ball extends Vector {
  readonly radius: number;
}

export interface Brick {
  readonly box: Box;
  readonly row: number;
  readonly standing: Computed<boolean>;
}

export const match = atom(openingMatch, "_match");
const pendingEvents = atom<readonly MatchEvent[]>([], "_pendingEvents");

export const ball: Computed<Ball> = computed((shown?: Ball) => {
  const { x, y } = match().ball;

  return shown?.x === x && shown.y === y ? shown : { x, y, radius: ballRadius };
}, "ball");
export const paddle: Computed<Box> = computed((shown?: Box) => {
  const next = paddleBox(match().paddle);

  return shown?.left === next.left ? shown : next;
}, "paddle");
export const score: Computed<number> = computed(() => match().score, "score");
export const lives: Computed<number> = computed(() => match().lives, "lives");
export const situation: Computed<Situation> = computed(() => match().situation, "situation");

export const bricks: readonly Brick[] = openingMatch().bricks.flatMap((cells, column) =>
  cells.flatMap((laid, row) =>
    laid
      ? [
          {
            box: brickBox(column, row),
            row,
            standing: computed(() => match().bricks[column][row], `brick.${column}.${row}`),
          },
        ]
      : [],
  ),
);

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
