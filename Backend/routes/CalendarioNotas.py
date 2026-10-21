"""Rotas persistentes para notas/períodos destacados no calendário."""
from datetime import date, datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from Backend.services.RepositorioLocal import RepositorioLocal

router = APIRouter(prefix="/notas", tags=["Notas do calendário"])
repositorio = RepositorioLocal()

class NotaEntrada(BaseModel):
    """Campos editáveis de uma nota. O ID é criado pelo backend ao persistir."""
    titulo: str = Field(min_length=1, description="Título mostrado no calendário.")
    inicio: date = Field(description="Primeiro dia, formato YYYY-MM-DD.")
    fim: date = Field(description="Último dia, formato YYYY-MM-DD.")
    contexto: str = Field(default="", description="Texto complementar.")

@router.get("", summary="Listar notas do calendário")
def listar_notas(inicio: date | None = Query(default=None), fim: date | None = Query(default=None)):
    """Lista notas persistidas, incluindo as que cruzam o intervalo consultado."""
    notas = repositorio.listar("notas")
    if inicio and fim and inicio > fim:
        raise HTTPException(status_code=422, detail="inicio não pode ser posterior a fim.")
    return [
        nota for nota in notas
        if (fim is None or date.fromisoformat(nota["inicio"]) <= fim)
        and (inicio is None or date.fromisoformat(nota["fim"]) >= inicio)
    ]

@router.post("", summary="Criar nota do calendário")
def criar_nota(dados: NotaEntrada):
    """Valida intervalo, grava a nota localmente e devolve o registro criado."""
    if dados.inicio > dados.fim:
        raise HTTPException(status_code=422, detail="inicio não pode ser posterior a fim.")
    registro = {
        "id": str(uuid4()), "titulo": dados.titulo.strip(),
        "inicio": dados.inicio.isoformat(), "fim": dados.fim.isoformat(),
        "contexto": dados.contexto, "criadoEm": datetime.now(timezone.utc).isoformat(),
    }
    return repositorio.adicionar("notas", registro)

@router.put("/{nota_id}", summary="Atualizar nota do calendário")
def atualizar_nota(nota_id: str, dados: NotaEntrada):
    """Atualiza uma nota existente e responde 404 para IDs desconhecidos."""
    if dados.inicio > dados.fim:
        raise HTTPException(status_code=422, detail="inicio não pode ser posterior a fim.")
    registro = repositorio.atualizar("notas", nota_id, {
        "titulo": dados.titulo.strip(), "inicio": dados.inicio.isoformat(),
        "fim": dados.fim.isoformat(), "contexto": dados.contexto,
        "atualizadoEm": datetime.now(timezone.utc).isoformat(),
    })
    if registro is None:
        raise HTTPException(status_code=404, detail="Nota não encontrada.")
    return registro
