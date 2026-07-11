import { BarChart3, BookOpen, LibraryBig, Settings as SettingsIcon } from "lucide-react";
import type { ReactElement } from "react";
import type { AppTab } from "../../shared/types.js";
import { APP_NAVIGATION } from "../appNavigation.js";
import { TabButton } from "./TabButton.js";

const TAB_ICONS: Record<AppTab, ReactElement> = {
  collect: <BookOpen size={18} />,
  runs: <LibraryBig size={18} />,
  insights: <BarChart3 size={18} />,
  settings: <SettingsIcon size={18} />
};

export function AppTabs({ activeTab, onTabChange }: { activeTab: AppTab; onTabChange: (tab: AppTab) => void }): ReactElement {
  return (
    <nav className="tabs" aria-label="Sections">
      {APP_NAVIGATION.map((item) => (
        <TabButton
          active={activeTab === item.id}
          icon={TAB_ICONS[item.id]}
          key={item.id}
          label={item.label}
          onClick={() => onTabChange(item.id)}
        />
      ))}
    </nav>
  );
}
