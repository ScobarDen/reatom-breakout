import {
  boardWidth,
  brickPoints,
  launchVelocity,
  paddleSpeed,
  paddleWidth,
} from "../breakout.config.ts";
import { fly } from "./flight.model.ts";
import { type Match, openingMatch, servedBall } from "./match.model.ts";

export type PaddleDirection = "left" | "right" | "none";
export type MatchEvent = "launch" | "pause" | "resume" | "new-match";

export interface Frame {
  readonly direction: PaddleDirection;
  readonly events: readonly MatchEvent[];
  readonly elapsedMs: number;
}

type Airborne = Extract<Match, { velocity: unknown }>;

const directionSign: Record<PaddleDirection, number> = { left: -1, right: 1, none: 0 };

function movePaddle(paddle: number, direction: PaddleDirection, elapsedMs: number): number {
  const moved = paddle + directionSign[direction] * paddleSpeed * elapsedMs;

  return Math.min(Math.max(moved, paddleWidth / 2), boardWidth - paddleWidth / 2);
}

function playFlight(match: Airborne, paddle: number, elapsedMs: number): Match {
  const flown = fly(
    { position: match.ball, velocity: match.velocity },
    match.bricks,
    paddle,
    elapsedMs,
  );
  const common = {
    bricks: flown.bricks,
    paddle,
    lives: match.lives,
    score: match.score + flown.destroyed * brickPoints,
  };

  if (flown.ending === "cleared") {
    return { ...common, situation: "won", ball: flown.ball.position };
  }
  if (flown.ending === "bottom") {
    const lives = match.lives - 1;

    return lives === 0
      ? { ...common, lives, situation: "lost", ball: flown.ball.position }
      : { ...common, lives, situation: "serve", ball: servedBall(paddle) };
  }

  return {
    ...common,
    situation: "flight",
    ball: flown.ball.position,
    velocity: flown.ball.velocity,
  };
}

function togglePause(match: Match, events: readonly MatchEvent[]): Match {
  const resuming = events.includes("resume");

  if (!resuming && !events.includes("pause")) {
    return match;
  }

  switch (match.situation) {
    case "serve":
    case "paused-serve": {
      return { ...match, situation: resuming ? "serve" : "paused-serve" };
    }
    case "flight":
    case "paused-flight": {
      return { ...match, situation: resuming ? "flight" : "paused-flight" };
    }
    case "won":
    case "lost": {
      break;
    }
  }

  return match;
}

export function step(match: Match, frame: Frame): Match {
  if (frame.events.includes("new-match")) {
    return openingMatch();
  }
  if (match.situation === "won" || match.situation === "lost") {
    return match;
  }

  const live = togglePause(match, frame.events);

  if (live.situation === "paused-serve" || live.situation === "paused-flight") {
    return live;
  }

  const paddle = movePaddle(live.paddle, frame.direction, frame.elapsedMs);

  if (live.situation === "flight") {
    return playFlight(live, paddle, frame.elapsedMs);
  }

  const served: Match = { ...live, paddle, ball: servedBall(paddle) };

  if (frame.events.includes("launch")) {
    return { ...served, situation: "flight", velocity: launchVelocity };
  }

  return served;
}
