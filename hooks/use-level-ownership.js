import {
  getLevelOwnershipRows,
  assignLevelOwners,
  removeLevelAssignment,
  lockLevel,
} from "../services/level-ownership-service.js";

export function useLevelOwnership() {
  return {
    getRows: getLevelOwnershipRows,
    assign: assignLevelOwners,
    remove: removeLevelAssignment,
    lock: (id, actor) => lockLevel(id, true, actor),
    unlock: (id, actor) => lockLevel(id, false, actor),
  };
}
