import { describe, expect, it } from "vitest";
import type { ActiveClientLogEncounter, ClientLogEncounter, ScanResult } from "../../shared/types.js";
import { defaultEncounterNotificationSettings } from "../../features/events/encounterCatalog.js";
import { EncounterNotificationTracker } from "./encounterNotifications.js";

describe("EncounterNotificationTracker", () => {
  it("baselines history and only notifies for a newly completed selected encounter", () => {
    const tracker = new EncounterNotificationTracker();
    const oldEncounter = completed("old", "the-maven", "The Maven");
    expect(tracker.accept(scan([oldEncounter]), defaultEncounterNotificationSettings())).toEqual([]);

    const next = completed("new", "the-maven", "The Maven");
    expect(tracker.accept(scan([oldEncounter, next]), defaultEncounterNotificationSettings())).toMatchObject([{
      encounterId: "the-maven",
      trigger: "exited",
      sound: true
    }]);
  });

  it("keeps Shaper muted by default", () => {
    const tracker = new EncounterNotificationTracker();
    tracker.accept(scan([]), defaultEncounterNotificationSettings());
    expect(tracker.accept(scan([completed("shaper", "the-shaper", "The Shaper")]), defaultEncounterNotificationSettings())).toEqual([]);
  });

  it("supports entry and completion triggers with per-encounter sound", () => {
    const tracker = new EncounterNotificationTracker();
    const settings = defaultEncounterNotificationSettings();
    settings.triggers.entered = true;
    settings.triggers.completion = true;
    settings.triggers.exited = false;
    settings.encounters["the-shaper"] = { enabled: true, sound: false };
    tracker.accept(scan([]), settings);

    const active = started("shaper", "the-shaper", "The Shaper");
    expect(tracker.accept(scan([], active), settings)).toMatchObject([{ trigger: "entered", sound: false }]);
    expect(tracker.accept(scan([], { ...active, completionAt: "2026-07-11T19:05:00.000Z" }), settings))
      .toMatchObject([{ trigger: "completion", sound: false }]);
  });
});

function scan(encounters: ClientLogEncounter[], activeEncounter: ActiveClientLogEncounter | null = null): ScanResult {
  return {
    filePath: "Client.txt",
    fileSize: 1,
    scannedAt: "2026-07-11T19:10:00.000Z",
    draws: [],
    encounters,
    activeEncounter,
    sessions: []
  };
}

function started(id: string, encounterId: string, title: string): ActiveClientLogEncounter {
  return {
    id,
    encounterId,
    title,
    boss: title,
    areaName: `${title} arena`,
    startedAt: "2026-07-11T19:00:00.000Z",
    startLine: 1
  };
}

function completed(id: string, encounterId: string, title: string): ClientLogEncounter {
  return {
    ...started(id, encounterId, title),
    endedAt: "2026-07-11T19:06:00.000Z",
    endLine: 2,
    leftToAreaName: "Hideout"
  };
}
