import os
import glob
import shutil

base = '/vercel/share/v0-project'

print("=== FULL DIRECTORY LISTING OF app/api/offers ===")
offers_api = os.path.join(base, 'app', 'api', 'offers')
if os.path.exists(offers_api):
    for root, dirs, files in os.walk(offers_api):
        level = root.replace(offers_api, '').count(os.sep)
        indent = ' ' * 2 * level
        print(f'{indent}{os.path.basename(root)}/')
        subindent = ' ' * 2 * (level + 1)
        for file in files:
            fpath = os.path.join(root, file)
            print(f'{subindent}{file}')
            with open(fpath, 'r', errors='ignore') as f:
                content = f.read()
            print(f'{subindent}  -> first 200 chars: {repr(content[:200])}')
else:
    print("app/api/offers does not exist at expected path")

print("\n=== SEARCHING ALL .ts FILES FOR pdfkit ===")
for ts_file in glob.glob(os.path.join(base, 'app', '**', '*.ts'), recursive=True):
    with open(ts_file, 'r', errors='ignore') as f:
        content = f.read()
    if 'pdfkit' in content or 'fontkit' in content:
        print(f"FOUND: {ts_file}")
        # Overwrite with clean content
        clean = "import { NextResponse } from 'next/server'\nexport async function GET() {\n  return NextResponse.json({ error: 'Not implemented' }, { status: 501 })\n}\n"
        with open(ts_file, 'w') as f:
            f.write(clean)
        print(f"  -> OVERWRITTEN with clean content")

print("\n=== REMOVING pdfkit/fontkit from node_modules/.pnpm ===")
pnpm_dir = os.path.join(base, 'node_modules', '.pnpm')
if os.path.exists(pnpm_dir):
    for entry in os.listdir(pnpm_dir):
        if 'pdfkit' in entry or 'fontkit' in entry:
            full_path = os.path.join(pnpm_dir, entry)
            print(f"Removing: {full_path}")
            shutil.rmtree(full_path, ignore_errors=True)
            print(f"  -> Removed")

print("\n=== CLEARING .next CACHE ===")
next_cache = os.path.join(base, '.next')
if os.path.exists(next_cache):
    shutil.rmtree(next_cache, ignore_errors=True)
    print(f"Removed {next_cache}")
else:
    print(".next does not exist")

print("\nDone!")
