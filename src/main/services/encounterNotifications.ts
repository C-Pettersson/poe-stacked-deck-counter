import type {
  ClientLogEncounter,
  EncounterNotificationSettings,
  ScanResult
} from "../../shared/types.js";

export type EncounterNotificationTrigger = "entered" | "completion" | "exited";

export interface EncounterNotificationMessage {
  encounterId: string;
  observationId: string;
  trigger: EncounterNotificationTrigger;
  title: string;
  body: string;
  sound: boolean;
}

export class EncounterNotificationTracker {
  private initialized = false;
  private completedIds = new Set<string>();
  private activeId: string | null = null;
  private activeCompletionAt: string | null = null;

  reset(): void {
    this.initialized = false;
    this.completedIds.clear();
    this.activeId = null;
    this.activeCompletionAt = null;
  }

  accept(result: ScanResult, settings: EncounterNotificationSettings): EncounterNotificationMessage[] {
    if (!this.initialized) {
      this.captureBaseline(result);
      return [];
    }

    const messages: EncounterNotificationMessage[] = [];
    const active = result.activeEncounter;

    if (active && active.id !== this.activeId) {
      this.push(messages, settings, active.encounterId, active.id, "entered", {
        title: `Entered ${active.title}`,
        body: `Tracking ${active.areaName}.`
      });
      if (active.completionAt) {
        this.push(messages, settings, active.encounterId, active.id, "completion", {
          title: `${active.title} completion detected`,
          body: "A known encounter completion line was heard."
        });
      }
    } else if (active?.completionAt && !this.activeCompletionAt) {
      this.push(messages, settings, active.encounterId, active.id, "completion", {
        title: `${active.title} completion detected`,
        body: "A known encounter completion line was heard."
      });
    }

    for (const encounter of result.encounters) {
      if (this.completedIds.has(encounter.id)) continue;

      if (encounter.completionAt && this.activeId === encounter.id && !this.activeCompletionAt) {
        this.push(messages, settings, encounter.encounterId, encounter.id, "completion", {
          title: `${encounter.title} completion detected`,
          body: "A known encounter completion line was heard."
        });
      }
      this.pushExit(messages, settings, encounter);
    }

    this.completedIds = new Set(result.encounters.map((encounter) => encounter.id));
    this.activeId = active?.id ?? null;
    this.activeCompletionAt = active?.completionAt ?? null;
    return messages;
  }

  private captureBaseline(result: ScanResult): void {
    this.initialized = true;
    this.completedIds = new Set(result.encounters.map((encounter) => encounter.id));
    this.activeId = result.activeEncounter?.id ?? null;
    this.activeCompletionAt = result.activeEncounter?.completionAt ?? null;
  }

  private pushExit(
    messages: EncounterNotificationMessage[],
    settings: EncounterNotificationSettings,
    encounter: ClientLogEncounter
  ): void {
    this.push(messages, settings, encounter.encounterId, encounter.id, "exited", {
      title: `${encounter.title} ended`,
      body: `Left ${encounter.areaName}. Log what dropped.`
    });
  }

  private push(
    messages: EncounterNotificationMessage[],
    settings: EncounterNotificationSettings,
    encounterId: string,
    observationId: string,
    trigger: EncounterNotificationTrigger,
    copy: Pick<EncounterNotificationMessage, "title" | "body">
  ): void {
    const policy = settings.encounters[encounterId];
    if (!settings.enabled || !settings.triggers[trigger] || !policy?.enabled) return;
    messages.push({ encounterId, observationId, trigger, ...copy, sound: policy.sound });
  }
}
