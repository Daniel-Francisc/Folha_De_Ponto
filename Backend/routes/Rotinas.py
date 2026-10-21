"""Rotas de agendamento de e-mails de rotina.

A implementação futura precisa persistir a agenda e conectar um scheduler local
que recupere agendamentos após reinício. Não há tarefas agendadas neste scaffold.
"""
from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/rotinas", tags=["E-mails de rotina"])

class RotinaEntrada(BaseModel):
    """Dados editáveis de uma rotina, com data compatível com datetime-local."""
    data: str = Field(description="Data/hora ISO 8601, exemplo 2026-10-25T09:00.")
    destinatarios: list[str] = Field(default_factory=list)
    descricao: str = ""

@router.get("", summary="Listar e-mails de rotina")
def listar_rotinas():
    """TODO: listar rotinas persistidas. Retorna `[]`; nenhuma rotina executa."""
    return []

@router.post("", summary="Criar e-mail de rotina")
def criar_rotina(dados: RotinaEntrada):
    """TODO: validar que a data é futura, persistir e registrar no scheduler.
    Não agenda atualmente; retorna `{}` sem afirmar que gravou.
    """
    return {}

@router.put("/{rotina_id}", summary="Atualizar e-mail de rotina")
def atualizar_rotina(rotina_id: str, dados: RotinaEntrada):
    """TODO: alterar agenda e scheduler existentes; responder 404 se ID ausente.
    Retorno scaffold atual: `{}`.
    """
    return {}
