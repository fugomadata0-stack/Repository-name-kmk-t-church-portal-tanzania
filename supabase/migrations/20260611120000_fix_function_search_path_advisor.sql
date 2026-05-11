-- Supabase advisor 0011 (function_search_path_mutable): weka search_path thabiti kwa functions za public
-- (inazuia search_path injection kwenye triggers/helpers).
-- Kila ALTER inafanywa peke yake; ikiwa moja inashindwa (mfano overload ya kiengele), zingine zinaendelea.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS fn
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (
        ARRAY[
          'notifications_touch_updated_at',
          'aid_touch_updated_at',
          'communications_touch_updated_at',
          'phase34_touch_updated_at',
          'system_alerts_touch_updated_at',
          'portal_leadership_term_autoclose',
          'portal_touch_updated_at_church_structure_entities',
          'portal_touch_attendance_updated_at',
          'portal_touch_master_settings_center',
          'portal_touch_settings_updated_at',
          'portal_generate_member_number',
          'portal_members_before_insert',
          'digest'
        ]
      )
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public', r.fn);
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'search_path: skipped % — %', r.fn, SQLERRM;
    END;
  END LOOP;
END $$;
