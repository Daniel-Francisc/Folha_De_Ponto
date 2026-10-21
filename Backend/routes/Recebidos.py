"""Rotas para mensagens recebidas e seu estado de atendimento.

Nenhuma caixa institucional é acessada. Antes de implementar, alinhar com a
instituição o protocolo/caixa autorizada e proteger dados pessoais retornados.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Literal

from Backend.services.RepositorioLocal import RepositorioLocal

router = APIRouter(prefix="/recebidos", tags=["E-mails recebidos"])
repositorio = RepositorioLocal()

class StatusRecebidoEntrada(BaseModel):
    """Status exibido pelo front-end para uma mensagem recebida."""
    status: Literal["pendente", "concluida", "negada"]

@router.get("", summary="Listar e-mails recebidos")
def listar_recebidos():
    """Lista mensagens importadas por um conector institucional autorizado.

    Nenhuma caixa é consultada automaticamente. Até a configuração IMAP ser
    definida, a lista persistida permanece vazia, sem dados fictícios.
    """
    return sorted(repositorio.listar("recebidos"), key=lambda item: item.get("data", ""), reverse=True)

@router.patch("/{recebido_id}", summary="Alterar status de recebido")
def atualizar_status_recebido(recebido_id: str, dados: StatusRecebidoEntrada):
    """Persiste o estado de uma mensagem já importada; não cria mensagem fake."""
    registro = repositorio.atualizar("recebidos", recebido_id, {"status": dados.status})
    if registro is None:
        raise HTTPException(status_code=404, detail="Mensagem recebida não encontrada.")
    return registro
