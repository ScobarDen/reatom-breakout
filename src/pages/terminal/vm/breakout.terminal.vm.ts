import {
  type PaddleDirection,
  type Situation,
  launch,
  newMatch,
  paddleDirection,
  pause,
  resume,
  situation,
} from "@/modules/breakout";

type HeldDirection = Exclude<PaddleDirection, "none">;

export interface BreakoutTerminalInput {
  press: (name: string, isRepeat: boolean) => void;
  release: (name: string) => void;
  letGoSilentKeys: () => void;
}

const firstRepeatDelayMs = 600;
const repeatGapMs = 100;

const situationLabels: Record<Situation, string> = {
  serve: "Serve: Space to launch",
  flight: "",
  "paused-serve": "Paused: R to resume",
  "paused-flight": "Paused: R to resume",
  won: "You won! N for a new match",
  lost: "You lost. N for a new match",
};

const directionKeys = new Map<string, HeldDirection>([
  ["left", "left"],
  ["a", "left"],
  ["right", "right"],
  ["d", "right"],
]);

const eventKeys = new Map<string, () => void>([
  ["space", launch],
  ["p", pause],
  ["r", resume],
  ["n", newMatch],
]);

export function situationLabel(): string {
  return situationLabels[situation()];
}

export function breakoutTerminalInput(now: () => number): BreakoutTerminalInput {
  const heldKeys = new Map<string, number>();
  let reportsRelease = false;

  function holdLatestDirection(): void {
    const latest = [...heldKeys.keys()].at(-1);

    paddleDirection.set(latest === undefined ? "none" : (directionKeys.get(latest) ?? "none"));
  }

  return {
    press(name, isRepeat) {
      const fire = isRepeat ? undefined : eventKeys.get(name);

      if (directionKeys.has(name)) {
        const waitMs = heldKeys.has(name) ? repeatGapMs : firstRepeatDelayMs;

        heldKeys.delete(name);
        heldKeys.set(name, now() + waitMs);
        holdLatestDirection();
      } else if (fire) {
        fire();
      }
    },
    release(name) {
      reportsRelease = true;
      if (heldKeys.delete(name)) {
        holdLatestDirection();
      }
    },
    letGoSilentKeys() {
      if (reportsRelease) {
        return;
      }

      const nowMs = now();
      const silent = [...heldKeys].filter(([, releaseAtMs]) => releaseAtMs <= nowMs);

      if (silent.length === 0) {
        return;
      }
      for (const [name] of silent) {
        heldKeys.delete(name);
      }
      holdLatestDirection();
    },
  };
}
