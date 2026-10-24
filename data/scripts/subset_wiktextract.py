#!/usr/bin/env python3
"""Filtra il dump kaikki russo ai soli lemmi presenti in data/words. Uso: subset_wiktextract.py dump.jsonl out.jsonl"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import strip_acc
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
lem = {w["ru"] for l in ["zero", "a1", "a2"] for w in json.load(open(os.path.join(root, "words", f"{l}.json"), encoding="utf-8"))}
n = 0
with open(sys.argv[2], "w", encoding="utf-8") as out:
    for line in open(sys.argv[1], encoding="utf-8"):
        d = json.loads(line)
        if d.get("lang_code") == "ru" and strip_acc(d["word"]) in lem:
            out.write(line); n += 1
print(n, "entry")
