/**
 * DADOS DE EXEMPLO — tela Emails.
 * TODO(dados): apagar quando o backend fornecer arquivos, rotinas e histórico.
 */

const NOMES = ['Maria Silva', 'João Pereira', 'Ana Costa', 'Carlos Mendes', 'Fernanda Lima']

const EMAILS = [
  'maria.silva@undf.edu.br',
  'joao.pereira@undf.edu.br',
  'ana.costa@undf.edu.br',
  'carlos.mendes@undf.edu.br',
  'fernanda.lima@undf.edu.br',
]

/** Folhas processadas que ainda não foram enviadas. */
export const ARQUIVOS_PENDENTES = [
  { id: 'a1', nome: 'Folha_2026-09_Maria_Silva.pdf', servidor: NOMES[0], email: EMAILS[0], competencia: '09/2026', score: 0.97 },
  { id: 'a2', nome: 'Folha_2026-09_Joao_Pereira.pdf', servidor: NOMES[1], email: EMAILS[1], competencia: '09/2026', score: 0.99 },
  { id: 'a3', nome: 'Folha_2026-08_Ana_Costa.pdf', servidor: NOMES[2], email: EMAILS[2], competencia: '08/2026', score: 0.82 },
  { id: 'a4', nome: 'Folha_2026-09_Carlos_Mendes.pdf', servidor: NOMES[3], email: EMAILS[3], competencia: '09/2026', score: 0.96 },
]

/** E-mails de rotina (data/hora editável, nunca no passado). */
export const EMAILS_ROTINA = [
  {
    id: 'r1',
    data: '2026-10-25T09:00',
    destinatarios: ['maria.silva@undf.edu.br', 'joao.pereira@undf.edu.br'],
    descricao: 'Envio mensal das folhas',
  },
  {
    id: 'r2',
    data: '2026-11-01T08:30',
    destinatarios: ['ana.costa@undf.edu.br'],
    descricao: 'Cobrança de folhas pendentes',
  },
]

/** E-mails recebidos. */
export const RECEBIDOS = [
  {
    id: 'rc1',
    remetente: 'Maria Silva',
    email: 'maria.silva@undf.edu.br',
    assunto: 'Dúvida sobre a folha de 09/2026',
    corpo:
      'Boa tarde,\n\nNa folha de setembro consta um dia de falta que não ocorreu. Podem verificar?\n\nAtenciosamente,\nMaria',
    data: '2026-10-20T10:12:00',
    status: 'pendente',
  },
  {
    id: 'rc2',
    remetente: 'João Pereira',
    email: 'joao.pereira@undf.edu.br',
    assunto: 'Confirmação de recebimento',
    corpo: 'Recebi a folha referente a agosto. Obrigado!',
    data: '2026-10-20T08:40:00',
    status: 'concluida',
  },
  {
    id: 'rc3',
    remetente: 'Ana Costa',
    email: 'ana.costa@undf.edu.br',
    assunto: 'Solicitação de correção de competência',
    corpo:
      'Prezados,\n\nA competência da minha folha está como 08/2026, mas deveria ser 09/2026.\n\nAtenciosamente,\nAna',
    data: '2026-10-19T16:25:00',
    status: 'pendente',
  },
  {
    id: 'rc4',
    remetente: 'Carlos Mendes',
    email: 'carlos.mendes@undf.edu.br',
    assunto: 'Reenvio de documento',
    corpo: 'Segue novamente o comprovante solicitado.',
    data: '2026-10-18T11:03:00',
    status: 'negada',
  },
]

const TRES_MESES = ['07/2026', '08/2026', '09/2026']

/** Histórico misto: registros nominais (com arquivos) e automáticos. */
export const HISTORICO = Array.from({ length: 16 }, (_, indice) => {
  const tipo = indice % 3 === 0 ? 'automatico' : 'nominal'
  const nome = NOMES[indice % NOMES.length]
  const mes = TRES_MESES[indice % TRES_MESES.length]
  const dia = 20 - Math.floor(indice / 2)

  return {
    id: `h${indice + 1}`,
    tipo,
    data: `2026-10-${String(dia).padStart(2, '0')}T${String(8 + (indice % 9)).padStart(2, '0')}:${String((indice * 7) % 60).padStart(2, '0')}:00`,
    remetente: tipo === 'nominal' ? nome : 'Sistema',
    destinatario: tipo === 'nominal' ? EMAILS[indice % EMAILS.length] : 'sistema@undf.edu.br',
    assunto:
      tipo === 'nominal'
        ? `Folha de ponto — ${mes}`
        : 'Rotina automática de envio executada',
    corpo:
      tipo === 'nominal'
        ? `Prezado(a) ${nome},\n\nSegue em anexo a folha de ponto referente a ${mes}.\n\nAtenciosamente,\nSecretaria Acadêmica`
        : `Rotina automática executada com sucesso.\n\nArquivos processados: 1\nCompetência: ${mes}`,
    arquivos:
      tipo === 'nominal'
        ? [
            { id: `${indice}-1`, nome: `Folha_${mes.replace('/', '-')}_${nome.replace(' ', '_')}.pdf` },
            { id: `${indice}-2`, nome: `Comprovante_${mes.replace('/', '-')}_${nome.replace(' ', '_')}.pdf` },
          ]
        : [],
    status: 'sucesso',
  }
})
