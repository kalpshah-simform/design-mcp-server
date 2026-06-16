import { z } from "zod";

export const cssVariablesResultSchema = z.object({
  // Flat map: last declaration wins (CSS cascade order). Keys include the -- prefix.
  variables: z.record(z.string(), z.string()),
  // Same data grouped by selector (:root, .dark, [data-theme="dark"], etc.)
  bySelector: z.record(z.string(), z.record(z.string(), z.string())),
  // Relative paths of every CSS file that contributed at least one variable
  sources: z.array(z.string()),
});

export type CssVariablesResult = z.infer<typeof cssVariablesResultSchema>;
