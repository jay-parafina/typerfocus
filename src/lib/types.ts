export interface Topic {
  id: string;
  title: string;
  description: string;
  modules: Module[];
}

export interface Module {
  id: string;
  topicId: string;
  title: string;
  description: string;
  order: number;
  phrases: Phrase[];
  quiz?: QuizQuestion[];
}

export interface Phrase {
  id: string;
  moduleId: string;
  text: string;
  order: number;
}

export interface PhraseResult {
  phraseId: string;
  wpm: number;
  accuracy: number;
  timestamp: number;
  errors: number;
  totalChars: number;
}

export interface ModuleProgress {
  moduleId: string;
  completedPhrases: string[];
  results: PhraseResult[];
  isComplete: boolean;
  bestWpm: number;
  averageAccuracy: number;
  phrasesComplete: boolean;
  quizResult?: QuizResult;
}

export type ModuleStatus = 'locked' | 'available' | 'in-progress' | 'complete';

// Quiz types

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  moduleId: string;
  question: string;
  options: QuizOption[];
  correctOptionId: string;
}

export interface QuizResult {
  score: number;
  total: number;
  passed: boolean;
  answers: Record<string, string>;
  timestamp: number;
}

export const QUIZ_PASSING_SCORE = 4;
export function quizPassingScore(totalQuestions: number): number {
  return Math.ceil(totalQuestions * 0.8);
}
