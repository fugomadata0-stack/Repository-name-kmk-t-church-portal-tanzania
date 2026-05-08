# Final Quality Audit Checklist (KMK(T) National Portal)

Tumia checklist hii kabla ya release ya production.

## 1) Link Integrity
- [ ] Kila `href` ya ndani ina file halisi
- [ ] Hakuna broken route ya module
- [ ] Public pages na admin pages zimetenganishwa vizuri

## 2) Module Baseline
- [ ] Add
- [ ] Edit
- [ ] Delete/Archive
- [ ] View
- [ ] Search
- [ ] Filter
- [ ] Print
- [ ] Export PDF
- [ ] Export Excel
- [ ] Add Category
- [ ] Add Type
- [ ] Add Custom Field
- [ ] Add Custom Section

## 3) Form Quality
- [ ] Required fields zimewekwa
- [ ] Validation inafanya kazi
- [ ] Save Draft ipo
- [ ] Submit ipo
- [ ] Reset/Cancel zipo
- [ ] Upload files ipo kwa modules zinazohitaji
- [ ] Preview before submit ipo kwa records muhimu

## 4) Status Consistency
- [ ] Haijawasilishwa / Not Submitted
- [ ] Rasimu / Draft
- [ ] Imewasilishwa / Submitted
- [ ] Inasubiri / Pending
- [ ] Inakaguliwa / Under Review
- [ ] Imeidhinishwa / Approved
- [ ] Imekataliwa / Rejected
- [ ] Imekamilika / Completed
- [ ] Haijakamilika / Not Completed
- [ ] Inahitaji Marekebisho / Needs Correction
- [ ] Imewasilishwa Tena / Resubmitted
- [ ] Imehifadhiwa / Archived

## 5) Security
- [ ] Supabase Auth enabled
- [ ] RLS enabled on protected tables
- [ ] No plain passwords in UI/storage
- [ ] Chief Admin protections enforced
- [ ] Super Admin max slots = 4 enforced
- [ ] Local scope restrictions (dayosisi/jimbo/branch) enforced
- [ ] Confidential fields restricted by role

## 6) Table UX
- [ ] Centered title + subtitle
- [ ] Search + filter
- [ ] Sort + pagination
- [ ] Status badges + row highlights
- [ ] Sticky header
- [ ] Export/print buttons
- [ ] Empty/loading/error states
- [ ] Responsive mobile fallback

## 7) Audit & Notifications
- [ ] Login/logout tracked
- [ ] Registration tracked
- [ ] Role/slot actions tracked
- [ ] Submit/approve/reject/correction tracked
- [ ] Export/print tracked
- [ ] File upload/delete tracked
- [ ] Chief override tracked
- [ ] Notifications flow active (In-app now; Email/SMS/WhatsApp ready)
