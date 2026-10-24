"""Funzioni condivise: accenti, traslitterazione, slug."""
import re

ACC = "́"
VOWELS = "аеёиоуыэюя"
LEVEL_ORDER = ["zero", "a1", "a2", "b1", "b2"]


def to_stress(s):
    """OpenRussian segna l'accento con apostrofo dopo la vocale: converte in U+0301."""
    return re.sub(r"([аеёиоуыэюя])'", lambda m: m.group(1) + ACC, s, flags=re.I).replace("'", "")


def strip_acc(s):
    return s.replace(ACC, "")


def add_default_stress(s):
    """Monosillabi senza segno: accenta l'unica vocale (tranne ё, gia' sempre tonica).
    Ritorna (stringa, risolto). Parole plurisillabiche senza segno e senza ё: risolto=False."""
    if ACC in s:
        return s, True
    v = [i for i, c in enumerate(s.lower()) if c in VOWELS]
    if not v:
        return s, True  # senza vocale (в, к, с): nulla da accentare
    if len(v) == 1:
        return (s, True) if s[v[0]].lower() == "ё" else (s[: v[0] + 1] + ACC + s[v[0] + 1 :], True)
    if "ё" in s.lower():
        return s, True
    return s, False


def stress_word_by_word(s):
    """Per espressioni di piu' parole (separate da spazio): applica la regola ad ogni parola."""
    ok = True
    out = []
    for w in s.split(" "):
        w2, r = add_default_stress(w)
        ok &= r
        out.append(w2)
    return " ".join(out), ok


# --- slug ASCII per gli id -------------------------------------------------
_SLUG = dict(zip("абвгдежзийклмнопрстуфхцчшщъыьэюяё",
                 ["a","b","v","g","d","e","zh","z","i","y","k","l","m","n","o","p","r","s","t","u","f","kh","ts","ch","sh","shch","","y","","e","yu","ya","yo"]))


def slug(ru):
    out = "".join(_SLUG.get(c, "_" if c in " -" else c) for c in ru.lower())
    return re.sub(r"[^a-z0-9_]", "", re.sub(r"_+", "_", out)).strip("_")


# --- traslitterazione leggibile da italiani -----------------------------------
# Convenzioni (nessuna riduzione vocalica: la spiegano le lezioni):
# ч/ш/щ seguono l'ortografia italiana (ce/ci/cia/scia/ssci...), ж=zh, ц=z, х=kh, й=j, ы=y,
# г davanti a е/и/ё/ь = gh. Accento tonico = accento grave sulla vocale.
_GRAVE = {"a": "\u00e0", "e": "\u00e8", "i": "\u00ec", "o": "\u00f2", "u": "\u00f9", "y": "\u1ef3"}
_CONS = dict(б="b", в="v", д="d", ж="zh", з="z", й="j", к="k", л="l", м="m", н="n", п="p",
             р="r", с="s", т="t", ф="f", х="kh", ц="z", ч="c", ш="sc", щ="ssc", ъ="", ь="")
_PLAIN_V = dict(а="a", о="o", у="u", э="e", ы="y", и="i")
_HUSH = "чшщ"


def _grave_last(piece):
    for i in range(len(piece) - 1, -1, -1):
        if piece[i] in _GRAVE:
            return piece[:i] + _GRAVE[piece[i]] + piece[i + 1:]
    return piece


# eccezioni di pronuncia ([što], [kɐˈnʲeʂnə]) indicate da qa-russian
_TRANSLIT_TOKEN = {"что\u0301": "st\u00f2", "что\u0301бы": "st\u00f2by", "что\u0301б": "st\u00f2b", "ничто\u0301": "nist\u00f2",
                   "что\u0301-то": "st\u00f2-to", "коне\u0301чно": "kon\u00e8sno"}


def translit(stress):
    """Per frasi di piu' parole traslittera ogni parola; applica le eccezioni per token."""
    if " " in stress:
        return " ".join(translit(t) for t in stress.split(" "))
    t = stress.lower()
    if t in _TRANSLIT_TOKEN:
        return _TRANSLIT_TOKEN[t]
    return _translit(stress)


def _translit(stress):
    """stress: russo con U+0301. Ritorna la trascrizione latina con accento grave sulla tonica."""
    chars = []  # (lettera, tonica)
    for ch in stress.lower():
        if ch == ACC:
            if chars:
                chars[-1] = (chars[-1][0], True)
        else:
            chars.append((ch, False))
    out = []
    for i, (c, st) in enumerate(chars):
        prev = chars[i - 1][0] if i else " "
        nxt = chars[i + 1][0] if i + 1 < len(chars) else ""
        if c == "\u0451":
            c, st = "\u0451", True
        if c in _CONS:
            piece = _CONS[c]
            if c in _HUSH and (nxt == "" or nxt not in VOWELS):
                piece += "i"  # ч/ш/щ davanti a consonante, ь o a fine parola: ci/sci/ssci (altrimenti un italiano legge k/sk)
            out.append(piece)
        elif c == "г":
            out.append("gh" if nxt in ("е", "и", "ё", "ь") else "g")
        elif c in _PLAIN_V:
            p = _PLAIN_V[c]
            if prev in _HUSH and c in "\u0430\u043e\u0443":
                p = "i" + p
            out.append(_grave_last(p) if st else p)
        elif c in "еёюя":
            after_hush = prev in _HUSH
            if c == "е":
                p = "ie" if (prev in VOWELS or prev in "ьъ -" ) else "e"
            else:
                base = {"ё": "o", "ю": "u", "я": "a"}[c]
                p = ("" if False else "i") + base
            if after_hush and c in "её" and c == "е":
                p = "e"
            out.append(_grave_last(p) if st else p)
        else:
            out.append(c)
    return "".join(out)
