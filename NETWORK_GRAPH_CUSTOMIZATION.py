# 🎨 Network Graph Customization Solutions

## A. ปรับความหนาของเส้น (Edge/Link) ให้บางลง

# ✅ แก้ไขใน /home/user/webapp/backend/novel_similarity_pipeline.py line 139:

# BEFORE (เส้นหนา):
widths = [2 + 6*G[u][v]["weight"] for u,v in G.edges()]

# AFTER (เส้นบาง):
widths = [0.5 + 2*G[u][v]["weight"] for u,v in G.edges()]  # เริ่มต้น 0.5px แทน 2px

# หรือสำหรับเส้นบางมาก:
widths = [0.3 + 1*G[u][v]["weight"] for u,v in G.edges()]  # เริ่มต้น 0.3px

## B. ย้ายป้ายชื่อ Node ให้ไปอยู่ด้านข้าง (ไม่ทับวงกลม)

# ✅ แก้ไขใน /home/user/webapp/backend/novel_similarity_pipeline.py line 143:

# BEFORE (ป้ายทับ Node):
nx.draw_networkx_labels(G, pos, font_size=8, ax=ax)

# AFTER (ป้ายข้าง Node):
# วิธี 1: เลื่อนตำแหน่ง label
label_pos = {}
for node, (x, y) in pos.items():
    if node in left_nodes:
        label_pos[node] = (x - 0.3, y)  # เลื่อนซ้าย
    else:
        label_pos[node] = (x + 0.3, y)  # เลื่อนขวา

nx.draw_networkx_labels(G, label_pos, font_size=8, ax=ax)

# วิธี 2: ใช้ bbox เพื่อไม่ให้ทับ
nx.draw_networkx_labels(G, pos, font_size=8, ax=ax, 
                       bbox=dict(boxstyle="round,pad=0.1", facecolor="white", alpha=0.8))

## C. Complete Improved Function

def plot_network_improved(edges: List[Tuple[str, str, float]], outpath: str, topk: int = 3):
    """
    Enhanced network visualization with thinner edges and side labels
    """
    # Keep only topk edges per input doc
    by_input: Dict[str, List[Tuple[str, str, float]]] = {}
    for a, b, w in edges:
        by_input.setdefault(a, []).append((a, b, w))
    pruned = []
    for a, lst in by_input.items():
        lst_sorted = sorted(lst, key=lambda x: x[2], reverse=True)[:topk]
        pruned.extend(lst_sorted)

    G = nx.Graph()
    for a, b, w in pruned:
        G.add_node(a, bipartite=0, kind="input")
        G.add_node(b, bipartite=1, kind="db")
        G.add_edge(a, b, weight=w)

    # Position: inputs on left, db on right
    left_nodes = [n for n, d in G.nodes(data=True) if d.get("kind") == "input"]
    right_nodes = [n for n, d in G.nodes(data=True) if d.get("kind") == "db"]
    pos_left = {n: (-1, i) for i, n in enumerate(sorted(left_nodes))}
    pos_right = {n: (1, i) for i, n in enumerate(sorted(right_nodes))}
    pos = {**pos_left, **pos_right}

    fig = plt.figure(figsize=(12, max(6, len(right_nodes) * 0.3 + len(left_nodes) * 0.3)))
    ax = fig.add_subplot(111)

    # Draw nodes
    nx.draw_networkx_nodes(G, pos, nodelist=left_nodes, node_size=800, 
                          node_shape="s", node_color='lightblue', ax=ax)
    nx.draw_networkx_nodes(G, pos, nodelist=right_nodes, node_size=700, 
                          node_shape="o", node_color='lightgreen', ax=ax)

    # ✅ Draw edges with THINNER lines
    widths = [0.5 + 2 * G[u][v]["weight"] for u, v in G.edges()]  # Much thinner
    nx.draw_networkx_edges(G, pos, width=widths, alpha=0.7, ax=ax)

    # ✅ Labels positioned to the SIDE of nodes
    label_pos = {}
    for node, (x, y) in pos.items():
        if node in left_nodes:
            label_pos[node] = (x - 0.4, y)  # Left side for input nodes
        else:
            label_pos[node] = (x + 0.4, y)  # Right side for database nodes

    nx.draw_networkx_labels(G, label_pos, font_size=9, ax=ax,
                           bbox=dict(boxstyle="round,pad=0.1", facecolor="white", alpha=0.9))

    ax.set_title("Input ↔ Database Network (top matches)", fontsize=14, pad=20)
    ax.axis("off")
    
    # Expand margins for better label visibility
    ax.margins(0.2)
    
    fig.tight_layout()
    fig.savefig(outpath, dpi=220, bbox_inches='tight')
    plt.close(fig)

## D. Quick Fix - Replace just the critical lines:

# In /home/user/webapp/backend/novel_similarity_pipeline.py:

# Line 139: Change edge thickness
# FROM: widths = [2 + 6*G[u][v]["weight"] for u,v in G.edges()]
# TO:   widths = [0.5 + 2*G[u][v]["weight"] for u,v in G.edges()]

# Line 143: Change label positioning  
# FROM: nx.draw_networkx_labels(G, pos, font_size=8, ax=ax)
# TO:   
label_pos = {node: (x-0.3 if node in left_nodes else x+0.3, y) for node, (x, y) in pos.items()}
nx.draw_networkx_labels(G, label_pos, font_size=8, ax=ax, 
                       bbox=dict(boxstyle="round,pad=0.1", facecolor="white", alpha=0.8))