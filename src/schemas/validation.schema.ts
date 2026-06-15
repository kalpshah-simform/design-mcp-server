import { z } from "zod";

export const validateDesignInputSchema = z.object({
  components: z.array(z.string()).min(1),
  colors: z.record(z.string(), z.string()).optional(),
  theme: z.string().optional(),
});

export const findingSchema = z.object({
  field: z.string(),
  value: z.string(),
  valid: z.boolean(),
  code: z.string(),
  message: z.string(),
});

export const validateDesignOutputSchema = z.object({
  valid: z.boolean(),
  findings: z.array(findingSchema),
});

export type ValidateDesignInput = z.infer<typeof validateDesignInputSchema>;
export type Finding = z.infer<typeof findingSchema>;
export type ValidateDesignOutput = z.infer<typeof validateDesignOutputSchema>;
