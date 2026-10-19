import CalendarioAcademico from '../components/CalendarioAcademico.jsx'
import CardFuncionarios from '../components/CardFuncionarios.jsx'
import CardEmails from '../components/CardEmails.jsx'
import ResumoRapido from '../components/ResumoRapido.jsx'

/**
 * Tela principal (Frontend/Agent.md, seção 5.1).
 * Deve ser a primeira tela visível: calendário acadêmico, card de funcionários,
 * card de e-mails e indicadores de solicitações pendentes.
 */
export default function Inicio() {
  return (
    <section aria-labelledby="titulo-inicio">
      <h1 id="titulo-inicio">Início</h1>

      {/* Desktop: calendário ⅔ + card de funcionários ⅓ | Mobile: blocos empilhados */}
      <div>
        <CalendarioAcademico />
        <CardFuncionarios />
      </div>

      <CardEmails />
      <ResumoRapido />
    </section>
  )
}
