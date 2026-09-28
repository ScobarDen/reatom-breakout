import { type Rules, difficultyRules, ruleBounds, rulesWithinBounds } from "./rules.model.ts";

const normal: Rules = { paddleSpeed: 0.4, ballSpeed: 0.3, lives: 3 };

describe("difficulty rules", () => {
  test("normal plays at the classic speeds with three lives", () => {
    expect(difficultyRules.normal).toEqual(normal);
  });

  test("easy is gentler and hard is harsher than normal", () => {
    expect(difficultyRules.easy.ballSpeed).toBeLessThan(normal.ballSpeed);
    expect(difficultyRules.easy.lives).toBeGreaterThan(normal.lives);
    expect(difficultyRules.hard.ballSpeed).toBeGreaterThan(normal.ballSpeed);
    expect(difficultyRules.hard.lives).toBeLessThan(normal.lives);
  });

  test.each(["easy", "normal", "hard"] as const)("%s stays within the bounds", (difficulty) => {
    expect(rulesWithinBounds(difficultyRules[difficulty])).toBe(true);
  });
});

describe("rule bounds", () => {
  test("allow speeds from half to double normal and one to nine lives", () => {
    expect(ruleBounds).toEqual({
      paddleSpeed: { min: 0.2, max: 0.8 },
      ballSpeed: { min: 0.15, max: 0.6 },
      lives: { min: 1, max: 9 },
    });
  });

  test.each<[string, Partial<Rules>]>([
    ["the slowest paddle", { paddleSpeed: 0.2 }],
    ["the fastest paddle", { paddleSpeed: 0.8 }],
    ["the slowest ball", { ballSpeed: 0.15 }],
    ["the fastest ball", { ballSpeed: 0.6 }],
    ["a single life", { lives: 1 }],
    ["nine lives", { lives: 9 }],
  ])("accept %s", (_name, change) => {
    expect(rulesWithinBounds({ ...normal, ...change })).toBe(true);
  });

  test.each<[string, Partial<Rules>]>([
    ["a paddle below half speed", { paddleSpeed: 0.19 }],
    ["a paddle above double speed", { paddleSpeed: 0.81 }],
    ["a ball below half speed", { ballSpeed: 0.14 }],
    ["a ball above double speed", { ballSpeed: 0.61 }],
    ["no lives", { lives: 0 }],
    ["ten lives", { lives: 10 }],
    ["a fraction of a life", { lives: 2.5 }],
    ["a speed that is not a number", { ballSpeed: Number.NaN }],
  ])("reject %s", (_name, change) => {
    expect(rulesWithinBounds({ ...normal, ...change })).toBe(false);
  });
});
