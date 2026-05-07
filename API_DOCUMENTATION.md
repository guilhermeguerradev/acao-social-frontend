# Documentacao da API - Acao Social Backend

Versao da API: `1.0.0`
Base URL local: use `VITE_API_URL` no front-end e `VITE_API_HOST`/`VITE_API_PORT` para proxy local.
Stack: Express, TypeScript, Prisma, PostgreSQL, JWT, bcrypt, Zod
Atualizado em: `06/05/2026`

Esta documentacao foi escrita para o front-end saber:

- quais endpoints existem;
- quais campos enviar;
- quais respostas esperar;
- quais regras de negocio respeitar na tela;
- como o banco esta modelado;
- como consultar dados pelo proprio backend e, em ambiente de desenvolvimento, pelo banco.

## Sumario Rapido

| Recurso | Base path | Autenticacao | Perfis principais |
| --- | --- | --- | --- |
| Auth | `/auth` | Parcial | Publico |
| Usuarios | `/users` | Parcial | MEDICO, INSTRUTOR |
| Medicos | `/medicos` | Sim | MEDICO, INSTRUTOR para escrita |
| Instrutores | `/instrutores` | Sim | MEDICO, INSTRUTOR para escrita |
| Beneficiarios | `/beneficiarios` | Sim | Qualquer usuario autenticado |
| Consultas | `/consultas` | Sim | MEDICO para escrita |
| Aulas | `/aulas` | Sim | INSTRUTOR para escrita |
| Matriculas | `/matriculas` | Sim | Qualquer usuario autenticado |

## Conceitos Importantes Para o Front-End

- Todos os IDs sao UUIDs em formato string.
- Datas sao retornadas em ISO string, por exemplo `"2026-05-06T13:00:00.000Z"`.
- O backend aceita JSON. Sempre envie `Content-Type: application/json` em requests com body.
- Listagens retornam no maximo 100 registros. Hoje nao existem query params de pagina, busca ou filtro implementados.
- Senhas nunca sao retornadas pela API.
- O papel do usuario vem do banco:
  - se o usuario tem registro em `Medico`, o papel e `MEDICO`;
  - se o usuario tem registro em `Instrutor`, o papel e `INSTRUTOR`;
  - se nao tem nenhum dos dois, o papel e `null`.
- A autenticacao usa JWT. Depois do login, salve o `token` no front e envie em todas as rotas protegidas.
- O backend recalcula o papel do usuario em cada request autenticado. Nao confie apenas no papel salvo no front.

## Headers

### Rotas publicas

```http
Content-Type: application/json
```

### Rotas autenticadas

```http
Content-Type: application/json
Authorization: Bearer {token}
```

## Padrao de Respostas

### Sucesso com objeto

```json
{
  "id": "uuid",
  "name": "Nome"
}
```

### Sucesso com lista

```json
[
  {
    "id": "uuid"
  }
]
```

### Sucesso sem corpo

Deletes retornam:

```http
204 No Content
```

### Erro simples

```json
{
  "error": "Mensagem de erro"
}
```

### Erro de validacao Zod

```json
{
  "error": [
    {
      "path": "email",
      "message": "Invalid email address"
    }
  ]
}
```

### Codigos comuns

| Status | Quando acontece |
| --- | --- |
| 400 | Dados invalidos ou regra de negocio violada |
| 401 | Token ausente, invalido ou usuario nao encontrado |
| 403 | Usuario autenticado sem permissao |
| 404 | Registro nao encontrado |
| 409 | Conflito, duplicidade ou dependencia |
| 429 | Rate limit excedido |
| 500 | Erro interno |

## Autenticacao e Sessao

### POST `/auth/login`

Faz login e devolve um token JWT.

Autenticacao: publica.

Body:

```json
{
  "email": "ana.silva@gmail.com",
  "password": "<senha_do_usuario>"
}
```

Validacoes:

| Campo | Regra |
| --- | --- |
| `email` | obrigatorio, email valido, convertido para minusculo |
| `password` | obrigatorio, minimo 6 caracteres |

Resposta `200`:

```json
{
  "token": "jwt",
  "user": {
    "id": "uuid-user",
    "name": "Dra. Ana Silva",
    "email": "ana.silva@gmail.com",
    "role": "MEDICO"
  }
}
```

Erros:

| Status | Mensagem |
| --- | --- |
| 401 | `Credenciais invalidas` |

Uso no front:

```ts
const API_URL = import.meta.env.VITE_API_URL ?? '/api'

const response = await fetch(`${API_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
})

const data = await response.json()
localStorage.setItem('token', data.token)
```

### POST `/auth/register/medico`

Cria um usuario e cria automaticamente o perfil de medico.

Autenticacao: publica.

Body:

```json
{
  "name": "Dr. Novo Medico",
  "email": "novo.medico@example.com",
  "password": "<senha_do_usuario>"
}
```

Validacoes:

| Campo | Regra |
| --- | --- |
| `name` | obrigatorio, 1 a 120 caracteres |
| `email` | obrigatorio, email valido, unico |
| `password` | obrigatorio, 8 a 72 caracteres |

Resposta `201`:

```json
{
  "id": "uuid-user",
  "name": "Dr. Novo Medico",
  "email": "novo.medico@example.com",
  "createdAt": "2026-05-06T01:00:00.000Z",
  "updatedAt": "2026-05-06T01:00:00.000Z",
  "medico": {
    "id": "uuid-medico"
  }
}
```

Erros:

| Status | Mensagem |
| --- | --- |
| 400 | `Email ja cadastrado` |

### POST `/auth/register/instrutor`

Cria um usuario e cria automaticamente o perfil de instrutor.

Autenticacao: publica.

Body:

```json
{
  "name": "Novo Instrutor",
  "email": "novo.instrutor@example.com",
  "password": "<senha_do_usuario>"
}
```

Resposta:

```json
{
  "id": "uuid-user",
  "name": "Novo Instrutor",
  "email": "novo.instrutor@example.com",
  "createdAt": "2026-05-06T01:00:00.000Z",
  "updatedAt": "2026-05-06T01:00:00.000Z",
  "instrutor": {
    "id": "uuid-instrutor"
  }
}
```

## Usuarios

Um usuario representa login, nome, email e senha. Ele pode ou nao ter papel. O papel vem da existencia de um registro em `Medico` ou `Instrutor`.

### Formato de usuario retornado

```json
{
  "id": "uuid-user",
  "name": "Nome do Usuario",
  "email": "usuario@example.com",
  "createdAt": "2026-05-06T01:00:00.000Z",
  "updatedAt": "2026-05-06T01:00:00.000Z",
  "medico": {
    "id": "uuid-medico"
  },
  "instrutor": null
}
```

### POST `/users`

Cria usuario sem papel. Para criar usuario ja com papel, prefira `/auth/register/medico` ou `/auth/register/instrutor`.

Autenticacao: publica.

Body:

```json
{
  "name": "Nome do Usuario",
  "email": "usuario@example.com",
  "password": "<senha_do_usuario>"
}
```

Resposta `201`:

```json
{
  "id": "uuid-user",
  "name": "Nome do Usuario",
  "email": "usuario@example.com",
  "createdAt": "2026-05-06T01:00:00.000Z",
  "updatedAt": "2026-05-06T01:00:00.000Z",
  "medico": null,
  "instrutor": null
}
```

### GET `/users`

Lista ate 100 usuarios recentes.

Autenticacao: obrigatoria.
Permissao: `MEDICO` ou `INSTRUTOR`.

Resposta `200`:

```json
[
  {
    "id": "uuid-user",
    "name": "Nome",
    "email": "email@example.com",
    "createdAt": "2026-05-06T01:00:00.000Z",
    "updatedAt": "2026-05-06T01:00:00.000Z",
    "medico": null,
    "instrutor": {
      "id": "uuid-instrutor"
    }
  }
]
```

### GET `/users/{id}`

Busca usuario por ID.

Autenticacao: obrigatoria.
Permissao: `MEDICO` ou `INSTRUTOR`.

Resposta `200`: mesmo formato de usuario.

Erros:

| Status | Mensagem |
| --- | --- |
| 404 | `Usuario nao encontrado` |

### PUT `/users/{id}`

Atualiza dados basicos do usuario.

Autenticacao: obrigatoria.
Permissao: `MEDICO` ou `INSTRUTOR`.

Body, todos os campos opcionais:

```json
{
  "name": "Novo Nome",
  "email": "novo.email@example.com",
  "password": "<nova_senha_do_usuario>"
}
```

Validacoes:

| Campo | Regra |
| --- | --- |
| `name` | 1 a 120 caracteres |
| `email` | email valido, unico |
| `password` | 8 a 72 caracteres |

Resposta `200`: usuario atualizado.

### DELETE `/users/{id}`

Remove usuario.

Autenticacao: obrigatoria.
Permissao: `MEDICO` ou `INSTRUTOR`.

Resposta `204`.

Observacao: se o usuario tiver dependencias indiretas, o banco pode bloquear a remocao. Hoje o service converte falhas em `Usuario nao encontrado`, entao o front deve tratar erro de delete de forma generica.

## Medicos

Um medico e um perfil vinculado a um usuario. Um usuario so pode ter um perfil de medico.

### Formato de medico retornado

```json
{
  "id": "uuid-medico",
  "userId": "uuid-user",
  "user": {
    "id": "uuid-user",
    "name": "Dra. Ana Silva",
    "email": "ana.silva@gmail.com"
  }
}
```

### POST `/medicos`

Cria perfil de medico para um usuario existente.

Autenticacao: obrigatoria.
Permissao: `MEDICO` ou `INSTRUTOR`.

Body:

```json
{
  "userId": "uuid-user"
}
```

Resposta `201`: medico criado.

Erros:

| Status | Mensagem |
| --- | --- |
| 404 | `Usuario nao encontrado` |
| 400 | `Usuario ja e medico` |

### GET `/medicos`

Lista ate 100 medicos.

Autenticacao: obrigatoria.

Resposta `200`:

```json
[
  {
    "id": "uuid-medico",
    "userId": "uuid-user",
    "user": {
      "id": "uuid-user",
      "name": "Dra. Ana Silva",
      "email": "ana.silva@gmail.com"
    }
  }
]
```

### GET `/medicos/{id}`

Busca medico por ID.

Autenticacao: obrigatoria.

Resposta `200`: medico.

### PUT `/medicos/{id}`

Troca o usuario vinculado ao perfil de medico.

Autenticacao: obrigatoria.
Permissao: `MEDICO` ou `INSTRUTOR`.

Body:

```json
{
  "userId": "uuid-user"
}
```

Regra: o novo usuario nao pode ja ser medico de outro registro.

### DELETE `/medicos/{id}`

Remove perfil de medico.

Autenticacao: obrigatoria.
Permissao: `MEDICO` ou `INSTRUTOR`.

Resposta `204`.

## Instrutores

Um instrutor e um perfil vinculado a um usuario. Um usuario so pode ter um perfil de instrutor.

### Formato de instrutor retornado

```json
{
  "id": "uuid-instrutor",
  "userId": "uuid-user",
  "user": {
    "id": "uuid-user",
    "name": "Prof. Carlos",
    "email": "carlos@example.com"
  }
}
```

### POST `/instrutores`

Cria perfil de instrutor para um usuario existente.

Autenticacao: obrigatoria.
Permissao: `MEDICO` ou `INSTRUTOR`.

Body:

```json
{
  "userId": "uuid-user"
}
```

Erros:

| Status | Mensagem |
| --- | --- |
| 404 | `Usuario nao encontrado` |
| 400 | `Usuario ja e instrutor` |

### GET `/instrutores`

Lista ate 100 instrutores.

Autenticacao: obrigatoria.

Resposta `200`: lista de instrutores.

### GET `/instrutores/{id}`

Busca instrutor por ID.

Autenticacao: obrigatoria.

### PUT `/instrutores/{id}`

Troca o usuario vinculado ao perfil de instrutor.

Autenticacao: obrigatoria.
Permissao: `MEDICO` ou `INSTRUTOR`.

Body:

```json
{
  "userId": "uuid-user"
}
```

### DELETE `/instrutores/{id}`

Remove perfil de instrutor.

Autenticacao: obrigatoria.
Permissao: `MEDICO` ou `INSTRUTOR`.

Resposta `204`.

## Beneficiarios

Beneficiario e a pessoa atendida pelo projeto social. Ele pode ter consultas e matriculas.

### Formato de beneficiario retornado

```json
{
  "id": "uuid-beneficiario",
  "name": "Nome do Beneficiario",
  "telefone": "11999999999",
  "createdAt": "2026-05-06T01:00:00.000Z"
}
```

### POST `/beneficiarios`

Cria beneficiario.

Autenticacao: obrigatoria.

Body:

```json
{
  "name": "Nome do Beneficiario",
  "telefone": "11999999999"
}
```

Validacoes:

| Campo | Regra |
| --- | --- |
| `name` | obrigatorio, 1 a 120 caracteres |
| `telefone` | opcional, ate 20 caracteres |

Resposta `201`: beneficiario criado.

### GET `/beneficiarios`

Lista ate 100 beneficiarios recentes.

Autenticacao: obrigatoria.

Resposta `200`:

```json
[
  {
    "id": "uuid-beneficiario",
    "name": "Nome",
    "telefone": "11999999999",
    "createdAt": "2026-05-06T01:00:00.000Z"
  }
]
```

### GET `/beneficiarios/{id}`

Busca beneficiario por ID.

Autenticacao: obrigatoria.

Erros:

| Status | Mensagem |
| --- | --- |
| 404 | `Beneficiario nao encontrado` |

### DELETE `/beneficiarios/{id}`

Remove beneficiario.

Autenticacao: obrigatoria.

Resposta `204`.

Regra: se o beneficiario tiver consultas ou matriculas vinculadas, o banco pode impedir a exclusao.

Importante: existe schema de update no codigo, mas nao existe rota `PUT /beneficiarios/{id}` registrada hoje.

## Aulas

Aula e uma atividade oferecida por um instrutor. Possui limite de vagas e pode receber matriculas.

### Formato de aula retornado

```json
{
  "id": "uuid-aula",
  "titulo": "Yoga para Iniciantes",
  "modalidade": "Yoga",
  "vagas": 12,
  "instrutorId": "uuid-instrutor",
  "createdAt": "2026-05-06T01:00:00.000Z",
  "instrutor": {
    "id": "uuid-instrutor",
    "userId": "uuid-user",
    "user": {
      "id": "uuid-user",
      "name": "Prof. Carlos",
      "email": "carlos@example.com"
    }
  },
  "_count": {
    "matriculas": 3
  }
}
```

Campo util para o front:

```ts
const vagasDisponiveis = aula.vagas - aula._count.matriculas
```

### POST `/aulas`

Cria aula.

Autenticacao: obrigatoria.
Permissao: `INSTRUTOR`.

Body recomendado:

```json
{
  "titulo": "Yoga para Iniciantes",
  "modalidade": "Yoga",
  "vagas": 12
}
```

O `instrutorId` e inferido do token. O schema aceita `instrutorId`, mas o front nao deve enviar esse campo no fluxo normal.

Validacoes:

| Campo | Regra |
| --- | --- |
| `titulo` | obrigatorio, string nao vazia |
| `modalidade` | obrigatorio, string nao vazia |
| `vagas` | obrigatorio, numero inteiro positivo |
| `instrutorId` | opcional, UUID |

Resposta `201`: aula criada.

### GET `/aulas`

Lista ate 100 aulas recentes.

Autenticacao: obrigatoria.

Resposta `200`: lista de aulas com instrutor e contagem de matriculas.

### GET `/aulas/{id}`

Busca aula por ID.

Autenticacao: obrigatoria.

### PUT `/aulas/{id}`

Atualiza aula.

Autenticacao: obrigatoria.
Permissao: `INSTRUTOR`.

Body, todos opcionais:

```json
{
  "titulo": "Yoga Iniciante",
  "modalidade": "Yoga",
  "vagas": 15
}
```

Regras:

- somente o instrutor dono da aula pode alterar;
- nao e permitido transferir aula para outro instrutor;
- `vagas` nao pode ficar menor que o numero atual de matriculados.

Erros:

| Status | Mensagem |
| --- | --- |
| 403 | `Acesso negado` |
| 403 | `Nao e permitido transferir aula entre instrutores` |
| 400 | `Vagas nao podem ser menores que numero de matriculados` |
| 404 | `Aula nao encontrada` |

### DELETE `/aulas/{id}`

Remove aula.

Autenticacao: obrigatoria.
Permissao: `INSTRUTOR`.

Regras:

- somente o instrutor dono da aula pode remover;
- se houver matriculas vinculadas, a API retorna conflito.

Erros:

| Status | Mensagem |
| --- | --- |
| 403 | `Acesso negado` |
| 404 | `Aula nao encontrada` |
| 409 | `Aula possui dependencias e nao pode ser removida` |

## Consultas

Consulta e um agendamento medico para um beneficiario em uma data/hora.

### Formato de consulta retornado

```json
{
  "id": "uuid-consulta",
  "dataHora": "2026-05-07T14:00:00.000Z",
  "medicoId": "uuid-medico",
  "beneficiarioId": "uuid-beneficiario",
  "createdAt": "2026-05-06T01:00:00.000Z",
  "medico": {
    "id": "uuid-medico",
    "userId": "uuid-user",
    "user": {
      "id": "uuid-user",
      "name": "Dra. Ana Silva",
      "email": "ana.silva@gmail.com"
    }
  },
  "beneficiario": {
    "id": "uuid-beneficiario",
    "name": "Maria",
    "telefone": "11999999999",
    "createdAt": "2026-05-06T01:00:00.000Z"
  }
}
```

### POST `/consultas`

Cria consulta.

Autenticacao: obrigatoria.
Permissao: `MEDICO`.

Body recomendado:

```json
{
  "beneficiarioId": "uuid-beneficiario",
  "dataHora": "2026-05-07T14:00:00.000Z"
}
```

O `medicoId` e inferido do token. O schema aceita `medicoId`, mas o front nao deve enviar esse campo no fluxo normal.

Validacoes:

| Campo | Regra |
| --- | --- |
| `beneficiarioId` | obrigatorio, UUID |
| `dataHora` | obrigatorio, data valida |
| `medicoId` | opcional, UUID |

Regras:

- nao permite consulta no passado;
- beneficiario precisa existir;
- medico precisa existir;
- o mesmo medico nao pode ter duas consultas no mesmo horario;
- o banco tambem possui restricao unica em `medicoId + dataHora`.

Erros:

| Status | Mensagem |
| --- | --- |
| 404 | `Medico nao encontrado` |
| 404 | `Beneficiario nao encontrado` |
| 400 | `Nao e possivel agendar consulta no passado` |
| 409 | `Horario indisponivel` |

### GET `/consultas`

Lista ate 100 consultas ordenadas por `dataHora` crescente.

Autenticacao: obrigatoria.

Resposta `200`: lista de consultas com medico e beneficiario.

Observacao para o front: hoje a rota lista todas as consultas, nao apenas as do medico logado.

### GET `/consultas/{id}`

Busca consulta por ID.

Autenticacao: obrigatoria.

### PUT `/consultas/{id}`

Reagenda uma consulta.

Autenticacao: obrigatoria.
Permissao: `MEDICO`.

Body:

```json
{
  "dataHora": "2026-05-08T10:30:00.000Z"
}
```

Regras:

- somente o medico dono pode alterar;
- nova data nao pode estar no passado;
- novo horario nao pode conflitar com outra consulta do mesmo medico.

### DELETE `/consultas/{id}`

Remove consulta.

Autenticacao: obrigatoria.
Permissao: `MEDICO`.

Regra: somente o medico dono pode remover.

Resposta `204`.

## Matriculas

Matricula vincula um beneficiario a uma aula.

### Formato de matricula retornado

```json
{
  "id": "uuid-matricula",
  "beneficiarioId": "uuid-beneficiario",
  "aulaId": "uuid-aula",
  "createdAt": "2026-05-06T01:00:00.000Z",
  "beneficiario": {
    "id": "uuid-beneficiario",
    "name": "Maria",
    "telefone": "11999999999",
    "createdAt": "2026-05-06T01:00:00.000Z"
  },
  "aula": {
    "id": "uuid-aula",
    "titulo": "Yoga para Iniciantes",
    "modalidade": "Yoga",
    "vagas": 12,
    "instrutorId": "uuid-instrutor",
    "createdAt": "2026-05-06T01:00:00.000Z"
  }
}
```

### POST `/matriculas`

Cria matricula.

Autenticacao: obrigatoria.

Body:

```json
{
  "beneficiarioId": "uuid-beneficiario",
  "aulaId": "uuid-aula"
}
```

Regras:

- aula precisa existir;
- beneficiario precisa existir;
- um beneficiario nao pode se matricular duas vezes na mesma aula;
- a aula precisa ter vaga disponivel;
- a criacao roda em transacao serializable para reduzir corrida de vagas.

Erros:

| Status | Mensagem |
| --- | --- |
| 404 | `Aula nao encontrada` |
| 404 | `Beneficiario nao encontrado` |
| 400 | `Limite de vagas atingido` |
| 409 | `Beneficiario ja matriculado ou limite de vagas atingido` |

### GET `/matriculas`

Lista ate 100 matriculas recentes.

Autenticacao: obrigatoria.

### GET `/matriculas/{id}`

Busca matricula por ID.

Autenticacao: obrigatoria.

### PUT `/matriculas/{id}`

Atualiza a aula, o beneficiario ou ambos.

Autenticacao: obrigatoria.

Body, todos opcionais:

```json
{
  "beneficiarioId": "uuid-beneficiario",
  "aulaId": "uuid-aula"
}
```

Regras:

- matricula precisa existir;
- nova aula precisa existir;
- novo beneficiario precisa existir;
- se trocar de aula, a nova aula precisa ter vaga;
- nao pode gerar duplicidade `beneficiarioId + aulaId`.

Erros:

| Status | Mensagem |
| --- | --- |
| 404 | `Matricula nao encontrada` |
| 404 | `Aula nao encontrada` |
| 404 | `Beneficiario nao encontrado` |
| 400 | `Limite de vagas atingido` |
| 409 | `Matricula duplicada ou invalida` |

### DELETE `/matriculas/{id}`

Remove matricula.

Autenticacao: obrigatoria.

Resposta `204`.

## Regras de Negocio da Aplicacao

### Usuarios e perfis

- Email de usuario e unico.
- Senha e salva com hash bcrypt.
- Usuario pode existir sem papel.
- Perfil de medico e separado do usuario.
- Perfil de instrutor e separado do usuario.
- Um usuario so pode ter um registro de medico.
- Um usuario so pode ter um registro de instrutor.
- Na regra atual, se um usuario tiver medico e instrutor ao mesmo tempo, o login retorna `MEDICO`, pois medico e checado primeiro.

### Autorizacao

- Rotas publicas: login, cadastro de medico, cadastro de instrutor e criacao simples de usuario.
- Rotas autenticadas exigem `Authorization: Bearer {token}`.
- Escrita de consultas exige `MEDICO`.
- Escrita de aulas exige `INSTRUTOR`.
- Escrita de usuarios, medicos e instrutores exige `MEDICO` ou `INSTRUTOR`.
- Beneficiarios e matriculas exigem apenas usuario autenticado.

### Consultas

- Consulta pertence a um medico e a um beneficiario.
- Consulta nao pode ser criada ou reagendada para o passado.
- O mesmo medico nao pode ter duas consultas no mesmo horario.
- Apenas o medico dono pode alterar ou remover sua consulta.
- Leitura de consultas hoje mostra todas as consultas para qualquer usuario autenticado.

### Aulas

- Aula pertence a um instrutor.
- Aula tem numero inteiro positivo de vagas.
- Apenas o instrutor dono pode alterar ou remover sua aula.
- Aula nao pode ser transferida entre instrutores pela rota de update.
- Vagas nao podem ser reduzidas abaixo do numero de matriculas atuais.
- Aula com matriculas pode falhar ao ser deletada por dependencia.

### Matriculas

- Matricula pertence a um beneficiario e a uma aula.
- Um beneficiario nao pode repetir matricula na mesma aula.
- Nao e permitido matricular se a aula ja atingiu o limite de vagas.
- A validacao de vagas ocorre dentro de transacao.

### Beneficiarios

- Beneficiario pode ter telefone opcional.
- Beneficiario pode ter varias consultas.
- Beneficiario pode ter varias matriculas.
- Delete pode falhar se houver consultas ou matriculas dependentes.

## Modelo do Banco de Dados

Banco: PostgreSQL via Prisma.

### Diagrama textual

```txt
User 1---0..1 Medico
User 1---0..1 Instrutor

Medico 1---N Consulta
Beneficiario 1---N Consulta

Instrutor 1---N Aula
Aula 1---N Matricula
Beneficiario 1---N Matricula
```

### Tabela `User`

| Campo | Tipo | Regra |
| --- | --- | --- |
| `id` | String UUID | PK |
| `name` | String | obrigatorio |
| `email` | String | unico |
| `password` | String | hash bcrypt |
| `createdAt` | DateTime | default now |
| `updatedAt` | DateTime | atualizado automaticamente |

Relacionamentos:

- `medico`: 0 ou 1;
- `instrutor`: 0 ou 1.

### Tabela `Medico`

| Campo | Tipo | Regra |
| --- | --- | --- |
| `id` | String UUID | PK |
| `userId` | String UUID | unico, FK para User |

Relacionamentos:

- `user`: usuario dono do perfil;
- `consultas`: consultas desse medico.

### Tabela `Instrutor`

| Campo | Tipo | Regra |
| --- | --- | --- |
| `id` | String UUID | PK |
| `userId` | String UUID | unico, FK para User |

Relacionamentos:

- `user`: usuario dono do perfil;
- `aulas`: aulas desse instrutor.

### Tabela `Beneficiario`

| Campo | Tipo | Regra |
| --- | --- | --- |
| `id` | String UUID | PK |
| `name` | String | obrigatorio |
| `telefone` | String nullable | opcional |
| `createdAt` | DateTime | default now |

Relacionamentos:

- `consultas`: consultas do beneficiario;
- `matriculas`: matriculas do beneficiario.

### Tabela `Consulta`

| Campo | Tipo | Regra |
| --- | --- | --- |
| `id` | String UUID | PK |
| `dataHora` | DateTime | data da consulta |
| `medicoId` | String UUID | FK para Medico |
| `beneficiarioId` | String UUID | FK para Beneficiario |
| `createdAt` | DateTime | default now |

Indices e restricoes:

- unico: `medicoId + dataHora`;
- indice: `beneficiarioId`.

### Tabela `Aula`

| Campo | Tipo | Regra |
| --- | --- | --- |
| `id` | String UUID | PK |
| `titulo` | String | obrigatorio |
| `modalidade` | String | obrigatorio |
| `vagas` | Int | inteiro positivo pela API |
| `instrutorId` | String UUID | FK para Instrutor |
| `createdAt` | DateTime | default now |

Indices:

- indice: `instrutorId`.

### Tabela `Matricula`

| Campo | Tipo | Regra |
| --- | --- | --- |
| `id` | String UUID | PK |
| `beneficiarioId` | String UUID | FK para Beneficiario |
| `aulaId` | String UUID | FK para Aula |
| `createdAt` | DateTime | default now |

Indices e restricoes:

- unico: `beneficiarioId + aulaId`;
- indice: `aulaId`.

## Como o Front-End Deve Consultar Dados

O front-end deve consultar o banco por meio da API, nao conectando direto no PostgreSQL.

### Cliente fetch simples

```ts
const API_URL = import.meta.env.VITE_API_URL ?? '/api'

function getToken() {
  return localStorage.getItem('token')
}

async function api(path: string, options: RequestInit = {}) {
  const token = getToken()

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {})
    }
  })

  if (response.status === 204) return null

  const data = await response.json()

  if (!response.ok) {
    throw data
  }

  return data
}
```

### Exemplos de consultas para telas

#### Tela de login

```ts
const session = await api('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
})
```

Use:

- `session.token` para autenticar;
- `session.user.role` para decidir telas permitidas;
- `session.user.id` como id do usuario logado.

#### Dashboard inicial

```ts
const [beneficiarios, consultas, aulas, matriculas] = await Promise.all([
  api('/beneficiarios'),
  api('/consultas'),
  api('/aulas'),
  api('/matriculas')
])
```

Observacao: essas rotas exigem login.

#### Tela de agenda medica

```ts
const consultas = await api('/consultas')
```

Para mostrar consultas:

- use `consulta.dataHora`;
- mostre `consulta.beneficiario.name`;
- mostre `consulta.medico.user.name`;
- se o usuario logado for medico, deixe editar/remover apenas as consultas cujo `consulta.medico.userId` seja o `user.id` da sessao, ou cujo `consulta.medicoId` seja o perfil de medico do usuario.

#### Criar consulta

```ts
await api('/consultas', {
  method: 'POST',
  body: JSON.stringify({
    beneficiarioId,
    dataHora: new Date(dataSelecionada).toISOString()
  })
})
```

Nao envie `medicoId` no fluxo normal. O backend usa o medico do token.

#### Tela de aulas

```ts
const aulas = await api('/aulas')
```

Para cada aula:

```ts
const matriculados = aula._count.matriculas
const vagasDisponiveis = aula.vagas - matriculados
```

#### Criar aula

```ts
await api('/aulas', {
  method: 'POST',
  body: JSON.stringify({
    titulo,
    modalidade,
    vagas: Number(vagas)
  })
})
```

Nao envie `instrutorId` no fluxo normal. O backend usa o instrutor do token.

#### Matricular beneficiario em aula

```ts
await api('/matriculas', {
  method: 'POST',
  body: JSON.stringify({
    beneficiarioId,
    aulaId
  })
})
```

Antes de mostrar o botao de matricula, o front pode verificar:

```ts
const temVaga = aula._count.matriculas < aula.vagas
```

Mesmo assim, o backend continua sendo a fonte final da regra.

## Consultas Diretas no Banco Para Desenvolvimento

Estas consultas sao para desenvolvimento, debug ou administracao. O front-end em producao deve usar os endpoints da API.

### Abrir o banco com Prisma Studio

```bash
npx prisma studio
```

### Rodar SQL no PostgreSQL

Exemplo usando `psql`:

```bash
psql "$DATABASE_URL"
```

Como os nomes das tabelas do Prisma usam maiusculas, use aspas nos SQLs.

### Listar usuarios com perfis

```sql
SELECT
  u.id,
  u.name,
  u.email,
  m.id AS medico_id,
  i.id AS instrutor_id
FROM "User" u
LEFT JOIN "Medico" m ON m."userId" = u.id
LEFT JOIN "Instrutor" i ON i."userId" = u.id
ORDER BY u."createdAt" DESC;
```

### Listar consultas com medico e beneficiario

```sql
SELECT
  c.id,
  c."dataHora",
  bu.name AS beneficiario,
  mu.name AS medico
FROM "Consulta" c
JOIN "Beneficiario" bu ON bu.id = c."beneficiarioId"
JOIN "Medico" m ON m.id = c."medicoId"
JOIN "User" mu ON mu.id = m."userId"
ORDER BY c."dataHora" ASC;
```

### Ver aulas com vagas ocupadas

```sql
SELECT
  a.id,
  a.titulo,
  a.modalidade,
  a.vagas,
  COUNT(mt.id) AS matriculados,
  a.vagas - COUNT(mt.id) AS vagas_disponiveis
FROM "Aula" a
LEFT JOIN "Matricula" mt ON mt."aulaId" = a.id
GROUP BY a.id
ORDER BY a."createdAt" DESC;
```

### Ver matriculas de uma aula

```sql
SELECT
  mt.id,
  b.name AS beneficiario,
  b.telefone,
  a.titulo AS aula
FROM "Matricula" mt
JOIN "Beneficiario" b ON b.id = mt."beneficiarioId"
JOIN "Aula" a ON a.id = mt."aulaId"
WHERE a.id = 'uuid-aula';
```

### Ver consultas de um beneficiario

```sql
SELECT
  c.id,
  c."dataHora",
  u.name AS medico
FROM "Consulta" c
JOIN "Medico" m ON m.id = c."medicoId"
JOIN "User" u ON u.id = m."userId"
WHERE c."beneficiarioId" = 'uuid-beneficiario'
ORDER BY c."dataHora" ASC;
```

## Variaveis de Ambiente

```env
DATABASE_URL="${DATABASE_URL}"
JWT_SECRET="troque-por-um-segredo-longo-e-aleatorio"
JWT_EXPIRES_IN="1h"
PORT="${PORT}"
CORS_ORIGINS="${CORS_ORIGINS}"
RATE_LIMIT_MAX=100
JSON_BODY_LIMIT="100kb"
NODE_ENV="development"
```

Notas:

- `JWT_SECRET` deve ser longo, aleatorio e nunca versionado.
- `JWT_EXPIRES_IN` define a duracao do token. Padrao no codigo: `1h`.
- `CORS_ORIGINS` deve conter as URLs do front separadas por virgula.
- `RATE_LIMIT_MAX` limita requests por IP a cada 15 minutos.
- `JSON_BODY_LIMIT` limita o tamanho do body JSON.

## Seguranca e LGPD

Implementado no codigo:

- Senhas com bcrypt.
- JWT com expiracao.
- Validacao do usuario no banco a cada request autenticado.
- Papel recalculado pelo banco a cada request autenticado.
- CORS configuravel.
- Rate limit por IP.
- Helmet para headers de seguranca.
- Validacao com Zod.
- Respostas sem hash de senha.
- Selecoes explicitas no Prisma para evitar exposicao acidental de campos.

Cuidados de produto/processo:

- Mostrar ao beneficiario a finalidade do cadastro.
- Coletar apenas dados necessarios.
- Proteger acesso administrativo no front.
- Nao salvar token em lugares publicos ou logs.
- Definir politica de retencao e exclusao de dados.
- Ter rotina de backup.
- Ter processo para pedidos de titulares de dados.

Referencias oficiais:

- LGPD, Lei n. 13.709/2018: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
- FAQ LGPD da ANPD: https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/perguntas-frequentes-anpd
- Guia ANPD de seguranca da informacao para agentes de tratamento de pequeno porte: https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-sobre-seguranca-da-informacao-para-agentes-de-tratamento-de-pequeno-porte

## Checklist Para Integracao do Front-End

- Implementar login e armazenamento do token.
- Enviar `Authorization: Bearer {token}` nas rotas protegidas.
- Usar `user.role` para controlar menus e botoes.
- Tratar erros no formato `{ error: string }` e `{ error: Array }`.
- Converter datas de inputs para ISO antes de enviar.
- Nao enviar `medicoId` ao criar consulta no fluxo normal.
- Nao enviar `instrutorId` ao criar aula no fluxo normal.
- Calcular vagas disponiveis com `aula.vagas - aula._count.matriculas`.
- Desabilitar matricula quando a aula estiver cheia, mas ainda tratar erro vindo do backend.
- Nao depender de query params de busca/paginacao, pois ainda nao existem.
- Nao conectar o front direto no banco.
