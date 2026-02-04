-- 削除操作を許可するための設定（ポリシー）です。
-- SupabaseのSQLエディタで実行してください。

-- ログイン済みのユーザー（管理者）のみ削除を許可する設定
create policy "Enable delete for authenticated users" 
on reservations 
for delete 
using (auth.role() = 'authenticated');

-- ※もし上記でもうまくいかない場合、一時的に全員に許可するには以下を使います（非推奨）
-- create policy "Enable delete for everyone" on reservations for delete using (true);
