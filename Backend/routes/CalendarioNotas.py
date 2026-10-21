"""Rotas de notas/períodos destacados no calendário.

Os handlers são scaffolds: retornam vazio porque ainda não existe armazenamento.
Ao implementar, persista as notas fora da memória do processo. Datas aceitam o
formato ISO `YYYY-MM-DD`, igual ao contrato enviado pelo front-end.
"""
from datetime import date
from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

router = APIRouter(prefix="/notas", tags=["Notas do calendário"])

class NotaEntrada(BaseModel):
    """Campos editáveis de uma nota. O ID é criado pelo backend ao persistir."""
    titulo: str = Field(min_length=1, description="Título mostrado no calendário.")
    inicio: date = Field(description="Primeiro dia, formato YYYY-MM-DD.")
    fim: date = Field(description="Último dia, formato YYYY-MM-DD.")
    contexto: str = Field(default="", description="Texto complementar.")

@router.get("", summary="Listar notas do calendário")
def listar_notas(inicio: date | None = Query(default=None), fim: date | None = Query(default=None)):
    """Listar notas sobrepostas ao intervalo. TODO: ler armazenamento e filtrar
    `nota.inicio <= fim` e `nota.fim >= inicio`; devolver objetos com id/título/
    início/fim/contexto. Retorno atual `[]`: nenhuma nota está persistida.
    """
    return []

@router.post("", summary="Criar nota do calendário")
def criar_nota(dados: NotaEntrada):
    """TODO: validar `inicio <= fim`, gerar ID e persistir; devolver registro
    criado. Ainda não grava nada; `{}` é o retorno scaffold, não confirmação.
    """
    return {}

@router.put("/{nota_id}", summary="Atualizar nota do calendário")
def atualizar_nota(nota_id: str, dados: NotaEntrada):
    """TODO: localizar ID, validar e substituir a nota; responder 404 se ausente.
    Retorno atual `{}` porque não há repositório de notas conectado.
    """
    return {}
