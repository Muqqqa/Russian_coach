// Sintesi vocale del browser (Web Speech API), lingua ru-RU. Solo lato client.
import { stripStress } from "./normalize";

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

export function findRussianVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const ru = voices.filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith("ru"));
  return ru.find((v) => v.lang.toLowerCase().replace("_", "-") === "ru-ru") ?? ru[0];
}

export type VoiceStatus = "unsupported" | "loading" | "missing" | "ready";

/** Stato della voce russa; richiama `cb` anche quando l'elenco delle voci si carica (asincrono). */
export function watchVoice(cb: (status: VoiceStatus, voice?: SpeechSynthesisVoice) => void): () => void {
  if (!speechSupported()) {
    cb("unsupported");
    return () => {};
  }
  const synth = window.speechSynthesis;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const update = (final: boolean) => {
    const voices = synth.getVoices();
    const v = findRussianVoice(voices);
    if (v) cb("ready", v);
    else if (voices.length > 0 || final) cb("missing");
    else cb("loading");
  };
  const handler = () => update(false);
  synth.addEventListener?.("voiceschanged", handler);
  update(false);
  // alcuni browser non emettono mai voiceschanged: dopo 1,5 s si considera definitivo
  timer = setTimeout(() => update(true), 1500);
  return () => {
    synth.removeEventListener?.("voiceschanged", handler);
    if (timer) clearTimeout(timer);
  };
}

/** Pronuncia un testo russo. L'accento tonico viene tolto: alcune voci leggono male U+0301. */
export function speak(text: string, voice?: SpeechSynthesisVoice, rate = 0.9): boolean {
  if (!speechSupported()) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(stripStress(text));
  u.lang = "ru-RU";
  if (voice) u.voice = voice;
  u.rate = rate;
  synth.speak(u);
  return true;
}

export function stopSpeaking(): void {
  if (speechSupported()) window.speechSynthesis.cancel();
}
