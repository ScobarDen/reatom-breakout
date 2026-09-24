import { type MatchKey, matchControls } from "@/modules/breakout";

export interface PressedKey {
  readonly name: string;
  readonly repeat: boolean;
}

export interface BreakoutTerminalInput {
  press: (key: PressedKey) => void;
  release: (name: string) => void;
  letGoSilentKeys: () => void;
}

const firstRepeatDelayMs = 600;
const repeatGapMs = 100;

const hostKeys = new Map<string, MatchKey>([
  ["left", "left"],
  ["a", "a"],
  ["right", "right"],
  ["d", "d"],
  ["space", "space"],
  ["p", "p"],
  ["r", "r"],
  ["n", "n"],
]);

export function breakoutTerminalInput(now: () => number): BreakoutTerminalInput {
  const controls = matchControls();
  const releaseDeadlines = new Map<MatchKey, number>();
  let reportsRelease = false;

  return {
    press({ name, repeat }) {
      const key = hostKeys.get(name);

      if (key === undefined) {
        return;
      }

      const waitMs = releaseDeadlines.has(key) ? repeatGapMs : firstRepeatDelayMs;

      releaseDeadlines.set(key, now() + waitMs);
      controls.press(key, repeat);
    },
    release(name) {
      const key = hostKeys.get(name);

      reportsRelease = true;
      if (key !== undefined) {
        releaseDeadlines.delete(key);
        controls.release(key);
      }
    },
    letGoSilentKeys() {
      if (reportsRelease) {
        return;
      }

      const nowMs = now();

      for (const [key, releaseAtMs] of releaseDeadlines) {
        if (releaseAtMs <= nowMs) {
          releaseDeadlines.delete(key);
          controls.release(key);
        }
      }
    },
  };
}
