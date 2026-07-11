import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode
} from "react";
import { createPortal } from "react-dom";
import { positionItemHover, type HoverPosition } from "./itemHoverPosition.js";

export type ItemHoverTone = "default" | "good" | "bad" | "muted" | "accent";
export type ItemHoverRarity = "normal" | "magic" | "rare" | "unique" | "currency" | "gem" | "divination";

export interface ItemHoverStat {
  label: string;
  value: ReactNode;
  tone?: ItemHoverTone;
}

export interface ItemHoverData {
  name: string;
  category?: string;
  baseType?: string;
  imageSrc?: string;
  imageAlt?: string;
  imageFit?: "contain" | "cover";
  imagePlacement?: "before-details" | "after-details";
  imageOverlay?: ReactNode;
  primaryDetails?: ReactNode;
  rarity?: ItemHoverRarity;
  properties?: Array<{ label: string; value: ReactNode }>;
  description?: ReactNode;
  stats?: ItemHoverStat[];
  statsLabel?: string;
  footer?: ReactNode;
}

export function ItemHover({
  children,
  className,
  data,
  focusable = true
}: {
  children: ReactNode;
  className?: string;
  data: ItemHoverData;
  focusable?: boolean;
}): ReactElement {
  const tooltipId = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<HoverPosition | null>(null);

  function cancelClose(): void {
    if (closeTimerRef.current !== undefined) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = undefined;
    }
  }

  function open(): void {
    cancelClose();
    setIsOpen(true);
  }

  function scheduleClose(): void {
    cancelClose();
    closeTimerRef.current = window.setTimeout(() => setIsOpen(false), 90);
  }

  useLayoutEffect(() => {
    if (!isOpen) return;

    function updatePosition(): void {
      const anchor = anchorRef.current?.getBoundingClientRect();
      const panel = panelRef.current?.getBoundingClientRect();
      if (!anchor || !panel) return;

      setPosition(
        positionItemHover(anchor, panel, {
          width: window.innerWidth,
          height: window.innerHeight
        })
      );
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    const resizeObserver = new ResizeObserver(updatePosition);
    if (panelRef.current) resizeObserver.observe(panelRef.current);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      resizeObserver.disconnect();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function closeOnEscape(event: KeyboardEvent): void {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  useEffect(() => () => cancelClose(), []);

  const panelStyle: CSSProperties = position
    ? { left: position.left, top: position.top }
    : { left: -10000, top: 0, visibility: "hidden" };

  return (
    <>
      <span
        ref={anchorRef}
        aria-describedby={isOpen ? tooltipId : undefined}
        aria-label={focusable ? `Inspect ${data.name}` : undefined}
        className={["item-hover-trigger", className].filter(Boolean).join(" ")}
        tabIndex={focusable ? 0 : undefined}
        onBlur={scheduleClose}
        onFocus={open}
        onMouseEnter={open}
        onMouseLeave={scheduleClose}
      >
        {children}
      </span>
      {isOpen
        ? createPortal(
            <div
              ref={panelRef}
              className={`item-hover-layer side-${position?.side ?? "right"}`}
              id={tooltipId}
              role="tooltip"
              style={panelStyle}
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
            >
              <ItemHoverPanel data={data} />
            </div>,
            document.body
          )
        : null}
    </>
  );
}

export function ItemHoverPanel({ data }: { data: ItemHoverData }): ReactElement {
  const artwork = data.imageSrc ? <HoverArtwork data={data} /> : null;

  return (
    <article className={`item-hover-card rarity-${data.rarity ?? "normal"}`}>
      <header className="item-hover-game-header">
        <h3>{data.name}</h3>
        {data.baseType ? <p>{data.baseType}</p> : null}
        {data.category ? <span>{data.category}</span> : null}
      </header>

      {data.imagePlacement !== "after-details" ? artwork : null}

      {data.primaryDetails ? <div className="item-hover-primary-details">{data.primaryDetails}</div> : null}

      {data.imagePlacement === "after-details" ? artwork : null}

      {data.properties && data.properties.length > 0 ? (
        <dl className="item-hover-properties">
          {data.properties.map((property) => (
            <div key={property.label}>
              <dt>{property.label}</dt>
              <dd>{property.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {data.description ? <div className="item-hover-description">{data.description}</div> : null}

      {data.stats && data.stats.length > 0 ? (
        <section className="item-hover-notes">
          <div className="item-hover-section-title"><span>{data.statsLabel ?? "Field notes"}</span></div>
          <dl>
            {data.stats.map((stat) => (
              <div key={stat.label}>
                <dt>{stat.label}</dt>
                <dd className={`tone-${stat.tone ?? "default"}`}>{stat.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {data.footer ? <footer className="item-hover-footer">{data.footer}</footer> : null}
    </article>
  );
}

function HoverArtwork({ data }: { data: ItemHoverData }): ReactElement {
  const fit = data.imageFit ?? "contain";
  const [displayWidth, setDisplayWidth] = useState<number>();
  return (
    <div className={`item-hover-art fit-${fit}`}>
      <img
        src={data.imageSrc}
        alt={data.imageAlt ?? data.name}
        style={fit === "contain" && displayWidth ? { width: displayWidth } : undefined}
        onLoad={(event) => {
          if (fit === "contain") setDisplayWidth(event.currentTarget.naturalWidth * 2);
        }}
      />
      {data.imageOverlay ? <div className="item-hover-art-overlay">{data.imageOverlay}</div> : null}
    </div>
  );
}
