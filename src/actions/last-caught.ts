import { action } from "@elgato/streamdeck";
import { rasterize } from "../keys/raster";
import { getSettings } from "../settings";
import { pokedex } from "../sources";
import type { PokedexData } from "../sources/pokedex";
import { PokedexKey } from "./pokedex-key";

@action({ UUID: "io.github.alexanderjuulj.pokedex.last-caught" })
export class LastCaughtKey extends PokedexKey {
  protected readonly label = "Last caught";
  protected readonly color = "primary";

  protected content({ last }: PokedexData) {
    if (!last) return { value: "None yet" };
    return {
      label: last.name,
      color: last.type,
      value: `#${String(last.id).padStart(3, "0")}`,
      art: last.art,
    };
  }

  protected override encode(svg: string) {
    return rasterize(svg);
  }

  protected override async link() {
    const base = (await getSettings()).pokedexUrl?.trim();
    const id = pokedex.value?.last?.id;
    return base && id ? new URL(`/pokedex/${id}`, base).href : base;
  }
}
