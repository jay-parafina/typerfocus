export interface StudyKitSection {
  title: string;
  body: string;
}

export interface StudyKitExercise {
  title: string;
  passage: string;
}

export interface StudyKitQuiz {
  question: string;
  options: [string, string, string, string];
  answer: number;
}

export interface StudyKitData {
  title: string;
  overview: string;
  key_concepts: string[];
  sections: StudyKitSection[];
  typing_exercises: StudyKitExercise[];
  quiz?: StudyKitQuiz[];
}

export interface StudyKitRow {
  id: string;
  user_id: string;
  topic: string;
  depth: string;
  section_count: number;
  exercise_count: number;
  quiz_count: number;
  guide_data: StudyKitData;
  created_at: string;
}
