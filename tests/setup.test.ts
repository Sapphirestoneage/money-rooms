import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Confirms the test runner works and the folder structure from README.md exists.
// Real tests arrive with the data model and the engine.

const root = resolve(import.meta.dirname, "..");
const folders = ["docs", "data", "engine", "ui", "tests/households"];

describe("project setup", () => {
  it.each(folders)("has the %s folder", (folder) => {
    expect(existsSync(resolve(root, folder))).toBe(true);
  });

  it("has the design tokens file", () => {
    expect(existsSync(resolve(root, "ui/tokens.css"))).toBe(true);
  });
});
