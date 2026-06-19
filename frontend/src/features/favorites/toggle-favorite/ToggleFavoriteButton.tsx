type ToggleFavoriteButtonProps = {
  isFavorite: boolean;
};

export function ToggleFavoriteButton({ isFavorite }: ToggleFavoriteButtonProps) {
  return <button type="button">{isFavorite ? "Remove favorite" : "Add favorite"}</button>;
}
