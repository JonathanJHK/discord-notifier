// Pausa a execução por X milissegundos.
// É usada para evitar excesso de requisições em sequência ao enviar mensagens para o Discord.
export function sleep(ms: number): Promise<void> {
  // Encapsula o temporizador para permitir pausas com await nos fluxos assíncronos.
  return new Promise((resolve) => setTimeout(resolve, ms));
}
