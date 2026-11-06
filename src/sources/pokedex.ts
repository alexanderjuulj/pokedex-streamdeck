import streamDeck from "@elgato/streamdeck";
import { readPassword } from "../keychain";
import { webpToPngDataUrl } from "../keys/art";
import type { PokemonType } from "../keys/draw";
import { NeedsAttention } from "../poller";
import { getSettings } from "../settings";

type Caught = { id: number; name: string; type: PokemonType };
export type PokedexData = {
  caught: number;
  total: number;
  last: (Caught & { art: string | null }) | null;
};

type Binder = { kind: string; first_pokemon_id: number | null; last_pokemon_id: number | null };
type Pokemon = { id: number; name: string; primary_type: string; card_count: number | null };
type Card = { pokemon_id: number; created_at: string };

// The same count as the app's home page: the goal is the Pokémon the Pokédex
// binders keep a pocket for (useGoal), and one is caught once a card counts for
// it. The last caught is the goal's Pokémon whose first card is the newest, so a
// duplicate or another region's card doesn't change it, and neither moves the count.
export function summarize(binders: Binder[], pokemon: Pokemon[], cards: Card[]) {
  const ranges = binders.filter((binder) => binder.kind === "pokedex");
  const inGoal = pokemon.filter(({ id }) =>
    ranges.some((range) => id >= range.first_pokemon_id! && id <= range.last_pokemon_id!),
  );

  const firstCard = new Map<number, string>();
  for (const { pokemon_id, created_at } of cards) {
    const seen = firstCard.get(pokemon_id);
    if (!seen || created_at < seen) firstCard.set(pokemon_id, created_at);
  }
  let last: Pokemon | undefined;
  let lastAt = "";
  for (const one of inGoal) {
    const at = firstCard.get(one.id);
    if (at && at >= lastAt) {
      last = one;
      lastAt = at;
    }
  }

  return {
    caught: inGoal.filter((one) => (one.card_count ?? 0) > 0).length,
    total: inGoal.length,
    last: last ? { id: last.id, name: last.name, type: last.primary_type as PokemonType } : null,
  };
}

let cookie: string | undefined;
// The app locks an address out after 5 failed logins, which would take the
// family's phones on the same Wi-Fi with it. So a refused login is never tried
// again by itself: only saving the login in the key's settings clears this.
let refused = false;

export function resetLogin() {
  cookie = undefined;
  refused = false;
}

async function request(base: string, path: string, init?: RequestInit) {
  const response = await fetch(new URL(path, base), {
    ...init,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    signal: AbortSignal.timeout(20_000),
  });
  // A session in its second half comes back renewed.
  const renewed = response.headers.getSetCookie().find((line) => line.startsWith("session="));
  if (renewed) cookie = renewed.split(";")[0];
  return response;
}

async function logIn(base: string, username: string) {
  const password = await readPassword();
  if (!password) throw new NeedsAttention("Set up");
  const response = await request(base, "/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  if (response.status === 401 || response.status === 429) {
    refused = true;
    throw new NeedsAttention("Login");
  }
  if (!response.ok) throw new Error(`The Pokédex answered ${response.status} to the login`);
}

let artOf: { id: number; art: string } | undefined;

// Only fetched when the Pokémon changes, and only kept here. Without a picture the
// key still shows the name, and the next refresh tries again.
async function loadArt(base: string, id: number): Promise<string | null> {
  if (artOf?.id === id) return artOf.art;
  try {
    const response = await request(base, `/pokemon/${String(id).padStart(3, "0")}.webp`);
    if (!response.ok) throw new Error(`answered ${response.status}`);
    const art = await webpToPngDataUrl(new Uint8Array(await response.arrayBuffer()));
    artOf = { id, art };
    return art;
  } catch (error) {
    streamDeck.logger.warn(`No artwork for #${id}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

export async function loadPokedex(): Promise<PokedexData> {
  const { pokedexUrl, pokedexUser } = await getSettings();
  if (!pokedexUrl?.trim() || !pokedexUser?.trim()) throw new NeedsAttention("Set up");
  if (refused) throw new NeedsAttention("Login");
  const base = pokedexUrl.trim();

  async function read<T>(path: string): Promise<T> {
    let response = await request(base, path);
    if (response.status === 401) {
      await logIn(base, pokedexUser!.trim());
      response = await request(base, path);
    }
    if (!response.ok) throw new Error(`The Pokédex answered ${response.status} to ${path}`);
    return (await response.json()) as T;
  }

  // One after the other: the first logs in when needed, for the rest.
  const binders = await read<Binder[]>("/api/binders");
  const pokemon = await read<Pokemon[]>("/api/pokemon_overview");
  const cards = await read<Card[]>("/api/cards");
  const { caught, total, last } = summarize(binders, pokemon, cards);
  if (total === 0) throw new NeedsAttention("No goal");
  return { caught, total, last: last && { ...last, art: await loadArt(base, last.id) } };
}
