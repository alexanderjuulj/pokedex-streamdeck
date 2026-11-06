import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NeedsAttention } from "../poller";

export type UsageWindow = { percent: number; resetsAt: string | null };
export type ClaudeUsage = { session: UsageWindow; week: UsageWindow };

type ApiWindow = { utilization?: number | null; resets_at?: string | null } | null;
type UsageResponse = { five_hour?: ApiWindow; seven_day?: ApiWindow };

// Claude Code keeps its login in the Keychain and renews it itself. Only ever
// read it here: renewing it from here could invalidate the copy Claude Code holds.
async function readToken(): Promise<string> {
  try {
    const { stdout } = await promisify(execFile)("/usr/bin/security", [
      "find-generic-password",
      "-s",
      "Claude Code-credentials",
      "-w",
    ]);
    const { claudeAiOauth } = JSON.parse(stdout) as { claudeAiOauth?: { accessToken?: string } };
    if (claudeAiOauth?.accessToken) return claudeAiOauth.accessToken;
  } catch {
    // Not logged in. Not logged either: a parse error can quote what it read.
  }
  throw new NeedsAttention("Sign in");
}

const toWindow = (window: ApiWindow | undefined): UsageWindow => ({
  percent: window?.utilization ?? 0,
  resetsAt: window?.resets_at ?? null,
});

// Not a documented API, so it can change without notice. An expired login
// answers 401 and counts as out of date, until Claude Code next runs.
export async function loadClaudeUsage(): Promise<ClaudeUsage> {
  const response = await fetch("https://api.anthropic.com/api/oauth/usage", {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${await readToken()}`,
      "anthropic-beta": "oauth-2025-04-20",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Claude's usage answered ${response.status}`);
  const body = (await response.json()) as UsageResponse;
  // A window can be missing while it's unused, but not both: then it's changed.
  if (!body.five_hour && !body.seven_day) throw new Error("Claude's usage had neither window");
  return { session: toWindow(body.five_hour), week: toWindow(body.seven_day) };
}
