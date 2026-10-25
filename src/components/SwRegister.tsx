"use client";
import { useEffect } from "react";
import { BASE_PATH, assetUrl } from "@/lib/data";

const WARM_KEY = "rc.warm.v2";
const PAGES = ["", "lezione/", "obiettivi/", "progressi/", "impostazioni/", "crediti/", "test-ingresso/"];
const DATA = ["words", "sentences", "lessons", "exercises", "credits", "manifest"].map((n) => `data/${n}.json`);

/** Registra il service worker semplice (solo in produzione) e gli chiede di scaricare subito pagine e dati per l'uso offline. */
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register(`${BASE_PATH}/sw.js`, { scope: `${BASE_PATH}/` })
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        let done = false;
        try {
          done = localStorage.getItem(WARM_KEY) === "1";
        } catch {
          /* ignorato */
        }
        if (done || !reg.active) return;
        reg.active.postMessage({ type: "warm", urls: [...PAGES, ...DATA].map(assetUrl) });
        try {
          localStorage.setItem(WARM_KEY, "1");
        } catch {
          /* ignorato */
        }
      })
      .catch(() => {
        /* PWA facoltativa: l'app funziona anche senza */
      });
  }, []);
  return null;
}
