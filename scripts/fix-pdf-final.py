import os
import glob

base = '/vercel/share/v0-project'

# Find the actual pdf route file - search exhaustively
print("Searching for pdf route files...")
for root, dirs, files in os.walk(base):
    for f in files:
        if 'pdf' in f.lower() and f.endswith('.ts'):
            full_path = os.path.join(root, f)
            print(f"Found: {full_path}")
            with open(full_path, 'r') as fh:
                content = fh.read()
            print(f"Content preview: {content[:200]}")
            if 'pdfkit' in content or 'fontkit' in content:
                print(f"FIXING: {full_path}")
                with open(full_path, 'w') as fh:
                    fh.write("import { NextResponse } from 'next/server'\n\nexport async function GET() {\n  return NextResponse.json({ error: 'Not available' }, { status: 501 })\n}\n")
                print(f"Fixed: {full_path}")

# Also list everything under app/api/offers
print("\nListing app/api/offers directory:")
offers_path = os.path.join(base, 'app', 'api', 'offers')
if os.path.exists(offers_path):
    for root, dirs, files in os.walk(offers_path):
        for f in files:
            fp = os.path.join(root, f)
            print(f"  {fp}")
else:
    print(f"  {offers_path} does not exist")

# Also check pdfkit in node_modules
print("\nSearching for pdfkit in node_modules...")
nm = os.path.join(base, 'node_modules', '.pnpm')
if os.path.exists(nm):
    for entry in os.listdir(nm):
        if 'pdfkit' in entry or 'fontkit' in entry:
            print(f"  Found: {entry}")
            full = os.path.join(nm, entry)
            import shutil
            shutil.rmtree(full, ignore_errors=True)
            print(f"  Removed: {full}")
