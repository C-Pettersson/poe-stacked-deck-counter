import { describe, expect, it } from "vitest";
import { createCollectionRun, type CollectionRun } from "../domain/collection.js";
import { APP_NAVIGATION } from "./appNavigation.js";
import { buildRunShelves, getStackedDeckSessionId, getStudyTypeId } from "./studyTypes.js";

function run(id: string, title: string, lifecycle: CollectionRun["lifecycle"] = "completed"): CollectionRun {
  return {
    ...createCollectionRun(null, { now: new Date("2026-01-01T00:00:00.000Z") }),
    id,
    title,
    lifecycle
  };
}

describe("generic navigation", () => {
  it("exposes exactly the four generic destinations", () => {
    expect(APP_NAVIGATION).toEqual([
      { id: "collect", label: "Collect" },
      { id: "runs", label: "Runs" },
      { id: "insights", label: "Insights" },
      { id: "settings", label: "Settings" }
    ]);
  });
});

describe("run study types", () => {
  it("classifies projected runs and resolves the underlying deck session", () => {
    const deck = run("stacked-deck:session-1", "Deck run");
    const encounter = run("client-log-maven-1", "Maven drops", "draft");
    const manualEncounter = {
      ...run("manual-maven-1", "Maven study"),
      template: {
        id: 7,
        name: "maven-encounter",
        title: "The Maven",
        description: "Record Maven rewards.",
        revision: "1",
        categoryId: 2,
        categoryName: "Bosses",
        fixedResult: false,
        allowRequirementSubmission: true,
        requirements: [],
        rewards: []
      }
    };
    const custom = run("custom-1", "Map study");

    expect(getStudyTypeId(deck)).toBe("stacked-decks");
    expect(getStackedDeckSessionId(deck)).toBe("session-1");
    expect(getStudyTypeId(encounter)).toBe("encounters");
    expect(getStudyTypeId(manualEncounter)).toBe("encounters");
    expect(getStudyTypeId(custom)).toBe("other");
  });

  it("places every visible run on exactly one shelf without aggregation", () => {
    const runs = [
      run("stacked-deck:session-1", "First deck run"),
      run("stacked-deck:session-2", "Second deck run"),
      run("client-log-maven-1", "Maven drops", "draft"),
      run("custom-1", "Map study", "active")
    ];
    const shelves = buildRunShelves(runs, { query: "", studyType: "all", lifecycle: "all" });
    const shelfRunIds = shelves.flatMap((shelf) => shelf.runs.map((candidate) => candidate.id));

    expect(shelves.map((shelf) => shelf.studyType.id)).toEqual(["stacked-decks", "encounters", "other"]);
    expect(shelfRunIds).toHaveLength(runs.length);
    expect(new Set(shelfRunIds)).toEqual(new Set(runs.map((candidate) => candidate.id)));
  });

  it("filters books by type, lifecycle, and search text", () => {
    const runs = [
      run("stacked-deck:session-1", "First deck run"),
      run("client-log-maven-1", "Maven drops", "draft"),
      run("client-log-sirus-1", "Sirus drops", "completed")
    ];

    expect(buildRunShelves(runs, { query: "maven", studyType: "encounters", lifecycle: "draft" })[0].runs)
      .toMatchObject([{ id: "client-log-maven-1" }]);
    expect(buildRunShelves(runs, { query: "maven", studyType: "stacked-decks", lifecycle: "all" })).toEqual([]);
  });
});
