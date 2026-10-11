from fastapi import APIRouter

router = APIRouter()


@router.get("/usuarios")
def get():
    return {"message": "API get funcionando"}

@router.post("/usuarios")
def post():
    return {"message": "API post funcionando"}

@router.put("/usuarios")
def put():
    return {"message": "API put funcionando"}

@router.delete("/usuarios")
def delete():
    return {"message": "API delete funcionando"}