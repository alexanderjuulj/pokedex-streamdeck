import streamDeck, { type SendToPluginEvent } from "@elgato/streamdeck";
import type { JsonObject, JsonValue } from "@elgato/utils";
import { readPassword, savePassword } from "../keychain";
import { getSettings } from "../settings";
import { pokedex } from "../sources";
import { resetLogin, type PokedexData } from "../sources/pokedex";
import { TileAction } from "./tile-action";

type Message = { event?: string; url?: string; username?: string; password?: string };

// The keys that read the Pokédex, and share its login and settings panel.
export abstract class PokedexKey extends TileAction<PokedexData> {
  constructor() {
    super(pokedex);
  }

  protected async link(): Promise<string | undefined> {
    return (await getSettings()).pokedexUrl?.trim();
  }

  // The settings panel (ui/pokedex.html) saves the address, username and
  // password together, so a half-typed username never gets tried as a login.
  override async onSendToPlugin(ev: SendToPluginEvent<JsonValue, JsonObject>) {
    const message = ev.payload as Message;
    if (message.event === "saveLogin") {
      try {
        await streamDeck.settings.setGlobalSettings({
          ...(await getSettings()),
          pokedexUrl: message.url?.trim() ?? "",
          pokedexUser: message.username?.trim() ?? "",
        });
        if (message.password) await savePassword(message.password);
      } catch (error) {
        streamDeck.logger.error(`Saving the login failed: ${String(error)}`);
        await this.#report("Couldn't save the password to the Keychain.");
        return;
      }
      resetLogin();
      await pokedex.refresh();
    }
    await this.#report();
  }

  // The panel asks too (above), but its question can arrive before Stream Deck
  // says it's open, and the SDK drops an answer to a panel it thinks is closed.
  override async onPropertyInspectorDidAppear() {
    await this.#report();
  }

  async #report(failure?: string) {
    const { value, problem, offline } = pokedex;
    let status = failure;
    if (!status && problem === "Login") status = "Wrong username or password, or too many tries.";
    else if (!status && problem === "No goal") status = "Logged in, but there's no Pokédex binder yet.";
    else if (!status && problem) status = "Fill in all three fields.";
    else if (!status && offline) status = "Couldn't reach the Pokédex at that address.";
    else if (!status && value) status = `Logged in: ${value.caught} of ${value.total} caught.`;
    await streamDeck.ui.sendToPropertyInspector({
      event: "status",
      status: status ?? "",
      hasPassword: (await readPassword()) !== null,
    });
  }
}
