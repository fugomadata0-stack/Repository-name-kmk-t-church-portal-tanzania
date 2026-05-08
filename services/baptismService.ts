export const baptismTable = "baptism_records";

export const baptismService = {
  list: async () => [],
  create: async (payload: Record<string, unknown>) => payload,
  update: async (id: number, payload: Record<string, unknown>) => ({ id, ...payload }),
  remove: async (id: number) => id,
};
