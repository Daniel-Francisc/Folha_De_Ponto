/**
 * Memória de sessão da tela Servidor.
 *
 * Guarda os PDFs processados (e seus arquivos) enquanto a página estiver
 * aberta. Sobrevive à navegação entre telas, mas some ao recarregar/fechar —
 * exatamente o comportamento pedido para a visualização dos OCRs.
 */

const documentos = []

export function listarDocumentosSessao() {
  return documentos
}

export function adicionarDocumentoSessao(documento) {
  documentos.unshift(documento)
}

export function atualizarDocumentoSessao(id, dados) {
  const indice = documentos.findIndex((item) => item.id === id)
  if (indice >= 0) documentos[indice] = { ...documentos[indice], ...dados }
}
