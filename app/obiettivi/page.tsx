"use client";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { ProgressBar } from "@/components/ui";
import { LEVELS, LEVEL_LABEL, levelIndex } from "@/lib/levels";
import { MAX_WEEKLY_MINUTES, currentWeek, deriveWeeklyPlan, ensureCurrentWeek, weekProgress } from "@/lib/goals";
import { addDays, formatDateIT } from "@/lib/dates";
import type { Level } from "@/lib/contract";

export default function GoalsPage() {
  const { ready, state, today, update, bank } = useApp();
  const [target, setTarget] = useState<Level>("a1");
  const [date, setDate] = useState(addDays(today, 180));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const next = LEVELS[Math.min(LEVELS.length - 1, levelIndex(state.level) + 1)];
    setTarget(state.goal?.targetLevel ?? next);
    setDate(state.goal?.targetDate ?? addDays(today, 180));
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const plan = useMemo(() => deriveWeeklyPlan({ currentLevel: state.level, goal: { targetLevel: target, targetDate: date }, today, dailyMinutes: state.settings.dailyMinutes }), [state.level, state.settings.dailyMinutes, target, date, today]);

  if (!ready) return <p className="muted">Caricamento...</p>;

  const week = currentWeek(state, today);
  const wp = weekProgress(week);
  const past = state.weeklyGoals.filter((w) => w.weekStart !== week?.weekStart).slice(-6).reverse();
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && date > today;
  const levelsInBank = new Set(bank?.levelsAvailable ?? []);

  const save = () => {
    update((s) => ensureCurrentWeek({ ...s, goal: { targetLevel: target, targetDate: date } }, today));
    setSaved(true);
  };

  return (
    <div className="stack">
      <h1>Obiettivi</h1>

      <section className="card stack" aria-labelledby="fin">
        <h2 id="fin">Obiettivo finale</h2>
        {state.goal && (
          <p style={{ margin: 0 }}>
            Attuale: <strong>{LEVEL_LABEL[state.goal.targetLevel]}</strong> entro il <strong>{formatDateIT(state.goal.targetDate)}</strong>. Parti da {LEVEL_LABEL[state.level]}.
          </p>
        )}
        <div>
          <label className="lbl" htmlFor="lvl">Che livello vuoi raggiungere?</label>
          <select id="lvl" className="field" value={target} onChange={(e) => { setTarget(e.target.value as Level); setSaved(false); }}>
            {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}{levelIndex(l) <= levelIndex(state.level) ? " (mantenimento)" : ""}</option>)}
          </select>
        </div>
        <div>
          <label className="lbl" htmlFor="dt">Entro quando?</label>
          <input id="dt" type="date" className="field" min={addDays(today, 1)} value={date} onChange={(e) => { setDate(e.target.value); setSaved(false); }} />
          {!validDate && <p className="small" style={{ color: "var(--bad)" }} role="alert">Scegli una data futura.</p>}
        </div>

        <div className="card soft stack" aria-live="polite">
          <h3>Il tuo piano settimanale</h3>
          {plan.maintenance ? (
            <p style={{ margin: 0 }}>Hai già questo livello (o più alto): ti propongo un mantenimento di <strong>{plan.lessonsTarget} lezioni</strong> e <strong>{plan.minutesTarget} minuti</strong> a settimana.</p>
          ) : (
            <>
              <p style={{ margin: 0 }}>
                Da {LEVEL_LABEL[state.level]} a {LEVEL_LABEL[target]} servono circa <strong>{plan.totalHours} ore</strong> di studio (stima indicativa). Con {plan.weeksLeft} {plan.weeksLeft === 1 ? "settimana" : "settimane"} a disposizione:
              </p>
              <div className="grid2">
                <div className="stat"><div className="n">{plan.minutesTarget}</div><div className="muted small">minuti a settimana</div></div>
                <div className="stat"><div className="n">{plan.lessonsTarget}</div><div className="muted small">lezioni da {state.settings.dailyMinutes} min</div></div>
              </div>
            </>
          )}
          {!plan.feasible && !plan.maintenance && (
            <div className="banner" role="alert">
              <strong>Obiettivo molto ambizioso.</strong> Servirebbero circa {plan.requiredMinutes} minuti a settimana; il piano è limitato a {MAX_WEEKLY_MINUTES}. Considera una data più lontana o un livello più basso.
            </div>
          )}
          {bank && !levelsInBank.has(target) && target !== "zero" && (
            <div className="banner">I contenuti di livello {LEVEL_LABEL[target]} non sono ancora nel banco: per ora l'app allena fino a {LEVEL_LABEL[bank.levelsAvailable[bank.levelsAvailable.length - 1] ?? "zero"]}.</div>
          )}
        </div>
        <button className="btn primary big" disabled={!validDate} onClick={save}>Salva obiettivo</button>
        {saved && <p role="status" className="chip good" style={{ alignSelf: "flex-start" }}>Obiettivo salvato</p>}
      </section>

      <section className="card stack" aria-labelledby="sett">
        <h2 id="sett">Mini obiettivo di questa settimana</h2>
        {week && (
          <>
            <div>
              <div className="row between"><span>Minuti</span><span>{Math.round(week.minutesDone)} / {week.minutesTarget}</span></div>
              <ProgressBar pct={wp.minutesPct} label="Minuti della settimana" good={wp.minutesPct >= 100} />
            </div>
            <div>
              <div className="row between"><span>Lezioni</span><span>{week.lessonsDone} / {week.lessonsTarget}</span></div>
              <ProgressBar pct={wp.lessonsPct} label="Lezioni della settimana" good={wp.lessonsPct >= 100} />
            </div>
            <p className="muted small" style={{ margin: 0 }}>Settimana dal {formatDateIT(week.weekStart)}. I mini obiettivi si ricalcolano dal tuo obiettivo finale, dal livello e dai minuti giornalieri.</p>
          </>
        )}
      </section>

      {past.length > 0 && (
        <section className="card" aria-labelledby="prec">
          <h2 id="prec">Settimane precedenti</h2>
          <table className="t">
            <thead><tr><th>Dal</th><th>Minuti</th><th>Lezioni</th></tr></thead>
            <tbody>
              {past.map((w) => (
                <tr key={w.weekStart}>
                  <td>{formatDateIT(w.weekStart)}</td>
                  <td>{Math.round(w.minutesDone)} / {w.minutesTarget}</td>
                  <td>{w.lessonsDone} / {w.lessonsTarget}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
