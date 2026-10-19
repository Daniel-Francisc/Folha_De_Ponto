/**
 * Painel lateral de documentos (Frontend/Agent.md, seção 5.2-B).
 * Padrão à direita; o usuário pode mover.
 * Estados: escaneado e corrigido (info), escaneado com bom score (ciano),
 * escaneado com score < 0,95 (warning), não escaneado (neutro).
 */
export default function PainelDocumentos() {
  return (
    <aside aria-label="Documentos">
      {/* TODO: alternância de posição (lateral esquerda/direita) */}
      <ul aria-label="Arquivos do lote">
        {/* TODO: itens com ícone/cor do estado e nome do arquivo */}
      </ul>
    </aside>
  )
}
