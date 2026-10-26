"""Search repository for phrases requiring scientific correction."""

import os

KEYWORDS = [
    "0.9548",
    "multimodal deep learning",
    "satellite dataset",
    "real satellite",
    "real-time",
    "95% confidence",
    "best model",
    "significant improvement",
    "accept H1",
]

TARGET_DIRS = ["frontend", "docs", "src", "backend"]
TARGET_FILES = ["README.md"]

found = {kw: [] for kw in KEYWORDS}

def search_file(filepath):
    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            for idx, line in enumerate(f, 1):
                for kw in KEYWORDS:
                    if kw.lower() in line.lower():
                        found[kw].append((filepath, idx, line.strip()))
    except Exception as e:
        pass

for root_dir in TARGET_DIRS:
    for root, dirs, files in os.walk(root_dir):
        # Skip node_modules and .git
        if "node_modules" in root or ".git" in root or "dist" in root:
            continue
        for file in files:
            if file.endswith((".md", ".py", ".jsx", ".js", ".json", ".html", ".css")):
                search_file(os.path.join(root, file))

for tf in TARGET_FILES:
    if os.path.exists(tf):
        search_file(tf)

for kw, matches in found.items():
    print(f"=== Keyword: '{kw}' ({len(matches)} occurrences) ===")
    for path, line_no, text in matches[:10]:
        print(f"  {path}:{line_no} -> {text[:100]}")
    if len(matches) > 10:
        print(f"  ... and {len(matches) - 10} more occurrences")
    print()
