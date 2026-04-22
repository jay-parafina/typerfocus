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
   * Move-forward semantics (MonkeyType-style):
   *   - cursorPos advances on every keypress, correct or wrong
   *   - Wrong chars are stored and shown in red but don't block
   *   - Backspace retreats and clears the previous character
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
  /**
   * When non-null, user is reviewing a prior phrase (read-only). Always
   * < phraseIndex. Null means normal typing mode.
   */
  reviewIndex: number | null;
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
  | {
      type: 'WRONG_LAST';
      pos: number;
      char: string;
      result: PhraseResult;
      wpm: number;
      accuracy: number;
    }
  | { type: 'BACKSPACE' }
  | { type: 'NEXT_PHRASE' }
  | { type: 'RESTART_PHRASE' }
  | { type: 'TAB_DOWN' }
  | { type: 'TAB_UP' }
  | { type: 'REVIEW_PREV' }
  | { type: 'REVIEW_NEXT' };

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
  return {
    phraseIndex: 0,
    results: [],
    cursorKey: 0,
    reviewIndex: null,
    ...blankPhrase(),
  };
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
        cursorPos: action.pos + 1,
        totalKeystrokes: action.totalKeystrokes,
        wrongKeystrokes: action.wrongKeystrokes,
        startTime: action.startTime,
        cursorKey: state.cursorKey + 1,
      };
    }

    case 'WRONG_LAST': {
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

    case 'BACKSPACE': {
      const { cursorPos, typedAt } = state;
      if (cursorPos <= 0) return state;
      const next = typedAt.slice();
      next[cursorPos - 1] = undefined;
      return {
        ...state,
        typedAt: next,
        cursorPos: cursorPos - 1,
        cursorKey: state.cursorKey + 1,
      };
    }

    case 'NEXT_PHRASE':
      return {
        ...blankPhrase(),
        phraseIndex: state.phraseIndex + 1,
        results: state.results,
        cursorKey: state.cursorKey + 1,
        reviewIndex: null,
      };

    case 'RESTART_PHRASE':
      return {
        ...blankPhrase(),
        phraseIndex: state.phraseIndex,
        results: state.results,
        cursorKey: state.cursorKey + 1,
        reviewIndex: null,
      };

    case 'TAB_DOWN':
      return { ...state, tabDown: true };
    case 'TAB_UP':
      return { ...state, tabDown: false };

    case 'REVIEW_PREV': {
      // Already reviewing → step further back, or hold at 0
      if (state.reviewIndex !== null) {
        if (state.reviewIndex <= 0) return state;
        return { ...state, reviewIndex: state.reviewIndex - 1 };
      }
      // From phase-done: advance past the just-completed phrase, then review it.
      // Avoids the awkward state where forward-from-review re-enters the
      // phrase-done flash for a phrase already recorded in `results`.
      if (state.phase === 'phrase-done') {
        return {
          ...blankPhrase(),
          phraseIndex: state.phraseIndex + 1,
          results: state.results,
          cursorKey: state.cursorKey + 1,
          reviewIndex: state.phraseIndex,
        };
      }
      // From typing: discard in-progress chars, review the previous phrase.
      if (state.phraseIndex <= 0) return state;
      return {
        ...blankPhrase(),
        phraseIndex: state.phraseIndex,
        results: state.results,
        cursorKey: state.cursorKey + 1,
        reviewIndex: state.phraseIndex - 1,
      };
    }

    case 'REVIEW_NEXT': {
      if (state.reviewIndex === null) return state;
      if (state.reviewIndex < state.phraseIndex - 1) {
        return { ...state, reviewIndex: state.reviewIndex + 1 };
      }
      return { ...state, reviewIndex: null };
    }

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
  /** Enter review mode, or step further back while already reviewing. */
  reviewPrev: () => void;
  /** Step forward in review, or exit review mode when at the boundary. */
  reviewNext: () => void;
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

  const reviewPrev = useCallback(() => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    dispatch({ type: 'REVIEW_PREV' });
  }, []);

  const reviewNext = useCallback(() => {
    dispatch({ type: 'REVIEW_NEXT' });
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

      // ── Review mode: only review navigation / Escape are meaningful ──
      if (s.reviewIndex !== null) {
        if (e.key === 'ArrowLeft') reviewPrev();
        else if (e.key === 'ArrowRight' || e.key === 'Enter') reviewNext();
        return;
      }

      // ── ArrowLeft enters review (works in both typing and phrase-done) ──
      if (e.key === 'ArrowLeft') {
        reviewPrev();
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

      // ── Evaluate the keypress ─────────────────────────────────────────
      const isCorrect = e.key === text[ci];
      const startTime = s.startTime ?? Date.now();
      const newTotal = s.totalKeystrokes + 1;
      const newWrong = s.wrongKeystrokes + (isCorrect ? 0 : 1);
      const isLast = ci === text.length - 1;

      if (isLast) {
        // Last char — phrase complete regardless of correct/wrong
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
        if (isCorrect) {
          dispatch({ type: 'CORRECT_LAST', pos: ci, char: e.key, result, wpm, accuracy });
        } else {
          dispatch({ type: 'WRONG_LAST', pos: ci, char: e.key, result, wpm, accuracy });
        }
      } else if (isCorrect) {
        dispatch({ type: 'CORRECT', pos: ci, char: e.key, startTime, totalKeystrokes: newTotal, wrongKeystrokes: newWrong });
      } else {
        dispatch({ type: 'WRONG', pos: ci, char: e.key, startTime, totalKeystrokes: newTotal, wrongKeystrokes: newWrong });
      }
    },
    [nextPhrase, restartPhrase, reviewPrev, reviewNext] // all stable via useCallback([])
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

  return {
    state,
    nextPhrase: stableNextPhrase,
    restartPhrase: stableRestartPhrase,
    reviewPrev,
    reviewNext,
  };
}
