import "../styles/breakout.css";
import { h as element, mount } from "@reatom/jsx";

import { screenNavigation } from "@/modules/screens";
import { ScreensShell } from "@/pages/jsx";

import { startShell } from "../shell/shell.ts";

const navigation = screenNavigation();

startShell({
  mount(root) {
    mount(root, element(ScreensShell, { navigation }));
  },
  isMatchShown: () => navigation.screen() === "match",
});
