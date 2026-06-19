type ToggleFavoriteButtonProps = {
  isFavorite: boolean;
};

export function ToggleFavoriteButton({ isFavorite }: ToggleFavoriteButtonProps) {
  return (
    <button className="secondary-button" type="button">
      {isFavorite ? "Remove favorite" : "Add favorite"}
    </button>
  );
}
