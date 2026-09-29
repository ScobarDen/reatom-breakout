import "./logger.ts";
import { showFrameRate } from "@/common/frame-rate";
import { advance } from "@/modules/breakout";

import { type MatchKeyboard, matchKeyboard } from "./keyboard.vm.ts";

export interface ShellOptions {
  readonly mount: (root: Element) => void;
  readonly isMatchShown?: () => boolean;
}

function listenToKeyboard(keyboard: MatchKeyboard): void {
  keyboard.letGoOffMatch();
  globalThis.addEventListener("keydown", (event) => {
    if (keyboard.press(event) === "claimed") {
      event.preventDefault();
    }
  });
  globalThis.addEventListener("keyup", (event) => {
    keyboard.release(event.code);
  });
  globalThis.addEventListener("blur", keyboard.letGo);
}

function runFrames(): void {
  const countFrame = import.meta.env.MODE === "development" ? showFrameRate() : undefined;

  function tick(elapsedMs: number, nowMs: number): void {
    advance(elapsedMs);
    countFrame?.(elapsedMs);
    requestAnimationFrame((nextMs) => {
      tick(nextMs - nowMs, nextMs);
    });
  }

  requestAnimationFrame((firstMs) => {
    tick(0, firstMs);
  });
}

export function startShell({ mount, isMatchShown }: ShellOptions): void {
  const root = document.querySelector("#root");

  if (!root) {
    throw new Error("The shell needs a #root element");
  }

  mount(root);
  listenToKeyboard(matchKeyboard(isMatchShown));
  runFrames();
}
