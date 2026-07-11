import type { ReactElement, ReactNode } from "react";
import { formatDropRate, formatPercent } from "../../shared/format.js";
import type { PriceSnapshot, SessionCard, Settings } from "../../shared/types.js";
import { CurrencyAmount } from "../CurrencyAmount.js";
import { getCardArtworkUrl } from "../cardArtwork.js";
import { parseRewardSpecification } from "../../itemTooltip/index.js";
import {
  getDivinationCardMetadata,
  type DivinationCardMetadata
} from "../divinationCardMetadata.js";
import { ItemHover, type ItemHoverStat } from "./ItemHover.js";
import { InfluenceIcons } from "./InfluenceIcons.js";

export function CardItemHover({
  card,
  children,
  className,
  currencyMode,
  currencySnapshot,
  totalCards
}: {
  card: SessionCard;
  children: ReactNode;
  className?: string;
  currencyMode: Settings["currencyMode"];
  currencySnapshot?: PriceSnapshot;
  totalCards: number;
}): ReactElement {
  const metadata = getDivinationCardMetadata(card.name);
  const stats: ItemHoverStat[] = [
    {
      label: "Market value",
      value: <CurrencyAmount mode={currencyMode} snapshot={currencySnapshot} valueChaos={card.priceChaos} />,
      tone: card.priceChaos === null ? "muted" : "good"
    },
    { label: "Observed", value: `${card.count.toLocaleString()} drop${card.count === 1 ? "" : "s"}` },
    { label: "Drop rate", value: formatDropRate(card.count, totalCards), tone: "accent" },
    {
      label: "7-day change",
      value: formatPercent(card.change7d),
      tone: typeof card.change7d === "number" ? (card.change7d >= 0 ? "good" : "bad") : "muted"
    },
    { label: "Price source", value: formatPriceSource(card.priceSource) },
    { label: "Confidence", value: formatConfidence(card.priceConfidence) }
  ];

  return (
    <ItemHover
      className={className}
      data={{
        name: card.name,
        category: "Divination Card",
        rarity: "divination",
        imageSrc: getCardArtworkUrl(card.name),
        imageAlt: `${card.name} divination card artwork`,
        imageFit: "cover",
        imageOverlay: metadata?.stackSize ? (
          <span className="divination-hover-stack" title="Maximum stack size">
            {metadata.stackSize}/{metadata.stackSize}
          </span>
        ) : undefined,
        primaryDetails: metadata ? <DivinationCardGameDetails metadata={metadata} /> : undefined,
        stats,
        footer: card.isValueIgnored ? "Excluded from profit totals by player preference." : "Hover values use the active price snapshot."
      }}
    >
      {children}
    </ItemHover>
  );
}

function DivinationCardGameDetails({ metadata }: { metadata: DivinationCardMetadata }): ReactElement {
  const specification = parseRewardSpecification(metadata.rewardLines);
  return (
    <section className="divination-hover-game-details" aria-label="Divination card details">
      <div className="divination-hover-reward">
        {metadata.rewardLines.map((line, lineIndex) => (
          <p key={lineIndex}>
            {line.map((segment, segmentIndex) => (
              <span className={`reward-tone-${segment.tone}`} key={`${segment.text}-${segmentIndex}`}>
                {segment.text}
              </span>
            ))}
            {line.some((segment) => /(?:Shaper|Elder|Crusader|Hunter|Redeemer|Warlord).*(?:Item|Influenced)/i.test(segment.text)) && specification?.influences.length
              ? <InfluenceIcons influences={specification.influences} />
              : null}
          </p>
        ))}
      </div>
      <div className="divination-hover-separator" aria-hidden="true" />
      <p className="divination-hover-flavour">{metadata.flavourText}</p>
      {metadata.dropLevel ? <p className="divination-hover-drop-level">Drop level {metadata.dropLevel}</p> : null}
    </section>
  );
}

function formatPriceSource(source: SessionCard["priceSource"]): string {
  if (source === "poe-watch") return "poe.watch";
  if (source === "poe-ninja") return "poe.ninja";
  return "Unpriced";
}

function formatConfidence(confidence: SessionCard["priceConfidence"]): string {
  if (!confidence) return "Unknown";
  return `${confidence[0].toUpperCase()}${confidence.slice(1)}`;
}
