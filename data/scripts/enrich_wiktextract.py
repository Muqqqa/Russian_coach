#!/usr/bin/env python3
"""Integra Wiktextract (kaikki.org, en.wiktionary) e Wikizionario (kaikki.org/itwiktionary) in data/words.
Eseguire DOPO build_words.py e build_sentences.py (che riscrive i file words).
 - forms: aggiunge solo le chiavi MANCANTI (mai sovrascrive OpenRussian);
 - gender/animate mancanti;
 - topics da categorie Wiktionary (mappa CATEGORY_TOPICS);
 - it: glosse italiane reali di Wikizionario, solo entry a senso unico con pos compatibile;
 - sidecar data/extra/wiktextract.json (IPA, tag grammaticali, reggenze, candidati it);
 - report data/reports/stress_disagreements.json (+ disaccordi forme/genere).
Uso: python3 -I data/scripts/enrich_wiktextract.py"""
import collections, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import qa_fixes

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "raw", "wiktextract")
WORDS = os.path.join(ROOT, "words")

POS_COMPAT = {  # pos nostro -> pos Wiktionary ammessi
    "noun": {"noun", "name"}, "verb": {"verb"}, "adj": {"adj", "det"}, "adv": {"adv"},
    "pron": {"pron", "det"}, "num": {"num", "adj"}, "prep": {"prep", "postp"}, "conj": {"conj"},
    "part": {"particle", "adv"}, "intj": {"intj", "phrase"}, "phrase": {"phrase", "intj"},
}
IT_POS_COMPAT = {
    "noun": {"noun", "name"}, "verb": {"verb"}, "adj": {"adj"}, "adv": {"adv"}, "pron": {"pron", "adj", "det"},
    "num": {"num", "adj"}, "prep": {"prep"}, "conj": {"conj"}, "part": {"particle"}, "intj": {"intj"},
    "phrase": {"phrase", "intj"},
}
SKIP_TAGS = {"archaic", "nonstandard", "obsolete", "dialectal", "poetic", "alternative", "partitive", "locative",
             "vocative", "table-tags", "inflection-template", "class", "romanization", "error-unrecognized-form",
             "dated", "colloquial", "regional", "participle", "adverbial", "multiword-construction"}
CASES = {"nominative": "nom", "genitive": "gen", "dative": "dat", "accusative": "acc",
         "instrumental": "ins", "prepositional": "prep"}

# Categorie Wiktionary (en) -> slug argomento italiano. Solo categorie semantiche utili a un principiante.
CATEGORY_TOPICS = {}
def _t(slug, cats):
    for c in cats.split("|"):
        CATEGORY_TOPICS[c.strip()] = slug
_t("famiglia", "Family|Family members|Parents|Male family members|Female family members|Marriage|Children|Male children|Female children")
_t("cibo-bevande", "Food and drink|Food and drink containers|Alcoholic beverages|Beer|Beverages|Breads|Coffee|Tea|Fruits|Snacks|Soups|Wines|Cooking|Drinking|Maize (food)")
_t("ristorante", "Restaurants|Bars")
_t("corpo", "Body parts|Face|Anatomy|Eye|Fingers|Hair|Limbs|Organs|Blood")
_t("salute", "Health|Medicine|Diseases|Healthcare occupations|Pain")
_t("abbigliamento", "Clothing|Footwear|Underwear|Bags")
_t("colori", "Colors of the rainbow|Blacks|Whites|Greys|Reds|Yellows")
_t("tempo", "Time|Days of the week|Times of day|Day|Night|Gregorian calendar months|Autumn")
_t("numeri", "Numbers|One|Two|Three|Four|Five|Seven|Nine|Ten|Twenty|Hundred|Thousand")
_t("meteo", "Weather|Meteorology|Rain|Snow|Wind")
_t("natura", "Plants|Trees|Forests|Woods|Landforms|Bodies of water|Sun|Moon|Water|Fire|Air")
_t("animali", "Canids|Cats|Dogs|Snakes")
_t("casa", "Furniture|Rooms|Home|Housing|Bedding|Light sources|Toilet (room)|Buildings")
_t("trasporti", "Transport|Rail transportation|Road transport|Roads|Vehicles|Automobiles|Aircraft")
_t("viaggi", "Travel|Hotels")
_t("luoghi", "Shops|Schools|Universities|Cities in Russia|National capitals|Places in Russia|Moscow")
_t("direzioni", "Directions")
_t("saluti", "Russian greetings|Russian phrasebook")
_t("persone", "People|Male people|Female people|Friendship|Personality|Nationalities")
_t("lavoro", "Occupations|Labour|Business|Management")
_t("soldi", "Money|Currency|Coins|Banking|Finance")
_t("tecnologia", "Computing|Software|Internet|Networking|Telephony|Electronics")
_t("scuola", "Education|Schools|Universities|Academic degrees")
_t("tempo-libero", "Hobbies|Games|Sports|Music|Entertainment|Theater|Recreation|Chess")
_t("emozioni", "Emotions|Fear|Love|Laughter")


# Correzioni manuali agli argomenti (revisione dopo il controllo del curriculum-writer: categorie Wiktionary troppo ampie)
TOPIC_OVERRIDES = {
    "w_voda": ["cibo-bevande"], "w_solntse": ["natura"], "w_pora": ["tempo"], "w_pora_noun": ["corpo"],
    "w_nomer": ["numeri"], "w_dobryy_den": ["saluti"], "w_kafe": ["ristorante"], "w_doktor": ["lavoro"],
    "w_paket": [], "w_mama": ["famiglia"],
    "w_chelovek": ["persone"], "w_devushka": ["persone"], "w_nosok": ["abbigliamento"], "w_botinok": ["abbigliamento"],
    "w_golova": ["corpo"], "w_zub": ["corpo"], "w_nos": ["corpo"], "w_plecho": ["corpo"], "w_grud": ["corpo"], "w_telo": ["corpo"],
    "w_syn": ["famiglia"], "w_chas": ["tempo"], "w_zavtra": ["tempo"], "w_seychas": ["tempo"], "w_minuta": ["tempo"],
    "w_skoro": ["tempo"], "w_obychno": ["tempo"], "w_vek": ["tempo"], "w_odnazhdy": ["tempo"], "w_chislo": ["numeri"],
    "w_pervyy": ["numeri"], "w_vtoroy": ["numeri"], "w_napitok": ["cibo-bevande"], "w_salat": ["cibo-bevande"],
    "w_stantsiya": ["trasporti"], "w_kvartira": ["casa"], "w_more": ["natura"], "w_yazyk": ["comunicazione"],
    "w_nalevo": ["direzioni"], "w_nazad": ["direzioni"], "w_vperyod": ["direzioni"], "w_est": ["grammatica"], "w_ulitsa": ["luoghi"],
}


def has_acc(s):
    return ACC in s


def load_entries():
    es = collections.defaultdict(list)
    for line in open(os.path.join(RAW, "ru_subset.jsonl"), encoding="utf-8"):
        d = json.loads(line)
        es[strip_acc(d["word"])].append(d)
    return es


def pick_entry(w, entries):
    ok = [e for e in entries if e["pos"] in POS_COMPAT[w["pos"]] and not any(
        "form-of" in (s.get("tags") or []) or "alt-of" in (s.get("tags") or []) for s in e["senses"][:1])]
    if not ok:
        return None
    if len(ok) == 1:
        return ok[0]
    en_words = set(re.findall(r"[a-z]+", " ".join(w["en"]).lower()))
    def score(e):
        g = " ".join(" ".join(s.get("glosses") or []) for s in e["senses"]).lower()
        return len(en_words & set(re.findall(r"[a-z]+", g)))
    return sorted(ok, key=lambda e: -score(e))[0]


def clean_form(f):
    f = re.sub(r"^\((?:по|наи)\)", "", f).strip().rstrip("*^")
    return f


def wikt_forms(w, e):
    """Ritorna dict chiave-nostra -> [forme] dall'entry Wiktextract."""
    out = collections.defaultdict(list)
    forms = e.get("forms") or []
    pos = w["pos"]
    for f in forms:
        tags = set(f.get("tags") or [])
        form = f.get("form", "")
        if not form or form == "-" or tags & SKIP_TAGS or form.startswith("of "):
            continue
        if pos in ("noun",):
            case = [CASES[t] for t in tags if t in CASES]
            num = "sg" if "singular" in tags else "pl" if "plural" in tags else None
            if len(case) == 1 and num:
                out[f"{case[0]}_{num}"].append((("animate" in tags) - ("inanimate" in tags), clean_form(form)))
        elif pos in ("adj", "pron", "num") and "short-form" in tags:
            g = "m" if "masculine" in tags else "f" if "feminine" in tags else "n" if "neuter" in tags else "pl" if "plural" in tags else None
            if g and f.get("source"):
                out[f"short_{g}"].append((0, clean_form(form)))
        elif pos in ("adj", "pron", "num") and f.get("source"):
            case = [CASES[t] for t in tags if t in CASES]
            if len(case) != 1:
                continue
            genders = [g for g, t in (("m", "masculine"), ("f", "feminine"), ("n", "neuter")) if t in tags]
            if "plural" in tags:
                genders = ["pl"]
            for g in genders:
                out[f"{g}_{case[0]}"].append((("animate" in tags) - ("inanimate" in tags), clean_form(form)))
        elif pos in ("adj", "adv") and not f.get("source"):
            if "comparative" in tags and "short-form" not in tags:
                out["comp"].append((0, clean_form(form)))
            elif "superlative" in tags:
                out["sup"].append((0, clean_form(form)))
        elif pos == "verb" and f.get("source") == "conjugation":
            pers = "1" if "first-person" in tags else "2" if "second-person" in tags else "3" if "third-person" in tags else None
            num = "sg" if "singular" in tags else "pl" if "plural" in tags else None
            if "imperative" in tags and num:
                out[f"imp_{num}"].append((0, clean_form(form)))
            elif "past" in tags and "participle" not in tags:
                g = "pl" if "plural" in tags else "m" if "masculine" in tags else "f" if "feminine" in tags else "n" if "neuter" in tags else None
                if g:
                    out[f"past_{g}"].append((0, clean_form(form)))
            elif pers and num and ("present" in tags or ("future" in tags and " " not in form)):
                out[f"presfut_{pers}{num}"].append((0, clean_form(form)))
    res = {}
    for k, vs in out.items():
        seen = []
        for _, v in sorted(vs, key=lambda x: x[0]):  # inanimato prima, come OpenRussian
            if v and v not in seen and has_acc(v) or (v and v not in seen and count_vowels_simple(v) <= 1):
                seen.append(v)
        if seen:
            res[k] = seen
    return res


def count_vowels_simple(s):
    return sum(c in VOWELS for c in s.lower())


def wikt_lemma_stress(w, e):
    """Possibili lemmi accentati secondo Wiktionary (lista)."""
    cands = []
    for f in e.get("forms") or []:
        tags = set(f.get("tags") or [])
        form = f.get("form", "")
        if strip_acc(form) != w["ru"]:
            continue
        if "canonical" in tags or ("infinitive" in tags and f.get("source") == "conjugation") or (
                {"nominative", "singular"} <= tags and not tags & SKIP_TAGS) or (
                {"masculine", "nominative"} <= tags and not tags & SKIP_TAGS):
            cands.append(form)
    if not cands:
        for h in e.get("head_templates") or []:
            a = (h.get("args") or {}).get("1", "")
            if a and strip_acc(a) == w["ru"] and has_acc(a):
                cands.append(a)
    return list(dict.fromkeys(cands))


def norm_for_compare(s, mono_ignore=True):
    s = s.strip()
    if mono_ignore and count_vowels_simple(s) <= 1:
        return strip_acc(s)
    return s


def main():
    entries = load_entries()
    # Wikizionario
    it_entries = collections.defaultdict(list)
    for line in open(os.path.join(RAW, "kaikki.org-dictionary-Russo.jsonl"), encoding="utf-8"):
        d = json.loads(line)
        it_entries[strip_acc(d["word"])].append(d)

    words = {}
    order = []
    for lvl in ["zero", "a1", "a2"]:
        ws = json.load(open(os.path.join(WORDS, f"{lvl}.json"), encoding="utf-8"))
        words[lvl] = ws
        order += ws

    extra = {}
    stress_dis, form_dis, gender_dis = [], [], []
    stats = collections.Counter()
    for w in order:
        wid = w["id"]
        ex = {}
        e = pick_entry(w, entries.get(w["ru"], []))
        if e is None:
            stats["senza entry Wiktionary"] += 1
            ex["no_wiktionary_entry"] = True
        else:
            # --- accenti del lemma ---
            wl = wikt_lemma_stress(w, e)
            if wl:
                orv = norm_for_compare(w["stress"].lower())
                wv = {norm_for_compare(x.lower()) for x in wl}
                if orv not in wv and not (" " in w["ru"]):
                    stress_dis.append({"id": wid, "ru": w["ru"], "pos": w["pos"], "level": w["level"], "field": "stress",
                                       "openrussian": w["stress"], "wiktextract": wl,
                                       "tipo": "variante" if any(strip_acc(x) == strip_acc(w["stress"]) and x != w["stress"] for x in wl) else "altro"})
                    stats["accenti in disaccordo (lemma)"] += 1
                else:
                    stats["accenti lemma concordi"] += 1
            # --- forme ---
            wf = wikt_forms(w, e)
            forms = w.get("forms") or {}
            orig_forms = dict(forms)
            has_pl = any(k.endswith("_pl") for k in forms if k not in ("short_pl",))
            has_sg = any(k.endswith("_sg") for k in forms)
            added = []
            for k, vs in wf.items():
                val = ", ".join(vs)
                if k in forms:
                    cur = {norm_for_compare(x.strip().lower()) for x in re.split(r"[,;/]", forms[k]) if x.strip()}
                    new = {norm_for_compare(x.lower()) for x in vs}
                    if not (cur & new):
                        form_dis.append({"id": wid, "ru": w["ru"], "key": k, "openrussian": forms[k], "wiktextract": vs})
                        stats["forme in disaccordo"] += 1
                    continue
                if w["pos"] == "noun" and orig_forms:
                    if k.endswith("_pl") and not has_pl:
                        continue
                    if k.endswith("_sg") and not has_sg:
                        continue
                forms[k] = val
                added.append(k)
            if added:
                w["forms"] = forms
                ex["forms_added"] = sorted(added)
                stats["parole con forme integrate"] += 1
                stats["forme aggiunte"] += len(added)
            # --- aspetto/ transitivita' per i verbi ---
            gt = {}
            if w["pos"] == "verb":
                asp = None
                for h in e.get("head_templates") or []:
                    a = (h.get("args") or {}).get("2", "")
                    asp = {"impf": "imperfective", "pf": "perfective", "both": "both"}.get(a, asp)
                for f in e.get("forms") or []:
                    if f.get("source") == "conjugation" and f.get("tags") == ["class"] or f.get("tags") == ["class"]:
                        m = re.findall(r"\b(imperfective|perfective|transitive|intransitive|reflexive)\b", f["form"])
                        for x in m:
                            if x in ("imperfective", "perfective"):
                                asp = asp or x
                            else:
                                gt[x] = True
                if asp:
                    gt["aspect"] = asp
                if w["ru"].endswith(("ся", "сь")):
                    gt["reflexive"] = True
                if not w.get("forms", {}).get("aspect") and asp:
                    w.setdefault("forms", {})["aspect"] = asp if asp != "both" else "both"
                    ex.setdefault("forms_added", []).append("aspect")
                if "aspect_partner" not in (w.get("forms") or {}):
                    for f in e.get("forms") or []:
                        t = set(f.get("tags") or [])
                        if not f.get("source") and t & {"perfective", "imperfective"} and len(t) == 1:
                            w.setdefault("forms", {})["aspect_partner"] = f["form"]
                            ex.setdefault("forms_added", []).append("aspect_partner")
                            break
            tags = set(e.get("tags") or [])
            for s in e["senses"]:
                tags |= set(s.get("tags") or [])
            if "indeclinable" in tags or "invariable" in tags or (w.get("forms") or {}).get("indeclinable"):
                gt["indeclinable"] = True
            if w["pos"] == "noun":
                if "plural-only" in tags:
                    gt["plural_only"] = True
                if "uncountable" in tags:
                    gt["uncountable"] = True
            if w["pos"] == "adj" and "possessive" in tags:
                gt["possessive"] = True
            # classe di declinazione / schema d'accento
            for f in e.get("forms") or []:
                if f.get("tags") == ["class"] and not re.search(r"(perfective|transitive)", f["form"]):
                    gt.setdefault("decl_class", []).append(f["form"])
            # --- genere / animato ---
            if w["pos"] == "noun":
                g = "m" if "masculine" in tags else "f" if "feminine" in tags else "n" if "neuter" in tags else None
                an = True if "animate" in tags and "inanimate" not in tags else False if "inanimate" in tags and "animate" not in tags else None
                if g:
                    if "gender" not in w:
                        w["gender"] = g; ex["gender_from_wikt"] = True; stats["genere integrato"] += 1
                    elif w["gender"] != g and len([x for x in ("masculine", "feminine", "neuter") if x in tags]) == 1:
                        gender_dis.append({"id": wid, "ru": w["ru"], "field": "gender", "openrussian": w["gender"], "wiktextract": g})
                if an is not None:
                    if "animate" not in w:
                        w["animate"] = an; ex["animate_from_wikt"] = True; stats["animato integrato"] += 1
                    elif w["animate"] != an:
                        gender_dis.append({"id": wid, "ru": w["ru"], "field": "animate", "openrussian": w["animate"], "wiktextract": an})
            if gt:
                ex["grammar"] = gt
            # --- IPA ---
            ipa = [s["ipa"] for s in (e.get("sounds") or []) if s.get("ipa")]
            if ipa:
                ex["ipa"] = ipa[0]
                stats["ipa"] += 1
            # --- reggenze ---
            gov = collections.Counter()
            for s in e["senses"]:
                for g in (s.get("raw_glosses") or s.get("glosses") or []):
                    for m in re.findall(r"\bwith (?:the )?(genitive|dative|accusative|instrumental|prepositional)\b", g):
                        gov[CASES[m]] += 1
            for cat in (c["name"] for c in (e.get("categories") or [])):
                m = re.match(r"Russian (?:prepositions|verbs) governing the (\w+)", cat)
                if m and m.group(1) in CASES:
                    gov[CASES[m.group(1)]] += 5
            if gov:
                ex["governs"] = [k for k, _ in gov.most_common()]
            # --- topics: solo categorie del PRIMO senso (evita contaminazione da sensi secondari) ---
            cats = {c["name"] for c in (e["senses"][0].get("categories") or [])} if e["senses"] else set()
            tp = sorted({CATEGORY_TOPICS[c] for c in cats if c in CATEGORY_TOPICS})
            if w["pos"] != "num" and "numeri" in tp:
                tp.remove("numeri")  # 'One', 'Two'... su non-numerali (раз, однажды) non indicano l'argomento numeri
            if w["pos"] in ("verb", "adj") and "tempo" in tp and w["ru"] not in ("долгий", "ранний"):
                tp.remove("tempo")
            tp = [t for t in tp if t != "tecnologia" or w["ru"] in ("телефон",)]
            if tp:
                w["topics"] = sorted(set(w.get("topics", [])) | set(tp))
                ex["topics_from"] = sorted(c for c in cats if c in CATEGORY_TOPICS)
                stats["parole con topics"] += 1
            if wid in TOPIC_OVERRIDES:
                w["topics"] = list(TOPIC_OVERRIDES[wid])
                ex["topics_override"] = True
        # --- italiano da Wikizionario ---
        ies = [d for d in it_entries.get(w["ru"], []) if d["pos"] in IT_POS_COMPAT[w["pos"]]]
        senses = []
        for d in ies:
            for s in d["senses"]:
                if "form-of" in (s.get("tags") or []) or not s.get("glosses"):
                    continue
                g = s["glosses"][0].strip()
                if re.search(r"definizione mancante|\bdi [а-яё]+$", g):
                    continue
                senses.append(g)
        senses = list(dict.fromkeys(senses))
        if len(ies) == 1 and len(senses) == 1 and len(senses[0]) <= 40 and ";" not in senses[0]:
            gl = re.sub(r"\s*\([^)]*\)", "", senses[0]).rstrip(".").strip()
            w["it"] = [x.strip() for x in gl.split(",") if x.strip()]
            ex["it_from"] = "itwiktionary"
            stats["it da Wikizionario"] += 1
        elif senses:
            ex["it_candidates"] = senses[:5]
            stats["it candidate (non usate)"] += 1
        # --- migrazione nei campi del contratto (ipa, aspect, grammar_tags, governs) ---
        for k in ("ipa", "aspect", "grammar_tags", "governs"):
            w.pop(k, None)
        if ex.get("ipa"):
            w["ipa"] = ex.pop("ipa")
        gt = ex.get("grammar") or {}
        asp = gt.pop("aspect", None)
        if asp:
            w["aspect"] = {"imperfective": "impf", "perfective": "pf", "both": "both"}[asp]
        dc = gt.pop("decl_class", None)
        tags_out = sorted(k for k, v in gt.items() if v is True)
        if tags_out:
            w["grammar_tags"] = tags_out
        if ex.get("governs"):
            w["governs"] = ["+" + c for c in ex.pop("governs")]
        if dc:
            ex["decl_class"] = dc
        ex.pop("grammar", None)
        if ex:
            extra[wid] = ex
        # attribuzione
        att = w["attribution"].split(" | ")[0]
        extras_att = []
        if ex.get("forms_added") or ex.get("topics_from") or ex.get("gender_from_wikt") or ex.get("animate_from_wikt"):
            extras_att.append("forme/genere/argomenti integrati da Wiktionary (en.wiktionary.org) via Wiktextract (kaikki.org), CC BY-SA 4.0")
        if ex.get("it_from"):
            extras_att.append("traduzione it da Wikizionario (it.wiktionary.org) via kaikki.org, CC BY-SA")
        w["attribution"] = att + "".join(" | " + x for x in extras_att)

    qa_fixes.apply_word_fixes(order)
    for w in order:
        if w.get("it") and "Wikizionario" not in w["attribution"] and "qa-russian" not in w["attribution"]:
            w["attribution"] += " | traduzione it: revisione del team (qa-russian)"
    for lvl, ws in words.items():
        json.dump(ws, open(os.path.join(WORDS, f"{lvl}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    os.makedirs(os.path.join(ROOT, "extra"), exist_ok=True)
    json.dump(extra, open(os.path.join(ROOT, "extra", "wiktextract.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    os.makedirs(os.path.join(ROOT, "reports"), exist_ok=True)
    json.dump({"generato_da": "scripts/enrich_wiktextract.py",
               "nota": "OpenRussian NON e' stato sovrascritto. Da verificare da qa-russian.",
               "accenti_lemma": stress_dis, "forme": form_dis, "genere_animato": gender_dis},
              open(os.path.join(ROOT, "reports", "stress_disagreements.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(dict(stats))
    print("disaccordi:", len(stress_dis), "lemma;", len(form_dis), "forme;", len(gender_dis), "genere/animato")


if __name__ == "__main__":
    main()
