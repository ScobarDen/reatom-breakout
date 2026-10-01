// @vitest-environment happy-dom
import { context, noop, sleep, urlAtom } from "@reatom/core";
import { DEBUG, h as element, mount } from "@reatom/jsx";

import { advance, bricks, matchControls } from "@/modules/breakout";
import { type ScreenNavigation, screenNavigation } from "@/modules/screens";
import { screensLayout } from "@/pages/dom";
import { ScreensLayout as JsxScreensLayout } from "@/pages/jsx";

interface View {
  readonly name: string;
  readonly render: (root: Element, navigation: ScreenNavigation) => void;
}

interface Markup {
  readonly reference: string;
  readonly view: string;
}

const views: readonly View[] = [
  {
    name: "DOM",
    render(root, navigation) {
      root.append(screensLayout(navigation));
    },
  },
];

function visit(href: string): void {
  urlAtom.sync.set(() => noop);
  urlAtom.syncFromSource(new URL(href));
}

function renderBesideJsx(view: View): {
  navigation: ScreenNavigation;
  markup: () => Promise<Markup>;
} {
  const navigation = screenNavigation();
  const reference = document.createElement("div");
  const root = document.createElement("div");

  document.body.append(reference, root);
  mount(reference, element(JsxScreensLayout, { navigation }));
  view.render(root, navigation);

  return {
    navigation,
    async markup() {
      await sleep(0);

      return { reference: reference.innerHTML, view: root.innerHTML };
    },
  };
}

function playUntilBrickBreaks(): void {
  const controls = matchControls();

  controls.press("space", false);
  controls.press("right", false);
  for (let frame = 0; frame < 10_000 && bricks.every(({ standing }) => standing()); frame++) {
    advance(16);
  }
}

beforeEach(() => {
  context.reset();
  DEBUG.set(false);
  visit("https://example.test/reatom-breakout/");
  document.body.replaceChildren();
});

describe.each(views)("the $name view", (view) => {
  test("draws the opening match as the jsx view does", async () => {
    const { markup } = renderBesideJsx(view);
    const { reference, view: drawn } = await markup();

    expect(drawn).toContain('class="board"');
    expect(drawn).toBe(reference);
  });

  test("follows a match in play as the jsx view does", async () => {
    const { markup } = renderBesideJsx(view);

    await markup();
    playUntilBrickBreaks();
    const { reference, view: drawn } = await markup();

    expect(drawn).toContain('visibility="hidden"');
    expect(drawn).toBe(reference);
  });

  test("shows the open screen as the jsx view does", async () => {
    const { navigation, markup } = renderBesideJsx(view);

    await markup();
    navigation.open("results");
    const { reference, view: drawn } = await markup();

    expect(drawn).toMatch(/aria-current="page"[^>]*>Results</u);
    expect(drawn).toBe(reference);
  });
});
