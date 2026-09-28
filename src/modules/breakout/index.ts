export { board } from "./model/board.model.ts";
export { difficultyRules, ruleBounds, rulesWithinBounds } from "./model/rules.model.ts";
export {
  type Brick,
  advance,
  ball,
  bricks,
  lives,
  paddle,
  paddleDirection,
  pause as pauseMatch,
  score,
  situation,
} from "./vm/breakout.vm.ts";
export {
  type MatchControls,
  type MatchKey,
  controlsHint,
  matchControls,
  situationLabel,
} from "./vm/controls.vm.ts";
export type { Box } from "./model/board.model.ts";
export type { Situation } from "./model/match.model.ts";
export type { Rules } from "./model/rules.model.ts";
export type { PaddleDirection } from "./model/step.model.ts";
