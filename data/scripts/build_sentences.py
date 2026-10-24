#!/usr/bin/env python3
"""Seleziona frasi Tatoeba (rus con traduzione ita) i cui token sono TUTTI in data/words,
accenta il testo con le forme di data/words e scrive data/sentences/*.json.
Aggiorna anche il campo `examples` delle parole. Eseguire dopo build_words.py.
Uso: python3 -I data/scripts/build_sentences.py"""
import collections, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import filter_sentences

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TAT = os.path.join(ROOT, "raw", "tatoeba")
WORDS = os.path.join(ROOT, "words")
OUT = os.path.join(ROOT, "sentences")
MAX_TOKENS = 8
EXAMPLES_PER_WORD = 3
TOKEN = re.compile(r"[А-Яа-яЁё]+(?:-[А-Яа-яЁё]+)*")
CLITIC_POS = {"prep", "conj", "part"}


def count_vowels(s):
    return sum(c in VOWELS for c in s.lower())


def main():
    words = []
    for lvl in ["zero", "a1", "a2"]:
        words += json.load(open(os.path.join(WORDS, f"{lvl}.json"), encoding="utf-8"))
    byid = {w["id"]: w for w in words}

    # indice forma (minuscola, senza accento) -> [(word id, forma accentata)]
    index = collections.defaultdict(set)
    maxgram = 1
    for w in words:
        forms = [w["stress"]]
        for k, v in (w.get("forms") or {}).items():
            if k in ("aspect", "aspect_partner", "indeclinable"):
                continue
            forms += [p.strip() for p in v.split(",")]
        for f in forms:
            if not f:
                continue
            index[strip_acc(f.lower()).replace("ё", "ё")].add((w["id"], f.lower()))
            maxgram = max(maxgram, len(f.split(" ")))
    # pronomi/aggettivi: aggiungi anche forma senza ё->е? (no: Tatoeba usa ё di norma)

    def accent_form(wid, f):
        """Forma accentata da mostrare in frase: i monosillabi clitici (prep/cong/particelle) restano senza accento."""
        w = byid[wid]
        if w["pos"] in CLITIC_POS and count_vowels(f) <= 1:
            return strip_acc(f)
        return f

    # --- Tatoeba ---
    rus = {}
    for line in open(os.path.join(TAT, "rus_sentences_detailed.tsv"), encoding="utf-8"):
        p = line.rstrip("\n").split("\t")
        if len(p) >= 4 and p[3] not in ("", "\\N"):
            rus[p[0]] = (p[2], p[3])
    ita = {}
    for line in open(os.path.join(TAT, "ita_sentences_detailed.tsv"), encoding="utf-8"):
        p = line.rstrip("\n").split("\t")
        if len(p) >= 4 and p[3] not in ("", "\\N"):
            ita[p[0]] = (p[2], p[3])
    cc0 = {l.split("\t")[0] for l in open(os.path.join(TAT, "rus_sentences_CC0.tsv"), encoding="utf-8")}
    links = collections.defaultdict(list)
    for line in open(os.path.join(TAT, "rus-ita_links.tsv"), encoding="utf-8"):
        a, b = line.split()
        links[a].append(b)

    cands = []
    excluded = []
    pool = 0
    stats = collections.Counter()
    for sid, (text, author) in rus.items():
        if sid not in links:
            stats["senza traduzione ita"] += 1
            continue
        its = [i for i in links[sid] if i in ita]
        if not its:
            stats["traduzione ita orfana"] += 1
            continue
        if re.search(r"[0-9A-Za-z]", text):
            stats["cifre/latino"] += 1
            continue
        toks = list(TOKEN.finditer(text))
        if not (2 <= len(toks) <= MAX_TOKENS) or len(text) > 70:
            stats["lunghezza"] += 1
            continue
        # riconoscimento con n-grammi (espressioni di piu' parole)
        pieces, i, ok = [], 0, True
        lows = [t.group(0).lower() for t in toks]
        while i < len(toks):
            hit = None
            for n in range(min(maxgram, len(toks) - i), 0, -1):
                key = " ".join(lows[i:i + n])
                if key in index:
                    hit = (n, key)
                    break
            if not hit:
                ok = False
                break
            n, key = hit
            cs = sorted(index[key])
            # preferisci il lemma stesso; poi livello piu' basso
            def rank(c):
                w = byid[c[0]]
                return (0 if strip_acc(w["stress"].lower()) == key else 1, LEVEL_ORDER.index(w["level"]), c[0])
            forms_acc = {accent_form(c[0], c[1]) for c in cs}
            if len(forms_acc) > 1:
                ok = False  # omografo con accenti diversi: non risolvibile senza analisi
                stats["omografo ambiguo"] += 1
                break
            best = sorted(cs, key=rank)[0]
            pieces.append((toks[i].start(), toks[i + n - 1].end(), accent_form(best[0], best[1]), best[0]))
            i += n
        if not ok:
            stats.setdefault("fuori vocabolario", 0)
            stats["fuori vocabolario"] += 1
            continue
        out, pos = [], 0
        for s, e, acc, wid in pieces:
            out.append(text[pos:s])
            orig = text[s]
            piece = acc
            if orig.isupper():
                piece = piece[0].upper() + piece[1:]
            out.append(piece)
            pos = e
        out.append(text[pos:])
        stress = "".join(out)
        if strip_acc(stress).replace("ё", "е") != text.replace("ё", "е"):
            stats["mismatch testo"] += 1
            continue
        wids = list(dict.fromkeys(p[3] for p in pieces))
        level = max((byid[w]["level"] for w in wids), key=LEVEL_ORDER.index)
        it_id = sorted(its, key=lambda x: (len(ita[x][0]), x))[0]
        pool += 1
        bad = filter_sentences.check(text, ita[it_id][0])
        if bad:
            excluded.append({"id": "s_" + sid.zfill(5), "motivo": bad[0], "termine": bad[1], "ru": text, "it": ita[it_id][0]})
            continue
        cands.append({"sid": sid, "text": text, "stress": stress, "words": wids, "level": level,
                      "it": ita[it_id][0], "au_ru": author, "au_it": ita[it_id][1], "it_id": it_id,
                      "cc0": sid in cc0, "n": len(toks)})
    filter_sentences.write_report(excluded, pool)
    print("escluse dal filtro contenuti:", len(excluded), "su", pool)
    print("candidate:", len(cands), dict(stats))

    # selezione greedy: ogni parola fino a EXAMPLES_PER_WORD frasi, frasi corte per prime
    need = collections.Counter({w["id"]: EXAMPLES_PER_WORD for w in words})
    cands.sort(key=lambda c: (c["n"], len(c["text"]), int(c["sid"])))
    chosen = []
    for c in cands:
        if any(need[w] > 0 for w in c["words"]):
            chosen.append(c)
            for w in c["words"]:
                if need[w] > 0:
                    need[w] -= 1
    chosen.sort(key=lambda c: (LEVEL_ORDER.index(c["level"]), int(c["sid"])))

    recs = {l: [] for l in ["zero", "a1", "a2"]}
    examples = collections.defaultdict(list)
    for c in chosen:
        sid = "s_" + c["sid"].zfill(5)
        if c["cc0"]:
            lic, attr = "CC0-1.0", f"Tatoeba.org, frase #{c['sid']} (CC0, autore {c['au_ru']}); traduzione it #{c['it_id']} di {c['au_it']} (CC BY 2.0 FR)"
        else:
            lic, attr = "CC-BY-2.0", f"Tatoeba.org, frase #{c['sid']} di {c['au_ru']}; traduzione it #{c['it_id']} di {c['au_it']}; licenza CC BY 2.0 FR"
        recs[c["level"]].append({"id": sid, "ru": c["text"], "stress": c["stress"], "it": c["it"],
                                 "words": c["words"], "level": c["level"],
                                 "source": "tatoeba", "license": lic, "attribution": attr})
        for w in c["words"]:
            examples[w].append(sid)
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith(".json"):
            os.remove(os.path.join(OUT, f))
    for lvl, r in recs.items():
        json.dump(r, open(os.path.join(OUT, f"{lvl}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(lvl, len(r), "frasi")
    # aggiorna examples nelle parole
    for lvl in ["zero", "a1", "a2"]:
        p = os.path.join(WORDS, f"{lvl}.json")
        ws = json.load(open(p, encoding="utf-8"))
        for w in ws:
            w.pop("examples", None)
            if examples.get(w["id"]):
                w["examples"] = examples[w["id"]][:EXAMPLES_PER_WORD]
        json.dump(ws, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    covered = {lvl: sum(1 for w in words if w["level"] == lvl and examples.get(w["id"])) for lvl in ["zero", "a1", "a2"]}
    tot = collections.Counter(w["level"] for w in words)
    print("parole con almeno un esempio:", {k: f"{v}/{tot[k]}" for k, v in covered.items()})


if __name__ == "__main__":
    main()
