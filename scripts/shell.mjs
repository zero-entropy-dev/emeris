/**
 * Native shell launcher — shared by Emeris meadow and sibling worlds.
 * The exe lives in emeris/shell/out/; products pass title/profile/icon only.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const EMERIS_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const SHELL_EXE = join(EMERIS_ROOT, "shell", "out", "EmerisShell.exe");

/**
 * @param {{ url: string, title: string, profile: string, icon?: string, browsers?: string[] }} opts
 * @returns {boolean} true when the native shell was started
 */
export function openShell(opts) {
  const { url, title, profile, icon, browsers = DEFAULT_BROWSERS } = opts;

  if (!existsSync(SHELL_EXE)) {
    console.warn(
      `\nEmeris shell not built — using browser app window (browser taskbar icon).` +
        `\nBuild once from emeris/: npm run shell:build` +
        `\nRequires: winget install Microsoft.DotNet.SDK.8\n`,
    );
    openBrowserFallback(url, browsers);
    return false;
  }

  const args = ["--url", url, "--title", title, "--profile", profile];
  if (icon && existsSync(icon)) args.push("--icon", icon);

  // `start` is the reliable way to raise a GUI process from IDE debug terminals.
  const child = spawn("cmd.exe", ["/c", "start", "", SHELL_EXE, ...args], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.on("error", (err) => {
    console.error("Emeris shell launch failed:", err.message);
    openBrowserFallback(url, browsers);
  });
  child.unref();
  return true;
}

const DEFAULT_BROWSERS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

function openBrowserFallback(url, browsers) {
  const browser = browsers.find((p) => existsSync(p));
  const child = browser
    ? spawn(browser, [`--app=${url}`, "--window-size=1280,800"], {
        detached: true,
        stdio: "ignore",
      })
    : spawn("cmd", ["/c", "start", "", url], {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      });
  child.unref();
}
