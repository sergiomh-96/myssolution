import { rmSync, existsSync } from 'fs'
import { resolve } from 'path'

const packagesToRemove = [
  'pdfkit',
  'fontkit',
]

const nodeModulesPath = resolve(process.cwd(), 'node_modules/.pnpm')

for (const pkg of packagesToRemove) {
  // Find all matching folders in .pnpm
  try {
    const { readdirSync } = await import('fs')
    const dirs = readdirSync(nodeModulesPath).filter(d => d.startsWith(pkg + '@'))
    for (const dir of dirs) {
      const fullPath = resolve(nodeModulesPath, dir)
      console.log(`Removing: ${fullPath}`)
      rmSync(fullPath, { recursive: true, force: true })
    }
  } catch (e) {
    console.log(`Could not process ${pkg}:`, e.message)
  }
}

// Also remove direct node_modules entries
const directPaths = [
  resolve(process.cwd(), 'node_modules/pdfkit'),
  resolve(process.cwd(), 'node_modules/fontkit'),
]

for (const p of directPaths) {
  if (existsSync(p)) {
    console.log(`Removing direct: ${p}`)
    rmSync(p, { recursive: true, force: true })
  } else {
    console.log(`Not found (ok): ${p}`)
  }
}

// Also clear Turbopack cache
const turboCachePath = resolve(process.cwd(), '.next/cache')
if (existsSync(turboCachePath)) {
  console.log(`Clearing Next.js cache: ${turboCachePath}`)
  rmSync(turboCachePath, { recursive: true, force: true })
  console.log('Cache cleared successfully')
} else {
  console.log('No .next/cache found')
}

console.log('Done! pdfkit and fontkit removed from node_modules, Next.js cache cleared.')
