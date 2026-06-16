import { z } from "zod";

const responsiveBehaviorSchema = z.object({
  sm: z.string().optional(),
  md: z.string().optional(),
  lg: z.string().optional(),
});

export const slotSchema = z.object({
  description: z.string(),
  suggestedComponents: z.array(z.string()),
  responsive: responsiveBehaviorSchema.optional(),
});

export const layoutPatternSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  slots: z.record(z.string(), slotSchema),
  example: z.string(),
  breakpoints: responsiveBehaviorSchema.optional(),
  mobileExample: z.string().optional(),
});

export const layoutPatternRegistrySchema = z.record(
  z.string(),
  layoutPatternSchema,
);

export type ResponsiveBehavior = z.infer<typeof responsiveBehaviorSchema>;
export type SlotDefinition = z.infer<typeof slotSchema>;
export type LayoutPattern = z.infer<typeof layoutPatternSchema>;
export type LayoutPatternRegistry = z.infer<typeof layoutPatternRegistrySchema>;
