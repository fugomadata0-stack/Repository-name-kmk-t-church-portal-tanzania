import {
  getWorkflowRecords,
  getFilteredWorkflowRecords,
  getApprovalDashboardSummary,
  updateWorkflowStatus,
  getWorkflowStatusOptions,
} from "../services/workflow-engine-service.js";

export function useWorkflowEngine() {
  return {
    getRecords: getWorkflowRecords,
    getFilteredRecords: getFilteredWorkflowRecords,
    getSummary: getApprovalDashboardSummary,
    updateStatus: updateWorkflowStatus,
    statuses: getWorkflowStatusOptions,
  };
}
