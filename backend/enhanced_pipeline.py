"""
Enhanced Novel Similarity Pipeline with Thai Language Support
Extended version of the original pipeline with additional features
"""

import os
import sys
import re
import json
import glob
import math
import string
import argparse
from typing import List, Dict, Tuple, Optional
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import networkx as nx
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Thai language support
try:
    from pythainlp import word_tokenize
    from pythainlp.corpus import thai_stopwords
    THAI_SUPPORT = True
    print("✅ Thai language support (pythainlp) is available")
except ImportError:
    THAI_SUPPORT = False
    print("⚠️  Thai language support (pythainlp) is not available")

# Import original functions
from novel_similarity_pipeline import (
    read_txt, 
    make_vectorizer,
    annotate_heatmap,
    plot_heatmap, 
    plot_network,
    classify_relation
)

# ---------------------------
# Enhanced Text Processing
# ---------------------------

def detect_language(text: str) -> str:
    """
    Simple language detection for Thai vs other languages
    """
    thai_chars = sum(1 for c in text if '\u0e00' <= c <= '\u0e7f')
    total_chars = len([c for c in text if c.isalpha()])
    
    if total_chars == 0:
        return 'unknown'
    
    thai_ratio = thai_chars / total_chars
    return 'thai' if thai_ratio > 0.3 else 'other'

def enhanced_preprocess(text: str, language: str = 'auto') -> str:
    """
    Enhanced preprocessing with Thai language support
    
    Args:
        text: Input text
        language: 'auto', 'thai', or 'other'
    
    Returns:
        Preprocessed text
    """
    if language == 'auto':
        language = detect_language(text)
    
    # Basic cleaning
    text = text.replace("\n", " ").replace("\r", " ")
    text = re.sub(r"\s+", " ", text).strip()
    
    if language == 'thai' and THAI_SUPPORT:
        return preprocess_thai_text(text)
    else:
        return preprocess_general_text(text)

def preprocess_thai_text(text: str) -> str:
    """
    Preprocess Thai text using pythainlp
    """
    try:
        # Tokenize Thai text
        tokens = word_tokenize(text, engine='newmm')
        
        # Get Thai stopwords
        stop_words = set(thai_stopwords())
        
        # Filter tokens
        processed_tokens = []
        for token in tokens:
            # Remove whitespace-only tokens
            token = token.strip()
            if len(token) == 0:
                continue
            
            # Remove stopwords
            if token in stop_words:
                continue
            
            # Remove punctuation-only tokens
            if all(c in string.punctuation for c in token):
                continue
            
            # Keep meaningful tokens
            if len(token) >= 1:  # Keep single character tokens for Thai
                processed_tokens.append(token.lower())
        
        return ' '.join(processed_tokens)
        
    except Exception as e:
        print(f"Thai processing failed: {e}, falling back to simple processing")
        return preprocess_general_text(text)

def preprocess_general_text(text: str) -> str:
    """
    Preprocess general (non-Thai) text
    """
    # Convert to lowercase
    text = text.lower()
    
    # Remove punctuation
    text = text.translate(str.maketrans("", "", string.punctuation))
    
    # Collapse multiple spaces
    text = re.sub(r"\s+", " ", text).strip()
    
    return text

def make_enhanced_vectorizer(language: str = 'auto') -> TfidfVectorizer:
    """
    Create TfidfVectorizer optimized for the detected language
    """
    if language == 'thai' and THAI_SUPPORT:
        # Thai-optimized settings
        return TfidfVectorizer(
            token_pattern=r'\S+',  # Thai tokens can be single characters
            min_df=1, 
            max_df=0.95,
            ngram_range=(1, 2),  # Include bigrams for better Thai understanding
            max_features=10000
        )
    else:
        # General/English settings
        return TfidfVectorizer(
            token_pattern=r"\b\w+\b", 
            min_df=1, 
            max_df=0.95,
            ngram_range=(1, 2),
            max_features=10000
        )

# ---------------------------
# Enhanced Database Loading
# ---------------------------

def load_database_enhanced(db_root: str, max_files_per_genre: int = 10) -> Tuple[List[str], List[str], List[str], str]:
    """
    Enhanced database loading with language detection
    
    Returns: texts, labels, genres, detected_language
    """
    texts, labels, genres = [], [], []
    all_text_sample = ""
    
    if not os.path.isdir(db_root):
        raise SystemExit(f"Database folder not found: {db_root}")
    
    genre_dirs = sorted([d for d in os.listdir(db_root) if os.path.isdir(os.path.join(db_root, d))])
    if not genre_dirs:
        raise SystemExit(f"No genre subfolders inside {db_root}. Expected: {db_root}/<genre>/*.txt")
    
    for g in genre_dirs:
        gpath = os.path.join(db_root, g)
        files = sorted(glob.glob(os.path.join(gpath, "**", "*.txt"), recursive=True))
        files = files[:max_files_per_genre]
        
        for p in files:
            raw_text = read_txt(p)
            all_text_sample += raw_text[:1000]  # Sample for language detection
            
            labels.append(os.path.basename(p))
            genres.append(g)
            texts.append(raw_text)  # Store raw text, will preprocess later
    
    if not texts:
        raise SystemExit("No .txt files found in the database.")
    
    # Detect language from sample
    detected_language = detect_language(all_text_sample)
    print(f"🔍 Detected language: {detected_language}")
    
    # Preprocess all texts with detected language
    processed_texts = [enhanced_preprocess(text, detected_language) for text in texts]
    
    return processed_texts, labels, genres, detected_language

def load_inputs_enhanced(input_root: str, language: str = 'auto', max_files: int = 5) -> Tuple[List[str], List[str]]:
    """
    Enhanced input loading with language-aware preprocessing
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
    
    # Read and preprocess texts
    raw_texts = [read_txt(p) for p in files]
    
    # If language is auto, detect from first file
    if language == 'auto' and raw_texts:
        language = detect_language(raw_texts[0])
    
    processed_texts = [enhanced_preprocess(text, language) for text in raw_texts]
    names = [os.path.basename(p) for p in files]
    
    return processed_texts, names

# ---------------------------
# Enhanced Pipeline
# ---------------------------

def run_enhanced_pipeline(db_root: str, input_root: str, out_root: str,
                         k_neighbors: int = 3,
                         dup_threshold: float = 0.90,
                         similar_threshold: float = 0.60,
                         max_files_per_genre: int = 10):
    """
    Enhanced similarity analysis pipeline with Thai language support
    """
    print("🚀 Starting Enhanced Novel Similarity Analysis")
    
    os.makedirs(out_root, exist_ok=True)

    # 1) Load database with language detection
    print("📚 Loading database...")
    db_texts, db_labels, db_genres, detected_language = load_database_enhanced(
        db_root, max_files_per_genre
    )
    print(f"📊 Loaded {len(db_texts)} documents from {len(set(db_genres))} genres")

    # 2) Load inputs with same language setting
    print("📝 Loading input files...")
    in_texts, in_labels = load_inputs_enhanced(input_root, detected_language, max_files=5)
    print(f"🎯 Loaded {len(in_texts)} input files")

    # 3) Create language-appropriate vectorizer
    print("🔧 Creating vectorizer...")
    vec = make_enhanced_vectorizer(detected_language)
    
    # 4) Vectorize texts
    print("🧮 Vectorizing texts...")
    X_db = vec.fit_transform(db_texts)
    X_in = vec.transform(in_texts)
    print(f"📈 Feature matrix: {X_db.shape} (database), {X_in.shape} (inputs)")

    # 5) Calculate similarities
    print("⚖️  Calculating similarities...")
    S = cosine_similarity(X_in, X_db)

    # 6) Analyze results (same as original)
    print("🎯 Analyzing results...")
    rows = []
    edges = []
    
    for i, in_name in enumerate(in_labels):
        sims = S[i]
        order = np.argsort(-sims)
        top_idx = order[0]
        top_score = float(sims[top_idx])
        top_db = db_labels[top_idx]
        top_genre = db_genres[top_idx]
        relation = classify_relation(top_score, dup_threshold, similar_threshold)

        # Store edges for network
        for j in order[:k_neighbors]:
            edges.append((in_name, db_labels[j], float(sims[j])))

        # Genre analysis
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
            "language": detected_language,
            "genre_rank_json": json.dumps([
                {"genre": g, "mean": round(m,4), "max": round(mx,4)} 
                for g,m,mx in genre_rank
            ], ensure_ascii=False)
        })

    # 7) Overall rankings
    best_by_db = S.max(axis=0)
    
    # Genre overlap analysis
    genre_overlap = {}
    for g in sorted(set(db_genres)):
        cols = [k for k, gg in enumerate(db_genres) if gg == g]
        sub = S[:, cols]
        genre_overlap[g] = {
            "mean_over_all": float(np.mean(sub)),
            "max_over_all": float(np.max(sub)),
        }
    
    genre_rank_overall = sorted([
        (g, v["mean_over_all"], v["max_over_all"]) 
        for g,v in genre_overlap.items()
    ], key=lambda x: x[2], reverse=True)

    # 8) Create DataFrames and save results
    print("💾 Saving results...")
    comp_df = pd.DataFrame(rows)
    
    # Expand genre_rank_json for readability
    def format_top_genres(gen_json):
        try:
            data = json.loads(gen_json)
            data = data[:3]
            return "; ".join([f'{d["genre"]}(max={d["max"]:.2f})' for d in data])
        except:
            return "N/A"

    if not comp_df.empty:
        comp_df["genre_top3"] = comp_df["genre_rank_json"].apply(format_top_genres)

    # Similarity matrix
    sim_df = pd.DataFrame(S, index=in_labels, columns=db_labels)

    # Save files
    comp_csv = os.path.join(out_root, "comparison_table.csv")
    sim_csv = os.path.join(out_root, "similarity_matrix.csv")
    overall_json = os.path.join(out_root, "overall_ranking.json")

    comp_df.to_csv(comp_csv, index=False, encoding="utf-8-sig")
    sim_df.to_csv(sim_csv, encoding="utf-8-sig")
    
    with open(overall_json, "w", encoding="utf-8") as f:
        json.dump({
            "analysis_info": {
                "detected_language": detected_language,
                "thai_support_available": THAI_SUPPORT,
                "total_db_documents": len(db_texts),
                "total_input_files": len(in_texts),
                "genres": list(set(db_genres))
            },
            "db_overall_rank": sorted([
                {
                    "db_doc": db_labels[j], 
                    "genre": db_genres[j], 
                    "best_similarity": float(best_by_db[j])
                }
                for j in range(len(db_labels))
            ], key=lambda d: d["best_similarity"], reverse=True),
            "genre_rank_overall": [
                {"genre": g, "mean": round(m,4), "max": round(mx,4)} 
                for (g,m,mx) in genre_rank_overall
            ]
        }, f, ensure_ascii=False, indent=2)

    # 9) Generate visualizations
    print("📊 Generating visualizations...")
    heatmap_path = os.path.join(out_root, "similarity_heatmap.png")
    plot_heatmap(S, db_labels, in_labels, 
                f"Cosine Similarity ({detected_language.title()} Text Analysis)", 
                heatmap_path)

    network_path = os.path.join(out_root, "network_top_matches.png")
    plot_network(edges, network_path, topk=k_neighbors)

    # 10) Enhanced text report
    report_path = os.path.join(out_root, "report.txt")
    lines = []
    lines.append("# Enhanced Similarity Analysis Report\n")
    lines.append(f"## Analysis Information")
    lines.append(f"- Detected Language: {detected_language.title()}")
    lines.append(f"- Thai Support Available: {'Yes' if THAI_SUPPORT else 'No'}")
    lines.append(f"- Database Documents: {len(db_texts)}")
    lines.append(f"- Input Files: {len(in_texts)}")
    lines.append(f"- Genres: {', '.join(sorted(set(db_genres)))}")
    lines.append("")
    
    lines.append("## Per-input Analysis\n")
    for _, row in comp_df.iterrows():
        lines.append(f"- **{row['input_doc']}**")
        lines.append(f"  - Most similar: {row['top_db_doc']} (genre: {row['top_genre']})")
        lines.append(f"  - Similarity score: {row['top_similarity']:.3f}")
        lines.append(f"  - Relationship: {row['relation']}")
        lines.append(f"  - Top genres: {row['genre_top3']}")
        lines.append("")

    lines.append("\n## Database Document Ranking\n")
    db_rank = sorted([
        {"db_doc": db_labels[j], "genre": db_genres[j], "best_similarity": float(best_by_db[j])}
        for j in range(len(db_labels))
    ], key=lambda d: d["best_similarity"], reverse=True)
    
    for i, d in enumerate(db_rank[:10], 1):
        lines.append(f"{i:2d}. {d['db_doc']} (genre: {d['genre']}) - {d['best_similarity']:.3f}")

    lines.append("\n## Genre Overlap Ranking\n")
    for i, (g, m, mx) in enumerate(genre_rank_overall, 1):
        lines.append(f"{i:2d}. {g}: max={mx:.3f}, mean={m:.3f}")

    with open(report_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print("✅ Analysis completed successfully!")
    
    return {
        "comparison_table": comp_csv,
        "similarity_matrix": sim_csv,
        "overall_ranking": overall_json,
        "heatmap": heatmap_path,
        "network": network_path,
        "report": report_path,
        "analysis_info": {
            "detected_language": detected_language,
            "thai_support": THAI_SUPPORT,
            "total_documents": len(db_texts),
            "total_inputs": len(in_texts)
        }
    }

def main():
    """Enhanced main function with additional options"""
    parser = argparse.ArgumentParser(
        description="Enhanced Novel Similarity Analysis with Thai Language Support"
    )
    parser.add_argument("--db", default="./db", 
                       help="Database root folder (expects ./db/<genre>/*.txt)")
    parser.add_argument("--inputs", default="./input", 
                       help="Input folder with .txt files to compare")
    parser.add_argument("--out", default="./output", 
                       help="Output folder")
    parser.add_argument("--topk", type=int, default=3, 
                       help="Top-K neighbors for analysis")
    parser.add_argument("--dup_threshold", type=float, default=0.90, 
                       help="Duplicate threshold (cosine similarity)")
    parser.add_argument("--similar_threshold", type=float, default=0.60, 
                       help="Similar threshold (cosine similarity)")
    parser.add_argument("--max_files_per_genre", type=int, default=10,
                       help="Maximum files to load per genre")
    
    args = parser.parse_args()

    try:
        results = run_enhanced_pipeline(
            db_root=args.db,
            input_root=args.inputs,
            out_root=args.out,
            k_neighbors=args.topk,
            dup_threshold=args.dup_threshold,
            similar_threshold=args.similar_threshold,
            max_files_per_genre=args.max_files_per_genre
        )
        
        print("\n📋 Generated Files:")
        for key, path in results.items():
            if key != "analysis_info" and os.path.exists(path):
                print(f"  - {key}: {path}")
        
        return results
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()