import { Poller } from "../poller";
import { loadClaudeUsage } from "./claude";
import { loadPokedex } from "./pokedex";
import { loadChannelStats } from "./youtube";

// The count and the last caught come from the same calls, so they share a poller.
export const pokedex = new Poller(loadPokedex);
// Subscribers and views come from the same call, so they share a poller.
export const youtube = new Poller(loadChannelStats);
// Usage moves faster than the rest. The endpoint is rate limited, so a failure
// waits as long as a success.
export const claude = new Poller(loadClaudeUsage, { everyMs: 5 * 60_000, retryMs: 5 * 60_000 });
