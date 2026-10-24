"use client";
import { useState } from "react";

const LETTERS = "а б в г д е ё ж з и й к л м н о п р с т у ф х ц ч ш щ ъ ы ь э ю я".split(" ");

/** Tastiera cirillica sullo schermo, per chi non ha il layout russo. */
export function Keypad({ onKey, onBackspace }: { onKey: (c: string) => void; onBackspace: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" className="btn small" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? "Nascondi tastiera cirillica" : "Tastiera cirillica"}
      </button>
      {open && (
        <div className="keypad" style={{ marginTop: 8 }} role="group" aria-label="Tastiera cirillica">
          {LETTERS.map((c) => (
            <button key={c} type="button" lang="ru" onClick={() => onKey(c)} aria-label={`lettera ${c}`}>
              {c}
            </button>
          ))}
          <button type="button" onClick={() => onKey(" ")} aria-label="spazio">␣</button>
          <button type="button" onClick={onBackspace} aria-label="cancella">⌫</button>
        </div>
      )}
    </div>
  );
}
