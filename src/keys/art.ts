import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

// The app's artwork is WebP, which resvg can't read but macOS's own sips can.
// Twice the size it's drawn at on the key, which is plenty.
export async function webpToPngDataUrl(webp: Uint8Array): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "pokedex-key-"));
  try {
    const from = path.join(dir, "art.webp");
    const to = path.join(dir, "art.png");
    await fs.writeFile(from, webp);
    await promisify(execFile)("/usr/bin/sips", ["-s", "format", "png", "-Z", "196", from, "--out", to]);
    return `data:image/png;base64,${(await fs.readFile(to)).toString("base64")}`;
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}
