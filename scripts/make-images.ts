// Draws the plugin's fixed images from the same code as the live keys, and
// preview.png: every key at full size and at the Mini's 80 px. Run with
// `pnpm images` after changing src/keys/draw.ts.
import fs from "node:fs";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";
import { ball, compact, drawTile, type Tile } from "../src/keys/draw";

const PLUGIN = "io.github.alexanderjuulj.pokedex.sdPlugin";
const WHITE = "#ffffff";

// Scaled up before the resize, so small sizes come out sharp.
const png = (svg: string, size: number) =>
  sharp(Buffer.from(svg), { density: 300 }).resize(size, size).png().toBuffer();

async function save(name: string, svg: string, size: number) {
  const file = path.join(PLUGIN, "imgs", name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await fs.promises.writeFile(`${file}.png`, await png(svg, size));
  await fs.promises.writeFile(`${file}@2x.png`, await png(svg, size * 2));
}

const icon = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${WHITE}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

// Lucide's icons, as in the app. White on nothing: Stream Deck's
// action list expects monochrome icons.
const EYE = icon(
  '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
);
const USERS = icon(
  '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>',
);
const SPARKLES = icon(
  '<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/>',
);
const TIMER = icon(
  '<line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/>',
);
const CALENDAR = icon(
  '<path d="M8 2v3"/><path d="M16 2v3"/><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/>',
);
const BALL = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">${ball(24, 0, 0, WHITE)}</svg>`;
const TILE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144"><rect width="144" height="144" rx="28" fill="#ee1515"/>${ball(112, 16, 16, WHITE)}</svg>`;

await save("plugin/marketplace", TILE_ICON, 288);
await save("plugin/category", BALL, 28);
await save("actions/caught/icon", BALL, 20);
await save("actions/last-caught/icon", SPARKLES, 20);
await save("actions/subscribers/icon", USERS, 20);
await save("actions/views/icon", EYE, 20);
await save("actions/claude-5h/icon", TIMER, 20);
await save("actions/claude-7d/icon", CALENDAR, 20);
// What a key shows before the plugin has drawn on it.
await save("actions/caught/key", drawTile({ color: "primary", label: "Pokédex", value: "–", progress: 0 }), 72);
await save("actions/last-caught/key", drawTile({ color: "primary", label: "Last caught", value: "–" }), 72);
await save("actions/subscribers/key", drawTile({ color: "water", label: "Subs", value: "–" }), 72);
await save("actions/views/key", drawTile({ color: "electric", label: "Views", value: "–" }), 72);
const claude = { color: "grass", label: "Claude", value: "–", progress: 0 } as const;
await save("actions/claude-5h/key", drawTile({ ...claude, corner: "5h" }), 72);
await save("actions/claude-7d/key", drawTile({ ...claude, corner: "7d" }), 72);

// Without artwork: this image is committed, and the repository holds none of The
// Pokémon Company's pictures. On the key, the Pokémon stands bottom right.
const SAMPLES: Tile[] = [
  { color: "primary", label: "Pokédex", value: "87", suffix: "/251", progress: 87 / 251 },
  { color: "water", label: "Subs", value: compact(342) },
  { color: "electric", label: "Views", value: compact(18_432) },
  { color: "electric", label: "Pikachu", value: "#025", art: null },
  { color: "fire", label: "Charmander", value: "#004", art: null },
  { color: "poison", label: "Nidoran♀", value: "#029", art: null },
  { color: "grass", label: "Claude", corner: "5h", value: "12%", suffix: " 3h", progress: 0.12 },
  { color: "electric", label: "Claude", corner: "7d", value: "63%", suffix: " 4d", progress: 0.63 },
  { color: "primary", label: "Claude", corner: "5h", value: "91%", suffix: " 38m", progress: 0.91 },
  { color: "missing", label: "Pokédex", value: "Login" },
  { color: "missing", label: "Subs", value: "Set up" },
  { color: "missing", label: "Views", value: compact(18_432) },
];
const COLUMNS = 3;
const GAP = 20;
const FULL = 144;
const MINI = 80;
const rows = Math.ceil(SAMPLES.length / COLUMNS);
const overlays: OverlayOptions[] = [];
for (const [i, tile] of SAMPLES.entries()) {
  const svg = drawTile(tile);
  const column = i % COLUMNS;
  const top = GAP + Math.floor(i / COLUMNS) * (FULL + GAP);
  overlays.push(
    { input: await png(svg, FULL), left: GAP + column * (FULL + GAP), top },
    { input: await png(svg, MINI), left: GAP + COLUMNS * (FULL + GAP) + column * (MINI + GAP), top },
  );
}
await sharp({
  create: {
    width: GAP + COLUMNS * (FULL + GAP) + COLUMNS * (MINI + GAP),
    height: GAP + rows * (FULL + GAP),
    channels: 3,
    background: "#111113",
  },
})
  .composite(overlays)
  .png()
  .toFile("preview.png");
console.log("Wrote the images and preview.png");
