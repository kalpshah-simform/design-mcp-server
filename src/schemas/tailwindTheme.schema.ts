import { z } from "zod";

export const tailwindThemeSchema = z.object({
  colors: z.record(z.string(), z.string()).optional(),
  spacing: z.record(z.string(), z.string()).optional(),
  breakpoints: z.record(z.string(), z.string()).optional(),
  borderRadius: z.record(z.string(), z.string()).optional(),
  boxShadow: z.record(z.string(), z.string()).optional(),
  parserWarnings: z.array(z.string()).optional(),
});

export type TailwindTheme = z.infer<typeof tailwindThemeSchema>;
