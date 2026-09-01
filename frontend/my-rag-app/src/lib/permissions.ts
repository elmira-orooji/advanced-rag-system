import type { AuthUser } from "../types/auth";

export function canManageUsers(user: AuthUser | null | undefined) {
  return user?.role === "admin";
}
