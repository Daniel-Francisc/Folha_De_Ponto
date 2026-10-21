import styles from './PainelDocumentos.module.css'

/**
 * Painel lateral da tela Servidor (Frontend/Agent.md, seção 5.2-B).
 *
 * Duas abas:
 * - "Documentos": lista com o estado de cada arquivo.
 * - "Dados": campos extraídos, editáveis pelo usuário.
 *
 * Cores dos documentos:
 * - corrigido ......... info (azul)
 * - ok ................ ciano/verde claro
 * - baixo ............. warning (amarelo) — score < 0,95
 * - nao_escaneado ..... neutro
 */

const STATUS = {
  corrigido: 'Escaneado e corrigido',
  ok: 'Escaneado (bom score)',
  baixo: 'Score abaixo de 0,95',
  nao_escaneado: 'Não escaneado',
}

export default function PainelDocumentos({
  documentos = [],
  docAtivoId,
  onSelecionar,
  campos = [],
  onCampoChange,
  onSalvar,
  salvando = false,
  aba,
  onAba,
  lado,
  onAlternarLado,
}) {
  const docAtivo = documentos.find((doc) => doc.id === docAtivoId)

  return (
    <aside className={styles.painel} aria-label="Documentos e dados">
      <header className={styles.cabecalho}>
        <h2 className={styles.titulo}>Documentos</h2>

        {/* Move o painel entre a lateral esquerda e a direita. */}
        <button
          type="button"
          className={styles.mover}
          onClick={onAlternarLado}
          aria-label={
            lado === 'direita' ? 'Mover painel para a esquerda' : 'Mover painel para a direita'
          }
          title={lado === 'direita' ? 'Mover para a esquerda' : 'Mover para a direita'}
        >
          <i
            className={`bi ${lado === 'direita' ? 'bi-chevron-double-left' : 'bi-chevron-double-right'}`}
            aria-hidden="true"
          />
        </button>
      </header>

      {/* ---------- Abas ---------- */}
      <div className={styles.abas} role="tablist" aria-label="Conteúdo do painel">
        <button
          type="button"
          role="tab"
          id="aba-documentos"
          aria-selected={aba === 'documentos'}
          aria-controls="painel-lista-documentos"
          className={`${styles.aba} ${aba === 'documentos' ? styles.abaAtiva : ''}`}
          onClick={() => onAba('documentos')}
        >
          Documentos
        </button>

        <button
          type="button"
          role="tab"
          id="aba-dados"
          aria-selected={aba === 'dados'}
          aria-controls="painel-dados"
          className={`${styles.aba} ${aba === 'dados' ? styles.abaAtiva : ''}`}
          onClick={() => onAba('dados')}
        >
          Dados
        </button>
      </div>

      {aba === 'documentos' ? (
        <div
          id="painel-lista-documentos"
          role="tabpanel"
          aria-labelledby="aba-documentos"
          className={styles.painelAba}
        >
          <ul className={styles.lista}>
            {documentos.map((doc) => (
              <li key={doc.id}>
                <button
                  type="button"
                  className={`${styles.item} ${styles[doc.status]} ${
                    doc.id === docAtivoId ? styles.ativo : ''
                  }`}
                  onClick={() => onSelecionar(doc)}
                  aria-current={doc.id === docAtivoId ? 'true' : undefined}
                >
                  <span className={styles.marcador} aria-hidden="true" />

                  <span className={styles.itemTexto}>
                    <span className={styles.nome}>{doc.nome}</span>
                    <span className={styles.statusTexto}>{STATUS[doc.status]}</span>
                  </span>

                  {doc.score !== null && (
                    <span className={styles.score}>{doc.score.toFixed(2)}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div id="painel-dados" role="tabpanel" aria-labelledby="aba-dados" className={styles.painelAba}>
          {!docAtivo ? (
            <p className={styles.vazio}>Selecione um documento para ver os dados.</p>
          ) : (
            <>
              <p className={styles.arquivoAtivo}>{docAtivo.nome}</p>

              <form
                className={styles.form}
                onSubmit={(evento) => {
                  evento.preventDefault()
                  onSalvar?.()
                }}
              >
                {campos.map((campo) => (
                  <label key={campo.id} className={styles.campo}>
                    <span className={styles.campoRotulo}>{campo.rotulo}</span>
                    <input
                      type="text"
                      className={styles.input}
                      value={campo.valor}
                      onChange={(evento) => onCampoChange(campo.id, evento.target.value)}
                    />
                  </label>
                ))}
                <button className={styles.botaoSalvar} type="submit" disabled={salvando}>
                  {salvando ? 'Salvando…' : 'Salvar alterações'}
                </button>
              </form>

              <p className={styles.nota}>
                A competência também define a pasta e o nome final do PDF. Confira os dados antes de salvar.
              </p>
            </>
          )}
        </div>
      )}
    </aside>
  )
}
