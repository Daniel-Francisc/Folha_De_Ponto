import { useRef } from 'react'
import styles from './emails.module.css'

/**
 * Aba "Histórico" (Frontend/Agent.md, seção 5.4).
 *
 * - Visualizador do e-mail enviado (⅔) + histórico resumido (⅓).
 * - No resumo, itens nominais exibem a faixa de arquivos enviados:
 *   arraste para o lado ou use ← / →; clicar em um arquivo troca o
 *   visualizador de e-mail pelo visualizador de arquivo.
 * - Abaixo: histórico completo com filtro (automáticos/nominais) e
 *   quantidade por página (5 a 50).
 */

function formatarData(iso) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function HistoricoPainel({
  historico = [],
  filtro,
  onFiltro,
  porPagina,
  onPorPagina,
  pagina,
  onPagina,
  selecionadoId,
  onSelecionar,
  arquivoSelecionado,
  onArquivo,
}) {
  const faixaRef = useRef(null)

  const selecionado = historico.find((item) => item.id === selecionadoId) ?? null
  const filtrados = historico.filter((item) => item.tipo === filtro)
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina))
  const paginaAtual = Math.min(pagina, totalPaginas - 1)
  const inicio = paginaAtual * porPagina
  const itens = filtrados.slice(inicio, inicio + porPagina)
  const resumo = historico.slice(0, 8)

  /** ← / → navegam entre os arquivos do registro selecionado. */
  function aoTeclar(evento) {
    if (!selecionado || selecionado.arquivos.length === 0) return
    if (evento.key !== 'ArrowLeft' && evento.key !== 'ArrowRight') return

    evento.preventDefault()

    const arquivos = selecionado.arquivos
    const indiceAtual = arquivos.findIndex((item) => item.id === arquivoSelecionado?.id)
    const destino =
      evento.key === 'ArrowRight'
        ? Math.min(arquivos.length - 1, indiceAtual + 1)
        : Math.max(0, indiceAtual < 0 ? 0 : indiceAtual - 1)

    onArquivo(arquivos[destino])
  }

  /* Arrastar a faixa horizontalmente com o mouse. */
  function iniciarArraste(evento) {
    const faixa = faixaRef.current
    if (!faixa) return
    faixa.dataset.arrastando = 'sim'
    faixa.dataset.origem = String(evento.clientX)
    faixa.dataset.scroll = String(faixa.scrollLeft)
  }

  function moverArraste(evento) {
    const faixa = faixaRef.current
    if (!faixa || faixa.dataset.arrastando !== 'sim') return
    faixa.scrollLeft =
      Number(faixa.dataset.scroll) - (evento.clientX - Number(faixa.dataset.origem))
  }

  function pararArraste() {
    const faixa = faixaRef.current
    if (faixa) faixa.dataset.arrastando = 'nao'
  }

  return (
    <>
      <div className={styles.grade}>
        {/* ---------- Visualizador ---------- */}
        <article className={styles.card}>
          {arquivoSelecionado ? (
            <div className={styles.arquivoViewer}>
              <i className={`bi bi-file-earmark-pdf ${styles.arquivoIcone}`} aria-hidden="true" />
              <p className={styles.viewerAssunto}>{arquivoSelecionado.nome}</p>
              <p className={styles.viewerMeta}>
                Pré-visualização do arquivo enviado. O conteúdo será exibido quando o backend
                fornecer o PDF.
              </p>
              <button
                type="button"
                className={styles.botaoSecundario}
                onClick={() => onArquivo(null)}
              >
                Voltar ao e-mail
              </button>
            </div>
          ) : selecionado ? (
            <div className={styles.viewer}>
              <div className={styles.cardCabecalho}>
                <h2 className={styles.viewerAssunto}>{selecionado.assunto}</h2>
                <span className={`${styles.badge} ${styles.badgeNeutra}`}>
                  {selecionado.tipo === 'nominal' ? 'Nominal' : 'Automático'}
                </span>
              </div>

              <p className={styles.viewerMeta}>
                Para: {selecionado.destinatario} · {formatarData(selecionado.data)}
              </p>

              <p className={styles.viewerCorpo}>{selecionado.corpo}</p>
            </div>
          ) : (
            <p className={styles.vazio}>Selecione um registro no histórico para visualizar.</p>
          )}
        </article>

        {/* ---------- Histórico resumido ---------- */}
        <aside className={styles.card}>
          <h2 className={styles.cardTitulo}>Histórico resumido</h2>

          <ul className={styles.resumoLista}>
            {resumo.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`${styles.resumoItem} ${
                    item.id === selecionadoId ? styles.resumoItemAtivo : ''
                  }`}
                  onClick={() => onSelecionar(item)}
                >
                  <span className={styles.notificacaoAssunto}>{item.assunto}</span>
                  <span className={styles.resumoMeta}>
                    {item.destinatario} · {formatarData(item.data)}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {selecionado?.tipo === 'nominal' && selecionado.arquivos.length > 0 && (
            <>
              <h3 className={styles.cardTitulo}>Arquivos enviados</h3>

              <div
                className={styles.faixa}
                ref={faixaRef}
                tabIndex={0}
                role="list"
                aria-label="Arquivos enviados — use as setas para navegar"
                onKeyDown={aoTeclar}
                onPointerDown={iniciarArraste}
                onPointerMove={moverArraste}
                onPointerUp={pararArraste}
                onPointerLeave={pararArraste}
              >
                {selecionado.arquivos.map((arquivo) => (
                  <button
                    key={arquivo.id}
                    type="button"
                    className={`${styles.faixaItem} ${
                      arquivo.id === arquivoSelecionado?.id ? styles.faixaItemAtivo : ''
                    }`}
                    onClick={() => onArquivo(arquivo)}
                  >
                    <i className="bi bi-file-earmark-pdf" aria-hidden="true" />
                    <span className={styles.faixaNome}>{arquivo.nome}</span>
                  </button>
                ))}
              </div>

              <p className={styles.dica}>Arraste para o lado ou use ← → para navegar.</p>
            </>
          )}
        </aside>
      </div>

      {/* ---------- Histórico completo ---------- */}
      <section className={styles.card}>
        <div className={styles.filtros}>
          <div className={styles.grupoFiltros} role="tablist" aria-label="Tipo de registro">
            <button
              type="button"
              role="tab"
              aria-selected={filtro === 'nominal'}
              className={`${styles.filtro} ${filtro === 'nominal' ? styles.filtroAtivo : ''}`}
              onClick={() => onFiltro('nominal')}
            >
              Nominais
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filtro === 'automatico'}
              className={`${styles.filtro} ${filtro === 'automatico' ? styles.filtroAtivo : ''}`}
              onClick={() => onFiltro('automatico')}
            >
              Automáticos
            </button>
          </div>

          <label className={styles.porPagina}>
            Mensagens por página
            <select value={porPagina} onChange={(evento) => onPorPagina(Number(evento.target.value))}>
              {[5, 10, 20, 50].map((quantidade) => (
                <option key={quantidade} value={quantidade}>
                  {quantidade}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.tabelaWrap}>
          <table className={styles.tabela}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Destinatário</th>
                <th>Assunto</th>
                <th>Tipo</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr
                  key={item.id}
                  className={item.id === selecionadoId ? styles.linhaSelecionada : undefined}
                >
                  <td>{formatarData(item.data)}</td>
                  <td className={styles.cellTrunc}>{item.destinatario}</td>
                  <td className={styles.cellTrunc}>
                    <button
                      type="button"
                      className={styles.miniBotao}
                      onClick={() => onSelecionar(item)}
                    >
                      {item.assunto}
                    </button>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${styles.badgeNeutra}`}>
                      {item.tipo === 'nominal' ? 'Nominal' : 'Automático'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.paginacao}>
          <button
            type="button"
            className={styles.miniBotao}
            onClick={() => onPagina(Math.max(0, paginaAtual - 1))}
            disabled={paginaAtual === 0}
          >
            Anterior
          </button>

          <span className={styles.paginaInfo}>
            {filtrados.length === 0
              ? 'Nenhum registro'
              : `${inicio + 1}–${Math.min(inicio + porPagina, filtrados.length)} de ${filtrados.length}`}
          </span>

          <button
            type="button"
            className={styles.miniBotao}
            onClick={() => onPagina(Math.min(totalPaginas - 1, paginaAtual + 1))}
            disabled={paginaAtual >= totalPaginas - 1}
          >
            Próxima
          </button>
        </div>
      </section>
    </>
  )
}
