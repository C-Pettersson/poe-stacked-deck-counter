import type { ReactElement } from "react";
import type { ItemGameData } from "../../domain/collection.js";
import { InfluenceIcons } from "./InfluenceIcons.js";

export function GameItemDetails({ data }: { data: ItemGameData }): ReactElement {
  return (
    <section className="game-item-details" aria-label="Item details">
      {data.influences?.length ? <InfluenceIcons influences={data.influences} /> : null}
      <ItemLines className="game-item-properties" lines={data.properties} />
      <ItemLines className="game-item-requirements" lines={data.requirements} separated />
      <ItemLines className="game-item-modifiers implicit" lines={data.implicitModifiers} separated />
      <ItemLines className="game-item-modifiers explicit" lines={data.explicitModifiers} separated />
      {data.description ? <p className="game-item-description">{data.description}</p> : null}
      {data.flavourText ? <p className="game-item-flavour">{data.flavourText}</p> : null}
      {data.helpText ? <p className="game-item-help">{data.helpText}</p> : null}
      <ItemFlags data={data} />
    </section>
  );
}

function ItemFlags({ data }: { data: ItemGameData }): ReactElement | null {
  const flags = [
    data.synthesised ? "Synthesised" : null,
    data.fractured ? "Fractured" : null,
    data.mirrored ? "Mirrored" : null,
    data.corrupted ? "Corrupted" : null
  ].filter((flag): flag is string => Boolean(flag));
  if (!flags.length) return null;
  return <div className="game-item-flags separated">{flags.map((flag) => <p key={flag}>{flag}</p>)}</div>;
}

function ItemLines({
  className,
  lines,
  separated = false
}: {
  className: string;
  lines: string[];
  separated?: boolean;
}): ReactElement | null {
  if (lines.length === 0) return null;
  return (
    <div className={`${className}${separated ? " separated" : ""}`}>
      {lines.map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}
    </div>
  );
}
