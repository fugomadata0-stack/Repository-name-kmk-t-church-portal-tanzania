-- Extend document_kind checks for promotion + recognition PDF types (additive only).

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'leadership_official_certificates_document_kind_check'
  ) then
    alter table public.leadership_official_certificates
      drop constraint leadership_official_certificates_document_kind_check;
  end if;
exception when others then
  null;
end $$;

alter table public.leadership_official_certificates
  add constraint leadership_official_certificates_document_kind_check
  check (
    document_kind in (
      'appointment_certificate',
      'executive_cv',
      'leadership_profile_pdf',
      'appointment_letter',
      'service_certificate',
      'identity_card',
      'promotion_certificate',
      'recognition_certificate'
    )
  );

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'leadership_credential_issues_document_kind_check'
  ) then
    alter table public.leadership_credential_issues
      drop constraint leadership_credential_issues_document_kind_check;
  end if;
exception when others then
  null;
end $$;

alter table public.leadership_credential_issues
  add constraint leadership_credential_issues_document_kind_check
  check (
    document_kind in (
      'appointment_certificate',
      'executive_cv',
      'leadership_profile_pdf',
      'appointment_letter',
      'service_certificate',
      'identity_card',
      'promotion_certificate',
      'recognition_certificate'
    )
  );

notify pgrst, 'reload schema';
