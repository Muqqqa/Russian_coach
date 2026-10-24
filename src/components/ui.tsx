"use client";
import { Fragment, type ReactNode } from "react";
import { useApp } from "./AppProvider";
import { wordGloss } from "@/lib/bank";
import type { Word } from "@/lib/contract";

export function Ru({ children, big, className = "" }: { children: ReactNode; big?: boolean; className?: string }) {
  return (
    <span lang="ru" className={`${big ? "ru-big" : "ru"} ${className}`}>
      {children}
    </span>
  );
}

export function ProgressBar({ pct, label, good }: { pct: number; label: string; good?: boolean }) {
  const v = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div className={`bar ${good ? "good" : ""}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v} aria-label={label}>
      <span style={{ width: `${v}%` }} />
    </div>
  );
}

export function SpeakButton({ text, label = "Ascolta", rate }: { text: string; label?: string; rate?: number }) {
  const { say, audioOk } = useApp();
  if (!audioOk) return null;
  return (
    <button type="button" className="btn small" onClick={() => say(text, rate)} aria-label={`${label}: ${text.replace(/́/g, "")}`}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 5L6 9H3v6h3l5 4z" />
        <path d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" />
      </svg>
      {label}
    </button>
  );
}

const INSTALL_HELP = (
  <>
    <p className="small" style={{ marginTop: 6 }}>Come installare una voce russa:</p>
    <ul className="small" style={{ margin: 0, paddingLeft: "1.2rem" }}>
      <li><strong>Android</strong>: Impostazioni, Sistema, Lingue, Sintesi vocale, Motore di Google, Installa dati vocali, Russo.</li>
      <li><strong>iPhone/iPad</strong>: Impostazioni, Accessibilita, Contenuti vocali, Voci, Russo.</li>
      <li><strong>Windows</strong>: Impostazioni, Ora e lingua, Voce, Aggiungi voci, Russo.</li>
      <li><strong>macOS</strong>: Impostazioni, Accessibilita, Contenuto parlato, Voce di sistema, Gestisci voci, Russo.</li>
      <li><strong>Linux</strong>: installa speech-dispatcher con una voce russa (per esempio espeak-ng).</li>
    </ul>
    <p className="small" style={{ marginTop: 6 }}>Dopo l&apos;installazione riavvia il browser.</p>
  </>
);

/** Avviso quando manca la voce russa. Non compare se l'audio e' disattivato o la voce c'e'. */
export function VoiceBanner({ force }: { force?: boolean }) {
  const { voiceStatus, state } = useApp();
  if (!force && !state.settings.audioEnabled) return null;
  if (voiceStatus === "ready" || voiceStatus === "loading") return null;
  return (
    <div className="banner" role="status">
      <strong>{voiceStatus === "unsupported" ? "Audio non supportato." : "Voce russa non trovata."}</strong>{" "}
      {voiceStatus === "unsupported"
        ? "Questo browser non ha la sintesi vocale. Puoi usare l'app senza audio: i dettati non vengono proposti."
        : "Sul tuo dispositivo non c'e' una voce russa installata, quindi non posso leggere le parole ad alta voce. Puoi continuare senza audio: i dettati non vengono proposti."}
      {voiceStatus === "missing" && <details><summary>Come installare la voce</summary>{INSTALL_HELP}</details>}
    </div>
  );
}

/** Parola con accento, trascrizione e traduzione (it se c'e', altrimenti en). */
export function WordLine({ word }: { word: Word }) {
  const g = wordGloss(word, 3);
  return (
    <div className="wordrow">
      <Ru>{word.stress}</Ru>
      <span className="translit">[{word.translit}]</span>
      <span>
        = {g.text}
        {g.lang === "en" && <span className="muted small"> (inglese)</span>}
      </span>
      <SpeakButton text={word.stress} label="Ascolta" />
    </div>
  );
}

// --- Markdown minimale (titoli, elenchi, grassetto, corsivo, paragrafi) senza HTML grezzo ---
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) out.push(<strong key={k++}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`")) out.push(<code key={k++}>{t.slice(1, -1)}</code>);
    else out.push(<em key={k++}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let para: string[] = [];
  let table: string[][] = [];
  let k = 0;
  const flushPara = () => {
    if (para.length) blocks.push(<p key={k++}>{inline(para.join(" "))}</p>);
    para = [];
  };
  const flushList = () => {
    if (list.length) blocks.push(<ul key={k++}>{list.map((l, i) => <li key={i}>{inline(l)}</li>)}</ul>);
    list = [];
  };
  const flushTable = () => {
    if (table.length) {
      const [head, ...rest] = table;
      blocks.push(
        <div key={k++} style={{ overflowX: "auto" }}>
          <table>
            <thead><tr>{head.map((c, i) => <th key={i}>{inline(c)}</th>)}</tr></thead>
            <tbody>{rest.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{inline(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
    }
    table = [];
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\s*\|.*\|\s*$/.test(line)) {
      flushPara();
      flushList();
      if (!/^\s*\|[\s:|-]+\|\s*$/.test(line)) table.push(line.trim().slice(1, -1).split("|").map((c) => c.trim()));
      continue;
    }
    flushTable();
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      flushPara();
      flushList();
      blocks.push(<h3 key={k++}>{inline(h[2])}</h3>);
    } else if (/^\s*[-*]\s+/.test(line)) {
      flushPara();
      list.push(line.replace(/^\s*[-*]\s+/, ""));
    } else if (line.trim() === "") {
      flushPara();
      flushList();
    } else {
      flushList();
      para.push(line.trim());
    }
  }
  flushPara();
  flushList();
  flushTable();
  return <div className="md">{blocks.map((b, i) => <Fragment key={i}>{b}</Fragment>)}</div>;
}
