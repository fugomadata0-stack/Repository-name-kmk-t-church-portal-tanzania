export const membersTable = "members";

export type MemberRow = {
  id: number;
  full_name: string;
  dayosisi: string;
  jimbo: string;
  branch: string;
  status: string;
  approval_status: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export const membersService = {
  list: async (): Promise<MemberRow[]> => [],
  create: async (payload: Partial<MemberRow>) => payload,
  update: async (id: number, payload: Partial<MemberRow>) => ({ id, ...payload }),
  archive: async (id: number) => id,
  restore: async (id: number) => id,
};
