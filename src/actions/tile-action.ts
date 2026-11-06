import streamDeck, { SingletonAction, type KeyDownEvent, type WillAppearEvent } from "@elgato/streamdeck";
import { drawTile, toDataUrl, type Tile, type TileColor } from "../keys/draw";
import type { Poller } from "../poller";

type TileContent = Pick<Tile, "value" | "suffix" | "progress" | "art"> &
  Partial<Pick<Tile, "color" | "label">>;

// A key that shows one thing from a poller as a Pokédex tile: gray, like a
// Pokémon not caught yet, while it needs attention or is out of date.
export abstract class TileAction<T> extends SingletonAction {
  protected abstract readonly label: string;
  protected abstract readonly color: TileColor;
  protected readonly corner?: string;
  // What a key shows before the first answer. A blank Pokédex keeps its bar.
  protected readonly empty: TileContent = { value: "–" };
  protected abstract content(value: T): TileContent;
  protected abstract link(): string | Promise<string | undefined>;
  // How the drawing reaches Stream Deck.
  protected encode(svg: string) {
    return toDataUrl(svg);
  }

  protected readonly source: Poller<T>;
  #drawn: string | undefined;

  constructor(source: Poller<T>) {
    super();
    this.source = source;
    source.watch(this);
  }

  isVisible() {
    return this.actions.length > 0;
  }

  #tile(): Tile {
    const { value, problem, offline } = this.source;
    const { label, corner, color } = this;
    if (problem) return { color: "missing", label, corner, value: problem };
    if (value === undefined) {
      return offline
        ? { color: "missing", label, corner, value: "Offline" }
        : { color, label, corner, ...this.empty };
    }
    const tile = { color, label, corner, ...this.content(value) };
    return offline ? { ...tile, color: "missing" } : tile;
  }

  #image() {
    return this.encode(drawTile(this.#tile()));
  }

  // Called often for a countdown, so only touches the keys when something changed.
  redraw() {
    const image = this.#image();
    if (image === this.#drawn) return;
    this.#drawn = image;
    for (const action of this.actions) if (action.isKey()) void action.setImage(image);
  }

  override async onWillAppear(ev: WillAppearEvent) {
    if (ev.action.isKey()) await ev.action.setImage(this.#image());
    this.source.refreshIfDue();
  }

  override async onKeyDown(ev: KeyDownEvent) {
    const url = await this.link();
    if (url) await streamDeck.system.openUrl(url);
    else await ev.action.showAlert();
  }
}
