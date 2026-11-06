import streamDeck from "@elgato/streamdeck";

// Shared by all the keys. The Pokédex password isn't here: see keychain.ts.
export type GlobalSettings = {
  pokedexUrl?: string;
  pokedexUser?: string;
  youtubeApiKey?: string;
  youtubeChannel?: string;
};

export const getSettings = () => streamDeck.settings.getGlobalSettings<GlobalSettings>();
