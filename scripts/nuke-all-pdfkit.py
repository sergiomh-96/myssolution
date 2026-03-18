import shutil
import os
import sys
from pathlib import Path

base_path = Path('/vercel/share/v0-project')

# Find and delete entire [id] folder (any folder in app/api/offers that's dynamic)
offers_api_path = base_path / 'app' / 'api' / 'offers'
if offers_api_path.exists():
    for item in offers_api_path.iterdir():
        if item.is_dir() and '[' in item.name:
            print(f"[v0] Removing {item}")
            shutil.rmtree(item)
        elif item.is_file() and 'pdf' in item.name:
            print(f"[v0] Removing {item}")
            item.unlink()

# Remove pdfkit and fontkit from node_modules
pdfkit_paths = [
    base_path / 'node_modules' / '.pnpm' / 'pdfkit@0.13.0',
    base_path / 'node_modules' / '.pnpm' / 'fontkit@1.9.0',
    base_path / 'node_modules' / 'pdfkit',
    base_path / 'node_modules' / 'fontkit',
]

for path in pdfkit_paths:
    if path.exists():
        print(f"[v0] Removing {path}")
        shutil.rmtree(path)

# Clear Turbopack cache
cache_paths = [
    base_path / '.next' / 'cache',
    base_path / '.turbo',
]

for path in cache_paths:
    if path.exists():
        print(f"[v0] Removing cache {path}")
        shutil.rmtree(path)

print("[v0] ✓ Cleanup complete")
