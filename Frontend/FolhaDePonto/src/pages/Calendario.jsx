import ImportadorCalendario from '../components/ImportadorCalendario.jsx'
import CalendarioAcademico from '../components/CalendarioAcademico.jsx'

/**
 * Tela de Calendário (Frontend/Agent.md, seção 5.3).
 * Importa .xls/.xlsx, recebe o JSON do backend e permite editar o calendário
 * acadêmico com atualização otimista em cache.
 */
export default function Calendario() {
  return (
    <section aria-labelledby="titulo-calendario">
      <h1 id="titulo-calendario">Calendário</h1>

      <ImportadorCalendario />
      <CalendarioAcademico />
    </section>
  )
}
