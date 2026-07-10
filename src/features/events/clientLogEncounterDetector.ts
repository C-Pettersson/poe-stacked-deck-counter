import type { ActiveClientLogEncounter, ClientLogEncounter } from "../../shared/types.js";
import { parseTimestampFromLogLine } from "../../shared/clientLog.js";
import { findEncounterDefinition, getEncounterDefinition } from "./encounterCatalog.js";

export interface PendingAreaGeneration {
  areaId: string;
  areaLevel: number;
  seed: string;
  lineNumber: number;
}

export interface EncounterDetectorState {
  pendingArea: PendingAreaGeneration | null;
  activeEncounter: ActiveClientLogEncounter | null;
}

const generationPattern = /Generating level (?<level>\d+) area "(?<areaId>[^"]+)" with seed (?<seed>\d+)/;
const enteredPattern = /:\s*You have entered (?<areaName>.+?)\.\s*$/;

export function createEncounterDetectorState(activeEncounter: ActiveClientLogEncounter | null = null): EncounterDetectorState {
  return { pendingArea: null, activeEncounter };
}

export function detectEncounterLogLine(
  line: string,
  lineNumber: number,
  state: EncounterDetectorState,
  completed: ClientLogEncounter[]
): EncounterDetectorState {
  const generation = generationPattern.exec(line);
  if (generation?.groups) {
    return {
      ...state,
      pendingArea: {
        areaId: generation.groups.areaId,
        areaLevel: Number(generation.groups.level),
        seed: generation.groups.seed,
        lineNumber
      }
    };
  }

  const timestamp = parseTimestampFromLogLine(line);
  const entered = enteredPattern.exec(line);
  if (timestamp && entered?.groups?.areaName) {
    return transitionArea(entered.groups.areaName.trim(), timestamp, lineNumber, state, completed);
  }

  if (timestamp && state.activeEncounter) {
    const definition = getEncounterDefinition(state.activeEncounter.encounterId);
    const completionLine = definition?.completionLines?.find((candidate) => line.includes(candidate));
    if (completionLine && !state.activeEncounter.completionAt) {
      return {
        ...state,
        activeEncounter: { ...state.activeEncounter, completionAt: timestamp, completionLine }
      };
    }
  }

  return state;
}

function transitionArea(
  areaName: string,
  timestamp: string,
  lineNumber: number,
  state: EncounterDetectorState,
  completed: ClientLogEncounter[]
): EncounterDetectorState {
  const areaId = state.pendingArea?.areaId;
  if (!areaId && state.activeEncounter && normalizeAreaName(state.activeEncounter.areaName) === normalizeAreaName(areaName)) {
    return { pendingArea: null, activeEncounter: state.activeEncounter };
  }
  const definition = findEncounterDefinition(areaName, areaId);
  let activeEncounter = state.activeEncounter;

  if (activeEncounter && activeEncounter.encounterId !== definition?.id) {
    completed.push({
      ...activeEncounter,
      endedAt: timestamp,
      endLine: lineNumber,
      leftToAreaName: areaName
    });
    activeEncounter = null;
  }

  if (!activeEncounter && definition) {
    activeEncounter = {
      id: `encounter:${definition.id}:${lineNumber}:${timestamp}`,
      encounterId: definition.id,
      title: definition.title,
      boss: definition.boss,
      areaName,
      areaId,
      areaLevel: state.pendingArea?.areaLevel,
      seed: state.pendingArea?.seed,
      startedAt: timestamp,
      startLine: lineNumber
    };
  }

  return { pendingArea: null, activeEncounter };
}

function normalizeAreaName(value: string): string {
  return value.trim().toLocaleLowerCase();
}
