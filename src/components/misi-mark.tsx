export interface MisiMarkProps extends React.SVGProps<SVGSVGElement> {
  strokeWidth?: number
}

/**
 * The Misi logomark: an "M" drawn as a flowing wave with a coin
 * floating above it. Renders in `currentColor` so it can sit on the
 * gradient tile, in the footer, or anywhere else.
 */
export function MisiMark({ strokeWidth = 3, ...props }: MisiMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <circle cx="16" cy="9" r="2.4" fill="currentColor" />
      <path
        d="M5 23.5 C7 14.5 12 14.5 14 18.5 C15 20.5 17 20.5 18 18.5 C20 14.5 25 14.5 27 23.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  )
}
