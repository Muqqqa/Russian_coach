"use client";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { ProgressBar, VoiceBanner } from "@/components/ui";
import { LEVEL_DESC, LEVEL_LABEL } from "@/lib/levels";
import { currentWeek, weekProgress } from "@/lib/goals";
import { displayStreak, streakAtRisk } from "@/lib/progress";
import { dueWords } from "@/lib/srs";
import { formatDateIT } from "@/lib/dates";

export default function Home() {
  const { ready, state, today, extra, bank, bankError, storageOk } = useApp();
  if (!ready) return <p className="muted">Caricamento...</p>;

  const streak = displayStreak(state.streak, today);
  const week = currentWeek(state, today);
  const wp = weekProgress(week);
  const due = dueWords(state.srs, today).length;
  const doneToday = state.streak.lastDay === today;
  const minutesToday = Math.round((extra.history[today]?.seconds ?? 0) / 60);
  const needPlacement = !state.placement?.done;

  return (
    <div className="stack">
      <header className="hdr">
        <Link href="/" className="brand">Russian <span>Coach</span></Link>
        <span className="chip">Livello {LEVEL_LABEL[state.level]}</span>
      </header>

      {!storageOk && (
        <div className="banner err" role="alert">
          <strong>Salvataggio non riuscito.</strong> Il browser non permette di salvare i dati (navigazione privata?). I progressi andranno persi alla chiusura: usa Esporta nella pagina Progressi.
        </div>
      )}
      {bankError && (
        <div className="banner err" role="alert">
          <strong>Dati non caricati.</strong> {bankError}. Ricarica la pagina; se il problema resta, i dati potrebbero non essere stati generati (<code>npm run copy-data</code>).
        </div>
      )}
      <VoiceBanner />

      <section className="card stack" aria-labelledby="oggi">
        <h1 id="oggi">{doneToday ? "Lezione di oggi completata" : "Lezione di oggi"}</h1>
        <p className="muted" style={{ margin: 0 }}>
          {doneToday
            ? `Bravo! Oggi hai studiato ${minutesToday} minuti. Se vuoi, puoi farne un'altra.`
            : due > 0
              ? `${due} ${due === 1 ? "parola da ripassare" : "parole da ripassare"} oggi, piu' qualche novita'.`
              : "Una lezione su misura: ripasso, errori ricorrenti e materiale nuovo."}
        </p>
        <div className="row">
          <Link className="btn primary big grow" href="/lezione/">{doneToday ? "Un'altra lezione" : "Inizia la lezione"}</Link>
          <span className="chip">{state.settings.dailyMinutes} min</span>
        </div>
        {streakAtRisk(state.streak, today) && <p className="small" style={{ margin: 0, color: "var(--warn)" }}>Studia oggi per non perdere la tua serie di {state.streak.current} giorni.</p>}
      </section>

      {needPlacement && (
        <section className="card soft stack" aria-labelledby="pl">
          <h2 id="pl">Da dove partire?</h2>
          <p style={{ margin: 0 }}>Fai il test d&apos;ingresso (10-15 domande) per trovare il livello giusto, oppure scegli tu il livello.</p>
          <div className="row">
            <Link className="btn primary" href="/test-ingresso/">Fai il test d&apos;ingresso</Link>
            <Link className="btn" href="/test-ingresso/#manuale">Scelgo io il livello</Link>
          </div>
        </section>
      )}

      <div className="grid2">
        <section className="card stat" aria-label="Serie di giorni">
          <div className="n">{streak}</div>
          <div className="muted small">{streak === 1 ? "giorno di fila" : "giorni di fila"}</div>
          <div className="muted small">record {state.streak.best}</div>
        </section>
        <section className="card stat" aria-label="Parole da ripassare">
          <div className="n">{due}</div>
          <div className="muted small">da ripassare</div>
          <div className="muted small">{Object.keys(state.srs).length} parole incontrate</div>
        </section>
      </div>

      <section className="card stack" aria-labelledby="sett">
        <h2 id="sett">Questa settimana</h2>
        {week ? (
          <>
            <div>
              <div className="row between small"><span>Minuti</span><span>{Math.round(week.minutesDone)} / {week.minutesTarget}</span></div>
              <ProgressBar pct={wp.minutesPct} label="Minuti della settimana" good={wp.minutesPct >= 100} />
            </div>
            <div>
              <div className="row between small"><span>Lezioni</span><span>{week.lessonsDone} / {week.lessonsTarget}</span></div>
              <ProgressBar pct={wp.lessonsPct} label="Lezioni della settimana" good={wp.lessonsPct >= 100} />
            </div>
            {wp.done && <p className="chip good" style={{ alignSelf: "flex-start" }}>Obiettivo settimanale raggiunto</p>}
          </>
        ) : null}
        <p className="muted small" style={{ margin: 0 }}>
          {state.goal
            ? `Obiettivo finale: ${LEVEL_LABEL[state.goal.targetLevel]} entro il ${formatDateIT(state.goal.targetDate)}.`
            : "Non hai ancora scelto un obiettivo finale."}{" "}
          <Link href="/obiettivi/">{state.goal ? "Modifica" : "Imposta obiettivo"}</Link>
        </p>
      </section>

      <section className="card" aria-labelledby="liv">
        <h2 id="liv">Il tuo livello: {LEVEL_LABEL[state.level]}</h2>
        <p className="muted" style={{ margin: 0 }}>{LEVEL_DESC[state.level]}.</p>
        {bank && <p className="muted small" style={{ margin: "8px 0 0" }}>Banco: {bank.exercises.length} esercizi{bank.curatedCount === 0 ? " (generati dalle parole e dalle frasi; il banco curato non e' ancora arrivato)" : `, di cui ${bank.curatedCount} curati`}.</p>}
      </section>

      <footer className="small muted center">
        <Link href="/crediti/">Crediti e licenze</Link>
      </footer>
    </div>
  );
}
