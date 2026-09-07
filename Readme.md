# 🎬🎌 Discord Notifier

![CI](https://github.com/JonathanJHK/discord-notifier/actions/workflows/ci.yml/badge.svg)
![Movie Notifier](https://github.com/JonathanJHK/discord-notifier/actions/workflows/movies.yml/badge.svg)
![Anime Notifier](https://github.com/JonathanJHK/discord-notifier/actions/workflows/anime.yml/badge.svg)

Serviço automatizado de notificações para Discord desenvolvido em **TypeScript**, responsável por acompanhar:

- 🎬 estreias de filmes nos cinemas brasileiros;
- 🎌 lançamento de novos episódios legendados de animes.

Os dados são obtidos através das APIs do **TMDB** e **AnimeSchedule.net**, processados pela aplicação e enviados para canais específicos do Discord através de **webhooks**.

A execução em produção é totalmente automatizada utilizando **GitHub Actions**.

---

## ✨ Funcionalidades

### 🎬 Movie Release Notifier

- Consulta lançamentos de filmes disponíveis nos cinemas brasileiros;
- busca filmes considerando uma janela retroativa de segurança;
- suporta paginação dos resultados do TMDB;
- obtém:
  - título;
  - sinopse;
  - data de estreia no Brasil;
  - gêneros;
  - duração;
  - avaliação;
  - pôster;
  - trailer;
- prioriza trailers em português e utiliza inglês como fallback;
- envia os dados através de embeds formatados no Discord;
- evita notificações duplicadas através de persistência de estado;
- tenta novamente filmes que falharam em execuções anteriores.

### 🎌 Anime Episode Notifier

- Consulta o cronograma de episódios legendados através da API v3 do AnimeSchedule.net;
- considera uma janela de segurança das últimas 24 horas;
- processa apenas lançamentos `SUB`;
- obtém informações adicionais do anime quando disponíveis;
- inclui:
  - título;
  - episódio;
  - horário de lançamento;
  - duração;
  - gêneros;
  - avaliação;
  - sinopse;
  - imagem;
  - serviços de streaming;
  - links externos;
- utiliza os dados básicos do timetable caso a consulta de detalhes falhe;
- evita episódios duplicados através de um identificador único;
- mantém cache dos detalhes durante a mesma execução.

---

## 🏗️ Arquitetura

```text
                    ┌─────────────────┐
                    │  GitHub Actions │
                    └────────┬────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
        ┌───────────────┐        ┌──────────────────┐
        │   TMDB API    │        │ AnimeSchedule API│
        └───────┬───────┘        └────────┬─────────┘
                │                         │
                ▼                         ▼
        ┌───────────────┐        ┌──────────────────┐
        │ Movie Notifier│        │  Anime Notifier  │
        └───────┬───────┘        └────────┬─────────┘
                │                         │
                └────────────┬────────────┘
                             ▼
                    ┌─────────────────┐
                    │ Discord Webhook │
                    └────────┬────────┘
                             ▼
                    ┌─────────────────┐
                    │     Discord     │
                    └─────────────────┘
```

---

## 🛡️ Resiliência

O projeto possui algumas estratégias para evitar perda ou duplicação de notificações.

### Retry

Chamadas externas possuem tratamento para falhas temporárias, incluindo:

- timeout;
- erros de rede;
- respostas `5xx`;
- rate limit `429`;
- exponential backoff;
- jitter;
- respeito ao `Retry-After` quando disponível.

Erros considerados permanentes não são repetidos desnecessariamente.

### Janela retroativa

O Movie Notifier consulta o dia atual e os **2 dias anteriores**.

```text
Hoje
 │
 ├── hoje
 ├── ontem
 └── anteontem
```

O Anime Notifier considera episódios lançados durante as **últimas 24 horas**.

Isso permite recuperar lançamentos caso uma execução agendada não seja concluída.

### Deduplicação

As notificações já enviadas são armazenadas em:

```text
data/
├── sent-movies.json
└── sent-anime.json
```

Um item só é registrado depois que o Discord confirma o envio.

```text
API
 ↓
processamento
 ↓
Discord
 ↓
envio confirmado
 ↓
salva ID
```

Se o envio falhar, o ID não é salvo e o lançamento poderá ser tentado novamente em uma execução futura.

---

## 📁 Estrutura do projeto

```text
discord-notifier/
├── .github/
│   └── workflows/
│       ├── anime.yml
│       ├── ci.yml
│       └── movies.yml
│
├── data/
│   ├── sent-anime.json
│   └── sent-movies.json
│
├── references/
│   ├── README.md
│   ├── anilist.service.ts
│   └── anime-rss.service.ts
│
├── src/
│   ├── anime/
│   │   ├── anime.embed.ts
│   │   ├── anime.mapper.ts
│   │   ├── anime-schedule.service.ts
│   │   ├── anime.state.ts
│   │   └── index.ts
│   │
│   ├── config/
│   │   └── env.ts
│   │
│   ├── discord/
│   │   └── webhook.service.ts
│   │
│   ├── movies/
│   │   ├── movie.embed.ts
│   │   ├── movie.mapper.ts
│   │   ├── movie.state.ts
│   │   └── tmdb.service.ts
│   │
│   ├── utils/
│   │   ├── date.ts
│   │   └── sleep.ts
│   │
│   └── index.ts
│
├── tests/
│   ├── anime.mapper.test.ts
│   ├── date.test.ts
│   └── movie.mapper.test.ts
│
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
└── tsconfig.json
```

### `references/`

A pasta `references/` contém implementações utilizadas durante a evolução do Anime Notifier, mas que não fazem mais parte da solução principal.

Atualmente estão preservadas como referência:

- integração GraphQL com AniList;
- integração RSS com AnimeSchedule.

A implementação utilizada em produção é a API v3 do AnimeSchedule.net.

---

## 🛠️ Tecnologias

- **Node.js 22**
- **TypeScript**
- **GitHub Actions**
- **Vitest**
- **Discord Webhooks**
- **TMDB API**
- **AnimeSchedule.net API v3**

---

## ⚙️ Configuração

### 1. Clone o projeto

```bash
git clone https://github.com/JonathanJHK/discord-notifier.git
cd discord-notifier
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Copie:

```text
.env.example
```

para:

```text
.env
```

Configure:

```env
TMDB_ACCESS_TOKEN=
DISCORD_MOVIES_WEBHOOK_URL=

ANIME_SCHEDULE_TOKEN=
DISCORD_ANIME_WEBHOOK_URL=
```

> ⚠️ Nunca envie tokens ou URLs privadas de webhook para o repositório.

O arquivo `.env` deve permanecer ignorado pelo Git.

---

## 🔑 Variáveis de ambiente

| Variável                     | Descrição                                     |
| ---------------------------- | --------------------------------------------- |
| `TMDB_ACCESS_TOKEN`          | Token de acesso à API do TMDB                 |
| `DISCORD_MOVIES_WEBHOOK_URL` | Webhook do canal de notificações de filmes    |
| `ANIME_SCHEDULE_TOKEN`       | Application Token da API do AnimeSchedule.net |
| `DISCORD_ANIME_WEBHOOK_URL`  | Webhook do canal de notificações de anime     |

---

## ▶️ Execução

### Filmes — desenvolvimento

```bash
npm run dev
```

### Filmes — produção

```bash
npm run build
npm start
```

### Anime — desenvolvimento

```bash
npm run anime:dev
```

### Anime — produção

```bash
npm run build
npm run anime:start
```

---

## 🧪 Testes

Execute todos os testes:

```bash
npm test
```

Modo watch:

```bash
npm run test:watch
```

Também é possível validar a compilação TypeScript:

```bash
npm run build
```

Atualmente os testes cobrem principalmente:

- utilitários de data;
- transformação de dados de filmes;
- transformação de dados de anime;
- identificadores utilizados para deduplicação;
- fallbacks de dados.

---

## 🔄 CI

O projeto possui um workflow de integração contínua:

```text
.github/workflows/ci.yml
```

Ele é executado em pushes e pull requests para `main`.

Fluxo:

```text
Checkout
   ↓
npm ci
   ↓
npm run build
   ↓
npm test
```

Uma alteração só passa pela validação quando o projeto compila e os testes são concluídos com sucesso.

---

## ⏰ Automação

### Movie Release Notifier

Workflow:

```text
.github/workflows/movies.yml
```

Execuções automáticas atuais:

```text
09:00 — horário de Brasília
18:00 — horário de Brasília
```

Também pode ser iniciado manualmente através de `workflow_dispatch`.

### Anime Episode Notifier

Workflow:

```text
.github/workflows/anime.yml
```

Executado automaticamente:

```text
a cada 2 horas
```

Também suporta execução manual.

### Concorrência

Os dois notificadores utilizam o mesmo grupo:

```yaml
concurrency:
  group: discord-notifier-state
  cancel-in-progress: false
```

Assim, os workflows que modificam os arquivos de estado não executam simultaneamente.

---

## 💾 Persistência de estado

O projeto não utiliza banco de dados.

O estado mínimo necessário para deduplicação é mantido em arquivos JSON versionados:

```text
data/sent-movies.json
data/sent-anime.json
```

Depois de uma execução que envia novas notificações, o GitHub Actions realiza automaticamente:

```text
alteração do estado
      ↓
git commit
      ↓
git pull --rebase
      ↓
git push
```

Para o volume e objetivo deste projeto, essa abordagem mantém a infraestrutura simples e sem necessidade de banco de dados externo.

---

## 🔐 Segurança

Informações sensíveis não são armazenadas no código.

Em desenvolvimento são utilizadas variáveis do arquivo `.env`.

No GitHub Actions devem ser configurados os seguintes **Repository Secrets**:

```text
TMDB_ACCESS_TOKEN
DISCORD_MOVIES_WEBHOOK_URL
ANIME_SCHEDULE_TOKEN
DISCORD_ANIME_WEBHOOK_URL
```

---

## 📚 Fontes de dados

### TMDB

Informações de filmes, imagens, avaliações e metadados são fornecidas pelo **TMDB — The Movie Database**.

> This product uses the TMDB API but is not endorsed or certified by TMDB.

### AnimeSchedule.net

Horários de lançamento, informações de episódios e metadados de anime são obtidos através da **AnimeSchedule.net API v3**.

Os direitos sobre imagens, descrições e demais conteúdos pertencem aos seus respectivos autores e detentores.

---

## 📄 Licença

Este projeto está licenciado sob a licença **ISC**.

---

## 👨‍💻 Autor

Desenvolvido por **Jonathan Heidy Kinjo**.

GitHub: [@JonathanJHK](https://github.com/JonathanJHK)
