import { action } from "@elgato/streamdeck";
import { compact } from "../keys/draw";
import { youtube } from "../sources";
import type { ChannelStats } from "../sources/youtube";
import { TileAction } from "./tile-action";

@action({ UUID: "io.github.alexanderjuulj.pokedex.subscribers" })
export class SubscribersKey extends TileAction<ChannelStats> {
  protected readonly label = "Subs";
  protected readonly color = "water";

  constructor() {
    super(youtube);
  }

  protected content({ subscribers }: ChannelStats) {
    return { value: subscribers === null ? "–" : compact(subscribers) };
  }

  protected link() {
    return "https://studio.youtube.com";
  }
}
