"""Consulta paginada do histórico de envios.

O histórico deve ser criado junto com o envio efetivamente concluído, e não por
esta rota de leitura. As consultas ainda não possuem repositório persistente.
"""
from fastapi import APIRouter, Query
from typing import Literal

from Backend.services.RepositorioLocal import RepositorioLocal

router = APIRouter(prefix="/historico", tags=["Histórico de e-mails"])
repositorio = RepositorioLocal()

@router.get("", summary="Listar histórico de envios")
def listar_historico(
    tipo: Literal["nominal", "automatico"] | None = Query(default=None),
    pagina: int = Query(default=1, ge=1),
    porPagina: int = Query(default=10, ge=5, le=50),
):
    """Filtra registros persistidos e devolve somente a página solicitada."""
    registros = repositorio.listar("historico")
    if tipo:
        registros = [registro for registro in registros if registro.get("tipo") == tipo]
    registros.sort(key=lambda item: item.get("data", ""), reverse=True)
    inicio = (pagina - 1) * porPagina
    return registros[inicio:inicio + porPagina]
