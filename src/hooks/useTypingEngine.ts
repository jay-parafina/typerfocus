'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { Phrase, PhraseResult } from '@/lib/types';

// ─── Stats ─────────────────────────────────────────────────────────────────
// WPM: (correctChars / 5) / elapsedMinutes  — standard gross WPM
// Accuracy: (totalKeystrokes - wrongKeystrokes) / totalKeystrokes * 100

function calcWpm(correctChars: number, startTime: number): number {
  const elapsedMinutes = (Date.now() - startTime) / 60_000;
  if (elapsedMinutes <= 0) return 0;
  return Math.round(correctChars / 5 / elapsedMinutes);
}

function calcAccuracy(totalKeystrokes: number, wrongKeystrokes: number): number {
  if (totalKeystrokes === 0) return 100;
  return Math.round(((totalKeystrokes - wrongKeystrokes) / totalKeystrokes) * 100);
}

// ─── State ─────────────────────────────────────────────────────────────────

export type EnginePhase = 'typing' | 'phrase-done' | 'module-done';

export interface EngineState {
  phraseIndex: number;
  /**
   * typedAt[i] = the character the user actually pressed at position i.
   * undefined means the user has not yet reached that position.
   *
   * Stop-on-error semantics:
   *   - cursorPos advances only when typedAt[cursorPos] === phrase[cursorPos]
   *   - A wrong char is stored at typedAt[cursorPos] and blocks the cursor
   *   - Backspace clears the blocking char (or retreats past a correct one)
   */
  typedAt: (string | undefined)[];
  /** Index of the character the cursor sits before (= next char to type). */
  cursorPos: number;
  totalKeystrokes: number;
  wrongKeystrokes: number;
  startTime: number | null;
  phase: EnginePhase;
  phraseWpm: number;
  phraseAccuracy: number;
  results: PhraseResult[];
  tabDown: boolean;
  /**
   * Increments on every keypress. Used as React key on the Cursor component
   * to unmount/remount it, resetting the blink animation so the cursor
   * appears solid while typing and only blinks during idle.
   */
  cursorKey: number;
}

// ─── Actions ───────────────────────────────────────────────────────────────

type Action =
  | {
      type: 'CORRECT';
      pos: number;
      char: string;
      startTime: number;
      totalKeystrokes: number;
      wrongKeystrokes: number;
    }
  | {
      type: 'CORRECT_LAST';
      pos: number;
      char: string;
      result: PhraseResult;
      wpm: number;
      accuracy: number;
    }
  | {
      type: 'WRONG';
      pos: number;
      char: string;
      startTime: number;
      totalKeystrokes: number;
      wrongKeystrokes: number;
    }
  | { type: 'BACKSPACE' }
  | { type: 'NEXT_PHRASE' }
  | { type: 'RESTART_PHRASE' }
  | { type: 'TAB_DOWN' }
  | { type: 'TAB_UP' };

// ─── Reducer ───────────────────────────────────────────────────────────────

function blankPhrase() {
  return {
    typedAt: [] as (string | undefined)[],
    cursorPos: 0,
    totalKeystrokes: 0,
    wrongKeystrokes: 0,
    startTime: null as number | null,
    phase: 'typing' as EnginePhase,
    phraseWpm: 0,
    phraseAccuracy: 0,
    tabDown: false,
  };
}

function init(): EngineState {
  return { phraseIndex: 0, results: [], cursorKey: 0, ...blankPhrase() };
}

function reducer(state: EngineState, action: Action): EngineState {
  switch (action.type) {
    case 'CORRECT': {
      const typedAt = state.typedAt.slice();
      typedAt[action.pos] = action.char;
      return {
        ...state,
        typedAt,
        cursorPos: action.pos + 1,
        totalKeystrokes: action.totalKeystrokes,
        wrongKeystrokes: action.wrongKeystrokes,
        startTime: action.startTime,
        cursorKey: state.cursorKey + 1,
      };
    }

    case 'CORRECT_LAST': {
      const typedAt = state.typedAt.slice();
      typedAt[action.pos] = action.char;
      return {
        ...state,
        typedAt,
        cursorPos: action.pos + 1,
        phase: 'phrase-done',
        phraseWpm: action.wpm,
        phraseAccuracy: action.accuracy,
        results: [...state.results, action.result],
        cursorKey: state.cursorKey + 1,
      };
    }

    case 'WRONG': {
      const typedAt = state.typedAt.slice();
      typedAt[action.pos] = action.char;
      return {
        ...state,
        typedAt,
        // cursorPos does NOT advance on wrong input
        totalKeystrokes: action.totalKeystrokes,
        wrongKeystrokes: action.wrongKeystrokes,
        startTime: action.startTime,
        cursorKey: state.cursorKey + 1,
      };
    }

    case 'BACKSPACE': {
      const { cursorPos, typedAt } = state;
      const next = typedAt.slice();
      if (next[cursorPos] !== undefined) {
        // There is a wrong char at the cursor — clear it and stay put
        next[cursorPos] = undefined;
        return { ...state, typedAt: next, cursorKey: state.cursorKey + 1 };
      } else if (cursorPos > 0) {
        // No pending error — retreat and un-type the previous correct char
        next[cursorPos - 1] = undefined;
        return {
          ...state,
          typedAt: next,
          cursorPos: cursorPos - 1,
          cursorKey: state.cursorKey + 1,
        };
      }
      return state; // already at start
    }

    case 'NEXT_PHRASE':
      return {
        ...blankPhrase(),
        phraseIndex: state.phraseIndex + 1,
        results: state.results,
        cursorKey: state.cursorKey + 1,
      };

    case 'RESTART_PHRASE':
      return {
        ...blankPhrase(),
        phraseIndex: state.phraseIndex,
        results: state.results,
        cursorKey: state.cursorKey + 1,
      };

    case 'TAB_DOWN':
      return { ...state, tabDown: true };
    case 'TAB_UP':
      return { ...state, tabDown: false };

    default:
      return state;
  }
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export interface UseTypingEngineReturn {
  state: EngineState;
  /** Call when the user presses Enter during phrase-done to skip ahead early. */
  nextPhrase: () => void;
  /** Call to restart the current phrase (Tab+Enter). */
  restartPhrase: () => void;
}

export function useTypingEngine(
  phrases: Phrase[],
  opts: {
    onPhraseComplete: (result: PhraseResult) => void;
    onEscape: () => void;
  }
): UseTypingEngineReturn {
  const [state, dispatch] = useReducer(reducer, undefined, init);

  // Always-current ref — lets the stable keydown listener read fresh state
  // without ever being re-registered (zero re-registration overhead).
  const stateRef = useRef(state);
  stateRef.current = state;

  // Stable refs for callbacks (no stale closures)
  const phrasesRef = useRef(phrases);
  phrasesRef.current = phrases;

  const onPhraseCompleteRef = useRef(opts.onPhraseComplete);
  onPhraseCompleteRef.current = opts.onPhraseComplete;

  const onEscapeRef = useRef(opts.onEscape);
  onEscapeRef.current = opts.onEscape;

  // ─── Auto-advance after phrase-done ──────────────────────────────────

  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nextPhrase = useCallback(() => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    dispatch({ type: 'NEXT_PHRASE' });
  }, []);

  const restartPhrase = useCallback(() => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    dispatch({ type: 'RESTART_PHRASE' });
  }, []);

  // Watch for phrase-done → kick off 1.5 s timer
  useEffect(() => {
    if (state.phase === 'phrase-done') {
      autoAdvanceTimer.current = setTimeout(nextPhrase, 1500);
      return () => {
        if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
      };
    }
  }, [state.phase, state.phraseIndex, nextPhrase]);

  // ─── Stable keydown listener ──────────────────────────────────────────

  // Registered once. Reads stateRef.current so it's always fresh.
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const s = stateRef.current;
      const phrases = phrasesRef.current;

      // ── Global keys ──────────────────────────────────────────────────
      if (e.key === 'Escape') {
        onEscapeRef.current();
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault(); // prevent focus shift
        dispatch({ type: 'TAB_DOWN' });
        return;
      }

      // ── Phrase-done state: only Enter advances ───────────────────────
      if (s.phase === 'phrase-done') {
        if (e.key === 'Enter') {
          if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
          nextPhrase();
        }
        return;
      }

      // ── Module done: ignore everything ──────────────────────────────
      if (s.phraseIndex >= phrases.length) return;

      // ── Tab+Enter = restart ──────────────────────────────────────────
      if (e.key === 'Enter' && s.tabDown) {
        restartPhrase();
        return;
      }

      // ── Backspace ────────────────────────────────────────────────────
      if (e.key === 'Backspace') {
        e.preventDefault();
        dispatch({ type: 'BACKSPACE' });
        return;
      }

      // ── Printable character ──────────────────────────────────────────
      if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;

      const currentPhrase = phrases[s.phraseIndex];
      if (!currentPhrase) return;

      const text = currentPhrase.text;
      const ci = s.cursorPos;
      if (ci >= text.length) return;

      // Blocked: wrong char already at cursor, must backspace first
      if (s.typedAt[ci] !== undefined) return;

      // ── Evaluate the keypress ─────────────────────────────────────────
      const isCorrect = e.key === text[ci];
      const startTime = s.startTime ?? Date.now();
      const newTotal = s.totalKeystrokes + 1;
      const newWrong = s.wrongKeystrokes + (isCorrect ? 0 : 1);

      if (!isCorrect) {
        dispatch({ type: 'WRONG', pos: ci, char: e.key, startTime, totalKeystrokes: newTotal, wrongKeystrokes: newWrong });
        return;
      }

      // Correct keypress
      if (ci < text.length - 1) {
        // Not the last char — just advance
        dispatch({ type: 'CORRECT', pos: ci, char: e.key, startTime, totalKeystrokes: newTotal, wrongKeystrokes: newWrong });
      } else {
        // Last char — phrase complete
        const wpm = calcWpm(text.length, startTime);
        const accuracy = calcAccuracy(newTotal, newWrong);
        const result: PhraseResult = {
          phraseId: currentPhrase.id,
          wpm,
          accuracy,
          timestamp: Date.now(),
          errors: newWrong,
          totalChars: text.length,
        };
        onPhraseCompleteRef.current(result);
        dispatch({ type: 'CORRECT_LAST', pos: ci, char: e.key, result, wpm, accuracy });
      }
    },
    [nextPhrase, restartPhrase] // stable: nextPhrase/restartPhrase are useCallback([])
  );

  // Register once, never re-register
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Tab up
  useEffect(() => {
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Tab') dispatch({ type: 'TAB_UP' });
    };
    document.addEventListener('keyup', onKeyUp);
    return () => document.removeEventListener('keyup', onKeyUp);
  }, []);

  // ─── Derived values for consumers ────────────────────────────────────

  const stableNextPhrase = useMemo(() => nextPhrase, [nextPhrase]);
  const stableRestartPhrase = useMemo(() => restartPhrase, [restartPhrase]);

  return { state, nextPhrase: stableNextPhrase, restartPhrase: stableRestartPhrase };
}
