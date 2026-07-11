import type { CSSProperties, ReactElement } from "react";
import { influenceLabel, type InfluenceId } from "../../itemTooltip/index.js";

export function InfluenceIcons({ influences }: { influences: InfluenceId[] }): ReactElement | null {
  if (influences.length === 0) return null;
  const visible = influences.slice(0, 2);
  return (
    <span
      className={`item-influence-icons${visible.length === 2 ? " is-double" : ""}`}
      aria-label={`${visible.map(influenceLabel).join(" and ")} influenced`}
      title={`${visible.map(influenceLabel).join(" + ")} Item`}
    >
      {visible.map((influence, index) => (
        <span className={`item-influence-icon influence-${influence}`} key={influence} style={{ "--influence-index": index } as CSSProperties}>
          <InfluenceGlyph influence={influence} />
        </span>
      ))}
    </span>
  );
}

function InfluenceGlyph({ influence }: { influence: InfluenceId }): ReactElement {
  const abbreviation = influenceLabel(influence).split(" ").map((word) => word[0]).join("");
  return (
    <svg viewBox="0 0 32 32" role="img" aria-label={influenceLabel(influence)}>
      <path className="influence-glyph-ring" d="M16 2 21 9 30 11 24 18 25 28 16 24 7 28 8 18 2 11 11 9Z" />
      <circle cx="16" cy="16" r="8" />
      <text x="16" y="19.25" textAnchor="middle">{abbreviation}</text>
    </svg>
  );
}
