if ((process.env.MODE ?? "") === "") {
  process.env.MODE = "development";
}

await import("../src/app/terminal/main.ts");
