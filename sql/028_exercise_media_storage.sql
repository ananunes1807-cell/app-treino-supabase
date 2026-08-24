-- Execute este arquivo no Supabase SQL Editor para habilitar o upload de imagens.
-- Fonte canonica: supabase/migrations/20260824000100_exercise_media_storage.sql

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exercise-media', 'exercise-media', true, 2097152, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists alion_exercise_media_public_read on storage.objects;
create policy alion_exercise_media_public_read on storage.objects for select to public
using (bucket_id = 'exercise-media');

drop policy if exists alion_exercise_media_admin_insert on storage.objects;
create policy alion_exercise_media_admin_insert on storage.objects for insert to authenticated
with check (bucket_id = 'exercise-media' and (storage.foldername(name))[1] = 'images' and (storage.foldername(name))[2] in ('default', 'masculino', 'feminino') and public.is_current_admin_ti());

drop policy if exists alion_exercise_media_admin_update on storage.objects;
create policy alion_exercise_media_admin_update on storage.objects for update to authenticated
using (bucket_id = 'exercise-media' and public.is_current_admin_ti())
with check (bucket_id = 'exercise-media' and (storage.foldername(name))[1] = 'images' and (storage.foldername(name))[2] in ('default', 'masculino', 'feminino') and public.is_current_admin_ti());

drop policy if exists alion_exercise_media_admin_delete on storage.objects;
create policy alion_exercise_media_admin_delete on storage.objects for delete to authenticated
using (bucket_id = 'exercise-media' and public.is_current_admin_ti());
