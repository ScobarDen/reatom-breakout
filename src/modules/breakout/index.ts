export {
  ballRadius,
  boardHeight,
  boardWidth,
  columns,
  paddleHeight,
  paddleWidth,
  paddleY,
  rows,
} from "./breakout.config.ts";
export {
  advance,
  ball,
  brickAt,
  launch,
  lives,
  newMatch,
  paddle,
  paddleDirection,
  pause,
  resume,
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
export type { Situation } from "./model/match.model.ts";
export type { PaddleDirection } from "./model/step.model.ts";
