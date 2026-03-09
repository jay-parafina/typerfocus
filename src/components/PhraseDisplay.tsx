import { Fragment } from 'react';
import { Cursor } from './Cursor';

interface PhraseDisplayProps {
  text: string;
  /** typedAt[i] = char pressed at position i, undefined = not yet reached */
  typedAt: (string | undefined)[];
  /** Index of next character to type (cursor position) */
  cursorPos: number;
  /**
   * Increments on every keypress. Passed as React `key` to Cursor so the
   * component remounts and the blink animation resets each time the user types.
   */
  cursorKey: number;
}

const COLOR_UNTYPED = '#646669';
const COLOR_CORRECT = '#d1d0c5';
const COLOR_WRONG   = '#ca4754';

export function PhraseDisplay({ text, typedAt, cursorPos, cursorKey }: PhraseDisplayProps) {
  return (
    /*
     * font-size: 0 on the wrapper kills whitespace-between-inline-blocks gaps.
     * Each character span resets it back to the intended size.
     * This keeps character spacing pixel-perfect at all sizes.
     */
    <div
      className="text-center select-none"
      style={{ fontSize: 0, lineHeight: '2.2rem' }}
    >
      {text.split('').map((char, i) => {
        const typed = typedAt[i];

        // Determine display character and colour
        let color: string;
        let displayChar: string;

        if (i < cursorPos) {
          // Cursor has moved past — was typed correctly
          color = COLOR_CORRECT;
          displayChar = char;
        } else if (i === cursorPos && typed !== undefined) {
          // Wrong char blocking the cursor here
          color = COLOR_WRONG;
          displayChar = typed; // show what the user actually pressed
        } else {
          // Not yet reached
          color = COLOR_UNTYPED;
          displayChar = char;
        }

        return (
          <Fragment key={i}>
            {/* Cursor sits BEFORE the character at cursorPos */}
            {i === cursorPos && <Cursor key={cursorKey} />}
            <span style={{ fontSize: '1.5rem', color }}>{displayChar}</span>
          </Fragment>
        );
      })}

      {/* Trailing cursor — shown only when the phrase is fully typed (edge case) */}
      {cursorPos >= text.length && <Cursor key={cursorKey} />}
    </div>
  );
}
