import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { addFavorite, listFavorites, removeFavorite } from "../../entities/favorite/api";
import { useTranslation } from "react-i18next";
import { useApiErrorText } from "../../shared/i18n/useApiErrorText";
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
  const { t } = useTranslation();
  const toErrorText = useApiErrorText();
  const { status: authStatus, session } = useAuth();
  const [status, setStatus] = useState<FavoritesStatus>("idle");
  const [programs, setPrograms] = useState<Program[]>([]);
  const [pendingIds, setPendingIds] = useState<number[]>([]);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const sessionGenerationRef = useRef(0);
  const sessionOwnerRef = useRef<number | null>(null);
  const mutationRevisionRef = useRef(0);

  useEffect(() => {
    const ownerId = authStatus === "authenticated" ? session?.user.id ?? null : null;
    if (sessionOwnerRef.current !== ownerId) {
      sessionOwnerRef.current = ownerId;
      sessionGenerationRef.current += 1;
      mutationRevisionRef.current += 1;
      setPendingIds([]);
    }

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
    const revisionAtLoadStart = mutationRevisionRef.current;

    async function loadFavorites() {
      setStatus("loading");
      setLoadError("");

      try {
        const nextPrograms = await listFavorites(abortController.signal);

        if (isActive) {
          // A mutation may complete while this request is in flight. Never let
          // its older snapshot overwrite the optimistic, server-confirmed UI.
          if (mutationRevisionRef.current === revisionAtLoadStart) {
            setPrograms(nextPrograms);
          }
          setStatus("ready");
        }
      } catch (error) {
        if (abortController.signal.aborted || !isActive) {
          return;
        }

        setPrograms([]);
        setStatus("error");
        setLoadError(toErrorText(error, t("favorites.loadError")));
      }
    }

    void loadFavorites();

    return () => {
      isActive = false;
      abortController.abort();
    };
  }, [authStatus, reloadToken, session?.user.id, t]);

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
      const generation = sessionGenerationRef.current;
      mutationRevisionRef.current += 1;

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
        if (sessionGenerationRef.current === generation) {
          // Откатываем только эту программу: восстановление устаревшего снимка
          // стёрло бы параллельно завершившийся запрос по другой карточке.
          setPrograms((current) =>
            shouldRemove
              ? current.some((item) => item.id === program.id)
                ? current
                : [program, ...current]
              : current.filter((item) => item.id !== program.id)
          );
          setActionError(
            toErrorText(
              error,
              shouldRemove ? t("favorites.removeError") : t("favorites.addError")
            )
          );
        }
      } finally {
        if (sessionGenerationRef.current === generation) {
          setPendingIds((current) => current.filter((id) => id !== program.id));
        }
      }
    },
    [favoriteIds, t, toErrorText]
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
