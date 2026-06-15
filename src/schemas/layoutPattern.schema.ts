import { z } from "zod";

export const slotSchema = z.object({
  description: z.string(),
  suggestedComponents: z.array(z.string()),
});

export const layoutPatternSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  slots: z.record(z.string(), slotSchema),
  example: z.string(),
});

export const layoutPatternRegistrySchema = z.record(
  z.string(),
  layoutPatternSchema,
);

export type SlotDefinition = z.infer<typeof slotSchema>;
export type LayoutPattern = z.infer<typeof layoutPatternSchema>;
export type LayoutPatternRegistry = z.infer<typeof layoutPatternRegistrySchema>;
