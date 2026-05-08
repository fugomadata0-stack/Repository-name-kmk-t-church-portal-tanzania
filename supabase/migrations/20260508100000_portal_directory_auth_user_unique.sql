-- Moja kwa moja: zuia safu mbili za portal_directory_profiles zikiwa na auth_user_id sawa
-- (kusababisha shida ya maybeSingle / kuzuiliwa kwa watumiaji halali).
-- Haiwezi kudhoofisha RLS ya jedwali la kanisa — ni kwenye portal directory tu.

create unique index if not exists portal_directory_profiles_one_auth_user
  on public.portal_directory_profiles (auth_user_id)
  where auth_user_id is not null;
