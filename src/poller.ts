import streamDeck from "@elgato/streamdeck";

const EVERY_MS = 10 * 60_000;
// After a failure, as when the network is still waking up with the Mac.
const RETRY_MS = 60_000;

// A failure only the user can fix. Its message goes on the key, so keep it to
// a word or two.
export class NeedsAttention extends Error {}

type Watcher = { isVisible(): boolean; redraw(): void };

// Keeps one source's latest value for the keys that show it, and only asks
// while one of them is on screen.
export class Poller<T> {
  value: T | undefined;
  // What the key should say instead of its value.
  problem: string | undefined;
  // The last try failed: the value, if any, is out of date.
  offline = false;

  #dueAt = 0;
  #running: Promise<void> | undefined;
  #watchers: Watcher[] = [];
  readonly #load: () => Promise<T>;
  readonly #everyMs: number;
  readonly #retryMs: number;

  constructor(load: () => Promise<T>, { everyMs = EVERY_MS, retryMs = RETRY_MS } = {}) {
    this.#load = load;
    this.#everyMs = everyMs;
    this.#retryMs = retryMs;
  }

  watch(watcher: Watcher) {
    this.#watchers.push(watcher);
  }

  refreshIfDue() {
    if (!this.#running && Date.now() >= this.#dueAt) void this.refresh();
  }

  async refresh(): Promise<void> {
    if (this.#running) await this.#running;
    if (!this.#watchers.some((watcher) => watcher.isVisible())) return;
    this.#running = this.#run().finally(() => {
      this.#running = undefined;
    });
    return this.#running;
  }

  async #run() {
    try {
      this.value = await this.#load();
      this.problem = undefined;
      this.offline = false;
      this.#dueAt = Date.now() + this.#everyMs;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (error instanceof NeedsAttention) {
        this.problem = message;
        this.#dueAt = Date.now() + this.#everyMs;
      } else {
        streamDeck.logger.warn(`Refresh failed: ${message}`);
        this.problem = undefined;
        this.offline = true;
        this.#dueAt = Date.now() + this.#retryMs;
      }
    }
    for (const watcher of this.#watchers) watcher.redraw();
  }
}
