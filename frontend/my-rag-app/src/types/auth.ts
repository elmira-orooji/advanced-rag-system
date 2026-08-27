export type UserRole = "admin" | "user";

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  organization_id: string;
  organization_name: string;
  organization_slug: string;
}

export interface AuthSession {
  accessToken: string;
  expiresAt: number | null;
  user: AuthUser;
}

export interface LoginResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number | null;
  user: AuthUser;
}
