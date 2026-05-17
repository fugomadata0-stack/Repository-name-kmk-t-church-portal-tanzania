export type UploadCenterCategory =
  | "receipt"
  | "report"
  | "certificate"
  | "signature"
  | "project"
  | "contribution";

export type UploadRegistryRow = {
  id: string;
  category: UploadCenterCategory;
  bucket: string;
  file_path: string;
  public_url: string | null;
  file_name: string;
  mime_type: string | null;
  file_size_bytes: number;
  version_number: number;
  parent_upload_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  uploaded_by: string | null;
  status: "active" | "superseded" | "deleted";
  meta: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type UploadCenterCategoryConfig = {
  id: UploadCenterCategory;
  labelSw: string;
  labelEn: string;
  hint: string;
  moduleKey: string;
};
