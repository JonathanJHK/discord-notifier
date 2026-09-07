# 🎬🎌 Discord Notifier

![CI](https://github.com/JonathanJHK/discord-notifier/actions/workflows/ci.yml/badge.svg)
![Movie Notifier](https://github.com/JonathanJHK/discord-notifier/actions/workflows/movies.yml/badge.svg)
![Anime Notifier](https://github.com/JonathanJHK/discord-notifier/actions/workflows/anime.yml/badge.svg)

Serviço automatizado de notificações para Discord desenvolvido em **Node.js + TypeScript**.

O projeto acompanha:

- 🎬 estreias de filmes nos cinemas brasileiros;
- 🎌 lançamento de novos episódios legendados de animes;
- 🇧🇷 tradução automática das sinopses de anime para português do Brasil.

Os dados são obtidos através das APIs do **TMDB** e **AnimeSchedule.net**, processados pela aplicação e enviados para canais específicos do Discord através de **webhooks**.

A execução em produção é automatizada com **GitHub Actions**, com um **Cloudflare Worker atuando como scheduler de contingência** caso uma execução agendada do GitHub não ocorra como esperado.

---

## ✨ Funcionalidades

### 🎬 Movie Release Notifier

O Movie Notifier acompanha lançamentos cinematográficos disponíveis no Brasil.

Principais funcionalidades:

- consulta estreias de filmes nos cinemas brasileiros;
- considera uma janela retroativa de segurança;
- suporta paginação dos resultados retornados pelo TMDB;
- busca informações detalhadas dos filmes;
- prioriza trailers disponíveis em português;
- utiliza trailer em inglês como fallback;
- envia notificações através de embeds formatados do Discord;
- mantém estado persistente para impedir notificações duplicadas;
- permite recuperar lançamentos caso uma execução anterior falhe.

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

### 🎌 Anime Episode Notifier

O Anime Notifier acompanha novos episódios legendados utilizando a API v3 do **AnimeSchedule.net**.

Principais funcionalidades:

- consulta o timetable de lançamentos;
- considera episódios lançados nas últimas 24 horas;
- processa apenas lançamentos `SUB`;
- busca informações adicionais do anime;
- utiliza os dados básicos do timetable caso a consulta de detalhes falhe;
- identifica cada episódio através de uma chave única;
- evita notificações duplicadas;
- mantém cache dos detalhes durante a mesma execução;
- traduz automaticamente sinopses para português do Brasil.

As notificações podem incluir:

- título;
- título romaji;
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

## 🇧🇷 Tradução de sinopses

As descrições dos animes são traduzidas automaticamente utilizando o **Lara Translate**.

O texto original completo é enviado para tradução.

Não é realizado truncamento da sinopse antes da chamada à API.

```text
AnimeSchedule
      ↓
sinopse original
      ↓
cache de tradução
   ┌──────┴──────┐
   │             │
existe         não existe
   │             │
   │       Lara Translate
   │             │
   │           PT-BR
   │             ↓
   │       salva no cache
   │             │
   └──────┬──────┘
          ↓
       Discord
```

### Cache de traduções

As traduções são persistidas em:

```text
data/anime-translations.json
```

Cada entrada possui:

- identificador do anime;
- hash SHA-256 da descrição original;
- tradução em português.

Exemplo conceitual:

```json
{
  "anime-route": {
    "sourceHash": "sha256...",
    "translated": "Sinopse traduzida..."
  }
}
```

Quando um novo episódio do mesmo anime é encontrado:

```text
sinopse original
       ↓
calcula SHA-256
       ↓
hash igual ao cache?
   ┌───────┴────────┐
   │                │
  sim              não
   │                │
usa cache     traduz novamente
```

Isso reduz o consumo da API e evita traduzir a mesma sinopse a cada novo episódio.

Caso o AnimeSchedule altere a descrição original, o hash muda e o cache é automaticamente invalidado.

### Fallback da tradução

A tradução é considerada uma funcionalidade complementar.

Se o Lara estiver:

- indisponível;
- sem credenciais;
- fora da cota;
- retornando erro;
- demorando além do timeout;

o Anime Notifier continua funcionando normalmente e utiliza a descrição original.

```text
Lara disponível
      ↓
PT-BR
      ↓
Discord

Lara indisponível
      ↓
descrição original
      ↓
Discord
```

Uma falha de tradução nunca deve impedir o envio de um episódio.

---

## 🏗️ Arquitetura

```text
                         ┌───────────────────┐
                         │ Cloudflare Worker │
                         │     Fallback      │
                         └─────────┬─────────┘
                                   │
                         verifica execuções
                                   │
                                   ▼
                         ┌───────────────────┐
                         │  GitHub Actions   │
                         └─────────┬─────────┘
                                   │
                  ┌────────────────┴────────────────┐
                  │                                 │
                  ▼                                 ▼
         ┌─────────────────┐              ┌───────────────────┐
         │    TMDB API     │              │ AnimeSchedule API │
         └────────┬────────┘              └─────────┬─────────┘
                  │                                 │
                  ▼                                 ▼
         ┌─────────────────┐              ┌───────────────────┐
         │ Movie Notifier  │              │  Anime Notifier   │
         └────────┬────────┘              └─────────┬─────────┘
                  │                                 │
                  │                                 ▼
                  │                       ┌───────────────────┐
                  │                       │ Translation Cache │
                  │                       └─────────┬─────────┘
                  │                                 │
                  │                        cache miss│
                  │                                 ▼
                  │                       ┌───────────────────┐
                  │                       │  Lara Translate   │
                  │                       └─────────┬─────────┘
                  │                                 │
                  └─────────────────┬───────────────┘
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

O projeto utiliza diferentes estratégias para reduzir falhas, evitar notificações duplicadas e recuperar execuções perdidas.

## Retry

Chamadas externas possuem tratamento para falhas temporárias.

Entre os mecanismos utilizados estão:

- timeout;
- retry;
- exponential backoff;
- jitter;
- tratamento de erros de rede;
- tratamento de respostas `5xx`;
- tratamento de rate limit `429`;
- respeito ao `Retry-After` quando disponível.

Erros considerados permanentes não são repetidos desnecessariamente.

---

## Rate limit do Discord

O envio através dos webhooks possui tratamento específico para respostas:

```text
429 Too Many Requests
```

Quando o Discord informa um período de espera, o notifier aguarda antes de realizar uma nova tentativa.

Também existe um intervalo entre mensagens sucessivas para reduzir a possibilidade de atingir o limite do webhook.

---

## Janela retroativa — Filmes

O Movie Notifier consulta:

```text
hoje
+
2 dias anteriores
```

Exemplo:

```text
Hoje
 │
 ├── hoje
 ├── ontem
 └── anteontem
```

Isso permite recuperar filmes que poderiam ter sido perdidos caso uma execução do GitHub Actions falhasse.

---

## Janela retroativa — Anime

O Anime Notifier considera episódios lançados durante as:

```text
últimas 24 horas
```

Portanto, uma falha temporária do GitHub Actions ou AnimeSchedule não significa necessariamente a perda da notificação.

---

## Deduplicação

Itens já enviados são armazenados em:

```text
data/
├── sent-movies.json
└── sent-anime.json
```

O estado só é atualizado depois que o envio ao Discord é concluído.

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

# ☁️ Cloudflare Worker — Scheduler de contingência

Além do agendamento nativo do GitHub Actions, o projeto utiliza um **Cloudflare Worker como fallback**.

O Worker não executa a lógica de filmes ou anime.

Sua responsabilidade é apenas verificar se os workflows esperados foram executados e, quando necessário, solicitar uma execução manual através da API do GitHub.

```text
GitHub schedule
      ↓
workflow executado?
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

Essa abordagem mantém toda a lógica da aplicação centralizada no GitHub Actions.

O Cloudflare funciona apenas como uma segunda camada de agendamento.

---

## Por que utilizar um fallback?

Workflows agendados do GitHub Actions podem eventualmente sofrer atraso ou não iniciar no horário esperado.

Com o Worker:

```text
GitHub Actions
     +
Cloudflare Cron
     +
janela retroativa
     +
deduplicação
```

o sistema possui múltiplas camadas de proteção contra perda de notificações.

---

## Segurança do Worker

O Cloudflare não recebe:

```text
TMDB_ACCESS_TOKEN
ANIME_SCHEDULE_TOKEN
LARA_ACCESS_KEY_ID
LARA_ACCESS_KEY_SECRET
DISCORD_MOVIES_WEBHOOK_URL
DISCORD_ANIME_WEBHOOK_URL
```

Essas credenciais permanecem no GitHub.

O Worker possui somente o acesso mínimo necessário para:

- consultar execuções dos workflows;
- disparar `workflow_dispatch` quando necessário.

As credenciais utilizadas pelo Worker são armazenadas através dos Secrets do Cloudflare.

---

# 🔒 Concorrência

Os workflows responsáveis por filmes e animes utilizam o mesmo grupo de concorrência:

```yaml
concurrency:
  group: discord-notifier-state
  cancel-in-progress: false
```

Isso evita que dois processos que alteram os arquivos de estado executem simultaneamente.

```text
Movie Workflow ──┐
                 ├── discord-notifier-state
Anime Workflow ──┘
```

Se um estiver rodando, o outro aguarda.

---

# 💾 Persistência

O projeto não necessita de banco de dados.

O estado mínimo necessário é versionado através de arquivos JSON:

```text
data/
├── anime-translations.json
├── sent-anime.json
└── sent-movies.json
```

### `sent-movies.json`

Armazena os IDs dos filmes já notificados.

### `sent-anime.json`

Armazena identificadores dos episódios já enviados.

Um identificador de episódio segue conceitualmente:

```text
anime-route:air-type:episode
```

Exemplo:

```text
anime-example:sub:10
```

### `anime-translations.json`

Armazena traduções das sinopses juntamente com o hash da descrição original.

---

# 🔄 Atualização automática do estado

Quando uma execução envia novas notificações, os arquivos alterados são commitados automaticamente pelo GitHub Actions.

Fluxo:

```text
execução
   ↓
novo item enviado
   ↓
arquivo JSON alterado
   ↓
git add
   ↓
git commit
   ↓
git pull --rebase
   ↓
git push
```

Isso permite manter persistência sem banco de dados ou infraestrutura adicional.

---

# 📁 Estrutura do projeto

```text
discord-notifier/
│
├── .github/
│   └── workflows/
│       ├── anime.yml
│       ├── ci.yml
│       └── movies.yml
│
├── data/
│   ├── anime-translations.json
│   ├── sent-anime.json
│   └── sent-movies.json
│
├── references/
│   ├── README.md
│   ├── anilist.service.ts
│   └── anime-rss.service.ts
│
├── src/
│   │
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

mantém implementações utilizadas durante a evolução do Anime Notifier.

Atualmente são preservadas como referência:

### AniList GraphQL

```text
references/anilist.service.ts
```

Implementação experimental utilizando a API GraphQL do AniList.

### AnimeSchedule RSS

```text
references/anime-rss.service.ts
```

Implementação anterior baseada no feed RSS do AnimeSchedule.

Esses arquivos não fazem parte da implementação utilizada atualmente em produção.

A fonte principal de dados de anime é:

```text
src/anime/anime-schedule.service.ts
```

utilizando a **AnimeSchedule API v3**.

---

# 🛠️ Tecnologias

Principais tecnologias utilizadas:

- Node.js 22
- TypeScript
- GitHub Actions
- Cloudflare Workers
- Cloudflare Cron Triggers
- Vitest
- Discord Webhooks
- TMDB API
- AnimeSchedule.net API v3
- Lara Translate
- `@translated/lara`
- dotenv

---

# ⚙️ Configuração local

## 1. Clone o projeto

```bash
git clone https://github.com/JonathanJHK/discord-notifier.git
```

Entre na pasta:

```bash
cd discord-notifier
```

---

## 2. Instale as dependências

```bash
npm install
```

---

## 3. Configure as variáveis de ambiente

Crie:

```text
.env
```

a partir de:

```text
.env.example
```

Configure:

```env
TMDB_ACCESS_TOKEN=
DISCORD_MOVIES_WEBHOOK_URL=

ANIME_SCHEDULE_TOKEN=
DISCORD_ANIME_WEBHOOK_URL=

LARA_ACCESS_KEY_ID=
LARA_ACCESS_KEY_SECRET=
```

Nunca envie o arquivo `.env` para o GitHub.

---

# 🔑 Variáveis de ambiente

| Variável                     | Descrição                                             |
| ---------------------------- | ----------------------------------------------------- |
| `TMDB_ACCESS_TOKEN`          | Token de leitura utilizado para acessar a API do TMDB |
| `DISCORD_MOVIES_WEBHOOK_URL` | Webhook do canal de notificações de filmes            |
| `ANIME_SCHEDULE_TOKEN`       | Application Token utilizado na AnimeSchedule API v3   |
| `DISCORD_ANIME_WEBHOOK_URL`  | Webhook do canal de notificações de anime             |
| `LARA_ACCESS_KEY_ID`         | Access Key ID utilizado pelo Lara Translate           |
| `LARA_ACCESS_KEY_SECRET`     | Secret associado à credencial do Lara Translate       |

---

# ▶️ Execução

## Filmes — desenvolvimento

```bash
npm run dev
```

---

## Filmes — produção

Compile:

```bash
npm run build
```

Execute:

```bash
npm start
```

---

## Anime — desenvolvimento

```bash
npm run anime:dev
```

---

## Anime — produção

Compile:

```bash
npm run build
```

Execute:

```bash
npm run anime:start
```

---

# 🧪 Testes

O projeto utiliza **Vitest**.

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

Os testes cobrem principalmente:

- utilitários de data;
- mapeamento de filmes;
- mapeamento de anime;
- fallbacks de dados;
- geração de identificadores de deduplicação;
- cache de traduções;
- recuperação de tradução existente;
- cache miss;
- invalidação de tradução quando a descrição original muda;
- fallback quando o Lara Translate está indisponível;
- falhas de persistência do cache.

As chamadas ao Lara Translate são mockadas nos testes automatizados.

Portanto:

```text
npm test
```

não deve consumir a cota da API de tradução.

---

# ✅ CI

O projeto possui integração contínua através de:

```text
.github/workflows/ci.yml
```

O workflow é executado em:

- pushes para `main`;
- pull requests direcionados para `main`.

Fluxo:

```text
Checkout
   ↓
Setup Node.js
   ↓
npm ci
   ↓
npm run build
   ↓
npm test
```

---

# ⏰ GitHub Actions

## 🎬 Movie Release Notifier

Workflow:

```text
.github/workflows/movies.yml
```

Execuções programadas:

```text
09:00 BRT
18:00 BRT
```

O workflow também pode ser iniciado manualmente através de:

```text
workflow_dispatch
```

---

## 🎌 Anime Episode Notifier

Workflow:

```text
.github/workflows/anime.yml
```

Execução:

```text
a cada 2 horas
```

Também suporta:

```text
workflow_dispatch
```

O workflow persiste automaticamente:

```text
data/sent-anime.json
data/anime-translations.json
```

---

# 🔐 GitHub Secrets

Os workflows utilizam os seguintes Repository Secrets:

```text
TMDB_ACCESS_TOKEN
DISCORD_MOVIES_WEBHOOK_URL

ANIME_SCHEDULE_TOKEN
DISCORD_ANIME_WEBHOOK_URL

LARA_ACCESS_KEY_ID
LARA_ACCESS_KEY_SECRET
```

Nenhuma dessas credenciais deve ser armazenada diretamente no código.

---

# ☁️ Configuração conceitual do Cloudflare

O Worker utilizado como fallback possui configuração separada da aplicação principal.

Ele precisa somente das informações necessárias para acessar a API do GitHub.

Exemplo conceitual:

```text
Cloudflare Worker

Secret
└── GitHub access token

Variables
├── repository owner
└── repository name
```

O token utilizado deve possuir apenas as permissões mínimas necessárias para consultar e disparar workflows.

---

# 🔁 Fluxo completo de contingência

A arquitetura final de execução funciona em camadas.

```text
1. GitHub Actions agenda workflow
             ↓
2. workflow executa normalmente
             ↓
3. notifier consulta API
             ↓
4. processa dados
             ↓
5. envia ao Discord
             ↓
6. persiste estado
```

Caso a execução esperada não aconteça:

```text
Cloudflare Cron
      ↓
verifica GitHub Actions
      ↓
execução recente encontrada?
   ┌───────┴────────┐
   │                │
  sim              não
   │                │
  fim       workflow_dispatch
                     ↓
              GitHub Actions
```

Mesmo que uma execução seja repetida, a camada de deduplicação impede que itens já processados sejam enviados novamente.

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
Janela Retroativa
+
Persistência
+
Deduplicação
+
Concurrency
+
Translation Cache
+
GitHub Actions
+
Cloudflare Fallback
```

Isso permite manter a solução simples, sem banco de dados ou servidor próprio, mas ainda tolerante a diversos tipos de falhas.

---

# 📡 Fontes de dados

## TMDB

Os dados relacionados a filmes são fornecidos pela API do:

**The Movie Database — TMDB**

São utilizados dados como:

- títulos;
- sinopses;
- imagens;
- gêneros;
- duração;
- avaliação;
- trailers;
- datas de lançamento.

> This product uses the TMDB API but is not endorsed or certified by TMDB.

---

## AnimeSchedule.net

Os dados de anime são obtidos através da:

**AnimeSchedule.net API v3**

São utilizados dados como:

- timetable;
- episódios;
- datas e horários;
- títulos;
- gêneros;
- duração;
- imagens;
- serviços de streaming;
- links externos;
- descrições.

---

## Lara Translate

O **Lara Translate** é utilizado para traduzir as sinopses obtidas pelo AnimeSchedule para português do Brasil.

A tradução possui cache persistente para reduzir chamadas repetidas.

---

# 🔐 Segurança

O projeto segue algumas regras para reduzir exposição de credenciais:

- `.env` não é versionado;
- tokens não são inseridos diretamente no código;
- webhooks do Discord permanecem em Secrets;
- credenciais do Lara permanecem em Secrets;
- token utilizado pelo Cloudflare possui acesso limitado;
- o Worker não recebe os tokens do TMDB, AnimeSchedule ou Discord;
- secrets de produção são armazenados nas plataformas responsáveis pela execução.

---

# 🚫 Banco de dados

O projeto propositalmente não utiliza banco de dados.

Para o volume atual de notificações, arquivos JSON versionados são suficientes para manter:

```text
IDs enviados
+
cache de tradução
```

Isso reduz:

- custo;
- infraestrutura;
- manutenção;
- dependências externas;
- complexidade operacional.

---

# 📌 Objetivos técnicos do projeto

Além da funcionalidade de notificações, o projeto explora conceitos como:

- integração com APIs REST;
- consumo de APIs autenticadas;
- webhooks;
- tratamento de rate limits;
- retry;
- exponential backoff;
- idempotência;
- deduplicação;
- persistência simples;
- processamento assíncrono;
- cache;
- hashing;
- fallbacks;
- CI;
- automação;
- agendamento;
- tolerância a falhas;
- GitHub Actions;
- Cloudflare Workers;
- testes unitários.

---

# 🚀 Possíveis evoluções

Algumas funcionalidades que podem ser adicionadas futuramente:

- notificações de séries;
- notificações de doramas;
- filtros personalizados por anime;
- filtros por gênero;
- cargos específicos do Discord;
- menções opcionais por categoria;
- novos provedores de dados;
- métricas de execução;
- observabilidade;
- dashboard;
- persistência externa caso o volume cresça.

---

# 📄 Licença

Este projeto utiliza a licença **ISC**.

---

# 👨‍💻 Autor

Desenvolvido por **Jonathan Heidy Kinjo**.

GitHub:

[@JonathanJHK](https://github.com/JonathanJHK)

Repositório:

[JonathanJHK/discord-notifier](https://github.com/JonathanJHK/discord-notifier)
