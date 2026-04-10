'use client';

import { useAccessibility } from '@/context/AccessibilityContext';

export function FontToggle() {
  const { fontPreference, setFontPreference } = useAccessibility();
  const isActive = fontPreference === 'opendyslexic';

  return (
    <button
      onClick={() => setFontPreference(isActive ? 'default' : 'opendyslexic')}
      aria-label={isActive ? 'Switch to standard font' : 'Switch to OpenDyslexic font'}
      aria-pressed={isActive}
      className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:opacity-90"
      style={{
        backgroundColor: isActive ? '#e2b714' : '#2c2e31',
        color: isActive ? '#323437' : '#d1d0c5',
        border: `1px solid ${isActive ? '#e2b714' : '#3d3f42'}`,
        fontFamily: isActive ? "'OpenDyslexic', sans-serif" : 'inherit',
      }}
    >
      {isActive ? 'Aa' : 'Aa'}
      <span className="ml-1.5 hidden sm:inline">
        {isActive ? 'OpenDyslexic' : 'Dyslexia font'}
      </span>
    </button>
  );
}
