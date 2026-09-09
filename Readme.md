# 🎬🎌📚 Discord Notifier

![CI](https://github.com/JonathanJHK/discord-notifier/actions/workflows/ci.yml/badge.svg)
![Movies](https://github.com/JonathanJHK/discord-notifier/actions/workflows/movies.yml/badge.svg)
![Anime](https://github.com/JonathanJHK/discord-notifier/actions/workflows/anime.yml/badge.svg)
![Manga](https://github.com/JonathanJHK/discord-notifier/actions/workflows/manga.yml/badge.svg)

Serviço automatizado de notificações para Discord desenvolvido em **Node.js + TypeScript**.

O projeto acompanha:

- 🎬 estreias de filmes nos cinemas brasileiros;
- 🎌 novos episódios legendados de animes;
- 📚 novas obras de mangá que iniciaram serialização recentemente.

As notificações são executadas automaticamente através de **GitHub Actions**, com um **Cloudflare Worker atuando como scheduler de contingência** caso uma execução agendada não seja iniciada corretamente.

---

# ✨ Funcionalidades

## 🎬 Movie Release Notifier

Responsável por acompanhar estreias de filmes disponíveis nos cinemas brasileiros.

### Funcionalidades

- consulta lançamentos através da API do **TMDB**;
- utiliza `region=BR`;
- considera lançamentos teatrais;
- utiliza uma janela retroativa para recuperar possíveis execuções perdidas;
- suporta paginação;
- consulta detalhes adicionais de cada filme;
- busca trailers;
- prioriza trailers em português;
- utiliza inglês como fallback;
- envia embeds formatados para o Discord;
- evita notificações duplicadas;
- tenta novamente itens que falharam anteriormente.

As notificações podem incluir:

- título;
- título original;
- sinopse;
- data de estreia no Brasil;
- gêneros;
- duração;
- avaliação;
- pôster;
- backdrop;
- trailer;
- link para o TMDB.

---

## 🎌 Anime Episode Notifier

Responsável por acompanhar novos episódios legendados através da **AnimeSchedule API v3**.

### Funcionalidades

- consulta o timetable do AnimeSchedule;
- considera apenas lançamentos `SUB`;
- utiliza uma janela retroativa de 24 horas;
- busca detalhes adicionais da obra;
- mantém fallback para os dados básicos do timetable;
- utiliza identificadores únicos por episódio;
- evita notificações duplicadas;
- traduz sinopses automaticamente para português do Brasil;
- mantém cache persistente das traduções.

As notificações podem incluir:

- título;
- episódio;
- horário de lançamento;
- duração;
- gêneros;
- avaliação;
- sinopse em português;
- imagem;
- serviços de streaming;
- MyAnimeList;
- AniList;
- AnimeSchedule.

---

## 📚 Manga Release Notifier

Responsável por detectar **novas obras que começaram a ser serializadas recentemente**.

O objetivo não é acompanhar:

- capítulos novos;
- volumes novos;
- atualizações de obras antigas.

O notifier procura apenas por **novas serializações**.

### Providers

A descoberta utiliza dois providers:

```text
Tenrai
  ↓ falhou
jikan-edge
```

O **Tenrai** é utilizado como provider principal.

Caso ele esteja indisponível, o sistema utiliza automaticamente o **jikan-edge** como fallback.

Os dois providers são normalizados para uma interface interna comum, evitando que o restante da aplicação dependa diretamente do formato de uma API específica.

### Critérios

Uma obra é considerada candidata quando:

```text
type = Manga
status = Publishing
data inicial dentro da janela configurada
MAL ID ainda não enviado
```

A aplicação também realiza uma validação local da data para evitar falsos positivos retornados pelos providers.

### Dados utilizados

As notificações podem incluir:

- título;
- título japonês;
- data de início;
- autor;
- revista/publicação;
- gêneros;
- demografia;
- avaliação;
- sinopse;
- capa;
- link para o MyAnimeList.

A publicação recebe destaque no topo do embed, por exemplo:

```text
📰 WEEKLY SHOUNEN JUMP

Nome do Mangá

Sinopse...
```

---

# 🇧🇷 Tradução de sinopses

O projeto utiliza **Lara Translate** para traduzir sinopses de anime e mangá para português do Brasil.

A tradução é considerada uma funcionalidade complementar.

Uma falha no serviço de tradução **não impede o envio da notificação**.

```text
sinopse original
       ↓
cache existe?
   ┌───────┴────────┐
   │                │
  sim              não
   │                │
 usa PT-BR      Lara Translate
                    ↓
                  PT-BR
                    ↓
               salva cache
   │                │
   └────────┬───────┘
            ↓
         Discord
```

Caso Lara esteja:

- indisponível;
- fora da cota;
- sem credenciais;
- retornando erro;

o texto original é utilizado.

---

# 💾 Cache de traduções

Anime e mangá possuem caches separados:

```text
data/
├── anime-translations.json
└── manga-translations.json
```

Cada tradução possui um hash SHA-256 da descrição original.

Exemplo:

```json
{
  "123456": {
    "sourceHash": "a1b2c3...",
    "translated": "Sinopse traduzida para português..."
  }
}
```

O funcionamento é:

```text
sinopse atual
     ↓
SHA-256
     ↓
hash igual ao cache?
 ┌──────┴───────┐
 │              │
sim            não
 │              │
usa cache    traduz novamente
```

Isso permite detectar automaticamente alterações feitas posteriormente na sinopse original.

As sinopses são enviadas **integralmente para tradução**.

O truncamento utilizado nos embeds acontece apenas posteriormente para respeitar o layout e os limites do Discord.

---

# 🏗️ Arquitetura

```text
                           ┌────────────────────┐
                           │ Cloudflare Worker  │
                           │ Scheduler Fallback │
                           └──────────┬─────────┘
                                      │
                              verifica workflows
                                      │
                                      ▼
                           ┌────────────────────┐
                           │   GitHub Actions   │
                           └──────────┬─────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          ▼                           ▼                           ▼
 ┌────────────────┐        ┌───────────────────┐        ┌─────────────────┐
 │    TMDB API    │        │ AnimeSchedule API │        │      Tenrai     │
 └───────┬────────┘        └─────────┬─────────┘        └────────┬────────┘
         │                           │                            │
         │                           │                   falhou   ▼
         │                           │                  ┌─────────────────┐
         │                           │                  │   jikan-edge    │
         │                           │                  └────────┬────────┘
         │                           │                            │
         ▼                           ▼                            ▼
 ┌────────────────┐        ┌──────────────────┐        ┌─────────────────┐
 │ Movie Notifier │        │  Anime Notifier  │        │ Manga Notifier  │
 └───────┬────────┘        └─────────┬────────┘        └────────┬────────┘
         │                           │                            │
         │                           ▼                            ▼
         │                 ┌──────────────────┐        ┌──────────────────┐
         │                 │Translation Cache │        │Translation Cache │
         │                 └─────────┬────────┘        └─────────┬────────┘
         │                           │                            │
         │                      cache miss                   cache miss
         │                           │                            │
         │                           └────────────┬───────────────┘
         │                                        ▼
         │                              ┌──────────────────┐
         │                              │  Lara Translate  │
         │                              └─────────┬────────┘
         │                                        │
         └────────────────────────┬───────────────┘
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

# 🛡️ Resiliência

O projeto possui diversas estratégias para evitar perda de notificações e reduzir falhas provocadas por serviços externos.

## Retry

As integrações utilizam mecanismos como:

- timeout;
- retry;
- exponential backoff;
- jitter;
- tratamento de erros de rede;
- tratamento de respostas `5xx`;
- tratamento de rate limit `429`;
- utilização de `Retry-After` quando disponível.

Erros considerados permanentes não são repetidos desnecessariamente.

---

## Provider fallback — Mangá

O Manga Notifier não depende de uma única fonte.

```text
Tenrai
  ↓
sucesso?
 ├── sim → continua
 │
 └── não
       ↓
   jikan-edge
```

Um resultado vazio:

```text
[]
```

é considerado uma resposta válida e **não ativa o fallback**.

O fallback só ocorre quando existe uma falha real na comunicação ou processamento do provider.

---

## Janela retroativa

### Filmes

O Movie Notifier considera:

```text
hoje
+
2 dias anteriores
```

### Anime

O Anime Notifier considera episódios lançados nas:

```text
últimas 24 horas
```

### Mangás

O Manga Notifier utiliza uma janela de dias recentes para localizar novas serializações.

A validação da data também é realizada localmente.

Essa estratégia permite recuperar itens caso uma execução automática tenha sido perdida.

---

# 🔁 Deduplicação

Notificações enviadas são registradas em:

```text
data/
├── sent-anime.json
├── sent-manga.json
└── sent-movies.json
```

Um item só é registrado **depois que o Discord confirma o envio**.

```text
API
 ↓
processamento
 ↓
Discord
 ↓
envio confirmado
 ↓
salva identificador
```

Se o envio falhar:

```text
Discord ❌
   ↓
ID não é salvo
   ↓
próxima execução
   ↓
nova tentativa
```

---

# 📚 Identificador de mangá

Mangás utilizam o **MyAnimeList ID** como identificador único.

Exemplo:

```json
[123456, 789012]
```

Como Tenrai e jikan-edge utilizam dados baseados no MyAnimeList, o mesmo identificador funciona independentemente do provider utilizado.

---

# 🔒 Concorrência

Os workflows que modificam arquivos de estado compartilham o mesmo grupo:

```yaml
concurrency:
  group: discord-notifier-state
  cancel-in-progress: false
```

Isso evita que dois processos façam alterações simultâneas nos arquivos JSON.

```text
movies.yml ─┐
anime.yml  ─┼─ discord-notifier-state
manga.yml  ─┘
```

---

# ☁️ Cloudflare Worker

Além do scheduler nativo do GitHub Actions, o projeto possui um **Cloudflare Worker funcionando como fallback**.

O Worker não executa a aplicação.

Ele apenas verifica se o workflow esperado foi criado pelo GitHub.

```text
GitHub schedule
      ↓
workflow apareceu?
  ┌──────┴───────┐
  │              │
 sim            não
  │              │
 fim      Cloudflare Worker
                  ↓
          workflow_dispatch
                  ↓
           GitHub Actions
```

O Worker também verifica execuções que:

- falharam;
- foram canceladas;
- terminaram de maneira anormal.

Execuções que ainda estão:

```text
queued
in_progress
waiting
```

não são duplicadas.

---

## Segurança do Cloudflare Worker

O Worker possui apenas as credenciais necessárias para acessar a API do GitHub.

Ele não possui acesso a:

```text
TMDB_ACCESS_TOKEN
ANIME_SCHEDULE_TOKEN

DISCORD_MOVIES_WEBHOOK_URL
DISCORD_ANIME_WEBHOOK_URL
DISCORD_MANGA_WEBHOOK_URL

LARA_ACCESS_KEY_ID
LARA_ACCESS_KEY_SECRET
```

Esses dados permanecem armazenados nos GitHub Secrets.

---

# 💾 Persistência

O projeto propositalmente não utiliza banco de dados.

O estado mínimo necessário é armazenado em arquivos JSON versionados:

```text
data/
├── anime-translations.json
├── manga-translations.json
├── sent-anime.json
├── sent-manga.json
└── sent-movies.json
```

Depois de uma execução com alterações:

```text
workflow
   ↓
notificação enviada
   ↓
JSON alterado
   ↓
git add
   ↓
git commit
   ↓
git pull --rebase
   ↓
git push
```

Para o volume atual do projeto, essa abordagem reduz infraestrutura e manutenção.

---

# 📁 Estrutura do projeto

```text
discord-notifier/
│
├── .github/
│   └── workflows/
│       ├── anime.yml
│       ├── ci.yml
│       ├── manga.yml
│       └── movies.yml
│
├── data/
│   ├── anime-translations.json
│   ├── manga-translations.json
│   ├── sent-anime.json
│   ├── sent-manga.json
│   └── sent-movies.json
│
├── references/
│   ├── README.md
│   ├── anilist.service.ts
│   └── anime-rss.service.ts
│
├── src/
│   ├── anime/
│   │   ├── anime-schedule.service.ts
│   │   ├── anime.embed.ts
│   │   ├── anime.mapper.ts
│   │   ├── anime.state.ts
│   │   ├── anime.translation-cache.ts
│   │   ├── anime.translation.ts
│   │   └── index.ts
│   │
│   ├── config/
│   │   └── env.ts
│   │
│   ├── discord/
│   │   └── webhook.service.ts
│   │
│   ├── manga/
│   │   ├── providers/
│   │   │   ├── jikan-edge.provider.ts
│   │   │   ├── manga-provider.ts
│   │   │   ├── provider-http.ts
│   │   │   └── tenrai.provider.ts
│   │   │
│   │   ├── index.ts
│   │   ├── manga.embed.ts
│   │   ├── manga.mapper.ts
│   │   ├── manga.service.ts
│   │   ├── manga.state.ts
│   │   ├── manga.translation-cache.ts
│   │   └── manga.translation.ts
│   │
│   ├── movies/
│   │   ├── movie.embed.ts
│   │   ├── movie.mapper.ts
│   │   ├── movie.state.ts
│   │   └── tmdb.service.ts
│   │
│   ├── translation/
│   │   └── lara.service.ts
│   │
│   ├── utils/
│   │   ├── date.ts
│   │   └── sleep.ts
│   │
│   └── index.ts
│
├── tests/
│   ├── anime.mapper.test.ts
│   ├── anime.translation-cache.test.ts
│   ├── anime.translation.test.ts
│   ├── date.test.ts
│   ├── manga.mapper.test.ts
│   ├── manga.service.test.ts
│   ├── manga.state.test.ts
│   ├── manga.translation-cache.test.ts
│   ├── manga.translation.test.ts
│   └── movie.mapper.test.ts
│
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
└── tsconfig.json
```

---

# 📚 Implementações de referência

A pasta:

```text
references/
```

mantém implementações que foram utilizadas durante o desenvolvimento, mas não fazem mais parte da solução ativa.

Atualmente inclui:

### AniList GraphQL

```text
references/anilist.service.ts
```

### AnimeSchedule RSS

```text
references/anime-rss.service.ts
```

Esses arquivos são mantidos apenas como referência técnica.

A implementação ativa utiliza a **AnimeSchedule API v3**.

---

# 🛠️ Tecnologias

- Node.js 22
- TypeScript
- GitHub Actions
- Cloudflare Workers
- Cloudflare Cron Triggers
- Vitest
- Discord Webhooks
- TMDB API
- AnimeSchedule API v3
- Tenrai API
- jikan-edge
- Lara Translate
- `@translated/lara`
- dotenv

---

# ⚙️ Configuração

## Clone

```bash
git clone https://github.com/JonathanJHK/discord-notifier.git
cd discord-notifier
```

## Dependências

```bash
npm install
```

## Ambiente

Crie:

```text
.env
```

utilizando `.env.example` como referência.

```env
TMDB_ACCESS_TOKEN=
DISCORD_MOVIES_WEBHOOK_URL=

ANIME_SCHEDULE_TOKEN=
DISCORD_ANIME_WEBHOOK_URL=

DISCORD_MANGA_WEBHOOK_URL=

LARA_ACCESS_KEY_ID=
LARA_ACCESS_KEY_SECRET=
```

Nunca envie o `.env` para o repositório.

---

# 🔑 Variáveis de ambiente

| Variável                     | Utilização                  |
| ---------------------------- | --------------------------- |
| `TMDB_ACCESS_TOKEN`          | Autenticação na API do TMDB |
| `DISCORD_MOVIES_WEBHOOK_URL` | Canal de filmes             |
| `ANIME_SCHEDULE_TOKEN`       | AnimeSchedule API v3        |
| `DISCORD_ANIME_WEBHOOK_URL`  | Canal de anime              |
| `DISCORD_MANGA_WEBHOOK_URL`  | Canal de mangás             |
| `LARA_ACCESS_KEY_ID`         | Lara Translate              |
| `LARA_ACCESS_KEY_SECRET`     | Lara Translate              |

Tenrai e jikan-edge não necessitam de credenciais na configuração atual.

---

# ▶️ Execução

## Filmes

Desenvolvimento:

```bash
npm run dev
```

Produção:

```bash
npm run build
npm start
```

---

## Anime

Desenvolvimento:

```bash
npm run anime:dev
```

Produção:

```bash
npm run build
npm run anime:start
```

---

## Mangás

Desenvolvimento:

```bash
npm run manga:dev
```

Produção:

```bash
npm run build
npm run manga:start
```

---

# 🧪 Testes

O projeto utiliza **Vitest**.

```bash
npm test
```

Modo watch:

```bash
npm run test:watch
```

Validar compilação:

```bash
npm run build
```

A suíte cobre funcionalidades como:

- utilitários de data;
- mapper de filmes;
- mapper de anime;
- mapper de mangás;
- deduplicação;
- estado do Manga Notifier;
- cache de traduções;
- invalidação por SHA-256;
- fallback da tradução;
- ausência de descrição;
- falha ao persistir cache;
- fallback Tenrai → jikan-edge;
- busca de detalhes com provider secundário.

Chamadas externas são mockadas nos testes.

Portanto, a suíte não deve:

- consumir a API do Lara;
- consultar Tenrai;
- consultar jikan-edge;
- chamar o Discord.

---

# ✅ CI

O workflow:

```text
.github/workflows/ci.yml
```

executa validação automática em pushes e pull requests.

```text
Checkout
   ↓
npm ci
   ↓
npm run build
   ↓
npm test
```

---

# ⏰ Workflows

## Filmes

```text
.github/workflows/movies.yml
```

Executa automaticamente e também suporta:

```text
workflow_dispatch
```

---

## Anime

```text
.github/workflows/anime.yml
```

Executado periodicamente e também suporta execução manual.

---

## Mangás

```text
.github/workflows/manga.yml
```

Executado diariamente e também suporta:

```text
workflow_dispatch
```

O estado persistido inclui:

```text
data/sent-manga.json
data/manga-translations.json
```

---

# 🔐 GitHub Secrets

Os workflows utilizam:

```text
TMDB_ACCESS_TOKEN
DISCORD_MOVIES_WEBHOOK_URL

ANIME_SCHEDULE_TOKEN
DISCORD_ANIME_WEBHOOK_URL

DISCORD_MANGA_WEBHOOK_URL

LARA_ACCESS_KEY_ID
LARA_ACCESS_KEY_SECRET
```

Nenhuma dessas credenciais deve estar diretamente no código.

---

# 🧯 Estratégias de proteção

O projeto combina:

```text
Retry
+
Timeout
+
Exponential Backoff
+
Jitter
+
Rate Limit Handling
+
Provider Fallback
+
Janela Retroativa
+
Deduplicação
+
Persistência
+
Concurrency
+
Translation Cache
+
GitHub Actions
+
Cloudflare Scheduler Fallback
+
Testes Automatizados
```

---

# 📡 Fontes de dados

## TMDB

Utilizado para informações de filmes.

> This product uses the TMDB API but is not endorsed or certified by TMDB.

---

## AnimeSchedule.net

Utilizado para dados de episódios e metadados de anime.

---

## Tenrai

Provider principal utilizado para descoberta e consulta de informações de mangá.

---

## jikan-edge

Provider secundário utilizado como fallback caso o Tenrai esteja indisponível.

---

## Lara Translate

Utilizado para tradução das sinopses para português do Brasil.

---

# 🎯 Objetivos técnicos

Além da funcionalidade de notificações, o projeto explora:

- integração com APIs REST;
- abstração de providers;
- provider fallback;
- webhooks;
- retry;
- exponential backoff;
- rate limiting;
- idempotência;
- deduplicação;
- cache;
- hashing SHA-256;
- processamento assíncrono;
- persistência simples;
- automação;
- CI;
- Cron Jobs;
- GitHub Actions;
- Cloudflare Workers;
- tolerância a falhas;
- testes unitários.

---

# 🚀 Possíveis evoluções

Algumas ideias futuras:

- notificações de séries;
- notificações de doramas;
- novos providers de mangá;
- filtros por revista;
- filtros por gênero;
- filtros por demografia;
- cargos opcionais do Discord;
- menções específicas por categoria;
- dashboard de execução;
- observabilidade e métricas;
- persistência externa caso o volume aumente.

---

# 📄 Licença

Este projeto utiliza a licença **ISC**.

---

# 👨‍💻 Autor

Desenvolvido por **Jonathan Heidy Kinjo**.

GitHub: [@JonathanJHK](https://github.com/JonathanJHK)

Repositório: [JonathanJHK/discord-notifier](https://github.com/JonathanJHK/discord-notifier)
