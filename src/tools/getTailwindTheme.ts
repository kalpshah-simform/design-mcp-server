import { loadTailwindTheme } from "../loaders/tailwindLoader.js";
import type { TailwindTheme } from "../schemas/tailwindTheme.schema.js";

export function getTailwindTheme(): TailwindTheme {
  return loadTailwindTheme();
}
