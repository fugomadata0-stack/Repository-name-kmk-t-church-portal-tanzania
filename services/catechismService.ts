export const catechismTable = "catechism_records";

export const catechismService = {
  list: async () => [],
  create: async (payload: Record<string, unknown>) => payload,
  complete: async (id: number) => id,
  issueCertificate: async (id: number) => id,
};
