// frontend/src/api/documents.js
import api from "../client";

export async function getDocuments() {
  const { data } = await api.get("/documents/");
  return data;
}

export async function deleteDocument(documentId) {
  await api.delete(`/documents/${documentId}`);
}

export async function uploadPdfDocument(file) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post("/documents/pdf", formData);
  return data;
}

export async function uploadPptxDocument(file) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post("/documents/pptx", formData);
  return data;
}

export async function uploadAudioDocument(file) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post("/documents/audio", formData);
  return data;
}

export async function uploadYoutubeDocument(url) {
  const { data } = await api.post("/documents/youtube", { url });
  return data;
}

export async function uploadWebDocument(url) {
  const { data } = await api.post("/documents/web", { url });
  return data;
}
