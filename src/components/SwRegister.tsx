"use client";
import { useEffect } from "react";
import { BASE_PATH } from "@/lib/data";

/** Registra il service worker semplice (solo in produzione). */
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(`${BASE_PATH}/sw.js`, { scope: `${BASE_PATH}/` }).catch(() => {
      /* PWA facoltativa: l'app funziona anche senza */
    });
  }, []);
  return null;
}
