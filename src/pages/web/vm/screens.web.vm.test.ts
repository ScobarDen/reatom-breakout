import { context, noop, sleep, urlAtom } from "@reatom/core";

import { screenHref, webScreenPort } from "./screens.web.vm.ts";

function visit(href: string): void {
  urlAtom.sync.set(() => noop);
  urlAtom.syncFromSource(new URL(href));
}

beforeEach(() => {
  context.reset();
});

describe("the screen in the address", () => {
  test("opens the screen named in the search", () => {
    visit("https://example.test/reatom-breakout/?screen=results");

    expect(webScreenPort().screen()).toBe("results");
  });

  test.each(["https://example.test/reatom-breakout/", "https://example.test/?screen=boss"])(
    "opens the match for %s",
    (href) => {
      visit(href);

      expect(webScreenPort().screen()).toBe("match");
    },
  );

  test("keeps the pathname and drops the search for the match", async () => {
    visit("https://example.test/reatom-breakout/?screen=player");
    const port = webScreenPort();

    port.open("results");
    await sleep(0);

    expect(urlAtom().href).toBe("https://example.test/reatom-breakout/?screen=results");

    port.open("match");
    await sleep(0);

    expect(urlAtom().href).toBe("https://example.test/reatom-breakout/");
  });

  test("links each screen on the same pathname", () => {
    visit("https://example.test/reatom-breakout/?screen=results");

    expect([screenHref("match"), screenHref("player")]).toEqual([
      "/reatom-breakout/",
      "/reatom-breakout/?screen=player",
    ]);
  });
});
