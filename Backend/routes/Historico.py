"""Consulta paginada do histórico de envios.

O histórico deve ser criado junto com o envio efetivamente concluído, e não por
esta rota de leitura. As consultas ainda não possuem repositório persistente.
"""
from fastapi import APIRouter, Query
from typing import Literal

router = APIRouter(prefix="/historico", tags=["Histórico de e-mails"])

@router.get("", summary="Listar histórico de envios")
def listar_historico(
    tipo: Literal["nominal", "automatico"] | None = Query(default=None),
    pagina: int = Query(default=1, ge=1),
    porPagina: int = Query(default=10, ge=5, le=50),
):
    """TODO: consultar registros persistidos, filtrar tipo e paginar; incluir
    arquivos associados aos envios nominais. Retorna `[]` pois ainda não há
    registros de envio reais.
    """
    return []
