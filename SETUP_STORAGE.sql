-- SupabaseのSQLエディタでこのSQLを実行して、画像保存用の「バケット」を作成してください。
-- 注：もし権限エラーになる場合は、Supabaseの左メニュー「Storage」から
-- 'product-images' という名前で「Public Bucket」を手動で作成してください。

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- 誰でも画像を閲覧できるようにする設定
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'product-images' );

-- 誰でも画像をアップロードできるようにする設定（本番では認証制限を推奨）
create policy "Allow Uploads"
  on storage.objects for insert
  with check ( bucket_id = 'product-images' );
