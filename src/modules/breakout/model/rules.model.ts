import { launchSlope } from "../breakout.config.ts";
import type { Vector } from "./match.model.ts";

export interface Rules {
  readonly paddleSpeed: number;
  readonly ballSpeed: number;
  readonly lives: number;
}

interface Bound {
  readonly min: number;
  readonly max: number;
}

const normal: Rules = { paddleSpeed: 0.4, ballSpeed: 0.3, lives: 3 };

export const difficultyRules = {
  easy: { paddleSpeed: 0.5, ballSpeed: 0.22, lives: 5 },
  normal,
  hard: { paddleSpeed: 0.35, ballSpeed: 0.42, lives: 2 },
} as const satisfies Record<string, Rules>;

function speedBound(normalSpeed: number): Bound {
  return { min: normalSpeed / 2, max: normalSpeed * 2 };
}

export const ruleBounds: Readonly<Record<keyof Rules, Bound>> = {
  paddleSpeed: speedBound(normal.paddleSpeed),
  ballSpeed: speedBound(normal.ballSpeed),
  lives: { min: 1, max: 9 },
};

export function launchVelocity(ballSpeed: number): Vector {
  const length = Math.hypot(launchSlope, 1);

  return { x: (ballSpeed * launchSlope) / length, y: -ballSpeed / length };
}

function within(value: number, { min, max }: Bound): boolean {
  return value >= min && value <= max;
}

export function rulesWithinBounds(rules: Rules): boolean {
  return (
    within(rules.paddleSpeed, ruleBounds.paddleSpeed) &&
    within(rules.ballSpeed, ruleBounds.ballSpeed) &&
    Number.isInteger(rules.lives) &&
    within(rules.lives, ruleBounds.lives)
  );
}
