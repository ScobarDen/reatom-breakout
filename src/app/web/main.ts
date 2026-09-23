import "../logger.ts";
import { h as element, mount } from "@reatom/jsx";

import { showFrameRate } from "@/common/frame-rate";
import { advance } from "@/modules/breakout";
import { BreakoutScreen } from "@/pages/web";

const root = document.querySelector("#root");

if (!root) {
  throw new Error("The web host needs a #root element");
}

mount(root, element(BreakoutScreen, {}));

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
