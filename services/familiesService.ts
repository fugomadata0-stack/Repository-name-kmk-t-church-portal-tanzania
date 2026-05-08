export const familiesTable = "families";
export const familyMembersTable = "family_members";

export const familiesService = {
  list: async () => [],
  create: async (payload: Record<string, unknown>) => payload,
  update: async (id: number, payload: Record<string, unknown>) => ({ id, ...payload }),
  archive: async (id: number) => id,
};
