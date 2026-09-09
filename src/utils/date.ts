// Retorna a data atual no fuso de São Paulo, em formato ISO compatível com a API do TMDB.
export function getBrazilDate(): string {
  // formatToParts evita depender da ordem/localização da string formatada.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error('Não foi possível determinar a data atual.');
  }

  return `${year}-${month}-${day}`;
}

// Soma ou subtrai dias de uma data no formato YYYY-MM-DD.
export function addDays(date: string, days: number): string {
  // UTC impede que mudanças de horário local alterem o dia calculado.
  const [year, month, day] = date.split('-').map(Number);

  const value = new Date(Date.UTC(year, month - 1, day + days));

  return value.toISOString().slice(0, 10);
}
