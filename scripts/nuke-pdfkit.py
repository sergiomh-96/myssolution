import os
import shutil

base = '/vercel/share/v0-project'

# 1. Remove entire app/api/offers/[id] directory (contains the broken pdf route)
pdf_dir = os.path.join(base, 'app', 'api', 'offers', '[id]')
if os.path.exists(pdf_dir):
    shutil.rmtree(pdf_dir)
    print(f"Deleted directory: {pdf_dir}")
else:
    print(f"Directory not found: {pdf_dir}")

# 2. Clear the Next.js Turbopack/webpack cache
cache_paths = [
    os.path.join(base, '.next', 'cache'),
    os.path.join(base, '.next', 'server'),
    os.path.join(base, '.next', 'static'),
]
for path in cache_paths:
    if os.path.exists(path):
        shutil.rmtree(path)
        print(f"Deleted cache: {path}")
    else:
        print(f"Cache path not found: {path}")

# 3. Remove pdfkit and fontkit from node_modules
for pkg in ['pdfkit', 'fontkit']:
    pkg_paths = []
    # Check direct node_modules
    direct = os.path.join(base, 'node_modules', pkg)
    if os.path.exists(direct):
        pkg_paths.append(direct)
    # Check pnpm node_modules
    pnpm_base = os.path.join(base, 'node_modules', '.pnpm')
    if os.path.exists(pnpm_base):
        for entry in os.listdir(pnpm_base):
            if entry.startswith(pkg):
                pkg_paths.append(os.path.join(pnpm_base, entry))

    for p in pkg_paths:
        shutil.rmtree(p)
        print(f"Removed: {p}")
    if not pkg_paths:
        print(f"Package not found in node_modules: {pkg}")

print("Done!")
