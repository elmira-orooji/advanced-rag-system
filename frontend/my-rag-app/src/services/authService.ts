import type { LoginSchemaType } from "../schemas/loginSchema";

export const authService = {
  async login(data: LoginSchemaType) {
    await new Promise((resolve) =>
      setTimeout(resolve, 1500)
    );

    console.log("Login data:", data);

    return {
      success: true,
    };
  },
};