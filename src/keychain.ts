import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

const SERVICE = "io.github.alexanderjuulj.pokedex";
const ACCOUNT = "pokedex-login";

// Stream Deck keeps global settings in a plain file, so the app's password
// goes in the macOS Keychain. It's stored as hex: `security -w` prints a value
// with non-ASCII letters (æ, ø) as hex itself, so a plain one couldn't be read
// back reliably.

// `security -i` takes the command on stdin, keeping the password out of the
// process list. It exits 0 whether the command worked or not, so this reads the
// value back to check.
export async function savePassword(password: string): Promise<void> {
  const hex = Buffer.from(password, "utf8").toString("hex");
  await new Promise<void>((resolve, reject) => {
    const child = spawn("/usr/bin/security", ["-i"], { stdio: ["pipe", "ignore", "ignore"] });
    child.on("error", reject);
    child.on("close", () => resolve());
    child.stdin.end(`add-generic-password -U -a ${ACCOUNT} -s ${SERVICE} -w ${hex}\n`);
  });
  if ((await readPassword()) !== password) throw new Error("Couldn't save to the Keychain");
}

export async function readPassword(): Promise<string | null> {
  try {
    const { stdout } = await promisify(execFile)("/usr/bin/security", [
      "find-generic-password",
      "-a",
      ACCOUNT,
      "-s",
      SERVICE,
      "-w",
    ]);
    return Buffer.from(stdout.trim(), "hex").toString("utf8");
  } catch {
    return null;
  }
}
