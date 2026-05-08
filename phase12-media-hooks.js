export const mediaRoleAccess = {
  super_admin: { add: true, edit: true, delete: true, clear: true, export: true, feature: true, share: true },
  admin: { add: true, edit: true, delete: true, clear: true, export: true, feature: true, share: true },
  media_admin: { add: true, edit: true, delete: false, clear: false, export: true, feature: true, share: true },
  askofu_dayosisi: { add: true, edit: true, delete: false, clear: false, export: true, feature: false, share: true },
  member: { add: false, edit: false, delete: false, clear: false, export: false, feature: false, share: true },
};

export const mediaFields = [
  { key: "title", label: "Title", required: true },
  { key: "type", label: "Type", options: ["Video", "Audio", "PDF", "Image", "DOC", "PPT"], required: true },
  { key: "category", label: "Category", required: true },
  { key: "dayosisi", label: "Dayosisi", required: true },
  { key: "jimbo", label: "Jimbo", required: true },
  { key: "tawi", label: "Tawi", required: true },
  { key: "speaker", label: "Preacher / Speaker", required: true },
  { key: "date", label: "Date", type: "date", required: true },
  { key: "description", label: "Description", textarea: true },
  { key: "tags", label: "Tags", required: false },
  { key: "thumbnail", label: "Thumbnail placeholder", required: false },
  { key: "file", label: "File placeholder", required: false },
  { key: "visibility", label: "Visibility", options: ["public", "private", "members"], required: true },
  { key: "status", label: "Status", options: ["draft", "published", "archived"], required: true },
];
