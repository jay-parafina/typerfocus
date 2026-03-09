/**
 * Blinking vertical caret.
 *
 * Parent passes `key={cursorKey}` to unmount/remount this on every keypress,
 * which resets the CSS animation. Result: cursor appears solid while typing
 * and only starts blinking after ~530 ms of inactivity — exactly like monkeytype.
 */
export function Cursor() {
  return (
    <span
      aria-hidden
      className="cursor-blink"
      style={{
        display: 'inline-block',
        width: '2px',
        height: '1.15em',
        backgroundColor: '#e2b714',
        borderRadius: '1px',
        verticalAlign: 'text-bottom',
        // Negative margin so the cursor sits between characters
        // without displacing them (net layout width = 0).
        margin: '0 -1px',
      }}
    />
  );
}
