/**
 * Importação da planilha de calendário (Frontend/Agent.md, seção 5.3).
 * Aceita .xls e .xlsx; o backend devolve o JSON do calendário.
 */
export default function ImportadorCalendario() {
  return (
    <section aria-label="Importar calendário">
      <input
        type="file"
        accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        aria-label="Enviar planilha do calendário acadêmico"
      />
      {/* TODO: estado de envio e mensagem de erro */}
    </section>
  )
}
