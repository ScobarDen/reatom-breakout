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

import { breakoutWebInput } from "./vm/breakout.web.vm.ts";

const scale = 2;

function BrickRect({ brick: { box, row, standing } }: { brick: Brick }) {
  return (
    <svg:rect
      x={box.left}
      y={box.top}
      width={box.right - box.left}
      height={box.bottom - box.top}
      fill={`hsl(${row * 24} 70% 55%)`}
      stroke="#111"
      visibility={() => (standing() ? "visible" : "hidden")}
    />
  );
}

function Board() {
  return (
    <svg:svg
      viewBox={`0 0 ${board.width} ${board.height}`}
      width={board.width * scale}
      height={board.height * scale}
      style={{ background: "#111", display: "block" }}
    >
      {bricks.map((brick) => (
        <BrickRect brick={brick} />
      ))}
      <svg:rect
        x={() => paddle().left}
        y={() => paddle().top}
        width={() => paddle().right - paddle().left}
        height={() => paddle().bottom - paddle().top}
        fill="#eee"
      />
      <svg:circle cx={() => ball().x} cy={() => ball().y} r={() => ball().radius} fill="#fff" />
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
