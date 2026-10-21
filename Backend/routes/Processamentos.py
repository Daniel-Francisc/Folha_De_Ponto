"""Consulta de lotes enviados ao processamento de PDFs/OCR.

O endpoint de upload atual é síncrono e não persiste lote. Este arquivo define o
ponto futuro para processamento assíncrono e acompanhamento por ID.
"""
from fastapi import APIRouter

router = APIRouter(prefix="/processamentos", tags=["Processamento de PDFs"])

@router.get("/{processamento_id}", summary="Consultar lote de PDFs")
def consultar_processamento(processamento_id: str):
    """TODO: persistir lote, estado por arquivo/página, campos extraídos e score;
    devolver 404 para ID desconhecido. Hoje nenhum lote é criado; retorna `{}`.
    """
    return {}
