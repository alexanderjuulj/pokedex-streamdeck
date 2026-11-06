import { action } from "@elgato/streamdeck";
import type { TileColor } from "../keys/draw";
import { claude } from "../sources";
import type { ClaudeUsage, UsageWindow } from "../sources/claude";
import { TileAction } from "./tile-action";

// An HP bar's colors, turned around: the games go yellow at half HP and red
// below a fifth.
const hpColor = (used: number): TileColor => (used >= 80 ? "primary" : used >= 50 ? "electric" : "grass");

function timeLeft(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`;
}

abstract class ClaudeKey extends TileAction<ClaudeUsage> {
  protected readonly label = "Claude";
  protected readonly color = "grass";
  protected override readonly empty = { value: "–", progress: 0 };
  protected abstract pick(usage: ClaudeUsage): UsageWindow;

  constructor() {
    super(claude);
  }

  protected content(usage: ClaudeUsage) {
    const { percent, resetsAt } = this.pick(usage);
    const left = resetsAt ? Date.parse(resetsAt) - Date.now() : null;
    // The window can reset between two answers, and then it's empty again.
    const used = left !== null && left <= 0 ? 0 : Math.min(100, Math.round(percent));
    return {
      color: hpColor(used),
      value: `${used}%`,
      suffix: left !== null && left > 0 ? ` ${timeLeft(left)}` : undefined,
      progress: used / 100,
    };
  }

  protected link() {
    return "https://claude.ai/settings/usage";
  }
}

@action({ UUID: "io.github.alexanderjuulj.pokedex.claude-5h" })
export class ClaudeSessionKey extends ClaudeKey {
  protected override readonly corner = "5h";
  protected pick(usage: ClaudeUsage) {
    return usage.session;
  }
}

@action({ UUID: "io.github.alexanderjuulj.pokedex.claude-7d" })
export class ClaudeWeekKey extends ClaudeKey {
  protected override readonly corner = "7d";
  protected pick(usage: ClaudeUsage) {
    return usage.week;
  }
}
