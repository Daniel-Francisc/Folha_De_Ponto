"""Pacote da API do Folha de Ponto.

Este arquivo torna explícito que `Backend` é um pacote Python. Isso permite
que o FastAPI CLI descubra `Backend.Main:app` ao iniciar com
`fastapi dev Backend/Main.py` a partir da raiz do repositório e resolva os
imports absolutos usados pelas rotas e pelos serviços.
"""
