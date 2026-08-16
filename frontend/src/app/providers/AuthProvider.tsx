import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from "react";
import { authenticate, fetchCurrentUser, refreshAuthTokens } from "../../entities/auth/api";
import { AdminAccessRequiredError, toFriendlyAuthError } from "../../entities/auth/errors";
import {
  clearStoredSession,
  readStoredSession,
  writeStoredSession
} from "../../entities/auth/storage";
import { ApiError } from "../../shared/api/http";
import {
  registerAuthBridge,
  unregisterAuthBridge,
  type AuthBridge
} from "../../shared/api/authBridge";
import type { Session, SignInPayload } from "../../shared/types/auth";

type AuthStatus = "bootstrapping" | "anonymous" | "authenticated";

type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  signIn: (payload: SignInPayload) => Promise<Session>;
  signOut: () => void;
  refreshSession: () => Promise<Session | null>;
};

type AuthProviderProps = {
  children: ReactNode;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isUnauthorizedError(error: unknown) {
  return error instanceof ApiError && error.status === 401;
}

async function buildSessionFromTokens(
  tokens: Pick<Session, "accessToken" | "refreshToken">,
  mode: Session["mode"],
  createdAt = new Date().toISOString()
) {
  const user = await fetchCurrentUser(tokens.accessToken);

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user,
    mode,
    createdAt
  } satisfies Session;
}

async function rehydrateStoredSession(storedSession: Session) {
  try {
    return await buildSessionFromTokens(
      {
        accessToken: storedSession.accessToken,
        refreshToken: storedSession.refreshToken
      },
      storedSession.mode,
      storedSession.createdAt
    );
  } catch (error) {
    if (!isUnauthorizedError(error)) {
      return storedSession;
    }

    const refreshedTokens = await refreshAuthTokens(storedSession.refreshToken);

    return buildSessionFromTokens(
      {
        accessToken: refreshedTokens.accessToken,
        refreshToken: refreshedTokens.refreshToken
      },
      storedSession.mode,
      storedSession.createdAt
    );
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>("bootstrapping");
  const [session, setSession] = useState<Session | null>(null);

  // Актуальная сессия для http-слоя: он живёт вне React и не может читать state.
  const sessionRef = useRef<Session | null>(null);
  // Один общий promise на все параллельные 401 — чтобы не жечь refresh-токен гонкой.
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  const applySession = useCallback((nextSession: Session) => {
    sessionRef.current = nextSession;
    writeStoredSession(nextSession);
    setSession(nextSession);
    setStatus("authenticated");
  }, []);

  const resetSession = useCallback(() => {
    sessionRef.current = null;
    clearStoredSession();
    setSession(null);
    setStatus("anonymous");
  }, []);

  // ── Мост для http-слоя ──────────────────────────────────────────────────────
  useEffect(() => {
    const bridge: AuthBridge = {
      getAccessToken: () => sessionRef.current?.accessToken ?? null,

      refreshAccessToken: () => {
        const currentSession = sessionRef.current;

        if (!currentSession) {
          return Promise.resolve(null);
        }

        if (!refreshPromiseRef.current) {
          refreshPromiseRef.current = (async () => {
            try {
              const tokens = await refreshAuthTokens(currentSession.refreshToken);

              applySession({
                ...currentSession,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken
              });

              return tokens.accessToken;
            } catch {
              resetSession();
              return null;
            } finally {
              refreshPromiseRef.current = null;
            }
          })();
        }

        return refreshPromiseRef.current;
      },

      onSessionExpired: () => {
        resetSession();
      }
    };

    registerAuthBridge(bridge);

    return () => {
      unregisterAuthBridge(bridge);
    };
  }, [applySession, resetSession]);

  // ── Восстановление сессии при загрузке ──────────────────────────────────────
  useEffect(() => {
    let isCancelled = false;

    async function bootstrapSession() {
      const storedSession = readStoredSession();

      if (!storedSession) {
        if (!isCancelled) {
          resetSession();
        }

        return;
      }

      try {
        const nextSession = await rehydrateStoredSession(storedSession);

        if (!isCancelled) {
          startTransition(() => {
            applySession(nextSession);
          });
        }
      } catch {
        if (!isCancelled) {
          resetSession();
        } else {
          clearStoredSession();
        }
      }
    }

    void bootstrapSession();

    return () => {
      isCancelled = true;
    };
  }, [applySession, resetSession]);

  async function signIn(payload: SignInPayload) {
    try {
      const tokens = await authenticate(payload.mode, payload);
      const nextSession = await buildSessionFromTokens(tokens, payload.mode);

      if (payload.mode === "admin-login" && nextSession.user.role !== "ADMIN") {
        throw new AdminAccessRequiredError();
      }

      startTransition(() => {
        applySession(nextSession);
      });

      return nextSession;
    } catch (error) {
      resetSession();
      throw new Error(toFriendlyAuthError(error, payload.mode));
    }
  }

  async function refreshSession() {
    const currentSession = sessionRef.current ?? session;

    if (!currentSession) {
      return null;
    }

    try {
      const refreshedTokens = await refreshAuthTokens(currentSession.refreshToken);
      const nextSession = await buildSessionFromTokens(
        {
          accessToken: refreshedTokens.accessToken,
          refreshToken: refreshedTokens.refreshToken
        },
        currentSession.mode,
        currentSession.createdAt
      );

      applySession(nextSession);

      return nextSession;
    } catch {
      resetSession();
      return null;
    }
  }

  function signOut() {
    resetSession();
  }

  return (
    <AuthContext.Provider
      value={{
        status,
        session,
        signIn,
        signOut,
        refreshSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
