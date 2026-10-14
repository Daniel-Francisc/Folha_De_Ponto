from fastapi import APIRouter, HTTPException, UploadFile, File
from model.ExcelExtrator import lerExcel

router = APIRouter()

@router.post("/")
async def post(arquivo: UploadFile = File(...)):
    try:
        nome = (arquivo.filename or "").lower()

        if not nome.endswith((".xls", ".xlsx")):
            raise HTTPException(
                 status_code=400,
                detail="Envie um arquivo XLS ou XLSX."
            )

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Não foi possível ler a planilha."
        )