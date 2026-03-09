import { ModuleProgress, PhraseResult, QuizResult } from './types';

const PROGRESS_KEY = 'typewise_progress';

function getAllProgress(): Record<string, ModuleProgress> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAllProgress(data: Record<string, ModuleProgress>) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
}

export function getModuleProgress(moduleId: string): ModuleProgress | null {
  const all = getAllProgress();
  return all[moduleId] ?? null;
}

export function saveModuleProgress(progress: ModuleProgress) {
  const all = getAllProgress();
  all[progress.moduleId] = progress;
  saveAllProgress(all);
}

export function recordPhraseResult(
  moduleId: string,
  totalPhrases: number,
  result: PhraseResult,
  hasQuiz: boolean = false
): ModuleProgress {
  const all = getAllProgress();
  const existing = all[moduleId] ?? {
    moduleId,
    completedPhrases: [],
    results: [],
    isComplete: false,
    bestWpm: 0,
    averageAccuracy: 0,
    phrasesComplete: false,
    quizResult: undefined,
  };

  // Replace or add result for this phrase
  const otherResults = existing.results.filter(r => r.phraseId !== result.phraseId);
  const results = [...otherResults, result];

  const completedPhrases = Array.from(
    new Set([...existing.completedPhrases, result.phraseId])
  );

  const phrasesComplete = completedPhrases.length >= totalPhrases;
  // isComplete requires phrases done AND (no quiz OR quiz already passed)
  const isComplete = existing.isComplete || (phrasesComplete && (!hasQuiz || (existing.quizResult?.passed ?? false)));
  const bestWpm = Math.max(existing.bestWpm, result.wpm);
  const averageAccuracy =
    results.reduce((sum, r) => sum + r.accuracy, 0) / results.length;

  const updated: ModuleProgress = {
    moduleId,
    completedPhrases,
    results,
    isComplete,
    bestWpm,
    averageAccuracy,
    phrasesComplete,
    quizResult: existing.quizResult,
  };

  all[moduleId] = updated;
  saveAllProgress(all);
  return updated;
}

export function recordQuizResult(
  moduleId: string,
  quizResult: QuizResult
): ModuleProgress {
  const all = getAllProgress();
  const existing = all[moduleId];
  if (!existing) {
    throw new Error(`Cannot record quiz for module ${moduleId}: no progress exists`);
  }

  const updated: ModuleProgress = {
    ...existing,
    quizResult,
    isComplete: (existing.phrasesComplete ?? true) && quizResult.passed,
  };

  all[moduleId] = updated;
  saveAllProgress(all);
  return updated;
}

export function getTopicProgress(moduleIds: string[]): {
  completedModules: number;
  totalModules: number;
  percentComplete: number;
} {
  const all = getAllProgress();
  const completedModules = moduleIds.filter(id => all[id]?.isComplete).length;
  return {
    completedModules,
    totalModules: moduleIds.length,
    percentComplete: moduleIds.length > 0 ? Math.round((completedModules / moduleIds.length) * 100) : 0,
  };
}
