import { type Screen, type ScreenNavigation, screenLabels, screens } from "@/modules/screens";

import { BreakoutScreen } from "./breakout.jsx.view.tsx";

function ScreenTabs({ navigation }: { navigation: ScreenNavigation }) {
  return (
    <nav class="screen-tabs">
      {screens.map((screen) => (
        <a
          class="screen-tab"
          href={() => navigation.href(screen)}
          aria-current={() => (navigation.screen() === screen ? "page" : undefined)}
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

export function ScreensShell({ navigation }: { navigation: ScreenNavigation }) {
  function hiddenUnless(screen: Screen): () => boolean {
    return () => navigation.screen() !== screen;
  }

  return (
    <div class="screens">
      <ScreenTabs navigation={navigation} />
      <section hidden={hiddenUnless("match")}>
        <BreakoutScreen />
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
