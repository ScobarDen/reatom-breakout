/** @jsxRuntime automatic */
/** @jsxImportSource react */
import { reatomComponent } from "@reatom/react";
import { memo } from "react";

import {
  type Brick,
  ball,
  board,
  bricks,
  controlsHint,
  lives,
  paddle,
  score,
  situationLabel,
} from "@/modules/breakout";

const scale = 2;

const BrickRect = memo(
  reatomComponent(
    ({ brick: { box, row, standing } }: { brick: Brick }) => (
      <rect
        className="brick"
        x={box.left}
        y={box.top}
        width={box.right - box.left}
        height={box.bottom - box.top}
        fill={`hsl(${row * 24} 70% 55%)`}
        visibility={standing() ? "visible" : "hidden"}
      />
    ),
    "BrickRect",
  ),
);

const PaddleRect = reatomComponent(() => {
  const { left, top, right, bottom } = paddle();

  return <rect className="paddle" x={left} y={top} width={right - left} height={bottom - top} />;
}, "PaddleRect");

const BallCircle = reatomComponent(() => {
  const { x, y, radius } = ball();

  return <circle className="ball" cx={x} cy={y} r={radius} />;
}, "BallCircle");

function Board() {
  return (
    <svg
      className="board"
      viewBox={`0 0 ${board.width} ${board.height}`}
      width={board.width * scale}
      height={board.height * scale}
    >
      {bricks.map((brick) => (
        <BrickRect key={brick.standing.name} brick={brick} />
      ))}
      <PaddleRect />
      <BallCircle />
    </svg>
  );
}

const Hud = reatomComponent(
  () => (
    <div className="hud">
      <span>{`Score ${score()}`}</span>
      <span>{`Lives ${lives()}`}</span>
    </div>
  ),
  "Hud",
);

const Situation = reatomComponent(() => <div>{situationLabel()}</div>, "Situation");

export function BreakoutScreen() {
  return (
    <main className="match">
      <Hud />
      <Board />
      <Situation />
      <div className="hint">{controlsHint}</div>
    </main>
  );
}
