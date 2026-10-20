import logoUrl from '../assets/logo-undf.png'
import styles from './LogoUniversidade.module.css'

/**
 * Logo oficial da universidade (Frontend/Agent.md, seção 3.4).
 * Centralizada acima da NavBar em todas as telas.
 */
export default function LogoUniversidade() {
  return (
    <div className={styles.logo}>
      <img
        className={styles.image}
        src={logoUrl}
        alt="Universidade do Distrito Federal Professor Jorge Amaury Maia Nunes"
        width="357"
        height="329"
      />
    </div>
  )
}
