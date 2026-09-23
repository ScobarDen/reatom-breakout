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

export interface BreakoutWebInput {
  press: (code: string, isRepeat: boolean) => boolean;
  release: (code: string) => void;
  letGo: () => void;
}

const situationLabels: Record<Situation, string> = {
  serve: "Serve: Space to launch",
  flight: "",
  "paused-serve": "Paused: R to resume",
  "paused-flight": "Paused: R to resume",
  won: "You won! N for a new match",
  lost: "You lost. N for a new match",
};

const directionKeys: Partial<Record<string, HeldDirection>> = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};

const eventKeys: Partial<Record<string, () => void>> = {
  Space: launch,
  KeyP: pause,
  KeyR: resume,
  KeyN: newMatch,
};

export function situationLabel(): string {
  return situationLabels[situation()];
}

export function breakoutWebInput(): BreakoutWebInput {
  const heldKeys = new Set<string>();

  function holdLatestDirection(): void {
    const latest = [...heldKeys].at(-1);

    paddleDirection.set(latest === undefined ? "none" : (directionKeys[latest] ?? "none"));
  }

  return {
    press(code, isRepeat) {
      const fire = isRepeat ? undefined : eventKeys[code];

      if (directionKeys[code]) {
        heldKeys.delete(code);
        heldKeys.add(code);
        holdLatestDirection();

        return true;
      }
      if (fire) {
        fire();

        return true;
      }

      return false;
    },
    release(code) {
      if (heldKeys.delete(code)) {
        holdLatestDirection();
      }
    },
    letGo() {
      heldKeys.clear();
      holdLatestDirection();
    },
  };
}
