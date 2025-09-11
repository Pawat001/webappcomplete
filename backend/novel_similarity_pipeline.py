
import os
import re
import json
import glob
import math
import string
import argparse
from typing import List, Dict, Tuple
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import networkx as nx
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# ---------------------------
# Utilities
# ---------------------------

def read_txt(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()

def simple_preprocess(text: str) -> str:
    # Lowercase, remove punctuation, collapse spaces
    text = text.lower()
    text = text.replace("\n", " ")
    text = text.translate(str.maketrans("", "", string.punctuation))
    text = re.sub(r"\s+", " ", text).strip()
    return text

def load_database(db_root: str) -> Tuple[List[str], List[str], List[str]]:
    """
    Returns: texts, labels(doc names), genres (same length as texts)
    Expects folder structure ./db/<genre>/**/*.txt (recursive)
    """
    texts, labels, genres = [], [], []
    if not os.path.isdir(db_root):
        raise SystemExit(f"Database folder not found: {db_root}")
    genre_dirs = sorted([d for d in os.listdir(db_root) if os.path.isdir(os.path.join(db_root, d))])
    if not genre_dirs:
        raise SystemExit(f"No genre subfolders inside {db_root}. Expected: {db_root}/<genre>/*.txt")
    for g in genre_dirs:
        gpath = os.path.join(db_root, g)
        # ✅ recursive glob เพื่อให้หาไฟล์ในทุก subfolder
        files = sorted(glob.glob(os.path.join(gpath, "**", "*.txt"), recursive=True))
        files = files[:10]  # จำกัดแนวละ 10 เรื่อง
        for p in files:
            labels.append(os.path.basename(p))
            genres.append(g)
            texts.append(simple_preprocess(read_txt(p)))
    if not texts:
        raise SystemExit("No .txt files found in the database.")
    return texts, labels, genres

def load_inputs(input_root: str, max_files: int = 5) -> Tuple[List[str], List[str]]:
    """
    Load 3-5 input files from ./input/*.txt
    """
    if not os.path.isdir(input_root):
        raise SystemExit(f"Input folder not found: {input_root}")
    files = sorted(glob.glob(os.path.join(input_root, "*.txt")))
    if not files:
        raise SystemExit(f"No .txt files found in {input_root}")
    if len(files) < 3:
        print(f"[WARN] Found {len(files)} input files (<3). Proceeding anyway.")
    if len(files) > max_files:
        files = files[:max_files]
    texts = [simple_preprocess(read_txt(p)) for p in files]
    names = [os.path.basename(p) for p in files]
    return texts, names

def make_vectorizer():
    # keep single-character tokens too (some languages), strip accents as default
    return TfidfVectorizer(token_pattern=r"\b\w+\b", min_df=1, max_df=0.95)

def annotate_heatmap(ax, im, data):
    # Put text annotations on heatmap cells
    nrows, ncols = data.shape
    for i in range(nrows):
        for j in range(ncols):
            ax.text(j, i, f"{data[i, j]:.2f}", ha="center", va="center", fontsize=8)

def plot_heatmap(matrix: np.ndarray, xlabels: List[str], ylabels: List[str], title: str, outpath: str):
    fig = plt.figure(figsize=(max(6, len(xlabels)*0.6), max(4, len(ylabels)*0.5)))
    ax = fig.add_subplot(111)
    im = ax.imshow(matrix, aspect="auto")
    ax.set_xticks(np.arange(len(xlabels)))
    ax.set_xticklabels(xlabels, rotation=45, ha="right")
    ax.set_yticks(np.arange(len(ylabels)))
    ax.set_yticklabels(ylabels)
    ax.set_title(title)
    ax.set_xlabel("Database")
    ax.set_ylabel("Inputs")
    annotate_heatmap(ax, im, matrix)
    fig.tight_layout()
    fig.savefig(outpath, dpi=200)
    plt.close(fig)

def plot_network(edges: List[Tuple[str, str, float]], outpath: str, topk:int=3):
    """
    edges: (input_doc, db_doc, weight)
    Draw bipartite-like graph connecting input docs to their top-K db neighbors.
    """
    # Keep only topk edges per input doc
    by_input: Dict[str, List[Tuple[str,str,float]]] = {}
    for a, b, w in edges:
        by_input.setdefault(a, []).append((a,b,w))
    pruned = []
    for a, lst in by_input.items():
        lst_sorted = sorted(lst, key=lambda x: x[2], reverse=True)[:topk]
        pruned.extend(lst_sorted)

    G = nx.Graph()
    for a, b, w in pruned:
        G.add_node(a, bipartite=0, kind="input")
        G.add_node(b, bipartite=1, kind="db")
        G.add_edge(a, b, weight=w)

    # Position: inputs on left, db on right with spring layout as fallback
    left_nodes = [n for n, d in G.nodes(data=True) if d.get("kind")=="input"]
    right_nodes = [n for n, d in G.nodes(data=True) if d.get("kind")=="db"]
    pos_left = {n: (-1, i) for i, n in enumerate(sorted(left_nodes))}
    pos_right = {n: (1, i) for i, n in enumerate(sorted(right_nodes))}
    pos = {**pos_left, **pos_right}
    # If many db nodes, shift spacing
    if len(right_nodes) > 0:
        step = max(1, len(right_nodes)//len(left_nodes) if len(left_nodes)>0 else 1)

    fig = plt.figure(figsize=(10, max(6, len(right_nodes)*0.25 + len(left_nodes)*0.25)))
    ax = fig.add_subplot(111)

    # Draw nodes
    nx.draw_networkx_nodes(G, pos, nodelist=left_nodes, node_size=800, node_shape="s", ax=ax)
    nx.draw_networkx_nodes(G, pos, nodelist=right_nodes, node_size=700, node_shape="o", ax=ax)

    # Draw edges with thickness proportional to weight
    widths = [2 + 6*G[u][v]["weight"] for u,v in G.edges()]
    nx.draw_networkx_edges(G, pos, width=widths, ax=ax)

    # Labels
    nx.draw_networkx_labels(G, pos, font_size=8, ax=ax)

    ax.set_title("Input ↔ Database Network (top matches)")
    ax.axis("off")
    fig.tight_layout()
    fig.savefig(outpath, dpi=220)
    plt.close(fig)

def classify_relation(score: float, dup_threshold: float=0.90, similar_threshold: float=0.60) -> str:
    if score >= dup_threshold:
        return "duplicate/near-duplicate"
    elif score >= similar_threshold:
        return "similar"
    else:
        return "different"

# ---------------------------
# Core pipeline
# ---------------------------

def run_pipeline(db_root: str, input_root: str, out_root: str,
                 k_neighbors: int = 3,
                 dup_threshold: float = 0.90,
                 similar_threshold: float = 0.60):
    os.makedirs(out_root, exist_ok=True)

    # 1) Load database
    db_texts, db_labels, db_genres = load_database(db_root)

    # 2) Load inputs (3–5 files preferred)
    in_texts, in_labels = load_inputs(input_root, max_files=5)

    # 3) Vectorize (fit on database to form the "knowledge base")
    vec = make_vectorizer()
    X_db = vec.fit_transform(db_texts)  # (N_db, V)
    X_in = vec.transform(in_texts)      # (N_in, V)

    # 4) Similarities
    S = cosine_similarity(X_in, X_db)   # (N_in x N_db)

    # 5) Per-input rankings & relation classification
    rows = []
    edges = []
    for i, in_name in enumerate(in_labels):
        sims = S[i]
        order = np.argsort(-sims)  # descending
        top_idx = order[0]
        top_score = float(sims[top_idx])
        top_db = db_labels[top_idx]
        top_genre = db_genres[top_idx]
        relation = classify_relation(top_score, dup_threshold, similar_threshold)

        # Store edges for network
        for j in order[:k_neighbors]:
            edges.append((in_name, db_labels[j], float(sims[j])))

        # Aggregate by genre (max & mean within each genre)
        genre_scores: Dict[str, List[float]] = {}
        for j, g in enumerate(db_genres):
            genre_scores.setdefault(g, []).append(float(sims[j]))
        genre_rank = sorted(
            [(g, float(np.mean(v)), float(np.max(v))) for g, v in genre_scores.items()],
            key=lambda x: x[2], reverse=True
        )

        rows.append({
            "input_doc": in_name,
            "top_db_doc": top_db,
            "top_genre": top_genre,
            "top_similarity": round(top_score, 4),
            "relation": relation,
            "genre_rank_json": json.dumps([{"genre": g, "mean": round(m,4), "max": round(mx,4)} for g,m,mx in genre_rank], ensure_ascii=False)
        })

    # 6) Overall rankings
    # 6.1 Which DB story is most similar (best match) across all inputs?
    best_by_db = S.max(axis=0)  # (N_db,)
    db_overall_rank = sorted([(db_labels[j], db_genres[j], float(best_by_db[j]))],
                             key=lambda x: x[2], reverse=True)
    # 6.2 Which genres overlap most (by mean/max across inputs)?
    genre_overlap = {}
    for g in sorted(set(db_genres)):
        cols = [k for k, gg in enumerate(db_genres) if gg == g]
        sub = S[:, cols]
        genre_overlap[g] = {
            "mean_over_all": float(np.mean(sub)),
            "max_over_all": float(np.max(sub)),
        }
    genre_rank_overall = sorted([(g, v["mean_over_all"], v["max_over_all"]) for g,v in genre_overlap.items()],
                                key=lambda x: x[2], reverse=True)

    # 7) DataFrames
    comp_df = pd.DataFrame(rows)
    # Expand genre_rank_json for readability (top-3 only)
    def top3(gen_json):
        data = json.loads(gen_json)
        data = data[:3]
        return "; ".join([f'{d["genre"]}(max={d["max"]:.2f},mean={d["mean"]:.2f})' for d in data])

    if not comp_df.empty:
        comp_df["genre_top3"] = comp_df["genre_rank_json"].apply(top3)

    # Table of per-input per-DB similarities (for heatmap & detailed comparison)
    sim_df = pd.DataFrame(S, index=in_labels, columns=db_labels)

    # 8) Save tables
    comp_csv = os.path.join(out_root, "comparison_table.csv")
    sim_csv = os.path.join(out_root, "similarity_matrix.csv")
    overall_json = os.path.join(out_root, "overall_ranking.json")

    comp_df.to_csv(comp_csv, index=False, encoding="utf-8-sig")
    sim_df.to_csv(sim_csv, encoding="utf-8-sig")
    with open(overall_json, "w", encoding="utf-8") as f:
        json.dump({
            "db_overall_rank_desc": "DB doc with highest similarity to any input (descending)",
            "db_overall_rank": sorted(
                [{"db_doc": db_labels[j], "genre": db_genres[j], "best_similarity": float(best_by_db[j])}
                 for j in range(len(db_labels))],
                key=lambda d: d["best_similarity"], reverse=True
            ),
            "genre_rank_overall_desc": "Genres ranked by max similarity across inputs (then mean)",
            "genre_rank_overall": [
                {"genre": g, "mean": round(m,4), "max": round(mx,4)} for (g,m,mx) in genre_rank_overall
            ]
        }, f, ensure_ascii=False, indent=2)

    # 9) Visualizations
    heatmap_path = os.path.join(out_root, "similarity_heatmap.png")
    plot_heatmap(S, db_labels, in_labels, "Cosine Similarity (Inputs vs Database)", heatmap_path)

    network_path = os.path.join(out_root, "network_top_matches.png")
    plot_network(edges, network_path, topk=k_neighbors)

    # 10) Brief text report
    report_path = os.path.join(out_root, "report.txt")
    lines = []
    lines.append("# Similarity Report\n")
    lines.append("## Per-input top match & relation\n")
    for _, row in comp_df.iterrows():
        lines.append(f"- {row['input_doc']} ⇒ {row['top_db_doc']} (genre={row['top_genre']}, score={row['top_similarity']:.2f}, relation={row['relation']})")
        lines.append(f"  Top genres: {row['genre_top3']}")
    lines.append("\n## Overall DB ranking (best match across inputs)\n")
    rank_db = sorted(
        [{"db_doc": db_labels[j], "genre": db_genres[j], "best_similarity": float(best_by_db[j])}
         for j in range(len(db_labels))],
        key=lambda d: d["best_similarity"], reverse=True
    )
    for d in rank_db[:10]:
        lines.append(f"- {d['db_doc']} (genre={d['genre']}): {d['best_similarity']:.2f}")
    lines.append("\n## Overall Genre overlap ranking\n")
    for g, m, mx in genre_rank_overall:
        lines.append(f"- {g}: max={mx:.2f}, mean={m:.2f}")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    return {
        "comparison_table": comp_csv,
        "similarity_matrix": sim_csv,
        "overall_ranking": overall_json,
        "heatmap": heatmap_path,
        "network": network_path,
        "report": report_path
    }

def main():
    parser = argparse.ArgumentParser(description="Novel similarity: build DB (per-genre) and compare 3–5 inputs.")
    parser.add_argument("--db", default="./db", help="Database root folder (expects ./db/<genre>/*.txt).")
    parser.add_argument("--inputs", default="./input", help="Input folder with 3–5 .txt files to compare.")
    parser.add_argument("--out", default="./output", help="Output folder.")
    parser.add_argument("--topk", type=int, default=3, help="Top-K neighbors for network graph edges.")
    parser.add_argument("--dup_threshold", type=float, default=0.90, help="Duplicate threshold (cosine).")
    parser.add_argument("--similar_threshold", type=float, default=0.60, help="Similar threshold (cosine).")
    args = parser.parse_args()

    results = run_pipeline(
        db_root=args.db,
        input_root=args.inputs,
        out_root=args.out,
        k_neighbors=args.topk,
        dup_threshold=args.dup_threshold,
        similar_threshold=args.similar_threshold
    )
    print(json.dumps(results, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
