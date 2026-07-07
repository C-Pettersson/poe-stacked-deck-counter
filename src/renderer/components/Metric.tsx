import type { ReactElement } from "react";

export function Metric(props: { label: string; value: string | ReactElement; tone?: "good" | "bad" }): ReactElement {
  return (
    <div className={`metric ${props.tone ?? ""}`}>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}
