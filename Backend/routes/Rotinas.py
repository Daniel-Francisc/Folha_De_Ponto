"""Rotas de validação e persistência de agendamentos locais.

O contrato atual não define a seleção de folhas/anexos nem o conteúdo do e-mail;
por isso, as rotinas são guardadas como aguardando configuração e não executam.
"""
from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field

from Backend.services.RepositorioLocal import RepositorioLocal

router = APIRouter(prefix="/rotinas", tags=["E-mails de rotina"])
repositorio = RepositorioLocal()

class RotinaEntrada(BaseModel):
    """Dados editáveis de uma rotina, com data compatível com datetime-local."""
    data: str = Field(description="Data/hora ISO 8601, exemplo 2026-10-25T09:00.")
    destinatarios: list[EmailStr] = Field(default_factory=list)
    descricao: str = Field(default="", max_length=1000)

@router.get("", summary="Listar e-mails de rotina")
def listar_rotinas():
    """Lista agendamentos locais persistidos; não afirma que um envio ocorreu."""
    return sorted(repositorio.listar("rotinas"), key=lambda item: item["data"])

@router.post("", summary="Criar e-mail de rotina")
def criar_rotina(dados: RotinaEntrada):
    """Valida e grava o agendamento.

    O contrato atual não informa modelo de mensagem nem seleção de anexos; por
    isso, o registro fica persistido como `aguardando_configuracao` e não dispara
    SMTP automaticamente. Isso evita enviar dados para destinatários por uma
    regra presumida.
    """
    try:
        data = datetime.fromisoformat(dados.data)
    except ValueError as erro:
        raise HTTPException(status_code=422, detail="data precisa ser ISO 8601.") from erro
    data_local = data.astimezone()
    if data_local <= datetime.now().astimezone():
        raise HTTPException(status_code=422, detail="A data da rotina precisa estar no futuro.")
    registro = {
        # Formato sem offset é o esperado por input type=datetime-local no front.
        "id": str(uuid4()), "data": data_local.replace(tzinfo=None).isoformat(timespec="minutes"),
        "destinatarios": dados.destinatarios, "descricao": dados.descricao,
        "status": "aguardando_configuracao",
    }
    return repositorio.adicionar("rotinas", registro)

@router.put("/{rotina_id}", summary="Atualizar e-mail de rotina")
def atualizar_rotina(rotina_id: str, dados: RotinaEntrada):
    """Atualiza os dados de uma rotina existente sem executá-la."""
    try:
        data = datetime.fromisoformat(dados.data)
    except ValueError as erro:
        raise HTTPException(status_code=422, detail="data precisa ser ISO 8601.") from erro
    data_local = data.astimezone()
    if data_local <= datetime.now().astimezone():
        raise HTTPException(status_code=422, detail="A data da rotina precisa estar no futuro.")
    registro = repositorio.atualizar("rotinas", rotina_id, {
        "data": data_local.replace(tzinfo=None).isoformat(timespec="minutes"),
        "destinatarios": dados.destinatarios,
        "descricao": dados.descricao, "status": "aguardando_configuracao",
    })
    if registro is None:
        raise HTTPException(status_code=404, detail="Rotina não encontrada.")
    return registro
