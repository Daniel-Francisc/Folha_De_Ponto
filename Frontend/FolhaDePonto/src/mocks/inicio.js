/**
 * DADOS DE EXEMPLO — apenas para validar a UI enquanto não há API.
 *
 * TODO(dados): apagar este arquivo quando o backend expuser os dados reais
 * (total de folhas lidas no mês e últimas solicitações de envio).
 */
export const TOTAL_FOLHAS_MES = 128

export const ENVIOS_RECENTES = [
  {
    id: '1',
    arquivo: 'Folha_2026-09_Maria_Silva.pdf',
    destinatario: 'maria.silva@undf.edu.br',
    data: '2026-10-19T14:32:00',
    status: 'sucesso',
  },
  {
    id: '2',
    arquivo: 'Folha_2026-09_Joao_Pereira.pdf',
    destinatario: 'joao.pereira@undf.edu.br',
    data: '2026-10-19T11:05:00',
    status: 'andamento',
  },
  {
    id: '3',
    arquivo: 'Folha_2026-08_Ana_Costa.pdf',
    destinatario: 'ana.costa@undf.edu.br',
    data: '2026-10-18T16:47:00',
    status: 'erro',
  },
]
