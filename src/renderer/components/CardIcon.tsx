import { useState, type ReactElement } from "react";
import { getCardArtworkUrl } from "../cardArtwork.js";
import { STACKED_DECK_ICON } from "../currencyAssets.js";

export function CardIcon({ cardName, compact = false }: { cardName: string; compact?: boolean }): ReactElement {
  const [failedIcon, setFailedIcon] = useState(false);
  const artworkUrl = getCardArtworkUrl(cardName);

  if (artworkUrl && !failedIcon) {
    return (
      <div className={compact ? "card-icon card-artwork compact" : "card-icon card-artwork"}>
        <img src={artworkUrl} alt={`${cardName} card artwork`} onError={() => setFailedIcon(true)} />
      </div>
    );
  }

  return (
    <div className={compact ? "card-icon has-image stacked-deck-icon compact" : "card-icon has-image stacked-deck-icon"}>
      <img src={STACKED_DECK_ICON} alt="" />
    </div>
  );
}
