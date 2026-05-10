insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('profile-images', 'profile-images', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('cover-images', 'cover-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('post-images', 'post-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('post-pdfs', 'post-pdfs', true, 10485760, array['application/pdf'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read for Vyntra storage" on storage.objects;
create policy "Public read for Vyntra storage"
on storage.objects for select
using (bucket_id in ('profile-images', 'cover-images', 'post-images', 'post-pdfs'));

drop policy if exists "Users upload own Vyntra files" on storage.objects;
create policy "Users upload own Vyntra files"
on storage.objects for insert
with check (
  bucket_id in ('profile-images', 'cover-images', 'post-images', 'post-pdfs')
  and auth.role() = 'authenticated'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users update own Vyntra files" on storage.objects;
create policy "Users update own Vyntra files"
on storage.objects for update
using (
  bucket_id in ('profile-images', 'cover-images', 'post-images', 'post-pdfs')
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id in ('profile-images', 'cover-images', 'post-images', 'post-pdfs')
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users delete own Vyntra files" on storage.objects;
create policy "Users delete own Vyntra files"
on storage.objects for delete
using (
  bucket_id in ('profile-images', 'cover-images', 'post-images', 'post-pdfs')
  and auth.uid()::text = (storage.foldername(name))[1]
);
