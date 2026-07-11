import { FileSearch, LoaderCircle } from "lucide-react";
import type { ReactElement } from "react";
import type { AppTab } from "../../shared/types.js";
import fieldNotesLogo from "../assets/wraeclast-field-notes.png";
import { AppTabs } from "./AppTabs.js";

export function AppSidebar({
  activeTab,
  isScanning,
  onScanLog,
  onTabChange
}: {
  activeTab: AppTab;
  isScanning: boolean;
  onScanLog: () => void;
  onTabChange: (tab: AppTab) => void;
}): ReactElement {
  return (
    <aside className="journal-sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark" aria-hidden="true">
          <img src={fieldNotesLogo} alt="" />
        </div>
        <div className="sidebar-brand-copy">
          <h1>Wraeclast Field Notes</h1>
          <p>Field research for the poe.how Codex.</p>
        </div>
      </div>

      <AppTabs activeTab={activeTab} onTabChange={onTabChange} />

      <div className="sidebar-spacer" aria-hidden="true" />
      <p className="sidebar-footnote">Private observations. Local archive.</p>
      <button
        aria-busy={isScanning}
        className={isScanning ? "scan-action is-scanning" : "scan-action"}
        type="button"
        onClick={onScanLog}
        disabled={isScanning}
      >
        {isScanning ? <LoaderCircle aria-hidden="true" className="spin-icon" size={19} /> : <FileSearch size={19} />}
        <span>{isScanning ? "Scanning..." : "Scan Log"}</span>
      </button>
    </aside>
  );
}
