import styles from './Inicio.module.css'
import CalendarioAcademico from '../components/CalendarioAcademico.jsx'
import CardFuncionarios from '../components/CardFuncionarios.jsx'
import CardEmails from '../components/CardEmails.jsx'
import ResumoRapido from '../components/ResumoRapido.jsx'

// DADOS DE EXEMPLO (ver src/mocks/inicio.js). Substituir pela API.
import { ENVIOS_RECENTES, TOTAL_FOLHAS_MES } from '../mocks/inicio.js'

/**
 * Tela principal (Frontend/Agent.md, seção 5.1).
 *
 * Layout (ver Inicio.module.css):
 * - Desktop: calendário ⅔ + card Funcionários ⅓; card Emails na linha inteira.
 * - Tablet:  calendário na linha inteira; Funcionários ½ + Emails ½.
 * - Mobile:  tudo empilhado em uma coluna.
 */
export default function Inicio() {
  return (
    <section aria-labelledby="titulo-inicio">
      <h1 id="titulo-inicio">Início</h1>

      <div className={styles.grade}>
        <div className={styles.calendario}>
          <CalendarioAcademico />
        </div>

        <div className={styles.funcionarios}>
          <CardFuncionarios total={TOTAL_FOLHAS_MES} />
        </div>

        <div className={styles.emails}>
          <CardEmails envios={ENVIOS_RECENTES} />
        </div>
      </div>

      <ResumoRapido />
    </section>
  )
}
