import api from '../client';

export async function generateCheatSheet(documentIds) {
  const { data } = await api.post('/cheat_sheets/', {
    document_ids: documentIds,
  });
  return data;
}

export async function getCheatSheets() {
  const { data } = await api.get('/cheat_sheets/');
  return data;
}

export async function deleteCheatSheet(cheatSheetId) {
  await api.delete(`/cheat_sheets/${cheatSheetId}`);
}