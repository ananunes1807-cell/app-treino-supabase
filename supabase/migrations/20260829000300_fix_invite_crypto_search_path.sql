begin;

-- O Supabase instala pgcrypto no schema extensions. A RPC usa SECURITY DEFINER
-- e precisa declarar esse schema explicitamente para resolver gen_random_bytes.
alter function public.create_or_get_student_invite(uuid, text, boolean)
set search_path = public, extensions;

commit;
