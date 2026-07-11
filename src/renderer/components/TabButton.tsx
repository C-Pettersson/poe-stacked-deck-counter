import type { ReactElement } from "react";

export function TabButton(props: { active: boolean; icon: ReactElement; label: string; onClick: () => void }): ReactElement {
  return (
    <button
      aria-current={props.active ? "page" : undefined}
      className={props.active ? "tab-button active" : "tab-button"}
      type="button"
      onClick={props.onClick}
    >
      {props.icon}
      <span>{props.label}</span>
    </button>
  );
}
