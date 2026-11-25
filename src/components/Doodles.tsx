import type { SVGProps } from 'react'

type DoodleProps = SVGProps<SVGSVGElement>

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function Star({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return <path d={`M${x} ${y - 7 * s} L${x + 2 * s} ${y - 2 * s} L${x + 7 * s} ${y} L${x + 2 * s} ${y + 2 * s} L${x} ${y + 7 * s} L${x - 2 * s} ${y + 2 * s} L${x - 7 * s} ${y} L${x - 2 * s} ${y - 2 * s} Z`} />
}

export function DoodleMelon(props: DoodleProps) {
  return (
    <svg viewBox="0 0 200 200" className={`doodle ${props.className || ''}`} {...stroke} aria-hidden="true">
      <path d="M26 126 A74 74 0 0 0 174 126 Z" />
      <path d="M38 126 A62 62 0 0 0 162 126" />
      <path d="M60 98 q4 -5 8 0 M92 112 q4 -5 8 0 M124 94 q4 -5 8 0 M142 116 q4 -5 8 0 M78 122 q4 -5 8 0" />
      <path d="M44 44 l10 -8 M156 50 l10 8 M160 28 l-2 12" />
      <Star x={36} y={62} s={1.1} />
      <Star x={168} y={78} s={0.8} />
      <circle cx="52" cy="82" r="2.4" />
      <circle cx="150" cy="34" r="2" />
      <path d="M18 150 q14 -8 26 0 M158 154 q12 -7 22 0" />
      <path d="M96 30 a10 10 0 0 1 12 12" />
    </svg>
  )
}

export function DoodleShapes(props: DoodleProps) {
  return (
    <svg viewBox="0 0 200 200" className={`doodle ${props.className || ''}`} {...stroke} aria-hidden="true">
      <circle cx="58" cy="56" r="24" />
      <path d="M106 34 L142 92 L70 92 Z" />
      <rect x="116" y="112" width="46" height="46" rx="4" />
      <path d="M24 128 Q52 104 82 128 Q52 150 24 128 Z" />
      <circle cx="53" cy="128" r="7" />
      <path d="M96 164 q10 -16 20 0 t20 0 t20 0" />
      <path d="M150 40 l10 10 M160 40 l-10 10" />
      <path d="M32 28 l0 12 M26 34 l12 0" />
      <circle cx="176" cy="86" r="2.5" />
      <circle cx="96" cy="60" r="2" />
      <path d="M78 22 a8 8 0 0 1 10 10" />
      <path d="M14 166 q8 -6 14 0" />
    </svg>
  )
}

export function DoodleBolt(props: DoodleProps) {
  return (
    <svg viewBox="0 0 200 200" className={`doodle ${props.className || ''}`} {...stroke} aria-hidden="true">
      <path d="M62 44 C104 22 152 48 150 94 C149 126 128 158 88 166" />
      <path d="M62 44 C46 66 44 104 58 128" />
      <path d="M104 58 L76 108 L102 106 L84 152 L134 96 L108 98 L126 58 Z" />
      <path d="M34 76 l-16 -6 M36 100 l-18 2 M42 124 l-16 10" />
      <path d="M158 118 l16 -8 M156 140 l16 2 M146 158 l12 10" />
      <path d="M70 176 q16 8 34 0" />
      <circle cx="118" cy="38" r="2.4" />
      <circle cx="24" cy="52" r="2" />
      <Star x={172} y={58} s={0.9} />
    </svg>
  )
}

export function DoodleNight(props: DoodleProps) {
  return (
    <svg viewBox="0 0 200 200" className={`doodle ${props.className || ''}`} {...stroke} aria-hidden="true">
      <path d="M112 26 A62 62 0 1 0 158 132 A50 50 0 1 1 112 26 Z" />
      <path d="M132 44 q18 6 24 24" />
      <rect x="34" y="116" width="52" height="42" rx="7" />
      <path d="M46 116 l-8 -14 M74 116 l8 -14" />
      <path d="M50 132 h20 M50 142 h12" />
      <circle cx="78" cy="146" r="3" />
      <Star x={40} y={52} s={1.1} />
      <Star x={172} y={92} s={0.9} />
      <Star x={100} y={168} s={0.7} />
      <circle cx="146" cy="164" r="2.2" />
      <path d="M18 82 q8 -6 16 0 M164 40 q8 -6 16 0" />
      <path d="M22 174 q12 -8 22 0" />
    </svg>
  )
}

export function DoodleSearch(props: DoodleProps) {
  return (
    <svg viewBox="0 0 200 200" className={`doodle ${props.className || ''}`} {...stroke} aria-hidden="true">
      <circle cx="86" cy="84" r="44" />
      <path d="M118 116 L158 156" />
      <path d="M64 78 q22 -20 44 0" />
      <path d="M68 96 q18 14 36 0" />
      <path d="M30 40 l10 -8 M164 46 l10 8" />
      <Star x={158} y={30} s={0.9} />
      <circle cx="34" cy="150" r="2.4" />
      <path d="M146 170 q12 -8 22 0" />
    </svg>
  )
}
