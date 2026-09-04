// Copies MediaPipe's WASM runtime into public/ so the app serves it itself and
// works offline. Plain Node so it runs the same on macOS, Linux and Windows —
// npm runs scripts through cmd.exe there, where `mkdir -p` and `cp` don't exist.
import { cpSync, mkdirSync } from "node:fs";

const source = "node_modules/@mediapipe/tasks-vision/wasm";
const target = "public/mediapipe";

mkdirSync(target, { recursive: true });
cpSync(source, target, { recursive: true });
