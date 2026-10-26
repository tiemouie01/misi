import { cn } from '#/lib/utils'

/** A wave line at height `y` with amplitude `amp`, repeating every `period`
 * units up to `width`. Given `bottom`, it closes into a shape filled down to
 * that height. */
function wavePath(
  y: number,
  amp: number,
  period: number,
  width: number,
  bottom?: number,
) {
  let d = `M0 ${y} Q${period / 4} ${y - 2 * amp} ${period / 2} ${y}`
  for (let x = period; x <= width; x += period / 2) d += ` T${x} ${y}`
  return bottom === undefined ? d : `${d} V${bottom} H0 Z`
}

const BAND_H = 220
const BACK = wavePath(40, 12, 720, 2880, BAND_H)
const CREST = wavePath(40, 12, 720, 2880)
const FRONT = wavePath(110, 20, 1440, 2880, BAND_H)
const DIVIDER = wavePath(13, 5, 720, 1440)

/** Two slow waves along the bottom of the screen, behind everything on the
 * teal ground. Each SVG is twice the screen's width and drifts by half. */
export function WaterWaves() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-0 -z-1 h-[220px] overflow-hidden"
    >
      <svg
        viewBox={`0 0 2880 ${BAND_H}`}
        preserveAspectRatio="none"
        className="water-drift-slow absolute bottom-0 left-0 h-full w-[200%] will-change-transform"
      >
        <path d={BACK} className="fill-(--wave-back)" />
        <path
          d={CREST}
          className="fill-none stroke-(--wave-crest)"
          strokeWidth={2}
        />
      </svg>
      <svg
        viewBox={`0 0 2880 ${BAND_H}`}
        preserveAspectRatio="none"
        className="water-drift absolute bottom-0 left-0 h-full w-[200%] will-change-transform"
      >
        <path d={FRONT} className="fill-(--wave-front)" />
      </svg>
    </div>
  )
}

/** A still wave line between the page's main number and its cards. */
export function WaveDivider({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1440 26"
      preserveAspectRatio="none"
      className={cn('block h-[26px] w-full', className)}
    >
      <path
        d={DIVIDER}
        className="fill-none stroke-(--wave-line)"
        strokeWidth={2}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
