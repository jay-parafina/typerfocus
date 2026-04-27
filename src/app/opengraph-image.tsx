import { ImageResponse } from 'next/og';

export const alt = 'TyperFocus — E-learning, rebuilt for neurodivergent minds.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const FONT_STACK =
  "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#323437',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          fontFamily: FONT_STACK,
          color: '#d1d0c5',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '32px',
            color: '#e2b714',
          }}
        >
          <Bracket side="left" />
          <span
            style={{
              fontSize: '120px',
              fontWeight: 700,
              letterSpacing: '-0.04em',
              lineHeight: 1,
            }}
          >
            tf
          </span>
          <Bracket side="right" />
          <span
            style={{
              fontSize: '120px',
              fontWeight: 500,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              marginLeft: '24px',
              color: '#d1d0c5',
            }}
          >
            typerfocus
          </span>
        </div>

        <div
          style={{
            marginTop: '64px',
            fontSize: '40px',
            fontWeight: 300,
            color: '#646669',
            letterSpacing: '0.01em',
            display: 'flex',
          }}
        >
          E-learning, rebuilt for{' '}
          <span style={{ color: '#e2b714', marginLeft: '14px' }}>
            neurodivergent minds.
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}

function Bracket({ side }: { side: 'left' | 'right' }) {
  const isLeft = side === 'left';
  return (
    <div
      style={{
        width: '70px',
        height: '180px',
        display: 'flex',
        borderTop: '8px solid #e2b714',
        borderBottom: '8px solid #e2b714',
        borderLeft: isLeft ? '8px solid #e2b714' : 'none',
        borderRight: isLeft ? 'none' : '8px solid #e2b714',
        borderTopLeftRadius: isLeft ? '6px' : 0,
        borderBottomLeftRadius: isLeft ? '6px' : 0,
        borderTopRightRadius: isLeft ? 0 : '6px',
        borderBottomRightRadius: isLeft ? 0 : '6px',
      }}
    />
  );
}
