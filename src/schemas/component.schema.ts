import { z } from "zod";

export const componentSchema = z.object({
  description: z.string(),
  props: z.record(z.string(), z.array(z.string())),
  examples: z.array(z.string()),
  tags: z.array(z.string()),
  deprecated: z.boolean().optional(),
  deprecatedVersion: z.string().optional(),
  replacement: z.string().optional(),
  migrationNotes: z.string().optional(),
});

export const componentRegistrySchema = z.record(z.string(), componentSchema);

export type ComponentDefinition = z.infer<typeof componentSchema>;
export type ComponentRegistry = z.infer<typeof componentRegistrySchema>;
