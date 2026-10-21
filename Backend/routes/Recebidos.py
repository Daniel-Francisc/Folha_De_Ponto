"""Rotas para mensagens recebidas e seu estado de atendimento.

Nenhuma caixa institucional é acessada. Antes de implementar, alinhar com a
instituição o protocolo/caixa autorizada e proteger dados pessoais retornados.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Literal

router = APIRouter(prefix="/recebidos", tags=["E-mails recebidos"])

class StatusRecebidoEntrada(BaseModel):
    """Status exibido pelo front-end para uma mensagem recebida."""
    status: Literal["pendente", "concluida", "negada"]

@router.get("", summary="Listar e-mails recebidos")
def listar_recebidos():
    """TODO: integrar fonte institucional aprovada, mapear mensagens e persistir
    status. Não acessa e-mail agora; retorno atual `[]`.
    """
    return []

@router.patch("/{recebido_id}", summary="Alterar status de recebido")
def atualizar_status_recebido(recebido_id: str, dados: StatusRecebidoEntrada):
    """TODO: localizar e persistir status; devolver registro atualizado ou 404.
    Não altera estado nesta versão; retorno atual `{}`.
    """
    return {}
