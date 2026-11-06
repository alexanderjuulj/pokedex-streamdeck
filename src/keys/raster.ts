import fs from "node:fs/promises";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import { toDataUrl } from "./draw";

let ready = false;

// `pnpm build` puts resvg's WebAssembly next to the bundle.
export async function initRaster() {
  await initWasm(await fs.readFile(new URL("resvg.wasm", import.meta.url)));
  ready = true;
}

// For a key with a picture in it: Stream Deck takes PNG for certain, but nothing
// promises its SVG renderer draws an embedded image.
export function rasterize(svg: string): string {
  if (!ready) return toDataUrl(svg);
  try {
    const resvg = new Resvg(svg);
    const rendered = resvg.render();
    const png = rendered.asPng();
    rendered.free();
    resvg.free();
    return `data:image/png;base64,${Buffer.from(png).toString("base64")}`;
  } catch {
    // Better a key without its picture than a plugin that falls over.
    return toDataUrl(svg);
  }
}
