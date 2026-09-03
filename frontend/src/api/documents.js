import api from '../client';

export async function getDocuments() {
  const { data } = await api.get('/documents/');
  return data;
}

export async function deleteDocument(documentId) {
  await api.delete(`/documents/${documentId}`);
}