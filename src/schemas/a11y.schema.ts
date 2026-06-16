import { z } from "zod";

export const a11yFindingSchema = z.object({
  field: z.string(),
  valid: z.boolean(),
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export const validateA11yInputSchema = z.object({
  componentName: z.string(),
  props: z.record(z.string(), z.unknown()).optional(),
  theme: z.string().optional(),
});

export const validateA11yOutputSchema = z.object({
  valid: z.boolean(),
  findings: z.array(a11yFindingSchema),
});

export type A11yFinding = z.infer<typeof a11yFindingSchema>;
export type ValidateA11yInput = z.infer<typeof validateA11yInputSchema>;
export type ValidateA11yOutput = z.infer<typeof validateA11yOutputSchema>;
