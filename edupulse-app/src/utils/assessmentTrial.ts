export type TrialQuestion = { type?: string; correctIndex?: number }
/** Written questions (essay, identification, follow-along...) are marked by a person; only choice questions have a key. */
export const isWrittenQuestion = (question: TrialQuestion) => question.type === 'short_answer'
const chosen = (answer: unknown): answer is number => Number.isInteger(answer)

/** The score of an instructor's test attempt: choice questions are marked with the answer key, written ones are left unscored. */
export function trialResult(questions: TrialQuestion[], answers: Record<number, unknown>) {
  const choice = questions.map(question => !isWrittenQuestion(question))
  const correct = questions.map((question, index) => choice[index]! && chosen(answers[index]) && answers[index] === question.correctIndex)
  return {
    scored: choice.filter(Boolean).length, written: choice.filter(isChoice => !isChoice).length, score: correct.filter(Boolean).length, correct,
    ready: questions.every((_, index) => !choice[index] || chosen(answers[index])),
  }
}
