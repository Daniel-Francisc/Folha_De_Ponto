"""Rotas de consulta e marcação inclusiva de dias no calendário.

Tipos acordados com a interface: `semAula` e `planejamento`. O PUT faz união
aditiva com os dados existentes; não apaga marcações anteriores.
"""
from datetime import date, timedelta
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Literal

from Backend.services.RepositorioLocal import RepositorioLocal

router = APIRouter(prefix="/marcacoes", tags=["Marcações do calendário"])
repositorio = RepositorioLocal()

class MarcaEntrada(BaseModel):
    """Intervalo inclusivo de dias para um tipo de marcação."""
    inicio: date
    fim: date
    tipo: Literal["semAula", "planejamento"]

@router.get("", summary="Listar marcações do calendário")
def listar_marcacoes(inicio: date | None = Query(default=None), fim: date | None = Query(default=None)):
    """Lista os tipos marcados por dia no intervalo inclusivo solicitado."""
    if inicio and fim and inicio > fim:
        raise HTTPException(status_code=422, detail="inicio não pode ser posterior a fim.")
    por_dia: dict[str, set[str]] = {}
    for marca in repositorio.listar("marcacoes"):
        dia = date.fromisoformat(marca["dia"])
        if (inicio is None or dia >= inicio) and (fim is None or dia <= fim):
            # O PUT grava `tipos` (lista). O fallback em `tipo` mantém
            # compatibilidade com registros antigos no formato singular.
            tipos = marca.get("tipos") or ([marca["tipo"]] if marca.get("tipo") else [])
            for tipo in tipos:
                por_dia.setdefault(dia.isoformat(), set()).add(tipo)
    return [{"dia": dia, "tipos": sorted(tipos)} for dia, tipos in sorted(por_dia.items())]

@router.put("", summary="Adicionar intervalos de marcação ao calendário")
def salvar_marcacoes(marcacoes: list[MarcaEntrada]):
    """Adiciona cada tipo às datas cobertas, preservando os dados já existentes.

    Outros tipos existentes são preservados; assim é possível marcar um mesmo
    dia como `semAula` e `planejamento` sem apagar uma classificação anterior.
    """
    registros = repositorio.listar("marcacoes")
    por_dia = {item["dia"]: set(item["tipos"]) for item in registros}
    for intervalo in marcacoes:
        if intervalo.inicio > intervalo.fim:
            raise HTTPException(status_code=422, detail="inicio não pode ser posterior a fim.")
        dia = intervalo.inicio
        while dia <= intervalo.fim:
            por_dia.setdefault(dia.isoformat(), set()).add(intervalo.tipo)
            dia += timedelta(days=1)
    saida = [
        {"dia": dia, "tipos": sorted(tipos)}
        for dia, tipos in sorted(por_dia.items()) if tipos
    ]
    repositorio.salvar_todos("marcacoes", saida)
    return saida
