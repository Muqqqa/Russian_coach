#!/usr/bin/env bash
# Scarica le fonti grezze in data/raw/ (ignorata da git). Uso: bash data/scripts/fetch_sources.sh
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p raw/openrussian raw/tatoeba
# OpenRussian: CSV con accenti e forme (repo pubblico, CC BY-SA 4.0)
tmp=$(mktemp -d)
git clone --depth 1 https://github.com/Badestrand/russian-dictionary.git "$tmp/or"
cp "$tmp"/or/*.csv "$tmp"/or/LICENSE raw/openrussian/
rm -rf "$tmp"
# OpenRussian: liste per livello (A1/A2/B1) lette dal sito pubblico
python3 -I scripts/fetch_levels.py raw/openrussian/levels.json
# Tatoeba: esportazioni per lingua (CC BY 2.0 FR; CC0 per il sottoinsieme _CC0)
B=https://downloads.tatoeba.org/exports/per_language
for f in rus/rus_sentences_detailed rus/rus-ita_links ita/ita_sentences_detailed rus/rus_sentences_CC0; do
  curl -sS -O "$B/$f.tsv.bz2"; bunzip2 -f "$(basename "$f").tsv.bz2"; mv "$(basename "$f").tsv" raw/tatoeba/
done
# Wiktextract (en.wiktionary, CC BY-SA 4.0 / GFDL): dump russo post-processato (~950 MB) e Wikizionario (it) russo
mkdir -p raw/wiktextract
curl -sS -o raw/wiktextract/kaikki.org-dictionary-Russian.jsonl https://kaikki.org/dictionary/Russian/kaikki.org-dictionary-Russian.jsonl
curl -sS -o raw/wiktextract/kaikki.org-dictionary-Russo.jsonl https://kaikki.org/itwiktionary/Russo/kaikki.org-dictionary-Russo.jsonl
# sottoinsieme per i nostri lemmi (dopo build_words.py)
python3 -I scripts/subset_wiktextract.py raw/wiktextract/kaikki.org-dictionary-Russian.jsonl raw/wiktextract/ru_subset.jsonl
