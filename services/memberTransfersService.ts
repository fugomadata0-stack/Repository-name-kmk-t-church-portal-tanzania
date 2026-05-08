export const memberTransfersTable = "member_transfers";

export const memberTransfersService = {
  list: async () => [],
  create: async (payload: Record<string, unknown>) => payload,
  approve: async (id: number) => id,
  reject: async (id: number) => id,
};
