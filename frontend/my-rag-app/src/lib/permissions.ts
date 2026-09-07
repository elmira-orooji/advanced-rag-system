import type { AuthUser } from "../types/auth";

export function canManageUsers(user: AuthUser | null | undefined) {
  return user?.role === "admin";
}

export function canManageKnowledge(user: AuthUser | null | undefined) {
  return user?.role === "admin";
}
