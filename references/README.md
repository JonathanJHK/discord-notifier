# Alternative Anime Sources

Implementações mantidas como referência de alternativas
testadas durante o desenvolvimento.

- `anilist.service.ts`
  - API GraphQL do AniList.
  - Abandonada como fonte principal devido à instabilidade observada.

- `anime-rss.service.ts`
  - RSS SUB do AnimeSchedule.
  - Funcional, mas substituído pela API v3 por fornecer menos metadados.

A implementação atualmente utilizada em produção é:
`src/anime/anime-schedule.service.ts`.
