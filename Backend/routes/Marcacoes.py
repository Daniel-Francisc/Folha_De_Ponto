"""Rotas de marcações de dias e intervalos no calendário.

Tipos acordados com a interface: `semAula` e `planejamento`. Hoje os dados são
validados pelo modelo, mas ainda não são persistidos; veja os TODOs abaixo.
"""
from datetime import date
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Literal

router = APIRouter(prefix="/marcacoes", tags=["Marcações do calendário"])

class MarcaEntrada(BaseModel):
    """Intervalo inclusivo de dias para um tipo de marcação."""
    inicio: date
    fim: date
    tipo: Literal["semAula", "planejamento"]

@router.get("", summary="Listar marcações do calendário")
def listar_marcacoes(inicio: date | None = Query(default=None), fim: date | None = Query(default=None)):
    """TODO: buscar marcações persistidas e devolver `[{dia, tipos: [...]}]`.
    Retorna `[]` enquanto não existir armazenamento.
    """
    return []

@router.put("", summary="Substituir marcações do calendário")
def salvar_marcacoes(marcacoes: list[MarcaEntrada]):
    """TODO: validar ordem dos intervalos, expandir dias inclusivos, aplicar a
    regra acordada de combinação/substituição e persistir. Retorna `[]` porque
    nenhum dado é salvo nesta versão.
    """
    return []
