import { BarChart3, Settings as SettingsIcon, Table2 } from "lucide-react";
import type { ReactElement } from "react";
import type { AppTab } from "../../shared/types.js";
import { TabButton } from "./TabButton.js";

export function AppTabs({ activeTab, onTabChange }: { activeTab: AppTab; onTabChange: (tab: AppTab) => void }): ReactElement {
  return (
    <nav className="tabs" aria-label="Sections">
      <TabButton
        active={activeTab === "sessions"}
        icon={<BarChart3 size={18} />}
        label="Sessions"
        onClick={() => onTabChange("sessions")}
      />
      <TabButton
        active={activeTab === "data"}
        icon={<Table2 size={18} />}
        label="Data"
        onClick={() => onTabChange("data")}
      />
      <TabButton
        active={activeTab === "settings"}
        icon={<SettingsIcon size={18} />}
        label="Settings"
        onClick={() => onTabChange("settings")}
      />
    </nav>
  );
}
