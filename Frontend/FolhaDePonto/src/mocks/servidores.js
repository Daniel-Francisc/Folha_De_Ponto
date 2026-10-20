/**
 * DADOS DE EXEMPLO — tela Servidor.
 *
 * TODO(dados): apagar quando o backend expuser servidores, documentos e os
 * campos extraídos pelo OCR.
 */

export const SERVIDORES = [
  { id: 's1', matricula: '1234567', nome: 'Maria Silva', email: 'maria.silva@undf.edu.br' },
  { id: 's2', matricula: '2345678', nome: 'João Pereira', email: 'joao.pereira@undf.edu.br' },
  { id: 's3', matricula: '3456789', nome: 'Ana Costa', email: 'ana.costa@undf.edu.br' },
  { id: 's4', matricula: '4567890', nome: 'Carlos Mendes', email: 'carlos.mendes@undf.edu.br' },
  { id: 's5', matricula: '5678901', nome: 'Fernanda Lima', email: 'fernanda.lima@undf.edu.br' },
]

/**
 * status: 'corrigido' | 'ok' | 'baixo' | 'nao_escaneado'
 * score: confiança do OCR (0–1) ou null quando não escaneado.
 */
export const DOCUMENTOS = [
  {
    id: 'd1',
    nome: 'Folha_2026-09_Maria_Silva.pdf',
    status: 'corrigido',
    score: 0.97,
    competencia: '09/2026',
    servidorId: 's1',
  },
  {
    id: 'd2',
    nome: 'Folha_2026-09_Joao_Pereira.pdf',
    status: 'ok',
    score: 0.99,
    competencia: '09/2026',
    servidorId: 's2',
  },
  {
    id: 'd3',
    nome: 'Folha_2026-08_Ana_Costa.pdf',
    status: 'baixo',
    score: 0.82,
    competencia: '08/2026',
    servidorId: 's3',
  },
  {
    id: 'd4',
    nome: 'digitalizacao_2026-10.pdf',
    status: 'nao_escaneado',
    score: null,
    competencia: '',
    servidorId: null,
  },
]
