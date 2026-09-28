import "../styles/breakout.css";
import { h as element, mount } from "@reatom/jsx";

import { screenNavigation } from "@/modules/screens";
import { ScreensLayout } from "@/pages/jsx";

import { startShell } from "../shell/shell.ts";

const navigation = screenNavigation();

startShell({
  mount(root) {
    mount(root, element(ScreensLayout, { navigation }));
  },
  isMatchShown: () => navigation.screen() === "match",
});
