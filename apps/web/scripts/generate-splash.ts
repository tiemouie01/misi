/**
 * Renders the iOS launch screens listed in src/lib/splash-screens.ts into
 * public/splash: the app icon centred on the app's background colour.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'
import {
  SPLASH_BACKGROUNDS,
  SPLASH_SCREENS,
} from '../src/lib/splash-screens.ts'

const ICON_PT = 112
const root = new URL('..', import.meta.url)
const icon = readFileSync(new URL('scripts/icon-square.svg', root), 'utf8')
const outDir = new URL('public/splash/', root)
mkdirSync(outDir, { recursive: true })

for (const { width, height, dpr, scheme, href } of SPLASH_SCREENS) {
  const w = width * dpr
  const h = height * dpr
  const size = ICON_PT * dpr
  const x = (w - size) / 2
  const y = (h - size) / 2
  const tile = icon.replace(
    /<svg[^>]*>/,
    `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 64 64">`,
  )
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <clipPath id="c"><rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${size * 0.225}"/></clipPath>
  <rect width="100%" height="100%" fill="${SPLASH_BACKGROUNDS[scheme]}"/>
  <g clip-path="url(#c)">${tile}</g>
</svg>`
  const png = new Resvg(svg).render().asPng()
  writeFileSync(new URL(`public${href}`, root), png)
}

console.log(`Generated ${SPLASH_SCREENS.length} splash screens.`)
