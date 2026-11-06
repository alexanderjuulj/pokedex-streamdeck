import { action } from "@elgato/streamdeck";
import type { PokedexData } from "../sources/pokedex";
import { PokedexKey } from "./pokedex-key";

@action({ UUID: "io.github.alexanderjuulj.pokedex.caught" })
export class CaughtKey extends PokedexKey {
  protected readonly label = "Pokédex";
  protected readonly color = "primary";
  protected override readonly empty = { value: "–", progress: 0 };

  protected content({ caught, total }: PokedexData) {
    return { value: String(caught), suffix: `/${total}`, progress: caught / total };
  }
}
