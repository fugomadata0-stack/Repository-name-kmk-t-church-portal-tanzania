import { getSafeSupabase } from "./phase-integration-core.js";
import { normalizePayloadByFieldMap } from "./utils/input-normalization.js";
import { emitRealtimeEnterprise } from "./hooks/use-realtime-enterprise.js";

const store = {
  mode: "mock",
  members: [
    { id:1,first_name:"Paul",middle_name:"",last_name:"Mushi",full_name:"PAUL MUSHI",gender:"Mwanaume",dob:"1992-03-05",age:34,phone:"0715000011",email:"paul@kmkt.or.tz",marital_status:"Married",occupation:"Mwalimu",dayosisi:"DAR ES SALAAM",jimbo:"KATI",branch:"AMANI",home_address:"SINZA",current_address:"SINZA",baptism_status:"Baptized",catechism_status:"Completed",communion_status:"Using",family_group:"FAMILIA YA MUSHI",household_head:"PAUL MUSHI",family_links:"Grace Mushi; Esther Mushi",jumuiya_joined:"Jumuiya ya Amani",departments_serving:"Kwaya",choir_membership:"Kwaya Kuu",talents_gifts:"Music",attendance_summary:"Average 4/4 weekly",membership_category:"FULL MEMBER",member_type:"ADULT",spiritual_milestone:"Baptism 2019",sacrament_field:"Communion",custom_field:"-",custom_section:"-",member_photo:"👤",notes:"-",restricted_visibility:"Internal",status:"Active",profile_status:"Complete",approval_status:"Approved",is_archived:false},
    { id:2,first_name:"Grace",middle_name:"",last_name:"Ndalichako",full_name:"GRACE NDALICHAKO",gender:"Mwanamke",dob:"1997-09-10",age:29,phone:"0715000012",email:"",marital_status:"Single",occupation:"Nurse",dayosisi:"MWANZA",jimbo:"ZIWA",branch:"NEEMA",home_address:"MWANZA",current_address:"MWANZA",baptism_status:"Baptized",catechism_status:"Completed",communion_status:"Using",family_group:"FAMILIA YA NDALICHAKO",household_head:"JOSEPH NDALICHAKO",family_links:"-",jumuiya_joined:"Jumuiya ya Neema",departments_serving:"Wanawake",choir_membership:"-",talents_gifts:"Teaching",attendance_summary:"Average 3/4 weekly",membership_category:"FULL MEMBER",member_type:"YOUTH",spiritual_milestone:"New Convert 2021",sacrament_field:"Communion",custom_field:"-",custom_section:"-",member_photo:"👤",notes:"-",restricted_visibility:"Restricted",status:"Catechism Student",profile_status:"Incomplete",approval_status:"Submitted",is_archived:false},
  ],
  families: [{ id:1,jina:"Familia ya Mushi",mkuu:"Paul Mushi",idadi:5,tawi:"Amani",simu:"0715000011",status:"active",members:["Paul Mushi","Grace Mushi","Esther Mushi"] }],
  baptisms: [{ id:1,muumini:"Paul Mushi",tarehe:"2019-03-02",mahali:"Dar",mchungaji:"Mch. Daniel",cert:"BPT-001",status:"verified" }],
  documents: [{ id:1,muumini:"Paul Mushi",aina:"ID",file:"id-paul.pdf",uploaded:"2026-04-26",visibility:"restricted" }],
  catechism: [{ id: 1, muumini: "GRACE NDALICHAKO", darasa: "CLASS A", teacher: "MCH. DANIEL", start_date: "2026-01-10", completion_date: "", progress: 75, status: "In Progress", certificate: "-" }],
  talents: [{ id: 1, muumini: "PAUL MUSHI", talent: "UIMBAJI", category: "MUSIC", ministry_linked: "KWAYA", skill_level: "Advanced", availability: "Weekend", status: "Active" }],
  transfers: [{ id: 1, muumini: "PAUL MUSHI", from_dayosisi: "DAR ES SALAAM", from_jimbo: "KATI", from_tawi: "AMANI", to_dayosisi: "MWANZA", to_jimbo: "ZIWA", to_tawi: "NEEMA", reason: "FAMILY MOVE", transfer_date: "2026-03-11", approval_status: "Under Review" }],
};

function useSupabase(){ return !!getSafeSupabase(); }
export function getMode(){ return store.mode; }

function getSessionScope() {
  try {
    const s = JSON.parse(localStorage.getItem("kmt_session") || "{}");
    return {
      role: String(s.role || "member"),
      dayosisi: String(s.dayosisi || "").toUpperCase(),
      jimbo: String(s.jimbo || "").toUpperCase(),
      tawi: String(s.tawi || "").toUpperCase(),
    };
  } catch {
    return { role: "member", dayosisi: "", jimbo: "", tawi: "" };
  }
}

async function writeMemberAudit(action, description, payload = {}) {
  const row = {
    action,
    description,
    payload,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: "active",
    approval_status: "approved",
    is_archived: false,
    archived_at: null,
    archived_by: null,
  };
  if (!useSupabase()) return;
  await getSafeSupabase().from("member_audit_logs").insert(row);
}

function emitMembersRealtime(action, payload = {}) {
  emitRealtimeEnterprise({
    module: "members",
    action,
    payload,
    at: new Date().toISOString(),
  });
}

function postgrestOrEqTwoCols(colA, colB, raw) {
  const val = String(raw).trim();
  if (!val) return "";
  const token = /^[a-zA-Z0-9_-]+$/.test(val) ? val : `"${val.replace(/"/g, '""')}"`;
  return `${colA}.eq.${token},${colB}.eq.${token}`;
}

function applyMemberScopeQuery(query) {
  const scope = getSessionScope();
  if (scope.role === "super_admin" || scope.role === "chief_admin" || scope.role === "admin" || scope.role === "national_admin") return query;
  if (scope.role === "dayosisi_admin" && scope.dayosisi) return query.eq("dayosisi", scope.dayosisi);
  if (scope.role === "jimbo_admin" && scope.jimbo) return query.eq("jimbo", scope.jimbo);
  if (scope.role === "tawi_admin" && scope.tawi) {
    const orExpr = postgrestOrEqTwoCols("tawi", "branch", scope.tawi);
    if (!orExpr) return query;
    return query.or(orExpr);
  }
  return query.neq("restricted_visibility", "Restricted");
}

export async function loadAllMembersData(){
  if(!useSupabase()){ store.mode = "mock"; return; }
  store.mode = "supabase";
  const s = getSafeSupabase();
  const membersScoped = applyMemberScopeQuery(s.from("members").select("*")).order("id",{ascending:false});
  const [m,f,b,d] = await Promise.all([
    membersScoped,
    s.from("member_families").select("*").order("id",{ascending:false}),
    s.from("baptism_records").select("*").order("id",{ascending:false}),
    s.from("member_documents").select("*").order("id",{ascending:false}),
  ]);
  if(!m.error) store.members = m.data || [];
  if(!f.error) store.families = f.data || [];
  if(!b.error) store.baptisms = b.data || [];
  if(!d.error) store.documents = d.data || [];
}

export const getMembers = ()=>[...store.members];
export const getFamilies = ()=>[...store.families];
export const getBaptisms = ()=>[...store.baptisms];
export const getMemberDocs = ()=>[...store.documents];
export const getCatechism = ()=>[...store.catechism];
export const getTalents = ()=>[...store.talents];
export const getTransfers = ()=>[...store.transfers];

export async function saveMember(payload, editId=null){
  const normalized = normalizePayloadByFieldMap(payload, {
    email: { preserveCase: true },
    notes: { preserveCase: true },
    custom_section: { preserveCase: true },
    attendance_summary: { preserveCase: true },
  });
  const row = { ...normalized, profile_status: normalized.profile_status || "Incomplete", approval_status: normalized.approval_status || "Draft", is_archived: !!normalized.is_archived };
  if(!useSupabase()){
    if(editId) store.members = store.members.map(r=>r.id===editId?{...r,...row}:r);
    else store.members.unshift({id:Date.now(),...row});
    emitMembersRealtime(editId ? "update" : "insert", { id: editId, full_name: row.full_name });
    return writeMemberAudit(editId ? "edit_member" : "add_member", row.full_name || "member", row);
  }
  const s = getSafeSupabase();
  const scope = getSessionScope();
  const actor = scope.role || "member";
  const rowWithAudit = { ...row, updated_by: actor, created_by: row.created_by || actor };
  const q = editId ? s.from("members").update(rowWithAudit).eq("id",editId) : s.from("members").insert(rowWithAudit);
  const { error } = await q; if(error) throw error;
  emitMembersRealtime(editId ? "update" : "insert", { id: editId, full_name: row.full_name });
  await writeMemberAudit(editId ? "edit_member" : "add_member", row.full_name || "member", { id: editId, ...rowWithAudit });
  await loadAllMembersData();
}
export async function deleteMember(id){
  if(!useSupabase()){
    store.members = store.members.map(r=>r.id!==id?r:{...r,status:"Archived",approval_status:"Archived",is_archived:true});
    emitMembersRealtime("archive", { id });
    return writeMemberAudit("archive_member", `member_${id}`, { id });
  }
  const scope = getSessionScope();
  const { error } = await getSafeSupabase().from("members").update({ status: "Archived", approval_status: "Archived", is_archived: true, archived_at: new Date().toISOString(), archived_by: scope.role || "member" }).eq("id",id); if(error) throw error;
  emitMembersRealtime("archive", { id });
  await writeMemberAudit("archive_member", `member_${id}`, { id });
  await loadAllMembersData();
}
export async function clearMembers(){
  if(!useSupabase()){
    store.members = store.members.map((r)=>({ ...r, status: "Archived", approval_status: "Archived", is_archived: true }));
    emitMembersRealtime("archive_all", {});
    return writeMemberAudit("archive_all_members", "all_members", {});
  }
  const scope = getSessionScope();
  const scopedQuery = applyMemberScopeQuery(getSafeSupabase().from("members").update({ status: "Archived", approval_status: "Archived", is_archived: true, archived_at: new Date().toISOString(), archived_by: scope.role || "member" }));
  const { error } = await scopedQuery.neq("id",-1);
  if(error) throw error;
  emitMembersRealtime("archive_all", {});
  await writeMemberAudit("archive_all_members", "scoped_members", {});
  await loadAllMembersData();
}

export async function submitMember(id, actor = "SYSTEM") {
  const row = store.members.find((r) => r.id === id);
  if (!row) return;
  await saveMember({ ...row, approval_status: "Submitted", status: "Submitted", submitted_by: actor, submitted_at: new Date().toISOString() }, id);
  emitMembersRealtime("submit", { id, actor });
  await writeMemberAudit("submit_member", `member_${id}`, { id, actor });
}
export async function approveMember(id, actor = "SYSTEM") {
  const row = store.members.find((r) => r.id === id);
  if (!row) return;
  await saveMember({ ...row, approval_status: "Approved", status: "Active", approved_by: actor, approved_at: new Date().toISOString() }, id);
  emitMembersRealtime("approve", { id, actor });
  await writeMemberAudit("approve_member", `member_${id}`, { id, actor });
}
export async function rejectMember(id, actor = "SYSTEM") {
  const row = store.members.find((r) => r.id === id);
  if (!row) return;
  await saveMember({ ...row, approval_status: "Rejected", status: "Rejected", rejected_by: actor, rejected_at: new Date().toISOString() }, id);
  emitMembersRealtime("reject", { id, actor });
  await writeMemberAudit("reject_member", `member_${id}`, { id, actor });
}
export async function requestMemberCorrection(id, actor = "SYSTEM") {
  const row = store.members.find((r) => r.id === id);
  if (!row) return;
  await saveMember({ ...row, approval_status: "Needs Correction", status: "Needs Correction", reviewed_by: actor }, id);
  emitMembersRealtime("correction", { id, actor });
  await writeMemberAudit("request_member_correction", `member_${id}`, { id, actor });
}
export async function restoreMember(id, actor = "SYSTEM") {
  const row = store.members.find((r) => r.id === id);
  if (!row) return;
  await saveMember({ ...row, is_archived: false, approval_status: "Draft", status: "Active", archived_at: null, archived_by: null, updated_by: actor }, id);
  emitMembersRealtime("restore", { id, actor });
  await writeMemberAudit("restore_member", `member_${id}`, { id, actor });
}

export async function saveFamily(payload){ if(!useSupabase()){ store.families.unshift({id:Date.now(),...payload}); return; } const { error } = await getSafeSupabase().from("member_families").insert(payload); if(error) throw error; await loadAllMembersData(); }
export async function clearFamilies(){ if(!useSupabase()){ store.families=[]; return; } const { error } = await getSafeSupabase().from("member_families").delete().neq("id",-1); if(error) throw error; await loadAllMembersData(); }
export async function deleteFamily(id){ if(!useSupabase()){ store.families=store.families.filter(r=>r.id!==id); return; } const { error } = await getSafeSupabase().from("member_families").delete().eq("id",id); if(error) throw error; await loadAllMembersData(); }

export async function saveBaptism(payload){ if(!useSupabase()){ store.baptisms.unshift({id:Date.now(),...payload}); return; } const { error } = await getSafeSupabase().from("baptism_records").insert(payload); if(error) throw error; await loadAllMembersData(); }
export async function clearBaptisms(){ if(!useSupabase()){ store.baptisms=[]; return; } const { error } = await getSafeSupabase().from("baptism_records").delete().neq("id",-1); if(error) throw error; await loadAllMembersData(); }
export async function deleteBaptism(id){ if(!useSupabase()){ store.baptisms=store.baptisms.filter(r=>r.id!==id); return; } const { error } = await getSafeSupabase().from("baptism_records").delete().eq("id",id); if(error) throw error; await loadAllMembersData(); }

export async function saveMemberDoc(payload){ if(!useSupabase()){ store.documents.unshift({id:Date.now(),...payload}); return; } const { error } = await getSafeSupabase().from("member_documents").insert(payload); if(error) throw error; await loadAllMembersData(); }
export async function clearMemberDocs(){ if(!useSupabase()){ store.documents=[]; return; } const { error } = await getSafeSupabase().from("member_documents").delete().neq("id",-1); if(error) throw error; await loadAllMembersData(); }
export async function deleteMemberDoc(id){ if(!useSupabase()){ store.documents=store.documents.filter(r=>r.id!==id); return; } const { error } = await getSafeSupabase().from("member_documents").delete().eq("id",id); if(error) throw error; await loadAllMembersData(); }

export async function uploadMemberAsset(file, folder="member-docs"){
  if(!useSupabase()) return { url:`mock://${folder}/${file.name}` };
  const name = `${Date.now()}-${file.name.replace(/\s+/g,"_")}`;
  const path = `${folder}/${name}`;
  const s = getSafeSupabase();
  const { error } = await s.storage.from("members-assets").upload(path,file,{upsert:false});
  if(error) throw error;
  const { data } = s.storage.from("members-assets").getPublicUrl(path);
  return { url:data.publicUrl };
}

export function getMemberFilterOptions(){
  const rows = store.members;
  const uniq = (arr) => [...new Set(arr.filter((v) => String(v || "").trim()))];
  return {
    dayosisi: uniq(rows.map(r=>r.dayosisi)), jimbo: uniq(rows.map(r=>r.jimbo)), tawi: uniq(rows.map(r=>r.branch)),
    jinsia: uniq(rows.map(r=>r.gender)), ubatizo: uniq(rows.map(r=>r.baptism_status)), uanachama: uniq(rows.map(r=>r.membership_category)),
    huduma: uniq(rows.map(r=>r.departments_serving)), status: uniq(rows.map(r=>r.status)),
  };
}

export async function logMemberActivityDb(role, action, description, payload = {}){
  if(!useSupabase()) return;
  await getSafeSupabase().from("activity_logs").insert({ actor_role: role, module: "members", action, description, payload });
}
