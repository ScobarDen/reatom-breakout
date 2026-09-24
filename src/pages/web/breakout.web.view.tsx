import {
  ball,
  ballRadius,
  boardHeight,
  boardWidth,
  brickAt,
  columns,
  controlsHint,
  lives,
  paddle,
  paddleHeight,
  paddleWidth,
  paddleY,
  rows,
  score,
  situationLabel,
} from "@/modules/breakout";

import { breakoutWebInput } from "./vm/breakout.web.vm.ts";

const scale = 2;
const brickWidth = boardWidth / columns;
const brickHeight = boardHeight / rows;

function Brick({ column, row }: { column: number; row: number }) {
  const standing = brickAt(column, row);

  return (
    <svg:rect
      x={column * brickWidth}
      y={row * brickHeight}
      width={brickWidth}
      height={brickHeight}
      fill={`hsl(${row * 24} 70% 55%)`}
      stroke="#111"
      visibility={() => (standing() ? "visible" : "hidden")}
    />
  );
}

function Board() {
  return (
    <svg:svg
      viewBox={`0 0 ${boardWidth} ${boardHeight}`}
      width={boardWidth * scale}
      height={boardHeight * scale}
      style={{ background: "#111", display: "block" }}
    >
      {Array.from({ length: columns }, (_cells, column) =>
        Array.from({ length: rows }, (_cell, row) => <Brick column={column} row={row} />),
      )}
      <svg:rect
        x={() => paddle() - paddleWidth / 2}
        y={paddleY - paddleHeight / 2}
        width={paddleWidth}
        height={paddleHeight}
        fill="#eee"
      />
      <svg:circle cx={() => ball().x} cy={() => ball().y} r={ballRadius} fill="#fff" />
    </svg:svg>
  );
}

export function BreakoutScreen() {
  const input = breakoutWebInput();

  function press(event: KeyboardEvent): void {
    if (input.press(event) === "claimed") {
      event.preventDefault();
    }
  }

  function release(event: KeyboardEvent): void {
    input.release(event.code);
  }

  return (
    <main
      tabindex={0}
      ref={(element) => {
        element.focus();
      }}
      on:keydown={press}
      on:keyup={release}
      on:blur={input.letGo}
      style={{
        "min-height": "100vh",
        display: "grid",
        "place-content": "center",
        gap: "8px",
        background: "#000",
        color: "#eee",
        font: "16px monospace",
        outline: "none",
      }}
    >
      <div style={{ display: "flex", "justify-content": "space-between" }}>
        <span>{() => `Score ${score()}`}</span>
        <span>{() => `Lives ${lives()}`}</span>
      </div>
      <Board />
      <div>{() => situationLabel()}</div>
      <div style={{ color: "#777" }}>{controlsHint}</div>
    </main>
  );
}
