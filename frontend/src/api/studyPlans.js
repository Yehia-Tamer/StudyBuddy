import api from "../client";

export async function generateStudyPlan(documentIds) {
  const { data } = await api.post("/study-plans/", {
    document_ids: documentIds,
  });
  return data;
}

export async function getStudyPlans() {
  const { data } = await api.get("/study-plans/");
  return data;
}

export async function deleteStudyPlan(studyPlanId) {
  await api.delete(`/study-plans/${studyPlanId}`);
}

export async function updateItemCompletion(studyPlanId, itemId, completed) {
  const { data } = await api.put(
    `/study-plans/${studyPlanId}/items/${itemId}`,
    {
      completed,
    },
  );
  return data;
}
