from fastapi import FastAPI
from routes.Usuarios import router as routerUsuarios

app = FastAPI()
app.include_router(routerUsuarios)