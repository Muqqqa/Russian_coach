"use client";
// Un esercizio alla volta: 5 tipi (translate, cloze, multiple_choice, match, dictation).
import { useEffect, useMemo, useRef, useState } from "react";
import type { Exercise } from "@/lib/contract";
import { gradeExercise, type Grade } from "@/lib/answers";
import { seededRng, shuffle } from "@/lib/rng";
import { useApp } from "./AppProvider";
import { Keypad } from "./Keypad";
import { Markdown, Ru, SpeakButton, VoiceBanner, WordLine } from "./ui";

const TYPE_LABEL: Record<Exercise["type"], string> = {
  translate: "Traduzione",
  cloze: "Completamento",
  multiple_choice: "Scelta multipla",
  match: "Abbinamento",
  dictation: "Dettato",
};
export const typeLabel = (t: Exercise["type"]) => TYPE_LABEL[t];

const hasCyrillic = (s: string) => /[Ѐ-ӿ]/.test(s);

interface Props {
  exercise: Exercise;
  /** Chiamato quando l'utente va avanti, con l'esito finale. */
  onDone: (correct: boolean) => void;
  nextLabel?: string;
  /** Mostra le parole allenate dopo la risposta (utile in lezione, non nel test). */
  showWords?: boolean;
}

export function ExerciseCard({ exercise, onDone, nextLabel = "Avanti", showWords = true }: Props) {
  const { bank, audioOk, say } = useApp();
  const [text, setText] = useState("");
  const [choice, setChoice] = useState<number | null>(null);
  const [grade, setGrade] = useState<Grade | null>(null);
  const [selfOk, setSelfOk] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const p = exercise.payload;

  useEffect(() => {
    if (grade) nextRef.current?.focus();
  }, [grade]);

  // Pronuncia automatica del dettato all'apertura
  useEffect(() => {
    if (p.type === "dictation" && audioOk) say(p.text, 0.85);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id, audioOk]);

  const words = useMemo(() => (bank ? exercise.words.map((id) => bank.wordById.get(id)).filter((w): w is NonNullable<typeof w> => !!w).slice(0, 4) : []), [bank, exercise.words]);
  const sourceWord = useMemo(() => {
    if (p.type === "translate" && p.direction === "ru_it") return words.find((w) => w.stress === p.source);
    if (p.type === "multiple_choice") return words.find((w) => w.stress === p.question);
    return undefined;
  }, [p, words]);

  const lesson = useMemo(() => (bank && exercise.lesson ? bank.lessons.find((l) => l.id === exercise.lesson) : undefined), [bank, exercise.lesson]);
  const finalCorrect = grade ? grade.correct || selfOk : false;
  const check = () => {
    if (grade) return;
    if (p.type === "multiple_choice") {
      if (choice === null) return;
      setGrade(gradeExercise(exercise, { kind: "choice", index: choice }));
    } else if (p.type !== "match") {
      if (!text.trim()) return;
      setGrade(gradeExercise(exercise, { kind: "text", value: text }));
    }
  };

  const typing = p.type === "translate" || p.type === "cloze" || p.type === "dictation";
  const typingRussian = (p.type === "translate" && p.direction === "it_ru") || p.type === "cloze" || p.type === "dictation";
  const canSelfMark = grade && !grade.correct && p.type === "translate" && p.direction === "ru_it";

  return (
    <form
      className="card stack"
      onKeyDown={(e) => {
        // Tastiera: 1-9 sceglie un'opzione, Invio controlla (scelta multipla)
        if (p.type !== "multiple_choice" || grade) return;
        if (/^[1-9]$/.test(e.key) && Number(e.key) <= p.options.length && !(e.target instanceof HTMLInputElement)) {
          e.preventDefault();
          setChoice(Number(e.key) - 1);
        } else if (e.key === "Enter" && choice !== null) {
          e.preventDefault();
          check();
        }
      }}
      onSubmit={(e) => {
        e.preventDefault();
        if (!grade) check();
        else onDone(finalCorrect);
      }}
    >
      <div className="row between">
        <span className="chip">{TYPE_LABEL[exercise.type]}</span>
        <span className="muted small">Difficoltà {exercise.difficulty}/5</span>
      </div>
      <h2 style={{ marginBottom: 0 }}>{exercise.prompt_it}</h2>

      {p.type === "translate" && (
        <div className="stack">
          <div className="row">
            {p.direction === "ru_it" ? <Ru big>{p.source}</Ru> : <span className="ru-big" style={{ fontFamily: "inherit" }}>{p.source}</span>}
            {p.direction === "ru_it" && <SpeakButton text={p.source} />}
          </div>
          {sourceWord && <div className="translit">[{sourceWord.translit}]{sourceWord.ipa ? `  ${sourceWord.ipa}` : ""}</div>}
        </div>
      )}

      {p.type === "multiple_choice" && (
        <div className="stack">
          <div className="row">
            {hasCyrillic(p.question) ? <Ru big>{p.question}</Ru> : <span className="ru-big" style={{ fontFamily: "inherit" }}>{p.question}</span>}
            {hasCyrillic(p.question) && <SpeakButton text={p.question} />}
          </div>
          {sourceWord && <div className="translit">[{sourceWord.translit}]</div>}
          <div className="opts" role="group" aria-label="Opzioni di risposta (tasti 1-9 per scegliere, Invio per controllare)">
            {p.options.map((o, i) => {
              const cls = grade ? (i === p.correct ? "right" : i === choice ? "wrong" : "") : "";
              return (
                <button key={i} type="button" className={`btn opt ${cls}`} aria-pressed={choice === i} disabled={!!grade} onClick={() => setChoice(i)}>
                  <span className="optnum" aria-hidden="true">{i + 1}</span>
                  {hasCyrillic(o) ? <Ru>{o}</Ru> : o}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {p.type === "cloze" && (
        <div className="stack">
          <p className="cloze" lang="ru">
            {p.text.split("___").map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && (
                  <input
                    ref={inputRef}
                    className="field"
                    lang="ru"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    disabled={!!grade}
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    autoComplete="off"
                    aria-label="Parola mancante"
                  />
                )}
              </span>
            ))}
          </p>
          {p.hint_it && <p className="muted">Traduzione: {p.hint_it}</p>}
        </div>
      )}

      {p.type === "dictation" && (
        <div className="stack">
          <VoiceBanner force />
          <div className="row">
            <button type="button" className="btn primary" disabled={!audioOk} onClick={() => say(p.text, 0.85)}>Ascolta</button>
            <button type="button" className="btn" disabled={!audioOk} onClick={() => say(p.text, 0.55)}>Più lento</button>
            {!audioOk && !revealed && <button type="button" className="btn" onClick={() => setRevealed(true)}>Mostra il testo</button>}
          </div>
          {revealed && !audioOk && <Ru big>{p.text}</Ru>}
          <p className="muted small">Scrivi la frase che senti (accenti e maiuscole non contano).</p>
        </div>
      )}

      {typing && p.type !== "cloze" && (
        <div className="stack">
          <label className="sr" htmlFor="ans">La tua risposta</label>
          <input
            id="ans"
            ref={inputRef}
            className="field"
            lang={typingRussian ? "ru" : "it"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!!grade}
            placeholder={typingRussian ? "Scrivi in russo" : "Scrivi in italiano"}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      )}
      {typing && typingRussian && !grade && (
        <Keypad
          onKey={(c) => {
            setText((t) => t + c);
            inputRef.current?.focus();
          }}
          onBackspace={() => setText((t) => t.slice(0, -1))}
        />
      )}

      {p.type === "match" && <Match key={exercise.id} exercise={exercise} pairs={p.pairs} done={!!grade} onFinish={(m) => setGrade(gradeExercise(exercise, { kind: "match", mistakes: m }))} />}

      {!grade && p.type !== "match" && (
        <button type="submit" className="btn primary big block" disabled={p.type === "multiple_choice" ? choice === null : !text.trim()}>
          Controlla
        </button>
      )}

      <div aria-live="polite">
        {grade && (
          <div className={`feedback ${finalCorrect ? "ok" : "ko"}`}>
            <div className="title">
              {finalCorrect ? (grade.approximate ? "Corretto (con un piccolo refuso)" : selfOk && !grade.correct ? "Segnata come corretta" : "Corretto!") : "Non proprio, ma sbagliando si impara"}
            </div>
            {(!finalCorrect || grade.approximate) && p.type !== "match" && (
              <div>
                Risposta attesa:{" "}
                {hasCyrillic(grade.expected) ? <Ru>{grade.expected}</Ru> : <strong>{grade.expected}</strong>}
              </div>
            )}
            {p.type === "match" && !finalCorrect && <div className="small">Alcuni abbinamenti erano sbagliati: guarda le coppie qui sotto.</div>}
            {p.type === "dictation" && <div className="muted small">{p.translation_it}</div>}
            {p.type === "cloze" && p.text && finalCorrect === false && <div className="small muted">{p.text.replace("___", grade.expected)}</div>}
            {canSelfMark && !selfOk && (
              <button type="button" className="btn small" style={{ marginTop: 8 }} onClick={() => setSelfOk(true)}>
                La mia risposta è giusta lo stesso
              </button>
            )}
          </div>
        )}
      </div>

      {grade && p.type === "match" && (
        <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
          {p.pairs.map((x, i) => (
            <li key={i}><Ru>{x.ru}</Ru> = {x.it}</li>
          ))}
        </ul>
      )}

      {grade && !finalCorrect && showWords && lesson && (
        <details className="review">
          <summary>Rivedi la spiegazione: {lesson.title_it}</summary>
          <Markdown source={lesson.explanation_md} />
        </details>
      )}

      {grade && showWords && words.length > 0 && (
        <details open={!finalCorrect}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>Parole di questo esercizio</summary>
          {words.map((w) => <WordLine key={w.id} word={w} />)}
        </details>
      )}

      {grade && (
        <button ref={nextRef} type="submit" className="btn primary big block">
          {nextLabel}
        </button>
      )}
    </form>
  );
}

function Match({ exercise, pairs, done, onFinish }: { exercise: Exercise; pairs: { ru: string; it: string }[]; done: boolean; onFinish: (mistakes: number) => void }) {
  const left = useMemo(() => pairs.map((p, i) => ({ i, label: p.ru })), [pairs]);
  const right = useMemo(() => shuffle(pairs.map((p, i) => ({ i, label: p.it })), seededRng("m:" + exercise.id)), [pairs, exercise.id]);
  // Si puo' toccare prima una colonna o l'altra: quando ci sono due selezioni si confronta la coppia.
  const [selL, setSelL] = useState<number | null>(null);
  const [selR, setSelR] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [miss, setMiss] = useState<{ l: number; r: number } | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const { say } = useApp();

  const settle = (l: number, r: number) => {
    if (l === r) {
      const next = new Set(matched).add(l);
      setMatched(next);
      setMiss(null);
      if (next.size === pairs.length) onFinish(mistakes);
    } else {
      setMistakes((m) => m + 1);
      setMiss({ l, r });
      setTimeout(() => setMiss(null), 700);
    }
    setSelL(null);
    setSelR(null);
  };
  const pickLeft = (i: number) => {
    say(left[i].label);
    if (selR !== null) settle(i, selR);
    else setSelL(i);
  };
  const pickRight = (i: number) => {
    if (selL !== null) settle(selL, i);
    else setSelR(i);
  };

  return (
    <div>
      <p className="muted small">Tocca una parola russa e la sua traduzione (in qualsiasi ordine). Errori: {mistakes}</p>
      <div className="match">
        <div className="stack" role="group" aria-label="Parole russe">
          {left.map((l) => (
            <button
              key={l.i}
              type="button"
              lang="ru"
              className={`btn ${matched.has(l.i) ? "done" : selL === l.i ? "sel" : miss?.l === l.i ? "miss" : ""}`}
              disabled={matched.has(l.i) || done}
              aria-pressed={selL === l.i}
              onClick={() => pickLeft(l.i)}
            >
              <Ru>{l.label}</Ru>
            </button>
          ))}
        </div>
        <div className="stack" role="group" aria-label="Traduzioni">
          {right.map((r) => (
            <button
              key={r.i}
              type="button"
              className={`btn ${matched.has(r.i) ? "done" : selR === r.i ? "sel" : miss?.r === r.i ? "miss" : ""}`}
              disabled={matched.has(r.i) || done}
              aria-pressed={selR === r.i}
              onClick={() => pickRight(r.i)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
