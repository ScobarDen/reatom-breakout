const sampleWindowMs = 500;

export function showFrameRate(): (elapsedMs: number) => void {
  const corner = document.createElement("div");
  let frames = 0;
  let windowMs = 0;

  Object.assign(corner.style, {
    position: "fixed",
    top: "4px",
    right: "8px",
    font: "12px monospace",
    color: "#9fef00",
    pointerEvents: "none",
  });
  document.body.append(corner);

  return (elapsedMs) => {
    frames++;
    windowMs += elapsedMs;
    if (windowMs >= sampleWindowMs) {
      corner.textContent = `${Math.round((frames * 1000) / windowMs)} fps`;
      frames = 0;
      windowMs = 0;
    }
  };
}
