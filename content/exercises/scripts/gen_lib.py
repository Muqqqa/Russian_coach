# Funzioni di supporto per il generatore di esercizi (deterministico).
import re, unicodedata, random, hashlib
from glossary import A, norm

CYR = "А-Яа-яЁё"
TOK_RE = re.compile(r"^([^A-Za-z" + CYR + "́]*)([A-Za-z" + CYR + "́][A-Za-z" + CYR + "́\\-]*)(.*)$")
PUNCT_RE = re.compile(r"[\.,!?;:«»\"“”…—–()]")
ONLY_CYR = re.compile("^[" + CYR + "́\\-]+$")


def rng_for(*parts):
    return random.Random("|".join(str(p) for p in parts))


def plain(s):
    return s.replace(A, "")


def noyo(s):
    return plain(s).replace("ё", "е").replace("Ё", "Е")


def nopunct(s):
    s = PUNCT_RE.sub("", s)
    return re.sub(r"\s+", " ", s).strip()


def ru_variants(stress):
    """risposta in russo con accento + varianti senza accento / senza punteggiatura / minuscolo / ё->е"""
    base = [stress.strip()]
    out = []
    def add(x):
        x = x.strip()
        if x and x not in out:
            out.append(x)
    for b in base:
        add(b)
        add(nopunct(b))
        add(plain(b))
        add(nopunct(plain(b)))
        add(plain(b).lower())
        add(nopunct(plain(b)).lower())
        add(nopunct(b).lower())
        add(noyo(b))
        add(nopunct(noyo(b)).lower())
    return out


def strip_diacritics(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def it_variants(text):
    out = []
    def add(x):
        x = re.sub(r"\s+", " ", x).strip()
        if x and x not in out:
            out.append(x)
    t = text.replace("’", "'")
    add(text)
    add(t)
    add(nopunct(t))
    add(nopunct(t).lower())
    add(t.lower())
    # apostrofo al posto dell'accento (e' per è)
    ap = t.replace("è", "e'").replace("È", "E'").replace("é", "e'").replace("à", "a'").replace("ò", "o'").replace("ù", "u'").replace("ì", "i'")
    if ap != t:
        add(ap)
        add(nopunct(ap).lower())
    add(strip_diacritics(nopunct(t)).lower())
    return out


def _articles(g):
    """articoli plausibili per un nome italiano (euristica sulla desinenza)"""
    g = g.lower()
    w0 = g.split(" ")[0]
    vow = w0[0] in "aeiouàèéìòù"
    last = w0[-1]
    fem = last in "aàù" or w0.endswith("ione")
    both = last == "e"
    lo = bool(re.match(r"^(s[^aeiou]|z|gn|ps|x|y)", w0))
    out = []
    if not fem or both:
        if vow:
            out += ["l'", "un "]
        else:
            out += ["lo ", "uno "] if lo else ["il ", "un "]
    if fem or both:
        out += ["l'", "un'"] if vow else ["la ", "una "]
    return out

def gloss_variants(glosses, pos=None):
    out = []
    def add(x):
        x = x.strip()
        if x and x not in out:
            out.append(x)
    for g in glosses:
        g = g.strip()
        add(g)
        add(g.lower())
        if pos == "noun" and " " not in g.strip():
            for art in _articles(g):
                add(art + g.lower())
        add(strip_diacritics(g.lower()))
    return out


def split_core(tok):
    m = TOK_RE.match(tok)
    if not m:
        return None
    return m.group(1), m.group(2), m.group(3)


def vowels_count(s):
    return sum(1 for c in noyo(s).lower() if c in "аеиоуыэюя")


def clip(x, lo, hi):
    return max(lo, min(hi, x))


def stable_hash(s, n=8):
    return hashlib.sha1(s.encode("utf-8")).hexdigest()[:n]


def shuffle_options(opts, correct_idx_value, rng):
    """mescola le opzioni e restituisce (lista, indice corretto) dove correct_idx_value e' la stringa corretta"""
    o = list(opts)
    rng.shuffle(o)
    return o, o.index(correct_idx_value)
