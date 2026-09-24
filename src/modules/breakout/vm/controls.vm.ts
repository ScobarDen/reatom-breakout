import type { Situation } from "../model/match.model.ts";
import type { PaddleDirection } from "../model/step.model.ts";
import { launch, newMatch, paddleDirection, pause, resume, situation } from "./breakout.vm.ts";

type HeldDirection = Exclude<PaddleDirection, "none">;

export type MatchKey = "left" | "a" | "right" | "d" | "space" | "p" | "r" | "n";

export interface MatchControls {
  press: (key: MatchKey, repeat: boolean) => boolean;
  release: (key: MatchKey) => void;
  releaseAll: () => void;
}

const directionKeys = new Map<MatchKey, HeldDirection>([
  ["left", "left"],
  ["a", "left"],
  ["right", "right"],
  ["d", "right"],
]);

const eventKeys = new Map<MatchKey, () => void>([
  ["space", launch],
  ["p", pause],
  ["r", resume],
  ["n", newMatch],
]);

const situationLabels: Record<Situation, string> = {
  serve: "Serve: Space to launch",
  flight: "",
  "paused-serve": "Paused: R to resume",
  "paused-flight": "Paused: R to resume",
  won: "You won! N for a new match",
  lost: "You lost. N for a new match",
};

export const controlsHint = "← → or A D move · Space launch · P pause · R resume · N new match";

export function situationLabel(): string {
  return situationLabels[situation()];
}

export function matchControls(): MatchControls {
  const heldKeys = new Set<MatchKey>();

  function holdLatestDirection(): void {
    const latest = [...heldKeys].at(-1);

    paddleDirection.set(latest === undefined ? "none" : (directionKeys.get(latest) ?? "none"));
  }

  return {
    press(key, repeat) {
      if (directionKeys.has(key)) {
        heldKeys.delete(key);
        heldKeys.add(key);
        holdLatestDirection();

        return true;
      }

      const fire = eventKeys.get(key);

      if (repeat || fire === undefined) {
        return false;
      }
      fire();

      return true;
    },
    release(key) {
      if (heldKeys.delete(key)) {
        holdLatestDirection();
      }
    },
    releaseAll() {
      heldKeys.clear();
      holdLatestDirection();
    },
  };
}
