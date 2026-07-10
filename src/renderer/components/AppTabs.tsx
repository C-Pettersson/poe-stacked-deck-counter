import { BarChart3, BookOpen, History, Settings as SettingsIcon, Table2 } from "lucide-react";
import type { ReactElement } from "react";
import type { AppTab } from "../../shared/types.js";
import { TabButton } from "./TabButton.js";

export function AppTabs({ activeTab, onTabChange }: { activeTab: AppTab; onTabChange: (tab: AppTab) => void }): ReactElement {
  return (
    <nav className="tabs" aria-label="Sections">
      <TabButton
        active={activeTab === "collect"}
        icon={<BookOpen size={18} />}
        label="Collect"
        onClick={() => onTabChange("collect")}
      />
      <TabButton
        active={activeTab === "runs"}
        icon={<History size={18} />}
        label="Runs"
        onClick={() => onTabChange("runs")}
      />
      <TabButton
        active={activeTab === "deck-runs"}
        icon={<BarChart3 size={18} />}
        label="Deck Runs"
        onClick={() => onTabChange("deck-runs")}
      />
      <TabButton
        active={activeTab === "deck-data"}
        icon={<Table2 size={18} />}
        label="Deck Data"
        onClick={() => onTabChange("deck-data")}
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
