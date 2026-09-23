import {
  type PaddleDirection,
  type Situation,
  ball,
  ballRadius,
  boardHeight,
  boardWidth,
  brickAt,
  columns,
  launch,
  lives,
  newMatch,
  paddle,
  paddleDirection,
  paddleHeight,
  paddleWidth,
  paddleY,
  pause,
  resume,
  rows,
  score,
  situation,
} from "@/modules/breakout";

type HeldDirection = Exclude<PaddleDirection, "none">;

const scale = 2;
const brickWidth = boardWidth / columns;
const brickHeight = boardHeight / rows;

const situationLabels: Record<Situation, string> = {
  serve: "Serve: Space to launch",
  flight: "",
  "paused-serve": "Paused: R to resume",
  "paused-flight": "Paused: R to resume",
  won: "You won! N for a new match",
  lost: "You lost. N for a new match",
};

const directionKeys: Partial<Record<string, HeldDirection>> = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};

const eventKeys: Partial<Record<string, () => void>> = {
  Space: launch,
  KeyP: pause,
  KeyR: resume,
  KeyN: newMatch,
};

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
  const heldKeys = new Set<string>();

  function holdLatestDirection(): void {
    const latest = [...heldKeys].at(-1);

    paddleDirection.set(latest === undefined ? "none" : (directionKeys[latest] ?? "none"));
  }

  function press(event: KeyboardEvent): void {
    const fire = event.repeat ? undefined : eventKeys[event.code];

    if (directionKeys[event.code]) {
      event.preventDefault();
      heldKeys.delete(event.code);
      heldKeys.add(event.code);
      holdLatestDirection();
    } else if (fire) {
      event.preventDefault();
      fire();
    }
  }

  function release(event: KeyboardEvent): void {
    if (heldKeys.delete(event.code)) {
      holdLatestDirection();
    }
  }

  function letGo(): void {
    heldKeys.clear();
    holdLatestDirection();
  }

  return (
    <main
      tabindex={0}
      ref={(element) => {
        element.focus();
      }}
      on:keydown={press}
      on:keyup={release}
      on:blur={letGo}
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
      <div>{() => situationLabels[situation()]}</div>
      <div style={{ color: "#777" }}>
        ← → or A D move · Space launch · P pause · R resume · N new match
      </div>
    </main>
  );
}
