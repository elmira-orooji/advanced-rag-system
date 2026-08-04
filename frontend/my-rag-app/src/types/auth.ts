export type UserRole = "admin" | "user";

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
}

export interface AuthSession {
  accessToken: string;
  expiresAt: number;
  user: AuthUser;
}

export interface LoginResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  user: AuthUser;
}
