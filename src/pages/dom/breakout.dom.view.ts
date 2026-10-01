import { effect } from "@reatom/core";

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

import { liveText, svgElement, withAttributes } from "./nodes.dom.view.ts";

const scale = 2;

function brickRect({ box, row, standing }: Brick): SVGRectElement {
  const rect = withAttributes(svgElement("rect"), {
    class: "brick",
    x: box.left,
    y: box.top,
    width: box.right - box.left,
    height: box.bottom - box.top,
    fill: `hsl(${row * 24} 70% 55%)`,
  });

  effect(() => {
    rect.setAttribute("visibility", standing() ? "visible" : "hidden");
  }, `${standing.name}.visibility`);

  return rect;
}

function paddleRect(): SVGRectElement {
  const rect = withAttributes(svgElement("rect"), { class: "paddle" });

  effect(() => {
    const { left, top, right, bottom } = paddle();

    withAttributes(rect, { x: left, y: top, width: right - left, height: bottom - top });
  }, "paddle.rect");

  return rect;
}

function ballCircle(): SVGCircleElement {
  const circle = withAttributes(svgElement("circle"), { class: "ball" });

  effect(() => {
    const { x, y, radius } = ball();

    withAttributes(circle, { cx: x, cy: y });
    circle.setAttribute("r", String(radius));
  }, "ball.circle");

  return circle;
}

function boardSvg(): SVGSVGElement {
  const svg = withAttributes(svgElement("svg"), {
    class: "board",
    viewBox: `0 0 ${board.width} ${board.height}`,
    width: board.width * scale,
    height: board.height * scale,
  });

  svg.append(...bricks.map((brick) => brickRect(brick)), paddleRect(), ballCircle());

  return svg;
}

export function breakoutScreen(): HTMLElement {
  const main = document.createElement("main");
  const hud = document.createElement("div");
  const scoreSpan = document.createElement("span");
  const livesSpan = document.createElement("span");
  const situationDiv = document.createElement("div");
  const hint = document.createElement("div");

  scoreSpan.append(liveText(() => `Score ${score()}`, "score.text"));
  livesSpan.append(liveText(() => `Lives ${lives()}`, "lives.text"));
  hud.className = "hud";
  hud.append(scoreSpan, livesSpan);
  situationDiv.append(liveText(situationLabel, "situation.text"));
  hint.className = "hint";
  hint.textContent = controlsHint;
  main.className = "match";
  main.append(hud, boardSvg(), situationDiv, hint);

  return main;
}
