import json,glob,re,os
A='́'
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..','..'))
def norm(s): return s.replace(A,'').replace('ё','е').lower().strip()
def load_words():
    W={}
    for f in sorted(glob.glob(ROOT+'/data/words/*.json')):
        for w in json.load(open(f)): W[w['id']]=w
    return W
def load_sentences():
    S={}
    for f in sorted(glob.glob(ROOT+'/data/sentences/*.json')):
        for s in json.load(open(f)): S[s['id']]=s
    return S
def load_lessons():
    L=[]
    for lv in ['zero','a1','a2']:
        for f in sorted(glob.glob(f'{ROOT}/content/curriculum/{lv}/*.json')): L.append(json.load(open(f))[0])
    return L
def clean_gloss(g):
    g=g.replace('**','').replace('*','')
    g=re.sub(r'\([^)]*\)','',g)
    g=g.split('«')[0] if g.strip().startswith('«') is False and False else g
    return g.strip(' .;')
def split_gloss(g):
    out=[]
    for p in re.split(r'[,;]| o | oppure ',g):
        p=p.strip(' .')
        if p and p not in out: out.append(p)
    return out
def build_glossary(W,L):
    manual=json.load(open(os.path.join(os.path.dirname(__file__),'glossary_manual.json')))
    byru={}
    for w in W.values(): byru.setdefault(norm(w['ru']),[]).append(w['id'])
    G={}
    src={}
    for l in L:
        md=l['explanation_md']
        gl={}
        for m in re.finditer(r'\*\*([^*\n]+?)\*\*\s*\(([^)\n]*)\)\s*(?:–|—|-|:)\s*([^\n]+)',md):
            gl.setdefault(norm(m.group(1)),m.group(3))
        for m in re.finditer(r'\*\*([^*\n]+?)\*\*\s*\(([^)\n]*)\)\s*\(«([^»\n]+)»\)',md):
            gl.setdefault(norm(m.group(1)),m.group(3))
        for wid in l['new_words']:
            w=W[wid]
            if wid in G: continue
            if wid in manual: G[wid]=manual[wid]; src[wid]='manual'; continue
            if w.get('it'): G[wid]=list(w['it']); src[wid]='data'; continue
            k=norm(w['ru'])
            if k in gl:
                g=clean_gloss(gl[k])
                # taglia dopo i due punti delle forme: "aspettare: жду..."
                g=g.split(':')[0]
                v=split_gloss(g)
                if v: G[wid]=v; src[wid]='lesson'
    return G,src
if __name__=='__main__':
    W=load_words();L=load_lessons();G,src=build_glossary(W,L)
    for l in L:
        for wid in l['new_words']:
            print(wid,src.get(wid),G.get(wid))
