"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { VoiceBanner } from "@/components/ui";
import { LEVELS, LEVEL_LABEL } from "@/lib/levels";
import { ensureCurrentWeek } from "@/lib/goals";
import { clearAll, defaultExtra, defaultState } from "@/lib/state";

type Theme = "system" | "light" | "dark";

export default function SettingsPage() {
  const { ready, state, update, voiceStatus, say, replaceAll, bank, today } = useApp();
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    try {
      const t = localStorage.getItem("rc.theme");
      if (t === "light" || t === "dark") setTheme(t);
    } catch {
      /* ignorato */
    }
  }, []);

  const applyTheme = (t: Theme) => {
    setTheme(t);
    try {
      if (t === "system") {
        localStorage.removeItem("rc.theme");
        document.documentElement.removeAttribute("data-theme");
      } else {
        localStorage.setItem("rc.theme", t);
        document.documentElement.setAttribute("data-theme", t);
      }
    } catch {
      /* ignorato */
    }
  };

  if (!ready) return <p className="muted">Caricamento...</p>;

  return (
    <div className="stack">
      <h1>Impostazioni</h1>

      <section className="card stack" aria-labelledby="min">
        <h2 id="min">Durata della lezione</h2>
        <div className="seg" role="group" aria-label="Minuti al giorno">
          {([15, 30, 45] as const).map((m) => (
            <button key={m} aria-pressed={state.settings.dailyMinutes === m} onClick={() => update((s) => ensureCurrentWeek({ ...s, settings: { ...s.settings, dailyMinutes: m } }, today))}>{m} min</button>
          ))}
        </div>
        <p className="muted small" style={{ margin: 0 }}>Cambiando la durata si aggiornano anche le lezioni dell'obiettivo settimanale.</p>
      </section>

      <section className="card stack" aria-labelledby="lv">
        <h2 id="lv">Livello</h2>
        <label className="sr" htmlFor="liv">Livello</label>
        <select id="liv" className="field" value={state.level} onChange={(e) => update((s) => ({ ...s, level: e.target.value as typeof s.level }))}>
          {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
        </select>
        <Link href="/test-ingresso/">Rifai il test d&apos;ingresso</Link>
      </section>

      <section className="card stack" aria-labelledby="aud">
        <h2 id="aud">Audio</h2>
        <label className="row" style={{ gap: 10 }}>
          <input type="checkbox" checked={state.settings.audioEnabled} onChange={(e) => update((s) => ({ ...s, settings: { ...s.settings, audioEnabled: e.target.checked } }))} style={{ width: 22, height: 22 }} />
          <span>Leggi le parole ad alta voce (dettati compresi)</span>
        </label>
        <p style={{ margin: 0 }}>
          Voce russa:{" "}
          <strong>
            {voiceStatus === "ready" ? "disponibile" : voiceStatus === "loading" ? "ricerca in corso..." : voiceStatus === "unsupported" ? "audio non supportato" : "non trovata"}
          </strong>
        </p>
        <VoiceBanner force />
        <div>
          <button className="btn" disabled={voiceStatus !== "ready" || !state.settings.audioEnabled} onClick={() => say("Привет! Как дела?")}>Prova la voce</button>
        </div>
      </section>

      <section className="card stack" aria-labelledby="th">
        <h2 id="th">Tema</h2>
        <div className="seg" role="group" aria-label="Tema">
          {([["system", "Automatico"], ["light", "Chiaro"], ["dark", "Scuro"]] as const).map(([v, l]) => (
            <button key={v} aria-pressed={theme === v} onClick={() => applyTheme(v)}>{l}</button>
          ))}
        </div>
      </section>

      <section className="card stack" aria-labelledby="dat">
        <h2 id="dat">Dati</h2>
        {bank && <p className="muted small" style={{ margin: 0 }}>{bank.words.length} parole, {bank.sentences.length} frasi, {bank.lessons.length} lezioni del percorso, {bank.exercises.length} esercizi ({bank.curatedCount} curati).</p>}
        <p style={{ margin: 0 }}><Link href="/crediti/">Crediti e licenze</Link> · <Link href="/progressi/">Esporta o importa i progressi</Link></p>
        <div>
          <button
            className="btn danger"
            onClick={() => {
              if (window.confirm("Cancellare tutti i progressi da questo browser? L'operazione non si puo' annullare (esporta prima una copia).")) {
                clearAll();
                replaceAll(defaultState(), defaultExtra());
              }
            }}
          >
            Cancella tutti i progressi
          </button>
        </div>
      </section>
    </div>
  );
}
