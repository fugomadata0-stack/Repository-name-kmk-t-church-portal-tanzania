const modules = [
  "dashboard",
  "developer",
  "documents",
  "mahubiri",
  "muundo",
  "viongozi",
  "waumini",
  "jumuiya",
  "taasisi",
  "matukio",
  "machapisho",
  "nyaraka",
  "fedha",
  "mapato_income",
  "vyanzo_mapato",
  "ripoti",
  "communications",
  "mipangilio",
  "usalama",
  "super_admin",
];
const fullAccess = new Set(modules);
const limitedMap = {
  super_admin: [...fullAccess],
  chief_admin: [...fullAccess].filter((m) => m !== "super_admin"),
  national_admin: [...fullAccess].filter((m) => m !== "super_admin" && m !== "usalama"),
  office_admin: [...fullAccess].filter((m) => m !== "super_admin" && m !== "usalama"),
  finance_admin: ["dashboard", "fedha", "mapato_income", "vyanzo_mapato", "ripoti", "communications", "nyaraka", "muundo"],
  secretary: ["dashboard", "waumini", "matukio", "communications", "nyaraka", "jumuiya", "machapisho", "muundo"],
  approver: ["dashboard", "nyaraka", "fedha", "mapato_income", "ripoti", "communications"],
  reviewer: ["dashboard", "ripoti", "waumini", "viongozi", "muundo", "fedha", "mapato_income"],
  dayosisi_admin: ["dashboard", "muundo", "viongozi", "waumini", "jumuiya", "matukio", "fedha", "vyanzo_mapato", "ripoti", "communications"],
  jimbo_admin: ["dashboard", "muundo", "viongozi", "waumini", "jumuiya", "matukio", "fedha", "vyanzo_mapato", "ripoti"],
  tawi_admin: ["dashboard", "muundo", "viongozi", "waumini", "jumuiya", "matukio"],
  viewer: ["dashboard", "ripoti"],
};

function canView(role, m) {
  return limitedMap[role]?.includes(m) ?? false;
}
function canCreate(role, m) {
  if (role === "viewer" || role === "reviewer" || role === "approver") return false;
  return canView(role, m);
}
function canEdit(role, m) {
  if (["viewer", "reviewer", "tawi_admin"].includes(role)) return false;
  if (role === "approver") return ["nyaraka", "fedha", "mapato_income", "communications"].includes(m);
  return canView(role, m);
}
function canDelete(role, m) {
  if (!["super_admin", "chief_admin", "national_admin"].includes(role)) return false;
  return canView(role, m);
}
function canExport(role, m) {
  return canView(role, m);
}
function canAudit(role, m) {
  return canView(role, m) && ["usalama", "fedha", "mipangilio", "super_admin"].includes(m);
}

const roles = Object.keys(limitedMap);
const rows = [];
for (const role of roles) {
  for (const m of modules) {
    rows.push(
      `('${role}', '${m}', ${canView(role, m)}, ${canCreate(role, m)}, ${canEdit(role, m)}, ${canDelete(
        role,
        m
      )}, ${canExport(role, m)}, ${canAudit(role, m)})`
    );
  }
}
process.stdout.write(rows.join(",\n"));
