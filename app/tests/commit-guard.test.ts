import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const scriptPath = fileURLToPath(new URL("../../scripts/check-no-client-files.mjs", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

function run(paths: string[]): { code: number; stderr: string } {
  try {
    execFileSync("node", [scriptPath, ...paths], { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, stderr: "" };
  } catch (error) {
    const e = error as { status: number; stderr: Buffer };
    return { code: e.status, stderr: e.stderr.toString() };
  }
}

describe("no client data in the repo (CLAUDE.md, DATA_MODEL.md section 6)", () => {
  it("flags anything under clients/ or named *.client.json, and nothing else", async () => {
    const { offendingPaths } = (await import(scriptPath)) as { offendingPaths: (p: string[]) => string[] };
    expect(offendingPaths(["clients/a.json", "app/clients/b.json", "household-a.2026-10-05.client.json", "deep/path/x.CLIENT.JSON"])).toEqual(["clients/a.json", "app/clients/b.json", "household-a.2026-10-05.client.json", "deep/path/x.CLIENT.JSON"]);
    expect(offendingPaths(["app/core/clients.ts", "app/tests/clients.test.ts", "app/tests/households/household-a.template.json", "docs/clients.md", "myclients/x.json"])).toEqual([]);
  });

  it("the script exits non-zero and names the files when given client files", () => {
    const bad = run(["app/core/clients.ts", "clients/rosa.json", "x.client.json"]);
    expect(bad.code).toBe(1);
    expect(bad.stderr).toMatch(/Refused/);
    expect(bad.stderr).toMatch(/clients\/rosa\.json/);
    expect(bad.stderr).toMatch(/x\.client\.json/);
    expect(bad.stderr).not.toMatch(/clients\.ts/);
    expect(run(["app/core/clients.ts"]).code).toBe(0);
  });

  it("the pre-commit hook runs the script and .gitignore keeps client files out", () => {
    const hook = readFileSync(`${repoRoot}.githooks/pre-commit`, "utf8");
    expect(hook).toMatch(/check-no-client-files\.mjs/);
    const ignore = readFileSync(`${repoRoot}.gitignore`, "utf8").split("\n");
    expect(ignore).toContain("/clients/");
    expect(ignore).toContain("*.client.json");
    const pkg = JSON.parse(readFileSync(`${repoRoot}package.json`, "utf8")) as { scripts: Record<string, string> };
    expect(pkg.scripts["prepare"]).toMatch(/core\.hooksPath \.githooks/);
    expect(existsSync(`${repoRoot}clients`)).toBe(false);
  });
});
