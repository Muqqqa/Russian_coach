// Contratto dati di Russian Coach (versione 1). Proprietario: lead.
// Ogni modifica richiede approvazione e un aumento di SCHEMA_VERSION.
// Il russo ha sempre l'accento tonico segnato con U+0301 (es. "ма́ма").

export const SCHEMA_VERSION = 1;

export type Level = "zero" | "a1" | "a2" | "b1" | "b2";
export type Pos =
  | "noun" | "verb" | "adj" | "adv" | "pron" | "num"
  | "prep" | "conj" | "part" | "intj" | "phrase";
export type Gender = "m" | "f" | "n";
export type ExerciseType =
  | "translate" | "cloze" | "multiple_choice" | "match" | "dictation";
export type QaStatus = "pending" | "approved" | "rejected";
export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface Provenance {
  source: "openrussian" | "wiktextract" | "tatoeba" | "original";
  license: string; // identificatore SPDX, es. "CC-BY-SA-4.0"
  attribution?: string; // autore / ID originale, se la licenza lo richiede
}

export interface Word extends Provenance {
  id: string; // "w_" + slug traslitterato, stabile (es. "w_mama")
  ru: string; // senza accento
  stress: string; // con accento U+0301
  translit: string; // trascrizione latina leggibile da italiani
  en: string[]; // glosse inglesi dalle fonti, la prima è la principale
  it?: string[]; // traduzioni italiane, se disponibili (l'app mostra it, altrimenti en)
  pos: Pos;
  gender?: Gender;
  animate?: boolean;
  level: Level;
  topics: string[]; // slug, es. "famiglia"
  forms?: Record<string, string>; // forme flesse con accento (chiavi libere ma documentate in data/README.md)
  examples?: string[]; // id frasi
}

export interface Sentence extends Provenance {
  id: string; // "s_" + numero, es. "s_00123"
  ru: string;
  stress: string;
  it: string;
  words: string[]; // id parole contenute
  level: Level;
}

export interface Lesson {
  id: string; // "l_<livello>_<nn>"
  level: Level;
  order: number; // posizione nel percorso del livello
  title_it: string;
  explanation_md: string; // spiegazione in italiano, markdown
  grammar_tags: string[];
  new_words: string[]; // id parole introdotte
  review_tags: string[]; // grammar_tags da ripassare
}

export interface Exercise {
  id: string; // "e_" + numero a 6 cifre
  type: ExerciseType;
  level: Level;
  difficulty: Difficulty;
  topics: string[];
  grammar_tags: string[];
  words: string[]; // id parole allenate (alimentano SRS ed errori ricorrenti)
  lesson?: string;
  est_seconds: number;
  prompt_it: string;
  payload: ExercisePayload;
  qa_status: QaStatus;
  qa_note?: string;
}

export type ExercisePayload =
  | { type: "translate"; direction: "ru_it" | "it_ru"; source: string; answer: string; accepted: string[] }
  | { type: "cloze"; text: string; answer: string; accepted: string[]; hint_it?: string } // "___" marca la lacuna
  | { type: "multiple_choice"; question: string; options: string[]; correct: number }
  | { type: "match"; pairs: { ru: string; it: string }[] } // 3-6 coppie
  | { type: "dictation"; text: string; translation_it: string; accepted: string[] };

// Stato utente: salvato solo nel browser, esportabile/importabile.
export interface UserState {
  schemaVersion: number;
  level: Level;
  placement?: { done: boolean; date: string; score: number };
  goal?: { targetLevel: Level; targetDate: string }; // obiettivo finale scelto dall'utente
  weeklyGoals: { weekStart: string; minutesTarget: number; minutesDone: number; lessonsTarget: number; lessonsDone: number }[]; // mini obiettivi derivati dal goal
  settings: { dailyMinutes: 15 | 30 | 45; audioEnabled: boolean };
  srs: Record<string, { box: 1 | 2 | 3 | 4 | 5; due: string }>; // per id parola, date ISO "YYYY-MM-DD"
  errors: { grammar_tags: Record<string, number>; words: Record<string, number> };
  completedLessons: string[];
  streak: { current: number; best: number; lastDay: string };
}
