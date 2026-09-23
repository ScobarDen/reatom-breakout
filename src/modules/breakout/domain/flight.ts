import {
  ballRadius,
  boardHeight,
  boardWidth,
  columns,
  maxPaddleBounceAngle,
  paddleHeight,
  paddleWidth,
  paddleY,
  rows,
} from "./constants.ts";
import type { Bricks, Vector } from "./match.ts";

type Ball = { readonly position: Vector; readonly velocity: Vector };

type Contact = {
  readonly at: number;
  readonly flipX: boolean;
  readonly flipY: boolean;
  readonly brick?: readonly [column: number, row: number];
  readonly paddle?: true;
  readonly bottom?: true;
};

export type Flown = {
  readonly ball: Ball;
  readonly bricks: Bricks;
  readonly destroyed: number;
  readonly ending?: "cleared" | "bottom";
};

const cellWidth = boardWidth / columns;
const cellHeight = boardHeight / rows;
const simultaneity = 1e-9;

function timeTo(target: number, from: number, speed: number): number {
  return Math.max(0, (target - from) / speed);
}

function wallContacts({ position, velocity }: Ball): Contact[] {
  const contacts: Contact[] = [];
  if (velocity.x < 0) {
    contacts.push({ at: timeTo(ballRadius, position.x, velocity.x), flipX: true, flipY: false });
  }
  if (velocity.x > 0) {
    contacts.push({
      at: timeTo(boardWidth - ballRadius, position.x, velocity.x),
      flipX: true,
      flipY: false,
    });
  }
  if (velocity.y < 0) {
    contacts.push({ at: timeTo(ballRadius, position.y, velocity.y), flipX: false, flipY: true });
  }
  if (velocity.y > 0) {
    contacts.push({
      at: timeTo(boardHeight - ballRadius, position.y, velocity.y),
      flipX: false,
      flipY: false,
      bottom: true,
    });
  }
  return contacts;
}

type Box = {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
};

type Sweep = {
  readonly enter: number;
  readonly exit: number;
  readonly enterX: number;
  readonly enterY: number;
};

function axisSweep(
  from: number,
  speed: number,
  min: number,
  max: number,
): [enter: number, exit: number] {
  if (speed === 0) {
    return from > min && from < max ? [-Infinity, Infinity] : [Infinity, -Infinity];
  }
  const toMin = (min - from) / speed;
  const toMax = (max - from) / speed;
  return [Math.min(toMin, toMax), Math.max(toMin, toMax)];
}

function sweepInto({ position, velocity }: Ball, box: Box): Sweep {
  const [enterX, exitX] = axisSweep(
    position.x,
    velocity.x,
    box.left - ballRadius,
    box.right + ballRadius,
  );
  const [enterY, exitY] = axisSweep(
    position.y,
    velocity.y,
    box.top - ballRadius,
    box.bottom + ballRadius,
  );
  return { enter: Math.max(enterX, enterY), exit: Math.min(exitX, exitY), enterX, enterY };
}

function brickContact(ball: Ball, column: number, row: number): Contact | undefined {
  const { enter, exit, enterX, enterY } = sweepInto(ball, {
    left: column * cellWidth,
    right: (column + 1) * cellWidth,
    top: row * cellHeight,
    bottom: (row + 1) * cellHeight,
  });
  if (enter < 0 || enter >= exit) return undefined;
  return { at: enter, flipX: enterX >= enterY, flipY: enterY >= enterX, brick: [column, row] };
}

function brickContacts(ball: Ball, bricks: Bricks): Contact[] {
  return bricks.flatMap((column, c) =>
    column.flatMap((standing, r) => {
      const contact = standing ? brickContact(ball, c, r) : undefined;
      return contact ? [contact] : [];
    }),
  );
}

function paddleContact(ball: Ball, paddle: number): Contact[] {
  if (ball.velocity.y <= 0) return [];
  const { enter, exit } = sweepInto(ball, {
    left: paddle - paddleWidth / 2,
    right: paddle + paddleWidth / 2,
    top: paddleY - paddleHeight / 2,
    bottom: paddleY + paddleHeight / 2,
  });
  if (enter >= exit || exit <= 0) return [];
  return [{ at: Math.max(0, enter), flipX: false, flipY: false, paddle: true }];
}

function paddleBounce({ position, velocity }: Ball, paddle: number): Vector {
  const reach = paddleWidth / 2 + ballRadius;
  const offset = Math.min(Math.max((position.x - paddle) / reach, -1), 1);
  const angle = offset * maxPaddleBounceAngle;
  const speed = Math.hypot(velocity.x, velocity.y);
  return { x: speed * Math.sin(angle), y: -speed * Math.cos(angle) };
}

function travel(position: Vector, velocity: Vector, time: number): Vector {
  return { x: position.x + velocity.x * time, y: position.y + velocity.y * time };
}

function withoutBricks(bricks: Bricks, hit: Contact[]): Bricks {
  return bricks.map((column, c) =>
    column.map(
      (standing, r) => standing && !hit.some(({ brick }) => brick?.[0] === c && brick[1] === r),
    ),
  );
}

export function fly(start: Ball, startBricks: Bricks, paddle: number, elapsedMs: number): Flown {
  let ball = start;
  let bricks = startBricks;
  let destroyed = 0;
  let remaining = elapsedMs;

  for (;;) {
    const contacts = [
      ...wallContacts(ball),
      ...brickContacts(ball, bricks),
      ...paddleContact(ball, paddle),
    ].filter((contact) => contact.at <= remaining);
    if (contacts.length === 0) {
      return {
        ball: { ...ball, position: travel(ball.position, ball.velocity, remaining) },
        bricks,
        destroyed,
      };
    }

    const first = Math.min(...contacts.map((contact) => contact.at));
    const touching = contacts.filter((contact) => contact.at - first <= simultaneity);
    const hitBricks = touching.filter((contact) => contact.brick);
    const flipX = touching.some((contact) => contact.flipX);
    const flipY = touching.some((contact) => contact.flipY);

    const position = travel(ball.position, ball.velocity, first);
    ball = {
      position,
      velocity: touching.some((contact) => contact.paddle)
        ? paddleBounce({ position, velocity: ball.velocity }, paddle)
        : {
            x: flipX ? -ball.velocity.x : ball.velocity.x,
            y: flipY ? -ball.velocity.y : ball.velocity.y,
          },
    };
    if (hitBricks.length > 0) {
      bricks = withoutBricks(bricks, hitBricks);
      destroyed += hitBricks.length;
    }
    if (!bricks.some((column) => column.some(Boolean))) {
      return { ball, bricks, destroyed, ending: "cleared" };
    }
    if (touching.some((contact) => contact.bottom)) {
      return { ball, bricks, destroyed, ending: "bottom" };
    }
    remaining -= first;
  }
}
