import streamDeck from "@elgato/streamdeck";
import { CaughtKey } from "./actions/caught";
import { LastCaughtKey } from "./actions/last-caught";
import { ClaudeSessionKey, ClaudeWeekKey } from "./actions/claude";
import { SubscribersKey } from "./actions/subscribers";
import { ViewsKey } from "./actions/views";
import { initRaster } from "./keys/raster";
import { claude, pokedex, youtube } from "./sources";

// Not "trace": it logs every message, settings included.
streamDeck.logger.setLevel("info");

streamDeck.actions.registerAction(new CaughtKey());
streamDeck.actions.registerAction(new LastCaughtKey());
streamDeck.actions.registerAction(new SubscribersKey());
streamDeck.actions.registerAction(new ViewsKey());
const claudeKeys = [new ClaudeSessionKey(), new ClaudeWeekKey()];
for (const key of claudeKeys) streamDeck.actions.registerAction(key);

// Each poller decides for itself whether it's time, and whether a key is showing.
setInterval(() => {
  pokedex.refreshIfDue();
  youtube.refreshIfDue();
  claude.refreshIfDue();
  // Their reset countdown moves on between answers.
  for (const key of claudeKeys) key.redraw();
}, 30_000);

streamDeck.system.onSystemDidWakeUp(() => {
  void pokedex.refresh();
  void youtube.refresh();
  void claude.refresh();
});

// The YouTube fields save themselves as they're typed, so wait for a pause.
let typing: NodeJS.Timeout | undefined;
streamDeck.settings.onDidReceiveGlobalSettings(() => {
  clearTimeout(typing);
  typing = setTimeout(() => void youtube.refresh(), 1_000);
});

// Without it the Last caught key sends plain SVG, and the rest don't need it.
await initRaster().catch((error: unknown) => {
  streamDeck.logger.error(`The renderer didn't load: ${String(error)}`);
});

streamDeck.connect();
