import { noop, urlAtom } from "@reatom/core";

import { advance, bricks, matchControls } from "@/modules/breakout";

export function visit(href: string): void {
  urlAtom.sync.set(() => noop);
  urlAtom.syncFromSource(new URL(href));
}

export function playUntilBrickBreaks(): void {
  const controls = matchControls();

  controls.press("space", false);
  controls.press("right", false);
  for (let frame = 0; frame < 10_000 && bricks.every(({ standing }) => standing()); frame++) {
    advance(16);
  }
}
