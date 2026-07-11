export interface HoverRect {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

export interface HoverPosition {
  left: number;
  top: number;
  side: "left" | "right";
}

export function positionItemHover(
  anchor: HoverRect,
  panel: { width: number; height: number },
  viewport: { width: number; height: number },
  gap = 14,
  margin = 12
): HoverPosition {
  const fitsRight = anchor.right + gap + panel.width <= viewport.width - margin;
  const fitsLeft = anchor.left - gap - panel.width >= margin;
  const side = fitsRight || !fitsLeft ? "right" : "left";
  const preferredLeft = side === "right" ? anchor.right + gap : anchor.left - gap - panel.width;
  const preferredTop = anchor.top + anchor.height / 2 - panel.height / 2;

  return {
    left: clamp(preferredLeft, margin, Math.max(margin, viewport.width - panel.width - margin)),
    top: clamp(preferredTop, margin, Math.max(margin, viewport.height - panel.height - margin)),
    side
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
