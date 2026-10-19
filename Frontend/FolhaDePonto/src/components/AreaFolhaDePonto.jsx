/**
 * Área central da tela Servidor (Frontend/Agent.md, seção 5.2-C).
 * Upload de PDFs, visualização do arquivo válido, dados editáveis na lateral
 * e carrossel dos arquivos escaneados já separados.
 */
export default function AreaFolhaDePonto() {
  return (
    <section aria-label="Folha de ponto">
      {/* TODO: área de upload (aceita apenas .pdf) */}
      <div aria-label="Envio de arquivos">
        <input type="file" accept=".pdf,application/pdf" multiple aria-label="Enviar folhas de ponto em PDF" />
      </div>

      {/* TODO: botão "mostrar outros arquivos" no topo do formulário */}
      {/* TODO: modo de visualização do PDF */}
      <div aria-label="Visualização do documento" />

      {/* TODO: carrossel dos arquivos escaneados separados */}
      <div aria-label="Arquivos escaneados" aria-roledescription="carrossel">
        {/* TODO: cada página com seus respectivos dados */}
      </div>
    </section>
  )
}
