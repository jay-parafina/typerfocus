import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

const STROKE = '#e2b714';
const BORDER = `6px solid ${STROKE}`;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#323437',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          fontFamily: 'monospace',
          color: STROKE,
        }}
      >
        <div
          style={{
            width: '32px',
            height: '110px',
            borderTop: BORDER,
            borderBottom: BORDER,
            borderLeft: BORDER,
            borderTopLeftRadius: '4px',
            borderBottomLeftRadius: '4px',
          }}
        />
        <span
          style={{
            fontSize: '64px',
            fontWeight: 700,
            letterSpacing: '-0.04em',
            lineHeight: 1,
          }}
        >
          tf
        </span>
        <div
          style={{
            width: '32px',
            height: '110px',
            borderTop: BORDER,
            borderBottom: BORDER,
            borderRight: BORDER,
            borderTopRightRadius: '4px',
            borderBottomRightRadius: '4px',
          }}
        />
      </div>
    ),
    { ...size }
  );
}
