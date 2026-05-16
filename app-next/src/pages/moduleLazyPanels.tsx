import { lazy } from "react";

/**
 * Lazy panel shells — each portal submodule loads its own chunk when opened,
 * instead of bundling every panel into the initial ModulePage graph.
 */
export const BrandingTablePanel = lazy(async () => {
  const m = await import("../components/settings/BrandingTablePanel");
  return { default: m.BrandingTablePanel };
});
export const ChurchIdentitySettingsPanel = lazy(async () => {
  const m = await import("../components/settings/ChurchIdentitySettingsPanel");
  return { default: m.ChurchIdentitySettingsPanel };
});
export const SiteTaxonomyPanel = lazy(async () => {
  const m = await import("../components/settings/SiteTaxonomyPanel");
  return { default: m.SiteTaxonomyPanel };
});
export const SystemSettingsPanel = lazy(async () => {
  const m = await import("../components/settings/SystemSettingsPanel");
  return { default: m.SystemSettingsPanel };
});
export const MasterSettingsCenterPanel = lazy(async () => {
  const m = await import("../components/settings/MasterSettingsCenterPanel");
  return { default: m.MasterSettingsCenterPanel };
});
export const AdvancedSettingsPanel = lazy(async () => {
  const m = await import("../components/settings/AdvancedSettingsPanel");
  return { default: m.AdvancedSettingsPanel };
});
export const SeoPublicSettingsPanel = lazy(async () => {
  const m = await import("../components/settings/SeoPublicSettingsPanel");
  return { default: m.SeoPublicSettingsPanel };
});
export const SystemHealthCenterPanel = lazy(async () => {
  const m = await import("../components/superadmin/SystemHealthCenterPanel");
  return { default: m.SystemHealthCenterPanel };
});
export const ChurchAuditLogPanel = lazy(async () => {
  const m = await import("../components/usalama/ChurchAuditLogPanel");
  return { default: m.ChurchAuditLogPanel };
});
export const PortalDirectoryPanel = lazy(async () => {
  const m = await import("../components/usalama/PortalDirectoryPanel");
  return { default: m.PortalDirectoryPanel };
});
export const SecurityMatrixPanel = lazy(async () => {
  const m = await import("../components/usalama/SecurityMatrixPanel");
  return { default: m.SecurityMatrixPanel };
});
export const SecurityRolesPanel = lazy(async () => {
  const m = await import("../components/usalama/SecurityRolesPanel");
  return { default: m.SecurityRolesPanel };
});
export const SecuritySessionsPanel = lazy(async () => {
  const m = await import("../components/usalama/SecuritySessionsPanel");
  return { default: m.SecuritySessionsPanel };
});
export const VisibilityRulesPanel = lazy(async () => {
  const m = await import("../components/usalama/VisibilityRulesPanel");
  return { default: m.VisibilityRulesPanel };
});
export const ChurchFamiliesPanel = lazy(async () => {
  const m = await import("../components/waumini/ChurchFamiliesPanel");
  return { default: m.ChurchFamiliesPanel };
});
export const ChurchMembersPanel = lazy(async () => {
  const m = await import("../components/waumini/ChurchMembersPanel");
  return { default: m.ChurchMembersPanel };
});
export const ChurchSchoolLogsPanel = lazy(async () => {
  const m = await import("../components/taasisi/ChurchSchoolLogsPanel");
  return { default: m.ChurchSchoolLogsPanel };
});
export const DomainEntitiesPanel = lazy(async () => {
  const m = await import("../components/domain/DomainEntitiesPanel");
  return { default: m.DomainEntitiesPanel };
});
export const HierarchyTreeView = lazy(async () => {
  const m = await import("../components/muundo/HierarchyTreeView");
  return { default: m.HierarchyTreeView };
});
export const MasterBranchExecutiveDashboard = lazy(async () => {
  const m = await import("../components/branch-engine/MasterBranchExecutiveDashboard");
  return { default: m.MasterBranchExecutiveDashboard };
});
export const GenericModuleView = lazy(async () => {
  const m = await import("../components/modules/GenericModuleView");
  return { default: m.GenericModuleView };
});
export const ChurchDocumentsPanel = lazy(async () => {
  const m = await import("../components/portal/ChurchDocumentsPanel");
  return { default: m.ChurchDocumentsPanel };
});
export const DeveloperProfilePanel = lazy(async () => {
  const m = await import("../components/portal/DeveloperProfilePanel");
  return { default: m.DeveloperProfilePanel };
});
export const SermonsPanel = lazy(async () => {
  const m = await import("../components/portal/SermonsPanel");
  return { default: m.SermonsPanel };
});
export const EventsPanel = lazy(async () => {
  const m = await import("../components/stage2/EventsPanel");
  return { default: m.EventsPanel };
});
export const GalleryPanel = lazy(async () => {
  const m = await import("../components/stage2/GalleryPanel");
  return { default: m.GalleryPanel };
});
export const HabariPanel = lazy(async () => {
  const m = await import("../components/stage2/HabariPanel");
  return { default: m.HabariPanel };
});
export const VideoLibraryPanel = lazy(async () => {
  const m = await import("../components/stage2/VideoLibraryPanel");
  return { default: m.VideoLibraryPanel };
});
export const AudioLibraryPanel = lazy(async () => {
  const m = await import("../components/stage2/AudioLibraryPanel");
  return { default: m.AudioLibraryPanel };
});
export const AnalyticsDashboardPanel = lazy(async () => {
  const m = await import("../components/stage3/AnalyticsDashboardPanel");
  return { default: m.AnalyticsDashboardPanel };
});
export const AIAssistantPanel = lazy(async () => {
  const m = await import("../components/ai/AIAssistantPanel");
  return { default: m.AIAssistantPanel };
});
export const FileManagerPanel = lazy(async () => {
  const m = await import("../components/stage3/FileManagerPanel");
  return { default: m.FileManagerPanel };
});
export const LiveStreamPanel = lazy(async () => {
  const m = await import("../components/stage3/LiveStreamPanel");
  return { default: m.LiveStreamPanel };
});
export const NotificationsCenterPanel = lazy(async () => {
  const m = await import("../components/notifications/NotificationsCenterPanel");
  return { default: m.NotificationsCenterPanel };
});
export const AttendancePanel = lazy(async () => {
  const m = await import("../components/attendance/AttendancePanel");
  return { default: m.AttendancePanel };
});
export const AidManagementPanel = lazy(async () => {
  const m = await import("../components/aid/AidManagementPanel");
  return { default: m.AidManagementPanel };
});
export const CommunicationsPanel = lazy(async () => {
  const m = await import("../components/communications/CommunicationsPanel");
  return { default: m.CommunicationsPanel };
});
export const RegistrationRequestsPanel = lazy(async () => {
  const m = await import("../components/registration/RegistrationRequestsPanel");
  return { default: m.RegistrationRequestsPanel };
});
export const InvitePromotePermissionsPanel = lazy(async () => {
  const m = await import("../components/invite/InvitePromotePermissionsPanel");
  return { default: m.InvitePromotePermissionsPanel };
});
export const EnterpriseLeadershipHub = lazy(async () => {
  const m = await import("../components/viongozi/EnterpriseLeadershipHub");
  return { default: m.EnterpriseLeadershipHub };
});
export const AboutKmktPanel = lazy(async () => {
  const m = await import("../components/site/AboutKmktPanel");
  return { default: m.AboutKmktPanel };
});
export const SiteBrandingPanel = lazy(async () => {
  const m = await import("../components/site/SiteBrandingPanel");
  return { default: m.SiteBrandingPanel };
});
