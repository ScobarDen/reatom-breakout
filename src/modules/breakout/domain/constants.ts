export const columns = 10;
export const rows = 15;
export const boardWidth = 400;
export const boardHeight = 300;
export const paddleWidth = 64;
export const paddleHeight = 8;
export const paddleY = 280;
export const ballRadius = 5;

export const firstBrickRow = 2;
export const brickRowCount = 5;
export const startingLives = 3;
export const paddleSpeed = 0.4;
export const ballSpeed = 0.3;
const launchSlope = 0.3;

export const launchVelocity = {
  x: (ballSpeed * launchSlope) / Math.hypot(launchSlope, 1),
  y: -ballSpeed / Math.hypot(launchSlope, 1),
};
export const brickPoints = 10;
export const maxPaddleBounceAngle = Math.PI / 3;
