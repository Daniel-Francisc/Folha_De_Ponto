/**
 * Utilitários do calendário acadêmico (Frontend/Agent.md, seções 5.1 e 5.3).
 * Sem dependências externas e sem qualquer acoplamento visual.
 */

export const DIAS_DA_SEMANA = [
  { curto: 'dom', extenso: 'domingo' },
  { curto: 'seg', extenso: 'segunda-feira' },
  { curto: 'ter', extenso: 'terça-feira' },
  { curto: 'qua', extenso: 'quarta-feira' },
  { curto: 'qui', extenso: 'quinta-feira' },
  { curto: 'sex', extenso: 'sexta-feira' },
  { curto: 'sáb', extenso: 'sábado' },
]

/** Data local no formato YYYY-MM-DD (sem conversão para UTC). */
export function paraISO(data) {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

/** Rótulo "Outubro de 2026". */
export function formatarMesAno(ano, mes) {
  const texto = new Date(ano, mes, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/**
 * Data completa para leitores de tela: "quinta-feira, 1 de outubro de 2026".
 * Usada no aria-label de cada célula.
 */
export function formatarDataCompleta(data) {
  return data.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Cria a célula de um dia.
 * `doMes` indica se o dia pertence ao mês exibido (false = dia "vazado"
 * do mês anterior/seguinte, usado apenas para completar a grade).
 */
function criarCelula(data, doMes) {
  return { data, doMes, dia: data.getDate(), chave: paraISO(data) }
}

/**
 * Matriz do mês: sempre semanas completas de 7 dias (domingo → sábado),
 * incluindo os dias adjacentes do mês anterior/seguinte para fechar a grade.
 *
 * @param {number} ano
 * @param {number} mes 0–11 (como em Date)
 * @returns {Array<Array<{data: Date, doMes: boolean, dia: number, chave: string}>>}
 */
export function criarMatrizDoMes(ano, mes) {
  const primeiroDia = new Date(ano, mes, 1)
  const totalDias = new Date(ano, mes + 1, 0).getDate()
  const deslocamento = primeiroDia.getDay()

  const celulas = []

  // Dias do mês anterior que completam a primeira semana.
  for (let i = 0; i < deslocamento; i += 1) {
    celulas.push(criarCelula(new Date(ano, mes, i - deslocamento + 1), false))
  }

  // Todos os dias do mês corrente.
  for (let dia = 1; dia <= totalDias; dia += 1) {
    celulas.push(criarCelula(new Date(ano, mes, dia), true))
  }

  // Dias do mês seguinte que completam a última semana.
  while (celulas.length % 7 !== 0) {
    const ultima = celulas[celulas.length - 1].data
    celulas.push(
      criarCelula(
        new Date(ultima.getFullYear(), ultima.getMonth(), ultima.getDate() + 1),
        false,
      ),
    )
  }

  // Agrupa em linhas de 7.
  const semanas = []
  for (let i = 0; i < celulas.length; i += 7) {
    semanas.push(celulas.slice(i, i + 7))
  }

  return semanas
}
