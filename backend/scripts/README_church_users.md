# Church Users (multiusuário por igreja)

Ordem de execução no Supabase SQL Editor:

1. **create_church_users_table.sql** – Cria os enums `church_user_role` e `church_user_status`, a tabela `church_users`, índices, trigger de `updated_at` e comentários.
2. **migrate_church_users_owners.sql** – Insere um registro `owner` em `church_users` para cada igreja existente (`churches.user_id`).

Após rodar os dois scripts, o backend passa a usar `church_users` para resolver igreja e papel do usuário (com fallback para `churches.user_id` quando não houver linha em `church_users`).
