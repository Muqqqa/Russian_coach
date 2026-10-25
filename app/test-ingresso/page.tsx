"use client";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { ExerciseCard } from "@/components/ExerciseCard";
import { ProgressBar } from "@/components/ui";
import { LEVELS, LEVEL_DESC, LEVEL_LABEL } from "@/lib/levels";
import { MAX_QUESTIONS, MIN_QUESTIONS, createPlacement, isPlacementFinished, pickPlacementQuestion, placementResult, recordPlacementAnswer, type PlacementResult, type PlacementSession } from "@/lib/placement";
import { mulberry32 } from "@/lib/rng";
import type { Exercise, Level } from "@/lib/contract";

export default function PlacementPage() {
  const { ready, bank, bankError, state, update, today } = useApp();
  const [session, setSession] = useState<PlacementSession>();
  const [question, setQuestion] = useState<Exercise>();
  const [result, setResult] = useState<PlacementResult>();
  const [applied, setApplied] = useState<Level>();
  const rng = useRef(mulberry32(Date.now() >>> 0));

  const pool = useMemo(() => bank?.exercises ?? [], [bank]);

  if (!ready || (!bank && !bankError)) return <p className="muted">Caricamento...</p>;
  if (!bank) return <div className="banner err" role="alert"><strong>Dati non caricati.</strong> {bankError}</div>;

  // Scelta manuale: placement.done = true con score 0 (nessun test fatto).
  const choose = (level: Level, score = 0) => {
    update((s) => ({ ...s, level, placement: { done: true, date: today, score } }));
    setApplied(level);
  };

  const begin = () => {
    const s = createPlacement(bank.levelsAvailable.length ? bank.levelsAvailable : ["zero"]);
    const q = pickPlacementQuestion(s, pool, rng.current);
    setResult(undefined);
    setApplied(undefined);
    setSession(s);
    setQuestion(q);
  };

  const answer = (correct: boolean) => {
    if (!session || !question) return;
    const next = recordPlacementAnswer(session, question, correct);
    setSession(next);
    if (isPlacementFinished(next)) {
      setResult(placementResult(next));
      setQuestion(undefined);
      return;
    }
    const q = pickPlacementQuestion(next, pool, rng.current);
    if (!q) {
      setResult(placementResult(next));
      setQuestion(undefined);
    } else setQuestion(q);
  };

  if (session && question && !result) {
    const n = session.answers.length;
    return (
      <div className="stack">
        <h1>Test d&apos;ingresso</h1>
        <div className="row between small muted">
          <span>Domanda {n + 1} (di solito {MIN_QUESTIONS}-{MAX_QUESTIONS})</span>
          <button className="btn small" onClick={() => { setSession(undefined); setQuestion(undefined); }}>Interrompi</button>
        </div>
        <ProgressBar pct={(n / MIN_QUESTIONS) * 100} label="Avanzamento del test" />
        <ExerciseCard key={question.id} exercise={question} onDone={answer} showWords={false} />
        <p className="muted small">Se non sai una risposta, scrivi quello che pensi o scegli a caso: il test si adatta alle tue risposte.</p>
      </div>
    );
  }

  if (result) {
    const sug = result.level;
    return (
      <div className="stack">
        <h1>Risultato del test</h1>
        <div className="card stack">
          <p style={{ margin: 0 }}>Livello consigliato</p>
          <div className="stat"><div className="n">{LEVEL_LABEL[sug]}</div><div className="muted">{LEVEL_DESC[sug]}</div></div>
          <p className="muted" style={{ margin: 0 }}>Hai risposto correttamente al {result.score}% delle {session?.answers.length} domande.</p>
          {result.capped && <div className="banner">Hai superato tutte le domande disponibili: i contenuti oltre {LEVEL_LABEL[sug]} non sono ancora nel banco, quindi questo è il massimo che posso assegnare.</div>}
          <table className="t">
            <thead><tr><th>Livello</th><th>Domande</th><th>Corrette</th></tr></thead>
            <tbody>
              {result.perLevel.filter((p) => p.asked > 0).map((p) => (
                <tr key={p.level}><td>{LEVEL_LABEL[p.level]}</td><td>{p.asked}</td><td>{p.correct}</td></tr>
              ))}
            </tbody>
          </table>
          {applied ? (
            <div className="banner" style={{ background: "var(--good-soft)", borderColor: "var(--good)" }} role="status">
              Livello {LEVEL_LABEL[applied]} salvato. <Link href="/lezione/">Vai alla prima lezione</Link>
            </div>
          ) : (
            <div className="row">
              <button className="btn primary" onClick={() => choose(sug, result.score)}>Usa {LEVEL_LABEL[sug]}</button>
              <button className="btn" onClick={begin}>Rifai il test</button>
            </div>
          )}
          {!applied && <p className="muted small" style={{ margin: 0 }}>Non sei d&apos;accordo? Puoi scegliere un altro livello qui sotto.</p>}
        </div>
        {!applied && <ManualPicker current={sug} onPick={(l) => choose(l, result.score)} />}
      </div>
    );
  }

  return (
    <div className="stack">
      <h1>Test d&apos;ingresso</h1>
      <div className="card stack">
        <p style={{ margin: 0 }}>Da 10 a 15 domande che si adattano alle tue risposte: se vai bene diventano più difficili, se sbagli si semplificano. Dura circa 5 minuti e non serve prepararsi.</p>
        {bank.exercises.length === 0 ? (
          <div className="banner err">Nessuna domanda disponibile: i dati non sono stati caricati.</div>
        ) : (
          <button className="btn primary big" onClick={begin}>{state.placement?.done ? "Rifai il test" : "Inizia il test"}</button>
        )}
        {state.placement?.done && <p className="muted small" style={{ margin: 0 }}>Ultimo test: {state.placement.date}, {state.placement.score}% corrette. Livello attuale: {LEVEL_LABEL[state.level]}.</p>}
        <p className="muted small" style={{ margin: 0 }}>Le risposte del test non modificano il ripasso delle parole.</p>
        <div className="banner" role="note">
          <strong>Non conosci nemmeno l&apos;alfabeto?</strong> Salta il test: scegli «Zero» qui sotto e la prima lezione ti insegna a leggere.
          <div style={{ marginTop: 8 }}>
            <Link className="btn primary" href="/lezione/" onClick={() => choose("zero", 0)}>Parto da zero</Link>
          </div>
        </div>
      </div>

      <section id="manuale" aria-labelledby="man">
        <h2 id="man">Oppure scegli tu il livello</h2>
        <ManualPicker current={applied ?? (state.placement?.done ? state.level : undefined)} onPick={(l) => choose(l, state.placement?.score ?? 0)} />
        {applied && <p role="status" className="chip good">Livello {LEVEL_LABEL[applied]} salvato</p>}
      </section>
    </div>
  );
}

function ManualPicker({ current, onPick }: { current?: Level; onPick: (l: Level) => void }) {
  return (
    <div className="stack">
      {LEVELS.map((l) => (
        <button key={l} type="button" className="btn" aria-pressed={current === l} onClick={() => onPick(l)} style={{ justifyContent: "space-between", textAlign: "left", borderColor: current === l ? "var(--primary)" : undefined }}>
          <span><strong>{LEVEL_LABEL[l]}</strong> <span className="muted">{LEVEL_DESC[l]}</span></span>
          {current === l && <span className="chip">scelto</span>}
        </button>
      ))}
    </div>
  );
}
