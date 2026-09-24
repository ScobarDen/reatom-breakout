import {
  BoxRenderable,
  type CliRenderer,
  FrameBufferRenderable,
  type KeyEvent,
  RGBA,
  TextRenderable,
} from "@opentui/core";

import {
  type Box,
  ball,
  board,
  bricks,
  controlsHint,
  lives,
  paddle,
  score,
  situationLabel,
} from "@/modules/breakout";

import { breakoutTerminalInput } from "./vm/breakout.terminal.vm.ts";

export interface BreakoutScreen {
  paint: () => void;
  press: (key: KeyEvent) => void;
  release: (key: KeyEvent) => void;
}

const cellWidth = 5;
const cellHeight = 10;
const boardColumns = Math.round(board.width / cellWidth);
const boardRows = Math.round(board.height / cellHeight);

const boardColor = RGBA.fromHex("#111111");
const paddleColor = RGBA.fromHex("#eeeeee");
const ballColor = RGBA.fromHex("#ffffff");
const brickColors = ["#e05252", "#e0a052", "#d6e052", "#52e07a", "#52a6e0", "#8a52e0"].map((hex) =>
  RGBA.fromHex(hex),
);

function toColumn(x: number): number {
  return Math.min(boardColumns - 1, Math.max(0, Math.floor(x / cellWidth)));
}

function toRow(y: number): number {
  return Math.min(boardRows - 1, Math.max(0, Math.floor(y / cellHeight)));
}

function cellsHigh(box: Box): number {
  return Math.round((box.bottom - box.top) / cellHeight);
}

function paintBoard(frame: FrameBufferRenderable): void {
  const buffer = frame.frameBuffer;

  buffer.clear(boardColor);
  for (const { box, row, standing } of bricks) {
    if (standing()) {
      buffer.fillRect(
        Math.round(box.left / cellWidth),
        Math.round(box.top / cellHeight),
        Math.round((box.right - box.left) / cellWidth) - 1,
        cellsHigh(box),
        brickColors[row % brickColors.length],
      );
    }
  }

  const paddleEdges = paddle();
  const paddleLeft = toColumn(paddleEdges.left);
  const paddleRight = toColumn(paddleEdges.right);

  buffer.fillRect(
    paddleLeft,
    toRow((paddleEdges.top + paddleEdges.bottom) / 2),
    paddleRight - paddleLeft + 1,
    Math.max(1, cellsHigh(paddleEdges)),
    paddleColor,
  );
  buffer.setCell(toColumn(ball().x), toRow(ball().y), "●", ballColor, boardColor);
  frame.requestRender();
}

export function mountBreakoutScreen(renderer: CliRenderer): BreakoutScreen {
  const input = breakoutTerminalInput(() => performance.now());
  const scoreLine = new TextRenderable(renderer, { content: "" });
  const boardFrame = new FrameBufferRenderable(renderer, {
    width: boardColumns,
    height: boardRows,
  });
  const situationLine = new TextRenderable(renderer, { content: "" });
  const hint = new TextRenderable(renderer, {
    content: controlsHint,
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
  layout.add(boardFrame);
  layout.add(situationLine);
  layout.add(hint);
  renderer.root.add(layout);

  return {
    paint() {
      input.letGoSilentKeys();
      scoreLine.content = `Score ${score()}    Lives ${lives()}`;
      situationLine.content = situationLabel();
      paintBoard(boardFrame);
    },
    press(key) {
      input.press({ name: key.name, repeat: key.eventType === "repeat" || key.repeated === true });
    },
    release(key) {
      input.release(key.name);
    },
  };
}
