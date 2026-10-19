import styles from './LogoUniversidade.module.css'

/**
 * Logo oficial da universidade (Frontend/Agent.md, seção 3.4).
 * Centralizada acima da NavBar em todas as telas.
 *
 * TODO: substituir o placeholder pelo arquivo oficial da logo (seção 12, item 1).
 * Não reproduzir o brasão sem o arquivo.
 */
export default function LogoUniversidade() {
  return (
    <div
      className={styles.logo}
      aria-label="Universidade do Distrito Federal Jorge Amaury Maia Nunes"
    >
      <span aria-hidden="true">Logo da universidade</span>
    </div>
  )
}
