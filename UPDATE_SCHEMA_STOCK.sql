-- SupabaseのSQLエディタで実行してください。
-- 既存のproductsテーブルに在庫（stock）カラムを追加します。

ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 0;

-- 既存の全商品の在庫をとりあえず10個に設定する場合（任意）
-- UPDATE products SET stock = 10;
