import { type Screen, type ScreenPort, screenLabels, screens } from "@/modules/screens";

import { BreakoutScreen } from "./breakout.web.view.tsx";
import { screenHref } from "./vm/screens.web.vm.ts";

function ScreenTabs({ navigation }: { navigation: ScreenPort }) {
  return (
    <nav style={{ display: "flex", gap: "16px" }}>
      {screens.map((screen) => (
        <a
          href={() => screenHref(screen)}
          aria-current={() => (navigation.screen() === screen ? "page" : undefined)}
          style:color={() => (navigation.screen() === screen ? "#fff" : "#777")}
          style:text-decoration="none"
        >
          {screenLabels[screen]}
        </a>
      ))}
    </nav>
  );
}

function ScreenStub({ screen }: { screen: Screen }) {
  return <p>{`${screenLabels[screen]} — coming soon`}</p>;
}

export function ScreensShell({ navigation }: { navigation: ScreenPort }) {
  function hiddenUnless(screen: Screen): () => boolean {
    return () => navigation.screen() !== screen;
  }

  return (
    <div
      style={{
        "min-height": "100vh",
        display: "grid",
        "place-content": "center",
        gap: "16px",
        background: "#000",
        color: "#eee",
        font: "16px monospace",
      }}
    >
      <ScreenTabs navigation={navigation} />
      <section hidden={hiddenUnless("match")}>
        <BreakoutScreen navigation={navigation} />
      </section>
      <section hidden={hiddenUnless("player")}>
        <ScreenStub screen="player" />
      </section>
      <section hidden={hiddenUnless("results")}>
        <ScreenStub screen="results" />
      </section>
    </div>
  );
}
