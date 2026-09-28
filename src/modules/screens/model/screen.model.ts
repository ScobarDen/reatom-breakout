export const screens = ["match", "player", "results"] as const;

export type Screen = (typeof screens)[number];

export function isScreen(value: string | undefined): value is Screen {
  return screens.some((screen) => screen === value);
}
