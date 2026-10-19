from fastapi import APIRouter

router = APIRouter()


@router.get("/servidores")
def get():
    return {"message": "API get funcionando"}

@router.post("/servidores")
def post(dados: dict):
    print(dados)
    return {"message": "API post funcionando"}

@router.put("/servidores")
def put(dados: dict):
    print(dados)
    return {"message": "API put funcionando"}