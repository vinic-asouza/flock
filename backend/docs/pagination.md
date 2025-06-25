# Paginação e Filtros Avançados - API de Membros

A API de membros agora suporta paginação completa e filtros avançados para busca e relatórios.

## Endpoints

### Listar Membros com Filtros
```
GET /api/members
```

### Gerar Relatórios
```
GET /api/members/reports
```

## Parâmetros de Query - Listagem

### Paginação
- `page` (opcional): Número da página (padrão: 1)
- `limit` (opcional): Número de itens por página (padrão: 10, máximo: 100)

### Ordenação
- `sort_by` (opcional): Campo para ordenação (padrão: 'name')
- `sort_order` (opcional): Ordem da classificação - 'asc' ou 'desc' (padrão: 'asc')

### Busca Geral
- `search` (opcional): Busca por nome, email, telefone, WhatsApp, cônjuge ou documento

### Filtros Básicos
- `active` (opcional): Filtra por status ativo (true/false)
- `role_id` (opcional): Filtra por cargo específico
- `congregation_id` (opcional): Filtra por congregação específica

### Filtros por Campos Específicos
- `gender` (opcional): Filtra por gênero ('Masculino' ou 'Feminino')
- `marital_status` (opcional): Filtra por estado civil ('Solteiro', 'Casado', 'Divorciado', 'Viúvo', 'Outro')
- `nationality` (opcional): Filtra por nacionalidade (busca parcial)
- `occupation` (opcional): Filtra por ocupação (busca parcial)
- `city` (opcional): Filtra por cidade (busca parcial)
- `state` (opcional): Filtra por estado (exato)

### Filtros por Datas
- `birth_date_from` (opcional): Data de nascimento a partir de (YYYY-MM-DD)
- `birth_date_to` (opcional): Data de nascimento até (YYYY-MM-DD)
- `baptism_date_from` (opcional): Data de batismo a partir de (YYYY-MM-DD)
- `baptism_date_to` (opcional): Data de batismo até (YYYY-MM-DD)
- `admission_date_from` (opcional): Data de admissão a partir de (YYYY-MM-DD)
- `admission_date_to` (opcional): Data de admissão até (YYYY-MM-DD)

### Filtros por Faixa Etária
- `age_from` (opcional): Idade mínima (0-150)
- `age_to` (opcional): Idade máxima (0-150)

## Exemplos de Uso - Listagem

### Listar primeira página com 10 membros
```
GET /api/members?page=1&limit=10
```

### Buscar membros por nome
```
GET /api/members?search=João&page=1&limit=20
```

### Filtrar membros ativos de um cargo específico
```
GET /api/members?active=true&role_id=123&page=1&limit=15
```

### Filtrar por faixa etária
```
GET /api/members?age_from=18&age_to=35&page=1&limit=20
```

### Filtrar por data de batismo
```
GET /api/members?baptism_date_from=2020-01-01&baptism_date_to=2023-12-31&page=1&limit=10
```

### Filtrar por gênero e estado civil
```
GET /api/members?gender=Masculino&marital_status=Casado&page=1&limit=15
```

### Ordenar por data de nascimento
```
GET /api/members?sort_by=birth&sort_order=desc&page=1&limit=10
```

### Combinação de filtros complexa
```
GET /api/members?search=Maria&active=true&role_id=123&congregation_id=456&gender=Feminino&age_from=25&age_to=50&baptism_date_from=2020-01-01&sort_by=name&sort_order=asc&page=2&limit=10
```

## Resposta - Listagem

A resposta inclui os dados dos membros, informações de paginação e filtros aplicados:

```json
{
  "data": [
    {
      "id": "1",
      "name": "João Silva",
      "email": "joao@email.com",
      "phone": "(11) 99999-9999",
      "birth": "1990-05-15",
      "gender": "Masculino",
      "marital_status": "Casado",
      "baptism_date": "2015-03-20",
      "admission_date": "2015-04-01",
      "active": true,
      "role": {
        "id": "123",
        "name": "Membro",
        "description": "Membro da igreja"
      },
      "congregation": {
        "id": "456",
        "name": "Congregação Central",
        "address": "Rua das Flores, 123",
        "city": "São Paulo",
        "state": "SP",
        "leader": "Pastor José",
        "phone": "(11) 88888-8888"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15,
    "hasNextPage": true,
    "hasPrevPage": false,
    "nextPage": 2,
    "prevPage": null
  },
  "filters": {
    "search": "João",
    "active": true,
    "role_id": "123",
    "congregation_id": null,
    "gender": "Masculino",
    "marital_status": null,
    "nationality": null,
    "occupation": null,
    "city": null,
    "state": null,
    "birth_date_from": null,
    "birth_date_to": null,
    "baptism_date_from": null,
    "baptism_date_to": null,
    "admission_date_from": null,
    "admission_date_to": null,
    "age_from": null,
    "age_to": null
  },
  "sorting": {
    "sort_by": "name",
    "sort_order": "asc"
  }
}
```

## Endpoint de Relatórios

### GET /api/members/reports

Retorna estatísticas agregadas dos membros para relatórios.

### Resposta - Relatórios

```json
{
  "summary": {
    "totalMembers": 150,
    "activeMembers": 140,
    "inactiveMembers": 10,
    "recentMembers": 5,
    "recentBaptisms": 3,
    "activePercentage": 93
  },
  "demographics": {
    "gender": {
      "Masculino": 75,
      "Feminino": 70,
      "Não informado": 5
    },
    "maritalStatus": {
      "Casado": 80,
      "Solteiro": 45,
      "Divorciado": 15,
      "Viúvo": 8,
      "Outro": 2
    },
    "ageRanges": {
      "0-12": 15,
      "13-17": 20,
      "18-25": 25,
      "26-35": 30,
      "36-50": 35,
      "51-65": 20,
      "65+": 5
    },
    "cities": {
      "São Paulo": 100,
      "Campinas": 30,
      "Santos": 20
    },
    "states": {
      "SP": 150
    }
  },
  "churchStructure": {
    "roles": {
      "Membro": 100,
      "Líder": 20,
      "Pastor": 5,
      "Sem cargo": 25
    },
    "congregations": {
      "Congregação Central": 80,
      "Congregação Norte": 40,
      "Congregação Sul": 30
    }
  },
  "timeline": {
    "baptismsByYear": {
      "2020": 15,
      "2021": 20,
      "2022": 25,
      "2023": 30
    },
    "admissionsByYear": {
      "2020": 18,
      "2021": 22,
      "2022": 28,
      "2023": 35
    }
  },
  "topOccupations": [
    { "occupation": "Professor", "count": 25 },
    { "occupation": "Engenheiro", "count": 20 },
    { "occupation": "Médico", "count": 15 },
    { "occupation": "Advogado", "count": 10 },
    { "occupation": "Administrador", "count": 8 }
  ],
  "generatedAt": "2024-01-15T10:30:00.000Z"
}
```

## Campos da Resposta

### data (Listagem)
Array com os membros da página atual

### pagination (Listagem)
- `page`: Página atual
- `limit`: Itens por página
- `total`: Total de registros encontrados
- `totalPages`: Total de páginas
- `hasNextPage`: Se existe próxima página
- `hasPrevPage`: Se existe página anterior
- `nextPage`: Número da próxima página (null se não existir)
- `prevPage`: Número da página anterior (null se não existir)

### filters (Listagem)
Valores dos filtros aplicados na consulta

### sorting (Listagem)
Informações sobre a ordenação aplicada

### summary (Relatórios)
Estatísticas gerais dos membros

### demographics (Relatórios)
Estatísticas demográficas por categoria

### churchStructure (Relatórios)
Estatísticas da estrutura da igreja

### timeline (Relatórios)
Análise temporal de batismos e admissões

### topOccupations (Relatórios)
Top 10 ocupações mais comuns

## Validações

- `page` deve ser maior que 0
- `limit` deve estar entre 1 e 100
- `age_from` e `age_to` devem estar entre 0 e 150
- `age_from` deve ser menor que `age_to` quando ambos são fornecidos
- Datas devem estar no formato YYYY-MM-DD
- Todos os parâmetros são opcionais
- Se não especificado, `page` = 1, `limit` = 10, `sort_by` = 'name', `sort_order` = 'asc'

## Performance

- A busca é otimizada com índices no banco de dados
- O count é calculado de forma eficiente
- Os filtros são aplicados no nível do banco de dados
- A busca por faixa etária é calculada em memória após a consulta
- Relatórios são gerados a partir de todos os dados para precisão 