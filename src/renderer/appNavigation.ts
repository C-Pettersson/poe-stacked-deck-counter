import type { AppTab } from "../shared/types.js";

export interface AppNavigationItem {
  id: AppTab;
  label: string;
}

export const APP_NAVIGATION: readonly AppNavigationItem[] = [
  { id: "collect", label: "Collect" },
  { id: "runs", label: "Runs" },
  { id: "insights", label: "Insights" },
  { id: "settings", label: "Settings" }
];
