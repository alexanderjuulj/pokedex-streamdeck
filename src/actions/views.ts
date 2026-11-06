import { action } from "@elgato/streamdeck";
import { compact } from "../keys/draw";
import { youtube } from "../sources";
import type { ChannelStats } from "../sources/youtube";
import { TileAction } from "./tile-action";

@action({ UUID: "io.github.alexanderjuulj.pokedex.views" })
export class ViewsKey extends TileAction<ChannelStats> {
  protected readonly label = "Views";
  protected readonly color = "electric";

  constructor() {
    super(youtube);
  }

  protected content({ views }: ChannelStats) {
    return { value: compact(views) };
  }

  protected link() {
    return "https://studio.youtube.com";
  }
}
