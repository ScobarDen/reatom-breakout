import { connectLogger } from "@reatom/core";

const hiddenNames = ["ball", "paddle", "paddleDirection"];

function isLogged(name: string): boolean {
  return !hiddenNames.some((hidden) => name === hidden || name.startsWith(`${hidden}.`));
}

if (import.meta.env.MODE === "development") {
  connectLogger({ match: isLogged });
}
