import { z } from "zod";

export const loginSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),

  rememberMe: z.boolean(),
});

export interface LoginSchemaType {
  username: string;
  password: string;
  rememberMe: boolean;
}