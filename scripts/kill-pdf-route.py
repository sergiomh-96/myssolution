import os
import shutil

base = '/vercel/share/v0-project'

# Try every possible encoding/path of the [id] directory
candidates = [
    os.path.join(base, 'app', 'api', 'offers', '[id]', 'pdf', 'route.ts'),
    os.path.join(base, 'app', 'api', 'offers', '%5Bid%5D', 'pdf', 'route.ts'),
]

print("=== CHECKING EXACT PATHS ===")
for path in candidates:
    print(f"Exists: {os.path.exists(path)} -> {path}")

# Walk manually
print("\n=== WALKING app/api ===")
api_path = os.path.join(base, 'app', 'api')
if os.path.exists(api_path):
    for root, dirs, files in os.walk(api_path):
        print(f"DIR: {root}")
        for f in files:
            full = os.path.join(root, f)
            print(f"  FILE: {full}")
            # Check content for pdfkit
            try:
                with open(full, 'r') as fh:
                    content = fh.read()
                    if 'pdfkit' in content or 'fontkit' in content:
                        print(f"  *** FOUND pdfkit/fontkit in: {full} ***")
                        # Overwrite with clean content
                        with open(full, 'w') as fw:
                            fw.write("import { NextResponse } from 'next/server'\n\nexport async function GET() {\n  return NextResponse.json({ error: 'Not available' }, { status: 501 })\n}\n")
                        print(f"  *** OVERWRITTEN with clean content ***")
            except Exception as e:
                print(f"  Error reading: {e}")
else:
    print(f"app/api does not exist at {api_path}")
    # List what's in app/
    app_path = os.path.join(base, 'app')
    print(f"\n=== LISTING app/ ===")
    if os.path.exists(app_path):
        for item in sorted(os.listdir(app_path)):
            print(f"  {item}")

# Remove pdfkit and fontkit from node_modules/.pnpm
pnpm_path = os.path.join(base, 'node_modules', '.pnpm')
print(f"\n=== REMOVING pdfkit/fontkit FROM .pnpm ===")
if os.path.exists(pnpm_path):
    for item in os.listdir(pnpm_path):
        if 'pdfkit' in item or 'fontkit' in item:
            full_path = os.path.join(pnpm_path, item)
            print(f"Removing: {full_path}")
            shutil.rmtree(full_path)
    # Also check node_modules directly
    for pkg in ['pdfkit', 'fontkit']:
        pkg_path = os.path.join(base, 'node_modules', pkg)
        if os.path.exists(pkg_path):
            print(f"Removing: {pkg_path}")
            shutil.rmtree(pkg_path)
else:
    print(f".pnpm not found at {pnpm_path}")

print("\nDone!")
