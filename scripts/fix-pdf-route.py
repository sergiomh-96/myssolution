import os

# Path to the problematic file
path = "/vercel/share/v0-project/app/api/offers/[id]/pdf/route.ts"

# Check if directory exists
dir_path = os.path.dirname(path)
print(f"Directory exists: {os.path.exists(dir_path)}")
print(f"File exists: {os.path.exists(path)}")

# List all files in the [id] directory
id_dir = "/vercel/share/v0-project/app/api/offers/[id]"
if os.path.exists(id_dir):
    print(f"Files in [id] dir:")
    for root, dirs, files in os.walk(id_dir):
        for f in files:
            print(f"  {os.path.join(root, f)}")

# Write clean content to the file (overwrite if exists, create if not)
clean_content = """import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ error: 'PDF generation not available' }, { status: 501 })
}
"""

os.makedirs(dir_path, exist_ok=True)
with open(path, 'w') as f:
    f.write(clean_content)

print(f"\nFile written successfully")
print(f"File size: {os.path.getsize(path)} bytes")

# Verify content
with open(path, 'r') as f:
    content = f.read()
print(f"File content:\n{content}")
