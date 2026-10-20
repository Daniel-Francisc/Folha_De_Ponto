/**
 * Regras de marcação do calendário (Frontend/Agent.md, seção 5.3).
 * Estrutura: { 'YYYY-MM-DD': ['semAula' | 'planejamento'] }
 */

export const TIPOS_MARCA = {
  semAula: { rotulo: 'Sem aula', cor: 'vermelha' },
  planejamento: { rotulo: 'Planejamento acadêmico', cor: 'roxa' },
}

/** Converte 'YYYY-MM-DD' em Date local (evita o deslocamento do UTC). */
export function paraData(iso) {
  const [ano, mes, dia] = iso.split('-').map(Number)
  return new Date(ano, mes - 1, dia)
}

/** Soma dias a uma data ISO e devolve outra ISO. */
function somarDias(iso, quantidade) {
  const data = paraData(iso)
  data.setDate(data.getDate() + quantidade)

  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

/** Adiciona ou remove uma marca de um único dia. */
export function alternarMarca(marcas, dia, tipo) {
  const atuais = marcas[dia] ?? []
  const proximas = atuais.includes(tipo)
    ? atuais.filter((item) => item !== tipo)
    : [...atuais, tipo]

  const copia = { ...marcas }

  if (proximas.length === 0) {
    delete copia[dia]
  } else {
    copia[dia] = proximas
  }

  return copia
}

/** Lista todos os dias de um intervalo (inclusive as pontas). */
export function diasDoIntervalo(inicio, fim) {
  const dias = []
  let atual = inicio

  // Laço limitado para evitar loop infinito se as datas vierem invertidas.
  for (let i = 0; atual <= fim && i < 3660; i += 1) {
    dias.push(atual)
    atual = somarDias(atual, 1)
  }

  return dias
}

/** Aplica uma marca a todos os dias do intervalo. */
export function aplicarIntervalo(marcas, inicio, fim, tipo) {
  const copia = { ...marcas }

  for (const dia of diasDoIntervalo(inicio, fim)) {
    const atuais = copia[dia] ?? []
    copia[dia] = [...new Set([...atuais, tipo])]
  }

  return copia
}

/** Nota que cobre um dia (inicio <= dia <= fim). */
export function notaDoDia(notas, dia) {
  if (!dia) return null
  return notas.find((nota) => nota.inicio <= dia && dia <= nota.fim) ?? null
}
