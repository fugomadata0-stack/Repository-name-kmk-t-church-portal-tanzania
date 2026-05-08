import { getComplianceRows, getComplianceSummary } from "../services/compliance-tracking-service.js";

export function useComplianceTracking() {
  return {
    getRows: getComplianceRows,
    getSummary: getComplianceSummary,
  };
}
