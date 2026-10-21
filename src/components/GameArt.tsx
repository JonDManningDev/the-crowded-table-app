import type { Art } from '../mock/data'

const palettes: Record<Art, string[]> = {
  azul: ['#e8bc80', '#19636b', '#ce6c49'],
  birds: ['#d7dfd0', '#f8f0de', '#b6744e'],
  rpg: ['#253c35', '#b18050', '#e3c28b'],
  social: ['#c17956', '#efe0b9', '#374d41'],
  rail: ['#e2c294', '#3f6058', '#a8513a'],
  forest: ['#8b9e81', '#355747', '#eadcb9'],
  mystery: ['#463c48', '#a88466', '#e7c699'],
}

export function GameArt({ type, className = '' }: { type: Art; className?: string }) {
  const [bg, one, two] = palettes[type]
  return (
    <div className={`game-art art-${type} ${className}`}>
      <svg viewBox="0 0 480 280" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="480" height="280" fill={bg}/>
        <circle cx="420" cy="30" r="160" fill={one} opacity=".12"/>
        <circle cx="40" cy="250" r="130" fill={two} opacity=".16"/>
        {type === 'azul' ? (
          <g transform="translate(20,-25) rotate(12 240 140)">
            {Array.from({ length: 35 }, (_, index) => (
              <g key={index} transform={`translate(${(index % 7) * 76},${Math.floor(index / 7) * 76})`}>
                <rect width="68" height="68" rx="3" fill={index % 3 ? '#f4ead7' : one}/>
                <path d="M34 5 44 24 63 34 44 44 34 63 24 44 5 34 24 24Z" fill={index % 3 ? two : '#e8c482'}/>
                <circle cx="34" cy="34" r="10" fill={index % 3 ? one : two}/>
              </g>
            ))}
          </g>
        ) : type === 'birds' ? (
          <g>
            <path d="M0 236Q100 190 220 215T480 195" stroke={one} strokeWidth="7" fill="none"/>
            {[0, 1, 2].map(index => (
              <g
                key={index}
                transform={`translate(${100 + index * 135} ${135 - index * 20}) rotate(${index * 8 - 12})`}
              >
                <ellipse rx="47" ry="31" fill={index % 2 ? '#658888' : two}/>
                <circle cx="32" cy="-27" r="23" fill={index % 2 ? '#658888' : two}/>
                <path d="m-34 10-55 38 18-47M53-30l22 9-23 4" fill={one}/>
                <path d="M-25-8Q13-25 20 12Q-9 24-25-8" fill={one}/>
                <circle cx="38" cy="-32" r="3" fill="#253c35"/>
                <path d="m-6 30-4 41m22-41 4 41" stroke="#5e5544" strokeWidth="3"/>
              </g>
            ))}
          </g>
        ) : type === 'rail' ? (
          <g>
            <path
              d="M-30 230Q90 90 215 145T510 55M-30 243Q90 103 215 158T510 68"
              fill="none"
              stroke={one}
              strokeWidth="4"
            />
            {Array.from({ length: 10 }, (_, index) => (
              <rect
                key={index}
                x={15 + index * 50}
                y={128 + Math.sin(index) * 45}
                width="34"
                height="12"
                rx="3"
                transform={`rotate(-12 ${15 + index * 50} 150)`}
                fill={two}
              />
            ))}
            <g transform="translate(190 65)">
              <rect width="110" height="70" rx="6" fill={one}/>
              <rect x="15" y="-35" width="45" height="40" rx="3" fill={one}/>
              <rect x="75" y="-24" width="15" height="30" fill={two}/>
              <circle cx="20" cy="72" r="16" fill={two}/>
              <circle cx="84" cy="72" r="16" fill={two}/>
              <rect x="23" y="-25" width="26" height="20" fill={bg}/>
            </g>
          </g>
        ) : type === 'forest' ? (
          <g>
            {[30, 105, 210, 325, 430].map((x, index) => (
              <g key={x} transform={`translate(${x} ${30 + index % 2 * 30})`}>
                <path d="M0 0-65 125h35l-50 55H80l-50-55h35Z" fill={index % 2 ? one : '#577660'}/>
                <path d="M0 135v90" stroke={two} strokeWidth="7"/>
              </g>
            ))}
            <circle cx="340" cy="48" r="22" fill={two}/>
          </g>
        ) : (
          <g transform="translate(235 140) rotate(-15)">
            <rect x="-160" y="-78" width="110" height="154" rx="10" fill={one} transform="rotate(-10)"/>
            <rect x="60" y="-72" width="105" height="146" rx="10" fill={two} transform="rotate(18)"/>
            <path d="m0-87 82 52v85L0 95-78 47v-82Z" fill={bg} stroke={two} strokeWidth="4"/>
            <path
              d="M0-87-40 20l122-55L0 95-40 20l-38 27L0-87 40 22-78-35M40 22 0 95"
              stroke={two}
              fill="none"
              strokeWidth="2"
            />
            <text x="0" y="16" fill={one} fontSize="40" textAnchor="middle" fontFamily="Georgia">
              {type === 'social' ? '?' : type === 'mystery' ? '♠' : '20'}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
