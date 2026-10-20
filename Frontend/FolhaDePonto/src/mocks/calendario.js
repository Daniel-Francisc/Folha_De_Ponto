/**
 * DADOS DE EXEMPLO — tela Calendário.
 * TODO(dados): apagar quando o backend fornecer notas, marcações e importação.
 */

export const NOTAS_INICIAIS = [
  {
    id: 'n1',
    titulo: 'Semana de avaliações',
    inicio: '2026-10-19',
    fim: '2026-10-23',
    contexto:
      'Aplicação das provas do 2º bimestre. Conferir salas e horários antes do início.',
  },
]

/**
 * Marcações por dia: { 'YYYY-MM-DD': ['semAula' | 'planejamento'] }.
 * Dias consecutivos do mesmo tipo são conectados por uma linha no calendário.
 */
export const MARCAS_INICIAIS = {
  '2026-10-12': ['semAula'],
  '2026-10-13': ['semAula'],
  '2026-10-14': ['semAula'],
  '2026-10-26': ['planejamento'],
  '2026-10-27': ['planejamento'],
}
