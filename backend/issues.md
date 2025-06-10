Pontos encontrados na validação de login:

- tentei criar um usário com cnpj já cadastrado, a requisição retornou erro corretamente, porém, o usuário foi criado no auth.user no supabase e a igreja não foi criada. Precisamos impedir que nesse cenário o usuário seja criado.