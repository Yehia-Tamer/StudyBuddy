import api from '../client';

export async function getFlashcards() {
  const { data } = await api.get('/flashcards/');
  return data;
}

export async function generateFlashcards(documentIds, count) {
  const { data } = await api.post('/flashcards/', {
    document_ids: documentIds,
    count,
  });
  return data;
}

export async function answerFlashcard(flashcardId, userAnswer) {
  const { data } = await api.post(`/flashcards/${flashcardId}/answer`, {
    user_answer: userAnswer,
  });
  return data;
}

export async function deleteFlashCard(flashcardId) {
  await api.delete(`/flashcards/${flashcardId}`);
}