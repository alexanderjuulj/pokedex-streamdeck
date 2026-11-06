import { GLYPHS } from "./glyphs";

// A key is a Pokédex tile: the flat fill, the white Poké Ball cut off at the
// bottom right, the name at the top left. The sizes follow PokemonTile (the
// ball is 3/4 of the tile, hanging 1/8 over the edges). Drawn at 144, which
// Stream Deck scales down to the key; the Mini's keys are 80 px.
const SIZE = 144;
const MARGIN = 12;
const WIDTH = SIZE - 2 * MARGIN;

// The app's type colors (_colors.scss).
const TYPES = {
  normal: "#8f8e80",
  fire: "#ec5b5b",
  water: "#4192e6",
  electric: "#f5c542",
  grass: "#2a9d7c",
  ice: "#34a0ab",
  fighting: "#c95b4a",
  poison: "#9a62b8",
  ground: "#b5893f",
  flying: "#7d8be0",
  psychic: "#e25d8d",
  bug: "#7f9d1a",
  rock: "#a08c56",
  ghost: "#6f5f9e",
  dragon: "#7b5fd6",
  dark: "#6b5a4e",
  steel: "#7a8ca0",
  fairy: "#c96aa8",
} as const;

export type PokemonType = keyof typeof TYPES;
// Besides the types: the Poké Ball's red, and the gray of a Pokémon not caught.
export type TileColor = PokemonType | "primary" | "missing";

function palette(color: TileColor) {
  if (color === "missing") {
    return { fill: "#e8e8ea", on: "#5f5f66", ball: "#222224", ballOpacity: 0.06 };
  }
  // Electric is the one type too light for white text.
  if (color === "electric") {
    return { fill: TYPES.electric, on: "#3d2c00", ball: "#ffffff", ballOpacity: 0.3 };
  }
  const fill = color === "primary" ? "#ee1515" : TYPES[color];
  return { fill, on: "#ffffff", ball: "#ffffff", ballOpacity: 0.18 };
}

const BALL_PATHS =
  '<path d="M0.25 45A50 50 0 0 1 99.75 45H69.36A20 20 0 0 0 30.64 45Z"/>' +
  '<path d="M0.25 55A50 50 0 0 0 99.75 55H69.36A20 20 0 0 1 30.64 55Z"/>' +
  '<circle cx="50" cy="50" r="12"/>';

export function ball(size: number, x: number, y: number, fill: string, opacity = 1): string {
  return `<g transform="translate(${x} ${y}) scale(${size / 100})" fill="${fill}" fill-opacity="${opacity}">${BALL_PATHS}</g>`;
}

const widthOf = (text: string, weight: number) =>
  [...text].reduce((sum, char) => sum + (GLYPHS[weight]![char]?.w ?? 500), 0) / 1000;

function drawText(
  text: string,
  x: number,
  y: number,
  size: number,
  weight: number,
  fill: string,
  opacity = 1,
) {
  let at = 0;
  const paths = [...text].map((char) => {
    const glyph = GLYPHS[weight]![char];
    if (!glyph) return "";
    const path = `<path transform="translate(${at} 0)" d="${glyph.d}"/>`;
    at += glyph.w;
    return path;
  });
  return `<g transform="translate(${x} ${y}) scale(${size / 1000})" fill="${fill}" fill-opacity="${opacity}">${paths.join("")}</g>`;
}

export type Tile = {
  color: TileColor;
  label: string;
  // Small, at the top right, where a Pokémon tile has its number.
  corner?: string;
  // The big number, or a short word for a key that needs attention.
  value: string;
  // Smaller, right after the value: "/251".
  suffix?: string;
  // 0 to 1, as a bar along the bottom.
  progress?: number;
  // Makes it a Pokémon's tile: `value` is its number, small under the name, and
  // this its artwork as a data URL, or null when there's no picture.
  art?: string | null;
};

const VALUE_WEIGHT = 800;
const LABEL_WEIGHT = 700;
const SUFFIX_RATIO = 0.42;
const LABEL_SIZE = 27;
const SMALL_SIZE = 21;
const LABEL_BASELINE = 36;
const CORNER_GAP = 10;
// Much larger than on the app's tile: on 80 px, the Pokémon has to do the talking.
const ART_SIZE = 98;
const NUMBER_SIZE = 19;

function numberParts({ value, suffix, progress }: Tile, on: string): string[] {
  const hasBar = progress !== undefined;
  // The largest size at which the value and its suffix fit the width.
  const em =
    widthOf(value, VALUE_WEIGHT) + (suffix ? widthOf(suffix, LABEL_WEIGHT) * SUFFIX_RATIO : 0);
  const size = Math.min(hasBar ? 58 : 66, WIDTH / em);
  const baseline = hasBar ? 106 : 122;

  const parts = [drawText(value, MARGIN, baseline, size, VALUE_WEIGHT, on)];
  if (suffix) {
    const x = MARGIN + widthOf(value, VALUE_WEIGHT) * size;
    parts.push(drawText(suffix, x, baseline, size * SUFFIX_RATIO, LABEL_WEIGHT, on));
  }
  if (hasBar) {
    const filled = Math.max(0, Math.min(1, progress)) * WIDTH;
    parts.push(
      `<rect x="${MARGIN}" y="120" width="${WIDTH}" height="12" rx="6" fill="${on}" fill-opacity="0.3"/>`,
      filled > 0
        ? `<rect x="${MARGIN}" y="120" width="${Math.max(filled, 12)}" height="12" rx="6" fill="${on}"/>`
        : "",
    );
  }
  return parts;
}

function pokemonParts({ value, art }: Tile, on: string): string[] {
  const at = SIZE - ART_SIZE - 2;
  return [
    art ? `<image x="${at}" y="${at}" width="${ART_SIZE}" height="${ART_SIZE}" href="${art}"/>` : "",
    drawText(value, MARGIN, LABEL_BASELINE + 20, NUMBER_SIZE, LABEL_WEIGHT, on, 0.85),
  ];
}

export function drawTile(tile: Tile): string {
  const { color, label, corner, art } = tile;
  const { fill, on, ball: ballFill, ballOpacity } = palette(color);
  const cornerWidth = corner ? widthOf(corner, LABEL_WEIGHT) * SMALL_SIZE : 0;
  // A long name gets smaller rather than cut off.
  const room = WIDTH - (corner ? cornerWidth + CORNER_GAP : 0);
  const labelSize = Math.min(LABEL_SIZE, room / widthOf(label, LABEL_WEIGHT));

  const parts = [
    `<rect width="${SIZE}" height="${SIZE}" fill="${fill}"/>`,
    ball(108, 54, 54, ballFill, ballOpacity),
    // The artwork goes under the text, as on the app's tile.
    ...(art === undefined ? numberParts(tile, on) : pokemonParts(tile, on)),
    drawText(label, MARGIN, LABEL_BASELINE, labelSize, LABEL_WEIGHT, on),
  ];
  if (corner) {
    const x = SIZE - MARGIN - cornerWidth;
    parts.push(drawText(corner, x, LABEL_BASELINE, SMALL_SIZE, LABEL_WEIGHT, on, 0.85));
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">${parts.join("")}</svg>`;
}

export const toDataUrl = (svg: string) =>
  `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

// Fits a count on a key: exact up to 9999, then three digits and a unit,
// rounded down so a count never shows more than it has reached.
export function compact(n: number): string {
  if (n < 10_000) return String(n);
  for (const [unit, letter] of [
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ] as const) {
    if (n >= unit) {
      const value = n / unit;
      const decimals = value >= 100 ? 0 : value >= 10 ? 1 : 2;
      return `${Math.floor(value * 10 ** decimals) / 10 ** decimals}${letter}`;
    }
  }
  return String(n);
}
