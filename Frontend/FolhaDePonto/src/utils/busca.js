/**
 * Utilitários de busca textual (Frontend/Agent.md, seção 5.2-A).
 *
 * Regra da tela Servidor: o usuário digita
 *   - somente o número        →  "1234567"
 *   - somente o nome          →  "Maria Silva"
 *   - número e nome com pipe  →  "1234567|Maria Silva"
 */

/** Remove acentos e normaliza para minúsculas (busca tolerante). */
export function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Filtra servidores pelo termo digitado.
 * Cada parte separada por "|" precisa aparecer no nome OU na matrícula,
 * o que faz "1234567|Maria Silva" funcionar como combinação (E lógico).
 *
 * @param {Array<{nome: string, matricula: string}>} lista
 * @param {string} termo
 */
export function filtrarServidores(lista, termo) {
  const partes = termo
    .split('|')
    .map((parte) => normalizar(parte))
    .filter(Boolean)

  // Sem termo: devolve a lista completa do cache.
  if (partes.length === 0) return lista

  return lista.filter((servidor) => {
    const nome = normalizar(servidor.nome)
    const matricula = normalizar(servidor.matricula)

    return partes.every((parte) => nome.includes(parte) || matricula.includes(parte))
  })
}

/** Rótulo curto: "Maria Silva · 1234567". */
export function rotuloServidor(servidor) {
  return `${servidor.nome} · ${servidor.matricula}`
}
