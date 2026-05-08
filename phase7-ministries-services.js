import { getSafeSupabase } from "./phase-integration-core.js";

const state = {
  mode: "mock",
  ministries: [
    { id:1,module:"Machapisho ya Kanisa / Digital Library",name:"Katiba ya Kanisa - Toleo 2026",title:"Katiba ya Kanisa",short_code:"KAT-2026",scope:"National",category:"Katiba ya Kanisa",type:"PDF",language:"Kiswahili",description:"Toleo rasmi la katiba",author_source:"KMK(T) HQ",file_upload:"katiba-2026.pdf",cover_image:"cover-katiba.jpg",tags:"katiba, official",access_level:"Internal",version:"v2.0",download_counter:120,status:"active",approval_status:"approved",publish_stage:"publish"},
    { id:2,module:"Media / Habari / Gallery",name:"Pasaka Highlights",short_code:"MEDIA-PASAKA",scope:"National",category:"Event highlights",type:"Video",news:"Pasaka events",media:"video-gallery",documents:"highlights.zip",status:"active",approval_status:"approved",publish_stage:"publish"},
    { id:3,module:"Ratiba / Events / Makambi / Mikutano",name:"Kambi ya Vijana Taifa",event_name:"Kambi ya Vijana Taifa",short_code:"EVENT-YCAMP",scope:"National",category:"Makambi",type:"Youth events",event_level:"National",dayosisi:"Mara",jimbo:"Musoma Kaskazini",branch:"Amani",date:"2026-08-10",venue:"Musoma Grounds",theme:"Imani na Huduma",scripture_reference:"1 Tim 4:12",speakers:"Askofu Mkuu",program_schedule:"Day 1-3",registration:"Open",attendance:"Expected 500",reports:"Pending",media:"photo/video",status:"active",approval_status:"pending",publish_stage:"review"},
    { id:4,module:"Official Document Center",name:"Strategic Plan 2026-2030",short_code:"DOC-SP2030",scope:"National",category:"Strategic plans",type:"Policy",documents:"strategic-plan.pdf",document_type:"Strategic plans",report_type:"Planning Report",status:"active",approval_status:"approved",publish_stage:"publish"},
    { id:5,module:"MWC Global Relations",name:"KMT - MWC Relationship",short_code:"MWC-REL",scope:"Global",mwc_intro:"Intro page ya ushirika wa KMT na MWC",affiliation_details:"Affiliated Member",representatives:"2 reps",global_events:"MWC Assembly",conferences:"Regional Summit",news:"Global updates",resources:"MWC resource links",documents:"mwc-docs.pdf",external_links:"https://mwc-cmm.org",status:"active",approval_status:"approved",publish_stage:"publish"},
  ],
  members: [{ id:1,jina:"Paul Mushi",idara:"Vijana Ministry",role:"Mjumbe",tawi:"Amani",simu:"0715000011",kujiunga:"2024-01-10",status:"active" }],
  leaders: [{ id:1,kiongozi:"Bro. John",idara:"Vijana Ministry",cheo:"Kiongozi Mkuu",dayosisi:"Dar es Salaam",jimbo:"Kati",tawi:"Amani",simu:"0714333344",email:"john@kmt.or.tz",status:"active" }],
  activities: [{ id:1,jina:"Evangelism Tour",idara:"Vijana Ministry",tarehe:"2026-05-10",mahali:"Morogoro",msimamizi:"Bro. John",washiriki:45,status:"planned" }],
  contributions: [{ id:1,idara:"Vijana Ministry",aina:"Sadaka",kiasi:250000,mlipaji:"Paul Mushi",tarehe:"2026-04-26",method:"Cash",status:"received" }],
};

const useSupabase = () => !!getSafeSupabase();
export const getMode = () => state.mode;
export const getHierarchySeed = () => {
  const dayosisi = [...new Set(state.ministries.map((r) => r.dayosisi).filter(Boolean))];
  const jimboByDayosisi = {};
  const tawiByJimbo = {};
  state.ministries.forEach((r) => {
    if (!jimboByDayosisi[r.dayosisi]) jimboByDayosisi[r.dayosisi] = [];
    if (!jimboByDayosisi[r.dayosisi].includes(r.jimbo)) jimboByDayosisi[r.dayosisi].push(r.jimbo);
    if (!tawiByJimbo[r.jimbo]) tawiByJimbo[r.jimbo] = [];
    if (!tawiByJimbo[r.jimbo].includes(r.branch)) tawiByJimbo[r.jimbo].push(r.branch);
  });
  return { dayosisi, jimboByDayosisi, tawiByJimbo };
};

export async function loadAllMinistryData() {
  if (!useSupabase()) { state.mode = "mock"; return; }
  state.mode = "supabase";
  const s = getSafeSupabase();
  const [m,mm,ml,ma,mc] = await Promise.all([
    s.from("ministries").select("*").order("id",{ascending:false}),
    s.from("ministry_members").select("*").order("id",{ascending:false}),
    s.from("ministry_leaders").select("*").order("id",{ascending:false}),
    s.from("ministry_activities").select("*").order("id",{ascending:false}),
    s.from("ministry_contributions").select("*").order("id",{ascending:false}),
  ]);
  if(!m.error) state.ministries = m.data || [];
  if(!mm.error) state.members = mm.data || [];
  if(!ml.error) state.leaders = ml.data || [];
  if(!ma.error) state.activities = ma.data || [];
  if(!mc.error) state.contributions = mc.data || [];
}

export const getMinistries = ()=>[...state.ministries];
export const getMinistryMembers = ()=>[...state.members];
export const getMinistryLeaders = ()=>[...state.leaders];
export const getMinistryActivities = ()=>[...state.activities];
export const getMinistryContributions = ()=>[...state.contributions];

export async function saveMinistry(payload, editId = null) {
  if(!useSupabase()){ if(editId) state.ministries = state.ministries.map(r=>r.id===editId?{...r,...payload}:r); else state.ministries.unshift({id:Date.now(),...payload}); return; }
  const s=getSafeSupabase(); const q=editId?s.from("ministries").update(payload).eq("id",editId):s.from("ministries").insert(payload); const {error}=await q; if(error) throw error; await loadAllMinistryData();
}
export async function deleteMinistry(id){ if(!useSupabase()){ state.ministries = state.ministries.filter(r=>r.id!==id); return; } const {error}=await getSafeSupabase().from("ministries").delete().eq("id",id); if(error) throw error; await loadAllMinistryData();}
export async function clearMinistries(){ if(!useSupabase()){ state.ministries=[]; return; } const {error}=await getSafeSupabase().from("ministries").delete().neq("id",-1); if(error) throw error; await loadAllMinistryData();}

export async function saveMinistryMember(payload, editId = null){
  if(!useSupabase()){
    if (editId) state.members = state.members.map((r) => (r.id === editId ? { ...r, ...payload } : r));
    else state.members.unshift({id:Date.now(),...payload});
    return;
  }
  const s = getSafeSupabase();
  const q = editId ? s.from("ministry_members").update(payload).eq("id", editId) : s.from("ministry_members").insert(payload);
  const {error}=await q; if(error) throw error; await loadAllMinistryData();
}
export async function deleteMinistryMember(id){ if(!useSupabase()){ state.members=state.members.filter(r=>r.id!==id); return; } const {error}=await getSafeSupabase().from("ministry_members").delete().eq("id",id); if(error) throw error; await loadAllMinistryData();}
export async function clearMinistryMembers(){ if(!useSupabase()){ state.members=[]; return; } const {error}=await getSafeSupabase().from("ministry_members").delete().neq("id",-1); if(error) throw error; await loadAllMinistryData();}

export async function saveMinistryLeader(payload, editId = null){
  if(!useSupabase()){
    if (editId) state.leaders = state.leaders.map((r) => (r.id === editId ? { ...r, ...payload } : r));
    else state.leaders.unshift({id:Date.now(),...payload});
    return;
  }
  const s = getSafeSupabase();
  const q = editId ? s.from("ministry_leaders").update(payload).eq("id", editId) : s.from("ministry_leaders").insert(payload);
  const {error}=await q; if(error) throw error; await loadAllMinistryData();
}
export async function deleteMinistryLeader(id){ if(!useSupabase()){ state.leaders=state.leaders.filter(r=>r.id!==id); return; } const {error}=await getSafeSupabase().from("ministry_leaders").delete().eq("id",id); if(error) throw error; await loadAllMinistryData();}
export async function clearMinistryLeaders(){ if(!useSupabase()){ state.leaders=[]; return; } const {error}=await getSafeSupabase().from("ministry_leaders").delete().neq("id",-1); if(error) throw error; await loadAllMinistryData();}

export async function saveMinistryActivity(payload, editId = null){
  if(!useSupabase()){
    if (editId) state.activities = state.activities.map((r) => (r.id === editId ? { ...r, ...payload } : r));
    else state.activities.unshift({id:Date.now(),...payload});
    return;
  }
  const s = getSafeSupabase();
  const q = editId ? s.from("ministry_activities").update(payload).eq("id", editId) : s.from("ministry_activities").insert(payload);
  const {error}=await q; if(error) throw error; await loadAllMinistryData();
}
export async function deleteMinistryActivity(id){ if(!useSupabase()){ state.activities=state.activities.filter(r=>r.id!==id); return; } const {error}=await getSafeSupabase().from("ministry_activities").delete().eq("id",id); if(error) throw error; await loadAllMinistryData();}
export async function clearMinistryActivities(){ if(!useSupabase()){ state.activities=[]; return; } const {error}=await getSafeSupabase().from("ministry_activities").delete().neq("id",-1); if(error) throw error; await loadAllMinistryData();}

export async function saveMinistryContribution(payload, editId = null){
  if(!useSupabase()){
    if (editId) state.contributions = state.contributions.map((r) => (r.id === editId ? { ...r, ...payload } : r));
    else state.contributions.unshift({id:Date.now(),...payload});
    return;
  }
  const s = getSafeSupabase();
  const q = editId ? s.from("ministry_contributions").update(payload).eq("id", editId) : s.from("ministry_contributions").insert(payload);
  const {error}=await q; if(error) throw error; await loadAllMinistryData();
}
export async function deleteMinistryContribution(id){ if(!useSupabase()){ state.contributions=state.contributions.filter(r=>r.id!==id); return; } const {error}=await getSafeSupabase().from("ministry_contributions").delete().eq("id",id); if(error) throw error; await loadAllMinistryData();}
export async function clearMinistryContributions(){ if(!useSupabase()){ state.contributions=[]; return; } const {error}=await getSafeSupabase().from("ministry_contributions").delete().neq("id",-1); if(error) throw error; await loadAllMinistryData();}

export function getMinistryFilterOptions(){
  const rows=state.ministries;
  const uniq = (arr) => [...new Set(arr.filter(Boolean))];
  return {
    type: uniq(rows.map(r=>r.module)),
    dayosisi: uniq(rows.map(r=>r.dayosisi)),
    jimbo: uniq(rows.map(r=>r.jimbo)),
    tawi: uniq(rows.map(r=>r.branch)),
    status: uniq(rows.map(r=>r.status)),
    leader: uniq(rows.map(r=>r.leader || r.teacher || r.director || r.name)),
  };
}

export async function logMinistryActivity(role, action, description, payload = {}){
  if(!useSupabase()) return;
  await getSafeSupabase().from("activity_logs").insert({ actor_role: role, module: "ministries", action, description, payload });
}
