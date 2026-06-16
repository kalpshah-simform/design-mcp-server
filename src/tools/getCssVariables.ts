import { loadCssVariables } from "../loaders/cssVariableLoader.js";
import type { CssVariablesResult } from "../schemas/cssVariables.schema.js";

export function getCssVariables(): CssVariablesResult {
  return loadCssVariables();
}
