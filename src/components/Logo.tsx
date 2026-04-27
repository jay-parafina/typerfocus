type LogoProps = {
  variant?: 'full' | 'mark';
  className?: string;
  'aria-label'?: string;
};

const FONT_STACK =
  "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace";

export function Logo({
  variant = 'full',
  className,
  'aria-label': ariaLabel,
}: LogoProps) {
  if (variant === 'mark') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        role="img"
        aria-label={ariaLabel ?? 'TyperFocus'}
        className={className ?? 'h-8 w-8'}
      >
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M 9 6 L 4 6 L 4 26 L 9 26" />
          <path d="M 23 6 L 28 6 L 28 26 L 23 26" />
        </g>
        <text
          x="16"
          y="22"
          fontFamily={FONT_STACK}
          fontSize="14"
          fontWeight="700"
          letterSpacing="-0.04em"
          fill="currentColor"
          textAnchor="middle"
        >
          tf
        </text>
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 320 80"
      role="img"
      aria-label={ariaLabel ?? 'typerfocus'}
      className={className ?? 'h-7 w-auto'}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M 22 22 L 14 22 L 14 58 L 22 58" />
        <path d="M 64 22 L 72 22 L 72 58 L 64 58" />
      </g>
      <text
        x="43"
        y="51"
        fontFamily={FONT_STACK}
        fontSize="22"
        fontWeight="600"
        letterSpacing="-0.02em"
        fill="currentColor"
        textAnchor="middle"
      >
        tf
      </text>
      <text
        x="92"
        y="51"
        fontFamily={FONT_STACK}
        fontSize="24"
        fontWeight="500"
        letterSpacing="-0.02em"
        fill="currentColor"
      >
        typerfocus
      </text>
    </svg>
  );
}
