"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { ExerciseCard, typeLabel } from "@/components/ExerciseCard";
import { Markdown, ProgressBar, VoiceBanner, WordLine } from "@/components/ui";
import { buildLesson, calibratedTimeFactor, type Category } from "@/lib/lesson";
import { applyAnswer, completeSession, displayStreak } from "@/lib/progress";
import { currentWeek, weekProgress } from "@/lib/goals";
import type { ActiveSession } from "@/lib/state";
import type { Exercise } from "@/lib/contract";

const CAT_LABEL: Record<Category, string> = { errori: "sui tuoi errori", ripasso: "di ripasso", nuovo: "con parole nuove", mix: "di rinforzo" };

type Phase = "intro" | "run" | "done";

export default function LessonPage() {
  const { ready, state, today, extra, bank, bankError, update, updateExtra, audioOk } = useApp();
  const [minutes, setMinutes] = useState<15 | 30 | 45>(15);
  const [phase, setPhase] = useState<Phase>("intro");
  const [summary, setSummary] = useState<{ correct: number; total: number; seconds: number; wrongIds: string[]; streak: number; lesson?: { title: string; passed: boolean } }>();
  const startedAt = useRef(Date.now());
  const minutesInit = useRef(false);

  useEffect(() => {
    if (ready && !minutesInit.current) {
      minutesInit.current = true;
      setMinutes(state.settings.dailyMinutes);
    }
  }, [ready, state.settings.dailyMinutes]);

  const active = extra.active && extra.active.day === today ? extra.active : undefined;
  const lessonN = extra.usedToday.day === today ? extra.usedToday.ids.length : 0;

  const preview = useMemo(() => {
    if (!bank || bank.exercises.length === 0) return undefined;
    const n = (extra.history[today]?.lessons ?? 0) + 1;
    return buildLesson({
      bank,
      state,
      minutes,
      today,
      seed: `${today}:${minutes}:${n}`,
      allowDictation: audioOk,
      excludeIds: extra.usedToday.day === today ? extra.usedToday.ids : [],
      timeFactor: calibratedTimeFactor(extra.history, today),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bank, minutes, today, audioOk, state.level, state.completedLessons.length, Object.keys(state.srs).length, lessonN]);

  const start = () => {
    if (!preview) return;
    const n = (extra.history[today]?.lessons ?? 0) + 1;
    const session: ActiveSession = {
      day: today,
      minutes,
      n,
      exerciseIds: preview.exercises.map((e) => e.id),
      index: 0,
      results: [],
      lessonId: preview.curriculumLesson?.id,
    };
    updateExtra((e) => ({
      ...e,
      active: session,
      usedToday: { day: today, ids: [...(e.usedToday.day === today ? e.usedToday.ids : []), ...session.exerciseIds] },
      seenLessons: session.lessonId && !(e.seenLessons ?? []).includes(session.lessonId) ? [...(e.seenLessons ?? []), session.lessonId] : e.seenLessons,
    }));
    startedAt.current = Date.now();
    setPhase("run");
  };

  const resume = () => {
    if (!active || !bank) return;
    setMinutes(active.minutes);
    startedAt.current = Date.now();
    setPhase("run");
  };

  if (!ready || (!bank && !bankError)) return <p className="muted">Caricamento...</p>;
  if (!bank) return <div className="banner err" role="alert"><strong>Dati non caricati.</strong> {bankError}</div>;

  if (phase === "run" && active && bank) {
    return (
      <Runner
        session={active}
        bankExercises={bank.exerciseById}
        startedAt={startedAt}
        onAnswer={(ex, correct) => update((s) => applyAnswer(s, ex, correct, today))}
        onProgress={(next) => updateExtra((e) => ({ ...e, active: next }))}
        onFinish={(res) => {
          const correct = res.filter((r) => r.correct).length;
          const seconds = res.reduce((n, r) => n + r.seconds, 0);
          let after = state;
          update((s) => {
            after = completeSession(s, { today, seconds, correct, answered: res.length, lessonId: active.lessonId });
            return after;
          });
          updateExtra((e) => {
            const h = e.history[today] ?? { seconds: 0, answered: 0, correct: 0, lessons: 0 };
            return { ...e, active: undefined, history: { ...e.history, [today]: { seconds: h.seconds + seconds, answered: h.answered + res.length, correct: h.correct + correct, lessons: h.lessons + 1 } } };
          });
          const lessonTitle = active.lessonId ? bank.lessons.find((l) => l.id === active.lessonId)?.title_it : undefined;
          setSummary({
            correct,
            total: res.length,
            seconds,
            wrongIds: res.filter((r) => !r.correct).map((r) => r.id),
            streak: displayStreak(after.streak, today),
            lesson: lessonTitle && active.lessonId ? { title: lessonTitle, passed: after.completedLessons.includes(active.lessonId) } : undefined,
          });
          setPhase("done");
        }}
      />
    );
  }

  if (phase === "done" && summary) {
    const week = currentWeek(state, today);
    const wp = weekProgress(week);
    const pct = summary.total ? Math.round((summary.correct / summary.total) * 100) : 0;
    const wrongWords = [...new Set(summary.wrongIds.flatMap((id) => bank.exerciseById.get(id)?.words ?? []))]
      .map((id) => bank.wordById.get(id))
      .filter((w): w is NonNullable<typeof w> => !!w)
      .slice(0, 8);
    return (
      <div className="stack">
        <h1>Lezione completata</h1>
        <div className="card stack">
          <div className="grid3">
            <div className="stat"><div className="n">{summary.correct}/{summary.total}</div><div className="muted small">corrette ({pct}%)</div></div>
            <div className="stat"><div className="n">{Math.max(1, Math.round(summary.seconds / 60))}</div><div className="muted small">minuti</div></div>
            <div className="stat"><div className="n">{summary.streak}</div><div className="muted small">giorni di fila</div></div>
          </div>
          <p style={{ margin: 0 }}>
            {pct >= 85 ? "Ottimo lavoro!" : pct >= 60 ? "Buon lavoro: gli errori torneranno nei prossimi ripassi." : "Non preoccuparti: gli errori che hai fatto torneranno presto, e ripetere è il modo migliore per ricordare."}
          </p>
          {summary.lesson && (
            <p className="chip" style={{ alignSelf: "flex-start", margin: 0 }}>
              {summary.lesson.passed ? `Argomento superato: ${summary.lesson.title}` : `Argomento da consolidare: ${summary.lesson.title} (serve almeno il 70% di risposte corrette per superarlo; tornerà nella prossima lezione)`}
            </p>
          )}
          {wrongWords.length > 0 && (
            <div>
              <h2>Da ripassare</h2>
              {wrongWords.map((w) => <WordLine key={w.id} word={w} />)}
            </div>
          )}
          {week && (
            <div>
              <div className="row between small"><span>Obiettivo della settimana</span><span>{Math.round(week.minutesDone)} / {week.minutesTarget} min</span></div>
              <ProgressBar pct={wp.minutesPct} label="Minuti della settimana" good={wp.done} />
            </div>
          )}
        </div>
        <div className="row">
          <button className="btn primary" onClick={() => { setPhase("intro"); setSummary(undefined); }}>Un'altra lezione</button>
          <Link className="btn" href="/">Torna alla home</Link>
        </div>
      </div>
    );
  }

  const noContent = bank && bank.exercises.length === 0;
  const cur = preview?.curriculumLesson;
  const firstTime = !!cur && !(extra.seenLessons ?? []).includes(cur.id) && !state.completedLessons.includes(cur.id);
  return (
    <div className="stack">
      <h1>Lezione del giorno</h1>
      <VoiceBanner />
      {noContent && <div className="banner err">Non ci sono ancora esercizi disponibili. Controlla che i dati siano stati copiati (<code>npm run copy-data</code>).</div>}

      {active && active.index < active.exerciseIds.length && (
        <div className="card soft stack">
          <h2>Lezione in corso</h2>
          <p style={{ margin: 0 }}>Hai una lezione iniziata: esercizio {active.index + 1} di {active.exerciseIds.length}.</p>
          <div className="row">
            <button className="btn primary" onClick={resume}>Riprendi</button>
            <button className="btn" onClick={() => updateExtra((e) => ({ ...e, active: undefined }))}>Scarta e ricomincia</button>
          </div>
        </div>
      )}

      {cur && (
        <details className="card" open={firstTime}>
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>
            {firstTime ? "Prima di iniziare, leggi" : "Argomento della lezione"}: {cur.title_it}
          </summary>
          <div style={{ marginTop: 10 }}><Markdown source={cur.explanation_md} /></div>
          {firstTime && <p className="muted small" style={{ marginBottom: 0 }}>Quando hai finito di leggere, scorri e premi «Inizia». Durante gli esercizi, se sbagli, potrai rivedere questa spiegazione.</p>}
        </details>
      )}

      <div className="card stack">
        <h2>Quanto tempo hai?</h2>
        <div className="seg" role="group" aria-label="Durata della lezione">
          {([15, 30, 45] as const).map((m) => (
            <button key={m} type="button" aria-pressed={minutes === m} onClick={() => setMinutes(m)}>{m} min</button>
          ))}
        </div>
        {preview && (
          <p className="muted" style={{ margin: 0 }}>
            {preview.exercises.length} esercizi, circa {Math.max(1, Math.round(preview.estimatedMinutes))} minuti:{" "}
            {(Object.keys(preview.counts) as Category[]).filter((c) => preview.counts[c] > 0).map((c) => `${preview.counts[c]} ${CAT_LABEL[c]}`).join(", ")}.
          </p>
        )}
        <button className="btn primary big block" disabled={!preview || preview.exercises.length === 0} onClick={start}>Inizia</button>
      </div>

    </div>
  );
}

function Runner({
  session,
  bankExercises,
  startedAt,
  onAnswer,
  onProgress,
  onFinish,
}: {
  session: ActiveSession;
  bankExercises: Map<string, Exercise>;
  startedAt: React.MutableRefObject<number>;
  onAnswer: (ex: Exercise, correct: boolean) => void;
  onProgress: (s: ActiveSession) => void;
  onFinish: (results: ActiveSession["results"]) => void;
}) {
  const list = useMemo(() => session.exerciseIds.map((id) => bankExercises.get(id)).filter((e): e is Exercise => !!e), [session.exerciseIds, bankExercises]);
  const [index, setIndex] = useState(Math.min(session.index, list.length));
  const [results, setResults] = useState(session.results);
  const shownAt = useRef(Date.now());
  useEffect(() => {
    shownAt.current = Date.now();
  }, [index]);

  const ex = list[index];
  const done = useCallback(
    (correct: boolean) => {
      const seconds = Math.min(180, Math.max(3, Math.round((Date.now() - shownAt.current) / 1000)));
      onAnswer(ex, correct);
      const nextResults = [...results, { id: ex.id, correct, seconds }];
      setResults(nextResults);
      if (index + 1 >= list.length) onFinish(nextResults);
      else {
        setIndex(index + 1);
        onProgress({ ...session, index: index + 1, results: nextResults });
      }
    },
    [ex, results, index, list.length, onAnswer, onFinish, onProgress, session],
  );

  if (!ex) {
    // esercizi non più nel banco: chiude la lezione con i risultati ottenuti
    return (
      <div className="stack">
        <p>Questa lezione non è più disponibile.</p>
        <button className="btn primary" onClick={() => onFinish(results)}>Chiudi</button>
      </div>
    );
  }
  void startedAt;
  return (
    <div className="stack">
      <div className="row between">
        <span className="muted small">Esercizio {index + 1} di {list.length}</span>
        <Link className="small" href="/" aria-label="Esci dalla lezione: potrai riprenderla più tardi">Esci (riprendi dopo)</Link>
      </div>
      <ProgressBar pct={(index / list.length) * 100} label="Avanzamento della lezione" />
      <ExerciseCard key={ex.id} exercise={ex} onDone={done} nextLabel={index + 1 >= list.length ? "Concludi" : "Avanti"} />
    </div>
  );
}
