import {
  createContext,
  startTransition,
  useContext,
  useEffect,
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

  useEffect(() => {
    let isCancelled = false;

    async function bootstrapSession() {
      const storedSession = readStoredSession();

      if (!storedSession) {
        if (!isCancelled) {
          setSession(null);
          setStatus("anonymous");
        }

        return;
      }

      try {
        const nextSession = await rehydrateStoredSession(storedSession);
        writeStoredSession(nextSession);

        if (!isCancelled) {
          startTransition(() => {
            setSession(nextSession);
            setStatus("authenticated");
          });
        }
      } catch {
        clearStoredSession();

        if (!isCancelled) {
          setSession(null);
          setStatus("anonymous");
        }
      }
    }

    void bootstrapSession();

    return () => {
      isCancelled = true;
    };
  }, []);

  async function signIn(payload: SignInPayload) {
    try {
      const tokens = await authenticate(payload.mode, payload);
      const nextSession = await buildSessionFromTokens(tokens, payload.mode);

      if (payload.mode === "admin-login" && nextSession.user.role !== "ADMIN") {
        throw new AdminAccessRequiredError();
      }

      writeStoredSession(nextSession);
      startTransition(() => {
        setSession(nextSession);
        setStatus("authenticated");
      });

      return nextSession;
    } catch (error) {
      clearStoredSession();
      setSession(null);
      setStatus("anonymous");
      throw new Error(toFriendlyAuthError(error, payload.mode));
    }
  }

  async function refreshSession() {
    if (!session) {
      return null;
    }

    try {
      const refreshedTokens = await refreshAuthTokens(session.refreshToken);
      const nextSession = await buildSessionFromTokens(
        {
          accessToken: refreshedTokens.accessToken,
          refreshToken: refreshedTokens.refreshToken
        },
        session.mode,
        session.createdAt
      );

      writeStoredSession(nextSession);
      setSession(nextSession);
      setStatus("authenticated");

      return nextSession;
    } catch {
      clearStoredSession();
      setSession(null);
      setStatus("anonymous");
      return null;
    }
  }

  function signOut() {
    clearStoredSession();
    setSession(null);
    setStatus("anonymous");
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
