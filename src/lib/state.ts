// Stato utente: valori iniziali, validazione, export/import e salvataggio nel browser.
import { SCHEMA_VERSION, type Level, type UserState } from "./contract";
import { isISODate } from "./dates";
import { isLevel } from "./levels";

export const STATE_KEY = "rc.state.v1";
export const EXTRA_KEY = "rc.extra.v1";
export const EXPORT_APP = "russian-coach";

export function defaultState(): UserState {
  return {
    schemaVersion: SCHEMA_VERSION,
    level: "zero",
    weeklyGoals: [],
    settings: { dailyMinutes: 15, audioEnabled: true },
    srs: {},
    errors: { grammar_tags: {}, words: {} },
    completedLessons: [],
    streak: { current: 0, best: 0, lastDay: "" },
  };
}

/** Dati accessori dell'app, fuori dal contratto UserState (cronologia giornaliera e lezione in corso). */
export interface DayStats {
  seconds: number;
  answered: number;
  correct: number;
  lessons: number;
}
export interface ActiveSession {
  day: string;
  minutes: 15 | 30 | 45;
  /** Numero progressivo della lezione nella giornata (varia la selezione). */
  n: number;
  exerciseIds: string[];
  index: number;
  results: { id: string; correct: boolean; seconds: number }[];
  /** Lezione del curriculum associata, se presente. */
  lessonId?: string;
}
export interface AppExtra {
  history: Record<string, DayStats>;
  active?: ActiveSession;
  /** Esercizi gia' proposti oggi: nelle lezioni successive dello stesso giorno si evitano. */
  usedToday: { day: string; ids: string[] };
}

export function defaultExtra(): AppExtra {
  return { history: {}, usedToday: { day: "", ids: [] } };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isMinutes = (v: unknown): v is 15 | 30 | 45 => v === 15 || v === 30 || v === 45;

export type Validation = { ok: true; state: UserState } | { ok: false; errors: string[] };

/** Valida (e ripulisce) uno stato proveniente da un file importato o dal browser. */
export function validateState(raw: unknown): Validation {
  const errors: string[] = [];
  if (!isObj(raw)) return { ok: false, errors: ["Il file non contiene un oggetto di stato."] };
  if (!isNum(raw.schemaVersion)) errors.push("schemaVersion mancante o non numerico.");
  else if (raw.schemaVersion > SCHEMA_VERSION) errors.push(`Il file e' di una versione piu' recente (${raw.schemaVersion}) di quella supportata (${SCHEMA_VERSION}).`);
  else if (raw.schemaVersion < 1) errors.push("schemaVersion non valido.");
  if (!isLevel(raw.level)) errors.push("Livello non valido.");

  const s = raw.settings;
  if (!isObj(s) || !isMinutes(s.dailyMinutes) || typeof s.audioEnabled !== "boolean") errors.push("Impostazioni non valide (minuti 15/30/45 e audio).");

  const srs: UserState["srs"] = {};
  if (!isObj(raw.srs)) errors.push("Dati SRS mancanti.");
  else {
    for (const [id, e] of Object.entries(raw.srs)) {
      if (!isObj(e) || ![1, 2, 3, 4, 5].includes(e.box as number) || !isISODate(e.due)) {
        errors.push(`Scheda SRS non valida: ${id}`);
        break;
      }
      srs[id] = { box: e.box as 1 | 2 | 3 | 4 | 5, due: e.due };
    }
  }

  const counts = (v: unknown, label: string): Record<string, number> => {
    const out: Record<string, number> = {};
    if (!isObj(v)) {
      errors.push(`Errori ricorrenti (${label}) non validi.`);
      return out;
    }
    for (const [k, n] of Object.entries(v)) {
      if (!isNum(n) || n < 0) {
        errors.push(`Contatore errori non valido: ${label}/${k}`);
        break;
      }
      out[k] = n;
    }
    return out;
  };
  const errs = isObj(raw.errors) ? raw.errors : {};
  if (!isObj(raw.errors)) errors.push("Sezione errori mancante.");
  const grammar = counts(errs.grammar_tags, "grammatica");
  const wordsErr = counts(errs.words, "parole");

  if (!Array.isArray(raw.completedLessons) || !raw.completedLessons.every((x) => typeof x === "string")) errors.push("Lezioni completate non valide.");

  const st = raw.streak;
  if (!isObj(st) || !isNum(st.current) || !isNum(st.best) || typeof st.lastDay !== "string" || (st.lastDay !== "" && !isISODate(st.lastDay))) errors.push("Streak non valido.");

  const weeks: UserState["weeklyGoals"] = [];
  if (!Array.isArray(raw.weeklyGoals)) errors.push("Obiettivi settimanali mancanti.");
  else {
    for (const w of raw.weeklyGoals) {
      if (!isObj(w) || !isISODate(w.weekStart) || !isNum(w.minutesTarget) || !isNum(w.minutesDone) || !isNum(w.lessonsTarget) || !isNum(w.lessonsDone)) {
        errors.push("Obiettivo settimanale non valido.");
        break;
      }
      weeks.push({ weekStart: w.weekStart, minutesTarget: w.minutesTarget, minutesDone: w.minutesDone, lessonsTarget: w.lessonsTarget, lessonsDone: w.lessonsDone });
    }
  }

  let goal: UserState["goal"];
  if (raw.goal !== undefined) {
    const g = raw.goal;
    if (!isObj(g) || !isLevel(g.targetLevel) || !isISODate(g.targetDate)) errors.push("Obiettivo finale non valido.");
    else goal = { targetLevel: g.targetLevel as Level, targetDate: g.targetDate };
  }
  let placement: UserState["placement"];
  if (raw.placement !== undefined) {
    const p = raw.placement;
    if (!isObj(p) || typeof p.done !== "boolean" || typeof p.date !== "string" || !isNum(p.score)) errors.push("Test d'ingresso non valido.");
    else placement = { done: p.done, date: p.date, score: p.score };
  }

  if (errors.length > 0) return { ok: false, errors };
  const set = s as { dailyMinutes: 15 | 30 | 45; audioEnabled: boolean };
  const stk = st as { current: number; best: number; lastDay: string };
  const state: UserState = {
    schemaVersion: SCHEMA_VERSION,
    level: raw.level as Level,
    weeklyGoals: weeks,
    settings: { dailyMinutes: set.dailyMinutes, audioEnabled: set.audioEnabled },
    srs,
    errors: { grammar_tags: grammar, words: wordsErr },
    completedLessons: raw.completedLessons as string[],
    streak: { current: stk.current, best: stk.best, lastDay: stk.lastDay },
  };
  if (goal) state.goal = goal;
  if (placement) state.placement = placement;
  return { ok: true, state };
}

export interface ExportFile {
  app: typeof EXPORT_APP;
  schemaVersion: number;
  exportedAt: string;
  state: UserState;
  extra?: Pick<AppExtra, "history">;
}

export function exportState(state: UserState, extra: AppExtra, now: Date = new Date()): string {
  const file: ExportFile = { app: EXPORT_APP, schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString(), state, extra: { history: extra.history } };
  return JSON.stringify(file, null, 2);
}

export type ImportResult = { ok: true; state: UserState; history: AppExtra["history"] } | { ok: false; errors: string[] };

/** Accetta il file esportato dall'app oppure un UserState "nudo". */
export function importState(text: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["Il file non e' un JSON valido."] };
  }
  if (isObj(data) && data.app !== undefined && data.app !== EXPORT_APP) return { ok: false, errors: ["Il file non proviene da Russian Coach."] };
  const rawState = isObj(data) && isObj(data.state) ? data.state : data;
  const v = validateState(rawState);
  if (!v.ok) return v;
  const history: AppExtra["history"] = {};
  if (isObj(data) && isObj(data.extra) && isObj(data.extra.history)) {
    for (const [day, d] of Object.entries(data.extra.history)) {
      if (isISODate(day) && isObj(d) && isNum(d.seconds) && isNum(d.answered) && isNum(d.correct) && isNum(d.lessons)) {
        history[day] = { seconds: d.seconds, answered: d.answered, correct: d.correct, lessons: d.lessons };
      }
    }
  }
  return { ok: true, state: v.state, history };
}

// --- Persistenza nel browser (localStorage sempre dentro try/catch) ---

function readKey(key: string): string | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeKey(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function loadState(): UserState {
  const text = readKey(STATE_KEY);
  if (!text) return defaultState();
  try {
    const v = validateState(JSON.parse(text));
    return v.ok ? v.state : defaultState();
  } catch {
    return defaultState();
  }
}
export function saveState(state: UserState): boolean {
  return writeKey(STATE_KEY, JSON.stringify(state));
}

export function loadExtra(): AppExtra {
  const text = readKey(EXTRA_KEY);
  if (!text) return defaultExtra();
  try {
    const raw = JSON.parse(text);
    if (!isObj(raw)) return defaultExtra();
    return {
      history: isObj(raw.history) ? (raw.history as AppExtra["history"]) : {},
      usedToday:
        isObj(raw.usedToday) && typeof raw.usedToday.day === "string" && Array.isArray(raw.usedToday.ids)
          ? { day: raw.usedToday.day, ids: raw.usedToday.ids.filter((x): x is string => typeof x === "string") }
          : { day: "", ids: [] },
      active: isObj(raw.active) ? (raw.active as unknown as ActiveSession) : undefined,
    };
  } catch {
    return defaultExtra();
  }
}
export function saveExtra(extra: AppExtra): boolean {
  return writeKey(EXTRA_KEY, JSON.stringify(extra));
}
export function clearAll(): void {
  try {
    localStorage.removeItem(STATE_KEY);
    localStorage.removeItem(EXTRA_KEY);
  } catch {
    /* ignorato */
  }
}
