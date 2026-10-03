/**
 * The engine. Pure functions only: data in, results out.
 * The UI imports from here and never does math of its own.
 */

export * from "./model";
export * from "./tax/brackets";
export * from "./tax/federal";
export * from "./tax/state";
export * from "./social-security/benefit";
export * from "./projection/bands";
export * from "./projection/income";
export * from "./projection/spending";
export * from "./projection/debts";
export * from "./projection/accounts";
export * from "./projection/limits";
export * from "./projection/timeline";
export * from "./projection/fi";
export * from "./projection/trace";
