import { type Unsubscribe, computed } from "@reatom/core";

import { type MatchKey, matchControls } from "@/modules/breakout";

export interface PressedKey {
  readonly code: string;
  readonly repeat: boolean;
}

export type KeyOutcome = "claimed" | "ignored";

export interface MatchKeyboard {
  press: (key: PressedKey) => KeyOutcome;
  release: (code: string) => void;
  letGo: () => void;
  letGoOffMatch: () => Unsubscribe;
}

const matchKeys: Partial<Record<string, MatchKey>> = {
  ArrowLeft: "left",
  KeyA: "a",
  ArrowRight: "right",
  KeyD: "d",
  Space: "space",
  KeyP: "p",
  KeyR: "r",
  KeyN: "n",
};

export function matchKeyboard(isMatchShown: () => boolean = () => true): MatchKeyboard {
  const controls = matchControls();

  return {
    press({ code, repeat }) {
      const key = matchKeys[code];

      if (key === undefined || !isMatchShown()) {
        return "ignored";
      }

      return controls.press(key, repeat) ? "claimed" : "ignored";
    },
    release(code) {
      const key = matchKeys[code];

      if (key !== undefined) {
        controls.release(key);
      }
    },
    letGo() {
      controls.releaseAll();
    },
    letGoOffMatch() {
      return computed(() => isMatchShown(), "isMatchShown").subscribe((isShown) => {
        if (!isShown) {
          controls.releaseAll();
        }
      });
    },
  };
}
