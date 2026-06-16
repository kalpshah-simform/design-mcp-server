import { z } from "zod";

export const propDefinitionSchema = z.object({
  type: z.enum(["string", "number", "boolean", "enum", "node", "ref"]),
  values: z.array(z.string()).optional(),
  required: z.boolean().default(false),
  default: z.string().optional(),
  description: z.string(),
});

export const componentSchema = z.object({
  description: z.string(),
  props: z.record(z.string(), propDefinitionSchema),
  examples: z.array(z.string()),
  tags: z.array(z.string()),
  aliases: z.array(z.string()).optional(),
  interactive: z.boolean().optional(),
  deprecated: z.boolean().optional(),
  deprecatedVersion: z.string().optional(),
  replacement: z.string().optional(),
  migrationNotes: z.string().optional(),
  docsUrl: z.string().optional(),
  storybookUrl: z.string().optional(),
});

export const componentRegistrySchema = z.record(z.string(), componentSchema);

export type PropDefinition = z.infer<typeof propDefinitionSchema>;
export type ComponentDefinition = z.infer<typeof componentSchema>;
export type ComponentRegistry = z.infer<typeof componentRegistrySchema>;
