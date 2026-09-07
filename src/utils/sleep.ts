// Pausa a execução por X milissegundos.
// É usada para evitar excesso de requisições em sequência ao enviar mensagens para o Discord.
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
