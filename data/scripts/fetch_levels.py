#!/usr/bin/env python3
"""Legge dal sito pubblico OpenRussian le liste per livello (A1, A2, B1).
Le pagine /list/all?level=XX contengono i dati in __NEXT_DATA__ (50 voci per pagina).
Poche decine di richieste, con pausa. Uso: python3 -I fetch_levels.py out.json"""
import json, re, subprocess, sys, time

def get(url):
    for _ in range(3):
        t = subprocess.run(["curl", "-sS", "-m", "40", url], capture_output=True, text=True).stdout
        m = re.search(r'__NEXT_DATA__" type="application/json">(.*?)</script>', t, re.S)
        if m:
            return json.loads(m.group(1))["props"]["pageProps"]
        time.sleep(2)
    raise SystemExit("fetch fallita: " + url)

out = {}
for lv in ["A1", "A2", "B1"]:
    es, s = [], 0
    while True:
        pp = get(f"https://en.openrussian.org/list/all?level={lv}&start={s}")
        es += pp["entries"]; s += 50
        if s >= pp["total"]:
            break
        time.sleep(0.5)
    out[lv] = es
json.dump(out, open(sys.argv[1], "w"), ensure_ascii=False)
print({k: len(v) for k, v in out.items()})
