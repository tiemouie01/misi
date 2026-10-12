/**
 * iOS ignores the manifest when launching a home-screen app and shows a blank
 * screen unless it finds an `apple-touch-startup-image` whose size matches the
 * device exactly. These are the iPhone screens (portrait, CSS px) we ship one
 * for; scripts/generate-splash.ts renders them at build time.
 */
const IPHONE_SCREENS = [
  [440, 956, 3], // 16/17 Pro Max
  [420, 912, 3], // Air
  [402, 874, 3], // 16 Pro, 17, 17 Pro
  [430, 932, 3], // 14 Pro Max, 15 Plus/Pro Max, 16 Plus
  [393, 852, 3], // 14 Pro, 15, 15 Pro, 16
  [428, 926, 3], // 12/13 Pro Max, 14 Plus
  [390, 844, 3], // 12, 13, 14, 16e
  [375, 812, 3], // X, XS, 11 Pro, 12/13 mini
  [414, 896, 3], // XS Max, 11 Pro Max
  [414, 896, 2], // XR, 11
  [414, 736, 3], // 6/7/8 Plus
  [375, 667, 2], // 6/7/8, SE 2/3
  [320, 568, 2], // SE 1
] as const

export const SPLASH_BACKGROUNDS = { light: '#e7f3ec', dark: '#0a1418' }

export const SPLASH_SCREENS = IPHONE_SCREENS.flatMap(([width, height, dpr]) =>
  (['light', 'dark'] as const).map((scheme) => ({
    width,
    height,
    dpr,
    scheme,
    href: `/splash/${width * dpr}x${height * dpr}-${scheme}.png`,
    media: `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait) and (prefers-color-scheme: ${scheme})`,
  })),
)
