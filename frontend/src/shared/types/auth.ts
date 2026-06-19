export type AuthMode = "user-login" | "user-register" | "admin-login";

export type Session = {
  accessToken: string;
  refreshToken: string;
  email: string;
  name: string;
  mode: AuthMode;
  createdAt: string;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  email: string;
  name: string;
  password: string;
};
