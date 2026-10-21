"""Consulta de lotes síncronos de PDFs/OCR que já foram persistidos."""
from fastapi import APIRouter, HTTPException

from Backend.services.RepositorioLocal import RepositorioLocal

router = APIRouter(prefix="/processamentos", tags=["Processamento de PDFs"])
repositorio = RepositorioLocal()

@router.get("/{processamento_id}", summary="Consultar lote de PDFs")
def consultar_processamento(processamento_id: str):
    """Consulta resultado de OCR por ID; desconhecidos respondem 404."""
    registro = next(
        (item for item in repositorio.listar("processamentos") if item.get("id") == processamento_id),
        None,
    )
    if registro is None:
        raise HTTPException(status_code=404, detail="Processamento não encontrado.")
    return registro
