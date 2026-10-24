"use client";
// Contesto globale: stato utente (localStorage), banco dati, voce russa, data odierna.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { UserState } from "@/lib/contract";
import type { Bank } from "@/lib/bank";
import { loadBank } from "@/lib/data";
import { defaultExtra, defaultState, loadExtra, loadState, saveExtra, saveState, type AppExtra } from "@/lib/state";
import { ensureCurrentWeek } from "@/lib/goals";
import { todayISO } from "@/lib/dates";
import { speak, stopSpeaking, watchVoice, type VoiceStatus } from "@/lib/audio";

interface Ctx {
  ready: boolean;
  today: string;
  state: UserState;
  extra: AppExtra;
  /** Aggiorna lo stato (e lo salva). Le chiamate nello stesso ciclo si compongono. */
  update: (fn: (s: UserState) => UserState) => void;
  updateExtra: (fn: (e: AppExtra) => AppExtra) => void;
  replaceAll: (s: UserState, e: AppExtra) => void;
  bank: Bank | undefined;
  bankError: string | undefined;
  voiceStatus: VoiceStatus;
  /** Pronuncia testo russo. Falso se non c'e' voce o l'audio e' disattivato. */
  say: (text: string, rate?: number) => boolean;
  /** Vero se l'audio e' attivo nelle impostazioni E la voce russa e' disponibile. */
  audioOk: boolean;
  storageOk: boolean;
}

const AppCtx = createContext<Ctx | null>(null);

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp fuori da AppProvider");
  return c;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [today, setToday] = useState("2000-01-01");
  const [state, setState] = useState<UserState>(defaultState);
  const [extra, setExtraState] = useState<AppExtra>(defaultExtra);
  const [bank, setBank] = useState<Bank>();
  const [bankError, setBankError] = useState<string>();
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("loading");
  const [storageOk, setStorageOk] = useState(true);
  const voiceRef = useRef<SpeechSynthesisVoice | undefined>(undefined);
  const stateRef = useRef(state);
  const extraRef = useRef(extra);

  useEffect(() => {
    const t = todayISO();
    const s = ensureCurrentWeek(loadState(), t);
    const e = loadExtra();
    stateRef.current = s;
    extraRef.current = e;
    setToday(t);
    setState(s);
    setExtraState(e);
    setReady(true);
    loadBank().then(setBank).catch((err) => setBankError(String(err?.message ?? err)));
    const stop = watchVoice((st, v) => {
      voiceRef.current = v;
      setVoiceStatus(st);
    });
    // se l'app resta aperta oltre la mezzanotte
    const onVis = () => {
      const n = todayISO();
      setToday((old) => (old === n ? old : n));
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // Cambio giorno: nuova riga settimanale se serve
  useEffect(() => {
    if (!ready) return;
    const next = ensureCurrentWeek(stateRef.current, today);
    if (next !== stateRef.current) {
      stateRef.current = next;
      setState(next);
      setStorageOk(saveState(next));
    }
  }, [today, ready]);

  const update = useCallback((fn: (s: UserState) => UserState) => {
    const next = fn(stateRef.current);
    stateRef.current = next;
    setState(next);
    setStorageOk(saveState(next));
  }, []);
  const updateExtra = useCallback((fn: (e: AppExtra) => AppExtra) => {
    const next = fn(extraRef.current);
    extraRef.current = next;
    setExtraState(next);
    saveExtra(next);
  }, []);
  const replaceAll = useCallback((s: UserState, e: AppExtra) => {
    const withWeek = ensureCurrentWeek(s, todayISO());
    stateRef.current = withWeek;
    extraRef.current = e;
    setState(withWeek);
    setExtraState(e);
    setStorageOk(saveState(withWeek));
    saveExtra(e);
  }, []);

  const audioOk = state.settings.audioEnabled && voiceStatus === "ready";
  const say = useCallback(
    (text: string, rate?: number) => {
      if (!stateRef.current.settings.audioEnabled || !voiceRef.current) return false;
      return speak(text, voiceRef.current, rate);
    },
    [],
  );
  useEffect(() => {
    if (!state.settings.audioEnabled) stopSpeaking();
  }, [state.settings.audioEnabled]);

  const value = useMemo<Ctx>(
    () => ({ ready, today, state, extra, update, updateExtra, replaceAll, bank, bankError, voiceStatus, say, audioOk, storageOk }),
    [ready, today, state, extra, update, updateExtra, replaceAll, bank, bankError, voiceStatus, say, audioOk, storageOk],
  );
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
