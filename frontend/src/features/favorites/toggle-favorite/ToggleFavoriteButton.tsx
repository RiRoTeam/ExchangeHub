import { useFavorites } from "../../../app/providers/FavoritesProvider";
import type { Program } from "../../../shared/types/program";

type ToggleFavoriteButtonProps = {
  program: Program;
  /** На детальной странице кнопка крупнее, чем в карточке списка. */
  size?: "compact" | "large";
};

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      fill={filled ? "currentColor" : "none"}
      focusable="false"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M12 20.4 4.6 13a4.8 4.8 0 0 1 6.8-6.8l.6.6.6-.6A4.8 4.8 0 1 1 19.4 13Z" />
    </svg>
  );
}

export function ToggleFavoriteButton({ program, size = "compact" }: ToggleFavoriteButtonProps) {
  const { isFavorite, isPending, toggleFavorite } = useFavorites();

  const active = isFavorite(program.id);
  const pending = isPending(program.id);
  const label = active ? `Remove ${program.title} from favorites` : `Save ${program.title} to favorites`;

  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={`favorite-button favorite-button--${size} ${active ? "favorite-button--active" : ""}`}
      disabled={pending}
      onClick={(event) => {
        // Карточка обёрнута ссылкой на детальную — клик по сердцу туда вести не должен.
        event.preventDefault();
        event.stopPropagation();
        void toggleFavorite(program);
      }}
      title={active ? "Remove from favorites" : "Save to favorites"}
      type="button"
    >
      <HeartIcon filled={active} />
    </button>
  );
}
