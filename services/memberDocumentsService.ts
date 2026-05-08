export const memberDocumentsTable = "member_documents";

export const memberDocumentsService = {
  list: async () => [],
  upload: async (payload: Record<string, unknown>) => payload,
  remove: async (id: number) => id,
};
