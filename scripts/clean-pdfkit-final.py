#!/usr/bin/env python3
import os
import shutil
import subprocess

base_path = "/vercel/share/v0-project"
pnpm_path = os.path.join(base_path, "node_modules/.pnpm")

# Remove pdfkit and fontkit directories
bad_packages = [
    "pdfkit@0.13.0",
    "fontkit@1.9.0", 
    "pdfkit",
    "fontkit",
    "@swc"
]

for pkg in bad_packages:
    pkg_path = os.path.join(pnpm_path, pkg)
    if os.path.exists(pkg_path):
        print(f"Removing {pkg_path}")
        shutil.rmtree(pkg_path, ignore_errors=True)

# Remove .next build cache
next_cache = os.path.join(base_path, ".next")
if os.path.exists(next_cache):
    print(f"Removing {next_cache}")
    shutil.rmtree(next_cache, ignore_errors=True)

# Remove node_modules entirely to force reinstall without pdfkit
nm_path = os.path.join(base_path, "node_modules")
if os.path.exists(nm_path):
    print(f"Removing {nm_path}")
    shutil.rmtree(nm_path, ignore_errors=True)

print("Done! Packages and cache removed.")
print("pnpm will reinstall dependencies on next build without pdfkit/fontkit")
