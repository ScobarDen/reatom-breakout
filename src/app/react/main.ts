import "../styles/breakout.css";
import { createElement } from "react";
import { createRoot } from "react-dom/client";

import { screenNavigation } from "@/modules/screens";
import { ScreensLayout } from "@/pages/react";

import { startShell } from "../shell/shell.ts";

const navigation = screenNavigation();

startShell({
  mount(root) {
    createRoot(root).render(createElement(ScreensLayout, { navigation }));
  },
  isMatchShown: () => navigation.screen() === "match",
});
