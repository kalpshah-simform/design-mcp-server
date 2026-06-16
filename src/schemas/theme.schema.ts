import { z } from "zod";

export const themeSchema = z.object({
  name: z.string().optional(),
  colors: z.record(z.string(), z.string()),
  typography: z.object({
    fontFamily: z.string(),
    fontSize: z.record(z.string(), z.string()),
  }),
  spacing: z.record(z.string(), z.string()),
  radius: z.record(z.string(), z.string()),
  shadows: z.record(z.string(), z.string()),
  a11y: z.object({
    buttonMinHeight: z.string(),
    requiredAria: z.boolean(),
  }),
});

export type Theme = z.infer<typeof themeSchema>;
