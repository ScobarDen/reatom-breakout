import {
  BoxRenderable,
  type CliRenderer,
  FrameBufferRenderable,
  type KeyEvent,
  RGBA,
  TextRenderable,
} from "@opentui/core";

import {
  type PaddleDirection,
  type Situation,
  ball,
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

export interface BreakoutScreen {
  paint: () => void;
  press: (key: KeyEvent) => void;
  release: (key: KeyEvent) => void;
}

const cellWidth = 5;
const cellHeight = 10;
const boardColumns = Math.round(boardWidth / cellWidth);
const boardRows = Math.round(boardHeight / cellHeight);
const brickCellWidth = boardWidth / columns / cellWidth;
const brickCellHeight = boardHeight / rows / cellHeight;
const firstRepeatDelayMs = 600;
const repeatGapMs = 100;

const boardColor = RGBA.fromHex("#111111");
const paddleColor = RGBA.fromHex("#eeeeee");
const ballColor = RGBA.fromHex("#ffffff");
const brickColors = ["#e05252", "#e0a052", "#d6e052", "#52e07a", "#52a6e0", "#8a52e0"].map((hex) =>
  RGBA.fromHex(hex),
);

const situationLabels: Record<Situation, string> = {
  serve: "Serve: Space to launch",
  flight: "",
  "paused-serve": "Paused: R to resume",
  "paused-flight": "Paused: R to resume",
  won: "You won! N for a new match",
  lost: "You lost. N for a new match",
};

const directionKeys = new Map<string, HeldDirection>([
  ["left", "left"],
  ["a", "left"],
  ["right", "right"],
  ["d", "right"],
]);

const eventKeys = new Map<string, () => void>([
  ["space", launch],
  ["p", pause],
  ["r", resume],
  ["n", newMatch],
]);

function toColumn(x: number): number {
  return Math.min(boardColumns - 1, Math.max(0, Math.floor(x / cellWidth)));
}

function toRow(y: number): number {
  return Math.min(boardRows - 1, Math.max(0, Math.floor(y / cellHeight)));
}

function paintBoard(board: FrameBufferRenderable): void {
  const buffer = board.frameBuffer;

  buffer.clear(boardColor);
  for (let column = 0; column < columns; column++) {
    for (let row = 0; row < rows; row++) {
      if (brickAt(column, row)()) {
        buffer.fillRect(
          Math.round(column * brickCellWidth),
          Math.round(row * brickCellHeight),
          Math.round(brickCellWidth) - 1,
          Math.round(brickCellHeight),
          brickColors[row % brickColors.length],
        );
      }
    }
  }

  const paddleLeft = toColumn(paddle() - paddleWidth / 2);
  const paddleRight = toColumn(paddle() + paddleWidth / 2);

  buffer.fillRect(
    paddleLeft,
    toRow(paddleY),
    paddleRight - paddleLeft + 1,
    Math.max(1, Math.round(paddleHeight / cellHeight)),
    paddleColor,
  );
  buffer.setCell(toColumn(ball().x), toRow(ball().y), "●", ballColor, boardColor);
  board.requestRender();
}

export function mountBreakoutScreen(renderer: CliRenderer): BreakoutScreen {
  const heldKeys = new Map<string, number>();
  let reportsRelease = false;
  const scoreLine = new TextRenderable(renderer, { content: "" });
  const board = new FrameBufferRenderable(renderer, { width: boardColumns, height: boardRows });
  const situationLine = new TextRenderable(renderer, { content: "" });
  const hint = new TextRenderable(renderer, {
    content: "← → or A D move · Space launch · P pause · R resume · N new match",
    fg: "#777777",
  });
  const layout = new BoxRenderable(renderer, {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
    gap: 1,
  });

  layout.add(scoreLine);
  layout.add(board);
  layout.add(situationLine);
  layout.add(hint);
  renderer.root.add(layout);

  function holdLatestDirection(): void {
    const latest = [...heldKeys.keys()].at(-1);

    paddleDirection.set(latest === undefined ? "none" : (directionKeys.get(latest) ?? "none"));
  }

  function letGoSilentKeys(): void {
    if (reportsRelease) {
      return;
    }

    const nowMs = performance.now();
    const silent = [...heldKeys].filter(([, releaseAtMs]) => releaseAtMs <= nowMs);

    if (silent.length === 0) {
      return;
    }
    for (const [name] of silent) {
      heldKeys.delete(name);
    }
    holdLatestDirection();
  }

  return {
    paint() {
      letGoSilentKeys();
      scoreLine.content = `Score ${score()}    Lives ${lives()}`;
      situationLine.content = situationLabels[situation()];
      paintBoard(board);
    },
    press(key) {
      const isRepeat = key.eventType === "repeat" || key.repeated === true;
      const fire = isRepeat ? undefined : eventKeys.get(key.name);

      if (directionKeys.has(key.name)) {
        const waitMs = heldKeys.has(key.name) ? repeatGapMs : firstRepeatDelayMs;

        heldKeys.delete(key.name);
        heldKeys.set(key.name, performance.now() + waitMs);
        holdLatestDirection();
      } else if (fire) {
        fire();
      }
    },
    release(key) {
      reportsRelease = true;
      if (heldKeys.delete(key.name)) {
        holdLatestDirection();
      }
    },
  };
}
