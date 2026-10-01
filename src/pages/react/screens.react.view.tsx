/** @jsxRuntime automatic */
/** @jsxImportSource react */
import { reatomComponent } from "@reatom/react";

import { type Screen, type ScreenNavigation, screenLabels, screens } from "@/modules/screens";

import { BreakoutScreen } from "./breakout.react.view.tsx";

const ScreenTabs = reatomComponent(
  ({ navigation }: { navigation: ScreenNavigation }) => (
    <nav className="screen-tabs">
      {screens.map((screen) => (
        <a
          key={screen}
          className="screen-tab"
          href={navigation.href(screen)}
          aria-current={navigation.screen() === screen ? "page" : undefined}
        >
          {screenLabels[screen]}
        </a>
      ))}
    </nav>
  ),
  "ScreenTabs",
);

function ScreenStub({ screen }: { screen: Screen }) {
  return <p>{`${screenLabels[screen]} — coming soon`}</p>;
}

export const ScreensLayout = reatomComponent(({ navigation }: { navigation: ScreenNavigation }) => {
  const shown = navigation.screen();

  return (
    <div className="screens">
      <ScreenTabs navigation={navigation} />
      <section hidden={shown !== "match"}>
        <BreakoutScreen />
      </section>
      <section hidden={shown !== "player"}>
        <ScreenStub screen="player" />
      </section>
      <section hidden={shown !== "results"}>
        <ScreenStub screen="results" />
      </section>
    </div>
  );
}, "ScreensLayout");
