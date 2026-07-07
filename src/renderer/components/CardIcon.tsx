import { useState, type ReactElement } from "react";
import { STACKED_DECK_ICON } from "../currencyAssets.js";

export function CardIcon(): ReactElement {
  const [failedIcon, setFailedIcon] = useState(false);

  if (!failedIcon) {
    return (
      <div className="card-icon has-image stacked-deck-icon">
        <img src={STACKED_DECK_ICON} alt="" onError={() => setFailedIcon(true)} />
      </div>
    );
  }

  return (
    <div className="card-icon fallback" aria-hidden="true">
      SD
    </div>
  );
}
