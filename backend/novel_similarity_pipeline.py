
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

def extract_novel_info(file_path: str, genre_path: str) -> Dict[str, str]:
    """
    Extract genre, folder name, and chapter name from file path
    
    Args:
        file_path: Full path to the text file
        genre_path: Path to the genre directory
        
    Returns:
        Dict with genre, folder_name, chapter_name, display_name
    """
    rel_path = os.path.relpath(file_path, genre_path)
    path_parts = rel_path.split(os.sep)
    
    genre = os.path.basename(genre_path)
    
    if len(path_parts) > 1:
        # 3-level structure: Genre/Novel Title/Filename.txt
        folder_name = path_parts[0].replace('_', ' ').replace('-', ' ')
        chapter_name = os.path.splitext(path_parts[-1])[0]
        display_name = f"{folder_name} - {chapter_name}"
        novel_title = folder_name
    else:
        # 2-level structure: Genre/Filename.txt
        folder_name = "N/A"
        chapter_name = os.path.splitext(path_parts[0])[0]
        display_name = chapter_name
        novel_title = "N/A"
    
    return {
        "genre": genre,
        "folder_name": folder_name,
        "chapter_name": chapter_name,
        "display_name": display_name,
        "novel_title": novel_title,
        "file_name": os.path.basename(file_path)
    }

def load_database(db_root: str) -> Tuple[List[str], List[str], List[str], List[str], List[Dict]]:
    """
    Returns: texts, labels(doc names), genres, titles, metadata (same length as texts)
    Expects folder structure ./db/<genre>/<title>/*.txt or ./db/<genre>/*.txt
    """
    texts, labels, genres, titles, metadata = [], [], [], [], []
    if not os.path.isdir(db_root):
        raise SystemExit(f"Database folder not found: {db_root}")
    genre_dirs = sorted([d for d in os.listdir(db_root) if os.path.isdir(os.path.join(db_root, d))])
    if not genre_dirs:
        raise SystemExit(f"No genre subfolders inside {db_root}. Expected: {db_root}/<genre>/*.txt")
    
    for g in genre_dirs:
        gpath = os.path.join(db_root, g)
        # ✅ recursive glob เพื่อให้หาไฟล์ในทุก subfolder
        files = sorted(glob.glob(os.path.join(gpath, "**", "*.txt"), recursive=True))
        files = files[:50]  # เพิ่มจำกัดไฟล์ต่อ genre
        
        for p in files:
            # Extract comprehensive file information
            file_info = extract_novel_info(p, gpath)
            
            labels.append(file_info["file_name"])
            genres.append(file_info["genre"])
            titles.append(file_info["novel_title"])
            metadata.append(file_info)
            
            texts.append(simple_preprocess(read_txt(p)))
            
    if not texts:
        raise SystemExit("No .txt files found in the database.")
    return texts, labels, genres, titles, metadata

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
    # Put text annotations on heatmap cells with improved font size
    nrows, ncols = data.shape
    
    # Use fixed font size of 9px for better readability
    fontsize = 9  # Fixed 9px font size as requested
    
    for i in range(nrows):
        for j in range(ncols):
            # Use white text for dark cells, black for light cells for better contrast
            text_color = "white" if data[i, j] > 0.6 else "black"
            ax.text(j, i, f"{data[i, j]:.2f}", ha="center", va="center", 
                   fontsize=fontsize, color=text_color, weight='bold')

def plot_heatmap(matrix: np.ndarray, xlabels: List[str], ylabels: List[str], title: str, outpath: str):
    # Calculate optimal cell size based on number of items
    nrows, ncols = len(ylabels), len(xlabels)
    
    # Fixed cell size of 40px as requested (convert to inches at 300 DPI)
    cell_width = 40/300  # 40px at 300 DPI = ~0.133 inches  
    cell_height = 40/300
    
    # Calculate figure size with proper margins
    fig_width = max(8, ncols * cell_width + 3)  # +3 for margins and labels
    fig_height = max(6, nrows * cell_height + 2.5)  # +2.5 for margins and labels
    
    fig = plt.figure(figsize=(fig_width, fig_height))
    ax = fig.add_subplot(111)
    
    # Use a better colormap with proper range
    im = ax.imshow(matrix, aspect="auto", cmap='RdYlBu_r', vmin=0, vmax=1)
    
    # Add colorbar
    cbar = plt.colorbar(im, ax=ax)
    cbar.set_label('ความคล้ายคลึง (Similarity Score)', rotation=270, labelpad=15)
    
    # Set ticks and labels
    ax.set_xticks(np.arange(len(xlabels)))
    ax.set_yticks(np.arange(len(ylabels)))
    
    # Truncate long labels to prevent overlap
    max_label_length = 25
    short_xlabels = [label[:max_label_length] + '...' if len(label) > max_label_length else label for label in xlabels]
    short_ylabels = [label[:max_label_length] + '...' if len(label) > max_label_length else label for label in ylabels]
    
    ax.set_xticklabels(short_xlabels, rotation=45, ha="right", fontsize=9)
    ax.set_yticklabels(short_ylabels, fontsize=9)
    
    # Set title and labels
    ax.set_title(title, fontsize=14, pad=20)
    ax.set_xlabel("ฐานข้อมูล (Database)", fontsize=12)
    ax.set_ylabel("ไฟล์ที่วิเคราะห์ (Input Files)", fontsize=12)
    
    # Add annotations with improved visibility
    annotate_heatmap(ax, im, matrix)
    
    # Adjust layout to prevent label cutoff
    plt.tight_layout()
    
    # Save with high DPI for better quality
    fig.savefig(outpath, dpi=300, bbox_inches='tight')
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

    # Draw edges with THINNER lines proportional to weight
    widths = [0.5 + 1.5*G[u][v]["weight"] for u,v in G.edges()]  # Much thinner: 0.5-2.0px
    nx.draw_networkx_edges(G, pos, width=widths, alpha=0.7, edge_color='gray', ax=ax)

    # Labels positioned to the SIDE of nodes to avoid overlap with proper offset
    label_pos = {}
    for node, (x, y) in pos.items():
        if node in left_nodes:
            label_pos[node] = (x - 0.6, y)  # Move further left for input nodes
        else:
            label_pos[node] = (x + 0.6, y)  # Move further right for database nodes
    
    # Use text-anchor equivalent and better positioning
    nx.draw_networkx_labels(G, label_pos, font_size=7, ax=ax,
                           bbox=dict(boxstyle="round,pad=0.2", facecolor="white", alpha=0.95),
                           horizontalalignment='left' if len(left_nodes) > 0 else 'right')

    ax.set_title("Input ↔ Database Network (top matches)", fontsize=12, pad=15)
    ax.axis("off")
    ax.margins(0.15)  # Add margins for better label visibility
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

    # 1) Load database with metadata
    db_texts, db_labels, db_genres, db_titles, db_metadata = load_database(db_root)

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

        # Create detailed similarity data for this input with comprehensive metadata
        input_similarities = []
        for j in order:  # Show ALL matches, not just top k_neighbors
            file_meta = db_metadata[j]
            input_similarities.append({
                "database_file": db_labels[j],
                "genre": db_genres[j], 
                "title": db_titles[j],  # Novel title
                "folder_name": file_meta["folder_name"],
                "chapter_name": file_meta["chapter_name"],
                "display_name": file_meta["display_name"],
                "similarity": round(float(sims[j]) * 100, 2)  # Convert to percentage
            })
        
        # เพิ่มข้อมูลครบถ้วนของ top match
        top_novel_title = db_titles[top_idx]
        top_metadata = db_metadata[top_idx]
        
        rows.append({
            "input_doc": in_name,
            "input_similarities": input_similarities,
            "top_db_doc": top_db,
            "top_genre": top_genre,
            "top_novel_title": top_novel_title,
            "top_folder_name": top_metadata["folder_name"],
            "top_chapter_name": top_metadata["chapter_name"],
            "top_display_name": top_metadata["display_name"],
            "top_similarity": round(top_score, 4),
            "relation": relation,
            "genre_rank_json": json.dumps([{"genre": g, "mean": round(m,4), "max": round(mx,4)} for g,m,mx in genre_rank], ensure_ascii=False)
        })

    # 6) Overall rankings
    # 6.1 Which DB story is most similar (best match) across all inputs?
    best_by_db = S.max(axis=0)  # (N_db,)
    # สร้าง overall ranking พร้อม metadata ครบถ้วน
    db_overall_rank = []
    for j in range(len(db_labels)):
        file_meta = db_metadata[j]
        db_overall_rank.append({
            "db_doc": db_labels[j],
            "genre": db_genres[j],
            "title": db_titles[j],
            "folder_name": file_meta["folder_name"],
            "chapter_name": file_meta["chapter_name"],
            "display_name": file_meta["display_name"],
            "best_similarity": float(best_by_db[j])
        })
    db_overall_rank = sorted(db_overall_rank, key=lambda x: x["best_similarity"], reverse=True)
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

    # Table of per-input per-DB similarities with enhanced labels for heatmap
    # Create display labels for matrix axes
    db_display_labels = [meta["display_name"] for meta in db_metadata]
    input_display_labels = [label.replace('.txt', '').replace('_', ' ') for label in in_labels]
    
    sim_df = pd.DataFrame(S, index=input_display_labels, columns=db_display_labels)

    # 8) Save tables
    comp_csv = os.path.join(out_root, "comparison_table.csv")
    sim_csv = os.path.join(out_root, "similarity_matrix.csv")
    overall_json = os.path.join(out_root, "overall_ranking.json")

    comp_df.to_csv(comp_csv, index=False, encoding="utf-8-sig")
    sim_df.to_csv(sim_csv, encoding="utf-8-sig")
    # Create analysis_by_input structure (like in the image)
    analysis_by_input = []
    for row in rows:
        analysis_by_input.append({
            "input_name": row["input_doc"],
            "input_title": row["input_doc"].replace('.txt', '').replace('_', ' ').title(),
            "similarities": row["input_similarities"]
        })
    
    with open(overall_json, "w", encoding="utf-8") as f:
        json.dump({
            "analysis_by_input": analysis_by_input,
            "db_overall_rank_desc": "DB doc with highest similarity to any input (descending)",
            "db_overall_rank": db_overall_rank,
            "matrix_labels": {
                "input_labels": input_display_labels,
                "db_labels": db_display_labels,
                "db_metadata": db_metadata
            },
            "genre_rank_overall_desc": "Genres ranked by max similarity across inputs (then mean)",
            "genre_rank_overall": [
                {"genre": g, "mean": round(m,4), "max": round(mx,4)} for (g,m,mx) in genre_rank_overall
            ]
        }, f, ensure_ascii=False, indent=2)

    # 9) Visualizations with enhanced labels
    heatmap_path = os.path.join(out_root, "similarity_heatmap.png")
    plot_heatmap(S, db_display_labels, input_display_labels, "Cosine Similarity (Inputs vs Database)", heatmap_path)

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
        [{"db_doc": db_labels[j], "genre": db_genres[j], "title": db_titles[j], "best_similarity": float(best_by_db[j])}
         for j in range(len(db_labels))],
        key=lambda d: d["best_similarity"], reverse=True
    )
    for d in rank_db[:10]:
        lines.append(f"- {d['db_doc']} (title={d['title']}, genre={d['genre']}): {d['best_similarity']:.2f}")
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
