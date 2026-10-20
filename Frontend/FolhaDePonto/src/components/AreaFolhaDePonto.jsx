import styles from './AreaFolhaDePonto.module.css'

/**
 * Área central da tela Servidor (Frontend/Agent.md, seção 5.2-C).
 *
 * - Sem documento ativo: zona de upload de PDF.
 * - Com documento ativo: modo de visualização.
 * - Botão "Mostrar outros arquivos" abre o carrossel com os arquivos do lote.
 */

const STATUS = {
  corrigido: 'Escaneado e corrigido',
  ok: 'Escaneado (bom score)',
  baixo: 'Score abaixo de 0,95',
  nao_escaneado: 'Não escaneado',
}

export default function AreaFolhaDePonto({
  documentoAtivo,
  documentos = [],
  onEnviarArquivo,
  mostrarOutros,
  onAlternarOutros,
  onSelecionar,
}) {
  function aoEscolher(evento) {
    const arquivo = evento.target.files?.[0]
    if (arquivo) onEnviarArquivo(arquivo)

    // Permite selecionar o mesmo arquivo novamente depois.
    evento.target.value = ''
  }

  return (
    <section className={styles.area} aria-label="Folha de ponto">
      {/* ---------- Barra superior ---------- */}
      <header className={styles.barra}>
        <div className={styles.barraTexto}>
          <h2 className={styles.titulo}>
            {documentoAtivo ? documentoAtivo.nome : 'Nova folha de ponto'}
          </h2>
          <p className={styles.subtitulo}>
            {documentoAtivo
              ? STATUS[documentoAtivo.status]
              : 'Envie um arquivo PDF para começar'}
          </p>
        </div>

        <div className={styles.acoes}>
          <label className={styles.botao}>
            <i className="bi bi-upload" aria-hidden="true" />
            Novo PDF
            <input
              type="file"
              accept=".pdf,application/pdf"
              className="visually-hidden"
              onChange={aoEscolher}
            />
          </label>

          {documentos.length > 0 && (
            <button
              type="button"
              className={styles.botaoSecundario}
              onClick={onAlternarOutros}
              aria-expanded={mostrarOutros}
            >
              <i className="bi bi-collection" aria-hidden="true" />
              Mostrar outros arquivos
            </button>
          )}
        </div>
      </header>

      {/* ---------- Conteúdo central ---------- */}
      {!documentoAtivo ? (
        <label className={styles.upload}>
          <i className={`bi bi-cloud-arrow-up ${styles.uploadIcone}`} aria-hidden="true" />
          <span className={styles.uploadTitulo}>Envie a folha de ponto</span>
          <span className={styles.uploadTexto}>Clique aqui ou arraste o PDF</span>
          <span className={styles.uploadNota}>Somente arquivos .pdf</span>

          <input
            type="file"
            accept=".pdf,application/pdf"
            className="visually-hidden"
            onChange={aoEscolher}
          />
        </label>
      ) : (
        <div className={styles.visualizador}>
          <i className={`bi bi-file-earmark-pdf ${styles.previewIcone}`} aria-hidden="true" />
          <p className={styles.previewNome}>{documentoAtivo.nome}</p>
          <p className={styles.previewNota}>
            A pré-visualização do PDF aparece aqui quando o backend fornecer o arquivo.
          </p>
        </div>
      )}

      {/* ---------- Carrossel de arquivos escaneados ---------- */}
      {mostrarOutros && documentos.length > 0 && (
        <div className={styles.carrossel} aria-label="Arquivos escaneados">
          <ul className={styles.carrosselLista}>
            {documentos.map((doc) => (
              <li key={doc.id} className={styles.carrosselItem}>
                <button
                  type="button"
                  className={`${styles.miniatura} ${styles[doc.status]} ${
                    doc.id === documentoAtivo?.id ? styles.ativa : ''
                  }`}
                  onClick={() => onSelecionar(doc)}
                  aria-current={doc.id === documentoAtivo?.id ? 'true' : undefined}
                >
                  <i className="bi bi-file-earmark-pdf" aria-hidden="true" />
                  <span className={styles.miniaturaNome}>{doc.nome}</span>
                  <span className={styles.miniaturaStatus}>{STATUS[doc.status]}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
