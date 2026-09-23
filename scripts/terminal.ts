if ((process.env.MODE ?? "") === "") {
  process.env.MODE = "development";
}

await import("../src/app/terminal/index.ts");
