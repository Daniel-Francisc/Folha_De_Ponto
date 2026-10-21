import { useEffect, useRef, useState } from 'react'
import styles from './BuscaServidor.module.css'
import { filtrarServidores, rotuloServidor } from '../utils/busca.js'

/**
 * Busca de servidores (Frontend/Agent.md, seção 5.2-A).
 *
 * - Consulta por número, nome ou "número|nome".
 * - Ao focar, abre um painel FLUTUANTE (overlay) com os servidores do cache,
 *   sem empurrar o conteúdo abaixo.
 * - Altura limitada, com rolagem interna.
 * - Fecha ao clicar fora, ao pressionar Esc ou ao escolher um servidor.
 */
export default function BuscaServidor({
  servidores = [],
  valor,
  onValorChange,
  onSelecionar,
  servidorSelecionado,
  carregando = false,
}) {
  const [aberto, setAberto] = useState(false)
  const raizRef = useRef(null)

  const resultados = filtrarServidores(servidores, valor)

  // Fecha o painel quando o usuário clica fora do componente.
  useEffect(() => {
    if (!aberto) return undefined

    function aoClicarFora(evento) {
      if (raizRef.current && !raizRef.current.contains(evento.target)) {
        setAberto(false)
      }
    }

    document.addEventListener('mousedown', aoClicarFora)
    return () => document.removeEventListener('mousedown', aoClicarFora)
  }, [aberto])

  function selecionar(servidor) {
    onSelecionar(servidor)
    setAberto(false)
  }

  return (
    <section className={styles.busca} aria-label="Busca de servidor" ref={raizRef}>
      <label htmlFor="busca-servidor" className={styles.rotulo}>
        Buscar servidor
      </label>

      {/* O dropdown é ancorado neste wrapper para flutuar sobre o conteúdo. */}
      <div className={styles.campoWrap}>
        <div className={styles.campo}>
          <i className={`bi bi-search ${styles.icone}`} aria-hidden="true" />

          <input
            id="busca-servidor"
            type="search"
            className={styles.input}
            value={valor}
            onChange={(evento) => {
              onValorChange(evento.target.value)
              setAberto(true)
            }}
            onFocus={() => setAberto(true)}
            onKeyDown={(evento) => {
              if (evento.key === 'Escape') setAberto(false)
            }}
            placeholder="Número, nome ou número | nome"
            autoComplete="off"
            aria-expanded={aberto}
            aria-controls="resultados-servidores"
          />

          {valor && (
            <button
              type="button"
              className={styles.limpar}
              aria-label="Limpar busca"
              onClick={() => {
                onValorChange('')
                setAberto(false)
              }}
            >
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          )}
        </div>

        {aberto && (
          <div className={styles.cache} id="resultados-servidores">
            <p className={styles.contagem}>
            {carregando
              ? 'Carregando servidores…'
              : `${resultados.length} servidor(es) no cache`}
          </p>

            {resultados.length === 0 ? (
              <p className={styles.vazio}>Nenhum servidor encontrado.</p>
            ) : (
              <ul className={styles.lista}>
                {resultados.map((servidor) => (
                  <li key={servidor.id}>
                    <button
                      type="button"
                      className={styles.resultado}
                      onClick={() => selecionar(servidor)}
                    >
                      <span className={styles.nome}>{servidor.nome}</span>
                      <span className={styles.matricula}>{servidor.matricula}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <p className={styles.dica}>
        Use <kbd>|</kbd> para combinar número e nome — ex.: <code>1234567|Maria</code>
      </p>

      {servidorSelecionado && (
        <p className={styles.selecionado}>
          <i className="bi bi-person-check" aria-hidden="true" />
          {rotuloServidor(servidorSelecionado)}
        </p>
      )}
    </section>
  )
}
