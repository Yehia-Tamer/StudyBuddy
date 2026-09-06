import api from "../client";

export async function createConversation(documentId = null) {
  const { data } = await api.post("/conversations/", {
    document_id: documentId,
  });
  return data;
}

export async function deleteConversation(conversationId) {
  await api.delete(`/conversations/${conversationId}`);
}

export async function getConversations() {
  const { data } = await api.get("/conversations/");
  return data;
}

export async function getMessages(conversationId) {
  const { data } = await api.get(`/conversations/${conversationId}/messages`);
  return data;
}

export async function sendMessage(conversationId, content, signal) {
  const { data } = await api.post(
    `/conversations/${conversationId}/messages`,
    { content },
    { signal },
  );
  return data;
}
