import api from "../client";

export async function generateQuiz(documentIds, difficulty, count) {
  const { data } = await api.post("/quizzes/", {
    document_ids: documentIds,
    difficulty,
    count,
  });
  return data;
}

export async function getQuizzes() {
  const { data } = await api.get("/quizzes/");
  return data;
}

export async function getQuiz(quizId) {
  const { data } = await api.get(`/quizzes/${quizId}`);
  return data;
}

export async function gradeQuiz(quizId, answers) {
  const { data } = await api.post(`/quizzes/${quizId}/grade`, { answers });
  return data;
}

export async function deleteQuiz(quizId) {
  await api.delete(`/quizzes/${quizId}`);
}
