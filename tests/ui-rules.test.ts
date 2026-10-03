/**
 * M1 "done when" item 4: no screen file contains a hard-coded color.
 * Colors live only in ui/tokens.css. This test reads the UI source files and
 * fails if any of them defines a color literal.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const uiRoot = join(import.meta.dirname, "..", "ui");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|css|html)$/.test(name) && !name.endsWith(".test.ts")) out.push(full);
  }
  return out;
}

const HEX = /#[0-9a-fA-F]{3,8}\b/;
const FUNCTIONAL = /\b(rgb|rgba|hsl|hsla)\(/;
const NAMED = /\b(?:color|background|fill|stroke|border-color)\s*:\s*(red|green|blue|white|black|gray|grey|orange|yellow|purple)\b/;

describe("UI files define no colors of their own", () => {
  const files = walk(uiRoot).filter((f) => !f.endsWith("tokens.css"));

  it("found the UI files", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it.each(files.map((f) => [relative(uiRoot, f), f]))("%s has no hard-coded color", (_name, file) => {
    const text = readFileSync(file, "utf8");
    for (const [n, line] of text.split("\n").entries()) {
      const stripped = line.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "");
      // Allow hash routes like "#/result" and ids like "#app".
      const candidate = stripped.replace(/#\/[a-z]+/g, "").replace(/#[a-z][\w-]*(?=['"\s)])/g, "");
      expect(HEX.test(candidate), `line ${n + 1}: ${line.trim()}`).toBe(false);
      expect(FUNCTIONAL.test(candidate), `line ${n + 1}: ${line.trim()}`).toBe(false);
      expect(NAMED.test(candidate), `line ${n + 1}: ${line.trim()}`).toBe(false);
    }
  });
});

describe("the dense entry screen keeps its accessibility and spacing rules", () => {
  const read = (...parts: string[]) => readFileSync(join(uiRoot, ...parts), "utf8");

  it("the tap target size lives only in tokens.css", () => {
    expect(read("tokens.css")).toContain("--tap-target: 44px");
    for (const file of walk(uiRoot).filter((f) => f.endsWith(".css") && !f.endsWith("tokens.css"))) {
      expect(readFileSync(file, "utf8").includes("44px"), relative(uiRoot, file)).toBe(false);
    }
    expect(read("components.css")).toMatch(/\.dense-row \{[^}]*min-height: var\(--tap-target\)/);
    expect(read("components.css")).toMatch(/\.section-header \{[^}]*min-height: var\(--tap-target\)/);
  });

  it("sections sit one section gap apart", () => {
    expect(read("tokens.css")).toContain("--section-gap: var(--space-5)");
    expect(read("components.css")).toMatch(/\.card--section \{[^}]*margin-bottom: var\(--section-gap\)/);
  });

  it("the section caret is a real button with aria-expanded, inside the heading", () => {
    const source = read("components", "collapsible-section.ts");
    expect(source).toMatch(/"button",\s*\{ type: "button", class: "section-header", "aria-expanded"/);
    expect(source).toContain('"aria-controls": bodyId');
    expect(source).toContain('el("h2", { class: "section-heading" }, button)');
  });

  it("a row is a real button, and its open editor is a labeled group", () => {
    const source = read("components", "dense-row.ts");
    expect(source).toMatch(/"button",\s*\{ type: "button", class: "dense-row__main", "aria-expanded": "false"/);
    expect(source).toContain('role: "group", "aria-label": `Editing ${o.name}`');
  });
});
