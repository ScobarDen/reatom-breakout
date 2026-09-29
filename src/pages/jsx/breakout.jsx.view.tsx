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

function BrickRect({ brick: { box, row, standing } }: { brick: Brick }) {
  return (
    <svg:rect
      class="brick"
      x={box.left}
      y={box.top}
      width={box.right - box.left}
      height={box.bottom - box.top}
      fill={`hsl(${row * 24} 70% 55%)`}
      visibility={() => (standing() ? "visible" : "hidden")}
    />
  );
}

function Board() {
  return (
    <svg:svg
      class="board"
      viewBox={`0 0 ${board.width} ${board.height}`}
      width={board.width * scale}
      height={board.height * scale}
    >
      {bricks.map((brick) => (
        <BrickRect brick={brick} />
      ))}
      <svg:rect
        class="paddle"
        x={() => paddle().left}
        y={() => paddle().top}
        width={() => paddle().right - paddle().left}
        height={() => paddle().bottom - paddle().top}
      />
      <svg:circle class="ball" cx={() => ball().x} cy={() => ball().y} r={() => ball().radius} />
    </svg:svg>
  );
}

export function BreakoutScreen() {
  return (
    <main class="match">
      <div class="hud">
        <span>{() => `Score ${score()}`}</span>
        <span>{() => `Lives ${lives()}`}</span>
      </div>
      <Board />
      <div>{() => situationLabel()}</div>
      <div class="hint">{controlsHint}</div>
    </main>
  );
}
