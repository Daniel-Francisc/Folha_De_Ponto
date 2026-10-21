"""Persistência JSON local simples para dados operacionais do backend.

Cada coleção fica em um arquivo dentro da raiz de armazenamento já configurada
para os documentos. A gravação usa arquivo temporário + substituição atômica;
assim uma interrupção durante a escrita não deixa JSON parcialmente gravado.
Este repositório atende a execução local de uma instância da API. Para múltiplos
processos simultâneos, deve ser substituído por um banco de dados transacional.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
import re
from threading import RLock
from typing import Any
from uuid import uuid4

from Backend.services.ArmazenamentoArquivos import ArmazenamentoArquivos


class RepositorioLocal:
    """Lê e grava coleções JSON sem estado volátil entre reinícios da API."""

    _lock = RLock()
    _colecao_valida = re.compile(r"^[a-z][a-z0-9_]{0,63}$")

    def __init__(self, raiz: str | Path | None = None):
        """Usa a raiz de arquivos configurada, criando uma subpasta `Dados`."""
        raiz_arquivos = (
            Path(raiz).expanduser().resolve()
            if raiz is not None
            else ArmazenamentoArquivos().raiz
        )
        self.pasta = raiz_arquivos / "Dados"

    def _caminho(self, colecao: str) -> Path:
        """Valida o nome da coleção para impedir escrita fora da pasta Dados."""
        if not self._colecao_valida.fullmatch(colecao):
            raise ValueError("Nome de coleção inválido.")
        return self.pasta / f"{colecao}.json"

    def listar(self, colecao: str) -> list[dict[str, Any]]:
        """Retorna registros da coleção; arquivo inexistente significa lista vazia."""
        caminho = self._caminho(colecao)
        with self._lock:
            try:
                dados = json.loads(caminho.read_text(encoding="utf-8"))
            except FileNotFoundError:
                return []
            except (OSError, json.JSONDecodeError) as erro:
                raise RuntimeError(
                    f"Não foi possível ler os dados locais da coleção {colecao}."
                ) from erro
        if not isinstance(dados, list) or any(not isinstance(item, dict) for item in dados):
            raise RuntimeError(f"O arquivo de dados da coleção {colecao} está inválido.")
        return dados

    def salvar_todos(self, colecao: str, registros: list[dict[str, Any]]) -> None:
        """Substitui uma coleção inteira por meio de gravação atômica."""
        caminho = self._caminho(colecao)
        self.pasta.mkdir(parents=True, exist_ok=True)
        temporario = caminho.with_name(f".{caminho.name}.{uuid4().hex}.tmp")
        conteudo = json.dumps(registros, ensure_ascii=False, indent=2) + "\n"
        with self._lock:
            try:
                temporario.write_text(conteudo, encoding="utf-8")
                os.replace(temporario, caminho)
            finally:
                temporario.unlink(missing_ok=True)

    def adicionar(self, colecao: str, registro: dict[str, Any]) -> dict[str, Any]:
        """Acrescenta e persiste um registro, devolvendo o mesmo objeto."""
        with self._lock:
            registros = self.listar(colecao)
            registros.append(registro)
            self.salvar_todos(colecao, registros)
        return registro

    def atualizar(
        self,
        colecao: str,
        identificador: str,
        alteracoes: dict[str, Any],
        campo_id: str = "id",
    ) -> dict[str, Any] | None:
        """Atualiza por ID; devolve None sem gravar quando o registro não existe."""
        with self._lock:
            registros = self.listar(colecao)
            for registro in registros:
                if str(registro.get(campo_id, "")) == identificador:
                    registro.update(alteracoes)
                    self.salvar_todos(colecao, registros)
                    return registro
        return None

    def remover(self, colecao: str, identificador: str) -> dict[str, Any] | None:
        """Remove por ID, persistindo a coleção e devolvendo o registro removido."""
        with self._lock:
            registros = self.listar(colecao)
            for indice, registro in enumerate(registros):
                if str(registro.get("id", "")) == identificador:
                    removido = registros.pop(indice)
                    self.salvar_todos(colecao, registros)
                    return removido
        return None

    def atualizar_status_documentos(
        self,
        identificadores: set[str],
        status_esperado: str,
        alteracoes: dict[str, Any],
    ) -> bool:
        """Altera em conjunto o estado de envio, evitando dois envios simultâneos.

        A operação só grava se todos os IDs ainda estiverem no estado esperado;
        se qualquer folha tiver sido reservada por outra requisição, nada muda.
        """
        with self._lock:
            documentos = self.listar("documentos")
            selecionados = [
                item for item in documentos
                if str(item.get("id", "")) in identificadores
            ]
            if len(selecionados) != len(identificadores) or any(
                item.get("statusEnvio") != status_esperado for item in selecionados
            ):
                return False
            for item in selecionados:
                item.update(alteracoes)
            self.salvar_todos("documentos", documentos)
            return True
