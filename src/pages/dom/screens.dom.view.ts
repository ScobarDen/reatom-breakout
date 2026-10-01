import { effect } from "@reatom/core";

import { type Screen, type ScreenNavigation, screenLabels, screens } from "@/modules/screens";

import { breakoutScreen } from "./breakout.dom.view.ts";

function screenTab(navigation: ScreenNavigation, screen: Screen): HTMLAnchorElement {
  const tab = document.createElement("a");

  tab.className = "screen-tab";
  tab.textContent = screenLabels[screen];
  effect(() => {
    tab.setAttribute("href", navigation.href(screen));
  }, `${screen}.tab.href`);
  effect(() => {
    if (navigation.screen() === screen) {
      tab.setAttribute("aria-current", "page");
    } else {
      tab.removeAttribute("aria-current");
    }
  }, `${screen}.tab.current`);

  return tab;
}

function screenStub(screen: Screen): HTMLElement {
  const stub = document.createElement("p");

  stub.textContent = `${screenLabels[screen]} — coming soon`;

  return stub;
}

function screenSection(navigation: ScreenNavigation, screen: Screen, content: Node): HTMLElement {
  const section = document.createElement("section");

  section.append(content);
  effect(() => {
    section.hidden = navigation.screen() !== screen;
  }, `${screen}.section.hidden`);

  return section;
}

export function screensLayout(navigation: ScreenNavigation): HTMLElement {
  const layout = document.createElement("div");
  const tabs = document.createElement("nav");

  tabs.className = "screen-tabs";
  tabs.append(...screens.map((screen) => screenTab(navigation, screen)));
  layout.className = "screens";
  layout.append(
    tabs,
    screenSection(navigation, "match", breakoutScreen()),
    screenSection(navigation, "player", screenStub("player")),
    screenSection(navigation, "results", screenStub("results")),
  );

  return layout;
}
