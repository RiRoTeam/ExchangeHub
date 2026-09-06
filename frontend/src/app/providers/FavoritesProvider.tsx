import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { addFavorite, listFavorites, removeFavorite } from "../../entities/favorite/api";
import { toFriendlyApiError } from "../../shared/api/problem";
import type { Program } from "../../shared/types/program";
import { useAuth } from "./AuthProvider";

type FavoritesStatus = "idle" | "loading" | "ready" | "error";

type FavoritesContextValue = {
  status: FavoritesStatus;
  /** Полные программы — страница избранного берёт список отсюда, без своего запроса. */
  programs: Program[];
  isFavorite: (programId: number) => boolean;
  /** Идёт запрос по этой программе — кнопку стоит заблокировать. */
  isPending: (programId: number) => boolean;
  toggleFavorite: (program: Program) => Promise<void>;
  /** Ошибка последнего действия; страницы могут её показать. */
  actionError: string;
  loadError: string;
  reload: () => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { status: authStatus } = useAuth();
  const [status, setStatus] = useState<FavoritesStatus>("idle");
  const [programs, setPrograms] = useState<Program[]>([]);
  const [pendingIds, setPendingIds] = useState<number[]>([]);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (authStatus !== "authenticated") {
      // Разлогинились — чужое избранное показывать нельзя.
      setPrograms([]);
      setStatus("idle");
      setLoadError("");
      setActionError("");
      return;
    }

    const abortController = new AbortController();
    let isActive = true;

    async function loadFavorites() {
      setStatus("loading");
      setLoadError("");

      try {
        const nextPrograms = await listFavorites(abortController.signal);

        if (isActive) {
          setPrograms(nextPrograms);
          setStatus("ready");
        }
      } catch (error) {
        if (abortController.signal.aborted || !isActive) {
          return;
        }

        setPrograms([]);
        setStatus("error");
        setLoadError(toFriendlyApiError(error, "We couldn’t load your favorites right now."));
      }
    }

    void loadFavorites();

    return () => {
      isActive = false;
      abortController.abort();
    };
  }, [authStatus, reloadToken]);

  const favoriteIds = useMemo(
    () => new Set(programs.map((program) => program.id)),
    [programs]
  );

  const isFavorite = useCallback(
    (programId: number) => favoriteIds.has(programId),
    [favoriteIds]
  );

  const isPending = useCallback(
    (programId: number) => pendingIds.includes(programId),
    [pendingIds]
  );

  const toggleFavorite = useCallback(
    async (program: Program) => {
      const shouldRemove = favoriteIds.has(program.id);
      const previousPrograms = programs;

      setActionError("");
      setPendingIds((current) => [...current, program.id]);

      // Оптимистично: обе ручки идемпотентны, так что откат безопасен.
      setPrograms((current) =>
        shouldRemove
          ? current.filter((item) => item.id !== program.id)
          : [program, ...current]
      );

      try {
        if (shouldRemove) {
          await removeFavorite(program.id);
        } else {
          await addFavorite(program.id);
        }
      } catch (error) {
        setPrograms(previousPrograms);
        setActionError(
          toFriendlyApiError(
            error,
            shouldRemove
              ? "We couldn’t remove this program from your favorites."
              : "We couldn’t add this program to your favorites."
          )
        );
      } finally {
        setPendingIds((current) => current.filter((id) => id !== program.id));
      }
    },
    [favoriteIds, programs]
  );

  const reload = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  return (
    <FavoritesContext.Provider
      value={{
        status,
        programs,
        isFavorite,
        isPending,
        toggleFavorite,
        actionError,
        loadError,
        reload
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);

  if (!context) {
    throw new Error("useFavorites must be used within FavoritesProvider");
  }

  return context;
}
