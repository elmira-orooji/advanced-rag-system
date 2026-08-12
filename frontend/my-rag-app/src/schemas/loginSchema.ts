import { z } from "zod";

export const loginSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),

  rememberMe: z.boolean(),
  organization: z.string().min(2).max(80).default("default"),
});

export interface LoginSchemaType {
  username: string;
  password: string;
  rememberMe: boolean;
  organization: string;
}
