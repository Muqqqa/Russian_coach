"use client";
import { useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { Ru } from "@/components/ui";
import { boxDistribution } from "@/lib/srs";
import { displayStreak } from "@/lib/progress";
import { addDays } from "@/lib/dates";
import { exportState, importState } from "@/lib/state";
import { LEVEL_LABEL } from "@/lib/levels";
import { wordGloss } from "@/lib/bank";

export default function ProgressPage() {
  const { ready, state, extra, today, bank, replaceAll } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string[] }>();

  if (!ready) return <p className="muted">Caricamento...</p>;

  const boxes = boxDistribution(state.srs);
  const total = Object.keys(state.srs).length;
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  const maxSec = Math.max(60, ...days.map((d) => extra.history[d]?.seconds ?? 0));
  const topTags = Object.entries(state.errors.grammar_tags).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topWords = Object.entries(state.errors.words).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const all = Object.values(extra.history);
  const answered = all.reduce((n, d) => n + d.answered, 0);
  const correct = all.reduce((n, d) => n + d.correct, 0);

  const doExport = () => {
    const blob = new Blob([exportState(state, extra)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `russian-coach-${today}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMsg({ ok: true, text: ["File esportato. Conservalo: puoi importarlo su un altro dispositivo."] });
  };

  const doImport = async (file: File) => {
    const text = await file.text();
    const r = importState(text);
    if (!r.ok) {
      setMsg({ ok: false, text: ["Importazione non riuscita:", ...r.errors] });
      return;
    }
    if (!window.confirm("Importare questo file sostituira' i progressi attuali. Continuare?")) return;
    replaceAll(r.state, { history: r.history, usedToday: { day: "", ids: [] } });
    setMsg({ ok: true, text: [`Importati i progressi (livello ${LEVEL_LABEL[r.state.level]}, ${Object.keys(r.state.srs).length} parole).`] });
  };

  return (
    <div className="stack">
      <h1>Progressi</h1>

      <div className="grid3">
        <section className="card stat"><div className="n">{displayStreak(state.streak, today)}</div><div className="muted small">serie attuale</div></section>
        <section className="card stat"><div className="n">{state.streak.best}</div><div className="muted small">record</div></section>
        <section className="card stat"><div className="n">{answered ? Math.round((correct / answered) * 100) : 0}%</div><div className="muted small">risposte corrette</div></section>
      </div>

      <section className="card stack" aria-labelledby="att">
        <h2 id="att">Ultimi 14 giorni</h2>
        <div className="hist" role="img" aria-label={`Minuti studiati negli ultimi 14 giorni: ${days.map((d) => `${d.slice(5)} ${Math.round((extra.history[d]?.seconds ?? 0) / 60)}`).join(", ")}`}>
          {days.map((d) => {
            const s = extra.history[d]?.seconds ?? 0;
            return <div key={d} className={s === 0 ? "zero" : ""} style={{ height: `${Math.max(4, (s / maxSec) * 100)}%` }} title={`${d}: ${Math.round(s / 60)} min`} />;
          })}
        </div>
        <p className="muted small" style={{ margin: 0 }}>Ogni colonna e' un giorno; l'ultima e' oggi.</p>
      </section>

      <section className="card stack" aria-labelledby="srs">
        <h2 id="srs">Lessico (ripetizione dilazionata)</h2>
        <p className="muted small" style={{ margin: 0 }}>{total} parole incontrate. Piu' sali di scatola, piu' tempo passa tra i ripassi (1, 2, 4, 8, 16 giorni).</p>
        {([1, 2, 3, 4, 5] as const).map((b) => (
          <div key={b}>
            <div className="row between small"><span>Scatola {b}</span><span>{boxes[b]}</span></div>
            <div className="bar" aria-hidden="true"><span style={{ width: `${total ? (boxes[b] / total) * 100 : 0}%` }} /></div>
          </div>
        ))}
      </section>

      <section className="card stack" aria-labelledby="err">
        <h2 id="err">Errori ricorrenti</h2>
        {topTags.length === 0 && topWords.length === 0 && <p className="muted" style={{ margin: 0 }}>Nessun errore ricorrente: ottimo!</p>}
        {topTags.length > 0 && (
          <div>
            <h3>Argomenti</h3>
            <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>{topTags.map(([t, n]) => <li key={t}>{t} <span className="chip bad">{n}</span></li>)}</ul>
          </div>
        )}
        {topWords.length > 0 && (
          <div>
            <h3>Parole</h3>
            <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
              {topWords.map(([id, n]) => {
                const w = bank?.wordById.get(id);
                return <li key={id}>{w ? <><Ru>{w.stress}</Ru> = {wordGloss(w).text}</> : id} <span className="chip bad">{n}</span></li>;
              })}
            </ul>
          </div>
        )}
        <p className="muted small" style={{ margin: 0 }}>Il numero scende ogni volta che rispondi bene. Le lezioni danno la precedenza a questi punti deboli.</p>
      </section>

      <section className="card stack" aria-labelledby="bk">
        <h2 id="bk">Esporta e importa</h2>
        <p className="muted" style={{ margin: 0 }}>I tuoi progressi sono salvati solo in questo browser. Esportali in un file per fare una copia o passare a un altro dispositivo.</p>
        <div className="row">
          <button className="btn primary" onClick={doExport}>Esporta (JSON)</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Importa da file</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void doImport(f);
              e.target.value = "";
            }}
          />
        </div>
        {msg && (
          <div className={msg.ok ? "feedback ok" : "feedback ko"} role="status">
            {msg.text.map((t, i) => <div key={i}>{t}</div>)}
          </div>
        )}
      </section>
    </div>
  );
}
