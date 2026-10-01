import "../styles/breakout.css";
import { screenNavigation } from "@/modules/screens";
import { screensLayout } from "@/pages/dom";

import { startShell } from "../shell/shell.ts";

const navigation = screenNavigation();

startShell({
  mount(root) {
    root.append(screensLayout(navigation));
  },
  isMatchShown: () => navigation.screen() === "match",
});
