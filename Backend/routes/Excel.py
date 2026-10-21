"""Importação de referências Excel e extração simples de eventos `.xlsx`.

O leitor abaixo usa somente bibliotecas da linguagem padrão, por isso entende o
formato XML compactado `.xlsx`, mas não o formato binário antigo `.xls`. A planilha
é guardada em uma pasta temporária local (não no repositório). O contrato atual
interpreta a primeira aba e uma linha de cabeçalho; veja `_planilha_xlsx` antes
de adaptar para o layout institucional completo.
"""

from io import BytesIO
from pathlib import Path
from tempfile import gettempdir
from uuid import uuid4
import re
from xml.etree import ElementTree
from zipfile import BadZipFile, ZipFile

from fastapi import APIRouter, File, HTTPException, UploadFile

router = APIRouter(prefix="/calendario", tags=["Calendário"])
# `tempfile.gettempdir()` mantém os arquivos fora da pasta sincronizada do Git.
STORAGE = Path(gettempdir()) / "folha_de_ponto" / "referencias"
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
# Namespaces XML definidos pelo padrão Office Open XML.
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main", "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}


def _planilha_xlsx(conteudo: bytes):
    """Transforma a primeira aba de um `.xlsx` em linhas e eventos.

    Um `.xlsx` é um ZIP que contém XMLs. `sharedStrings.xml` armazena textos
    compartilhados e cada célula indica em qual coluna está (por exemplo, C4).
    Esta função restaura as posições das colunas para que células vazias não
    desloquem os dados. Cabeçalhos aceitos: Data; opcionalmente Título/Evento/
    Descrição/Feriado e Tipo/Categoria. Retorna `[]` sem cabeçalho de calendário.

    TODO para próximas etapas: reconhecer o leiaute oficial do calendário,
    validar datas sem deixar exceções técnicas escaparem e suportar abas múltiplas.
    """
    with ZipFile(BytesIO(conteudo)) as arquivo:
        workbook = ElementTree.fromstring(arquivo.read("xl/workbook.xml"))
        rels = ElementTree.fromstring(arquivo.read("xl/_rels/workbook.xml.rels"))
        rel_map = {item.attrib["Id"]: item.attrib["Target"] for item in rels}
        primeira = workbook.find("m:sheets/m:sheet", NS)
        if primeira is None:
            return []
        target = rel_map[primeira.attrib[f"{{{NS['r']}}}id"]].lstrip("/")
        sheet_path = target if target.startswith("xl/") else f"xl/{target}"
        sheet = ElementTree.fromstring(arquivo.read(sheet_path))
        shared = []
        if "xl/sharedStrings.xml" in arquivo.namelist():
            root = ElementTree.fromstring(arquivo.read("xl/sharedStrings.xml"))
            shared = ["".join(t.text or "" for t in si.findall(".//m:t", NS)) for si in root.findall("m:si", NS)]
        rows = []
        for row in sheet.findall(".//m:sheetData/m:row", NS):
            values = []
            for cell in row.findall("m:c", NS):
                # Converte letras de coluna em índice 1-based: A=1, Z=26, AA=27.
                col_ref = re.match(r"[A-Z]+", cell.attrib.get("r", "A"))
                col_index = 0
                for char in col_ref.group(0) if col_ref else "A":
                    col_index = col_index * 26 + ord(char) - ord("A") + 1
                while len(values) < col_index:
                    values.append("")
                # Tipo `s` referencia uma string compartilhada; `inlineStr` guarda
                # o texto dentro da própria célula; os demais usam o valor XML.
                value = cell.findtext("m:v", default="", namespaces=NS)
                if cell.attrib.get("t") == "s" and value:
                    value = shared[int(value)]
                elif cell.attrib.get("t") == "inlineStr":
                    value = "".join(t.text or "" for t in cell.findall(".//m:t", NS))
                values[col_index - 1] = value.strip()
            rows.append(values)
    if not rows:
        return []
    headers = [value.casefold() for value in rows[0]]
    data_i = next((i for i, value in enumerate(headers) if value in {"data", "dia", "date"}), None)
    title_i = next((i for i, value in enumerate(headers) if value in {"titulo", "evento", "descrição", "descricao", "feriado"}), None)
    type_i = next((i for i, value in enumerate(headers) if value in {"tipo", "categoria"}), None)
    if data_i is None:
        return []
    eventos = []
    for row in rows[1:]:
        if data_i >= len(row) or not row[data_i]:
            continue
        data = row[data_i]
        if data.isdigit():
            from datetime import date, timedelta
            data = (date(1899, 12, 30) + timedelta(days=int(data))).isoformat()
        elif "/" in data:
            from datetime import datetime
            data = datetime.strptime(data, "%d/%m/%Y").date().isoformat()
        eventos.append({"data": data, "titulo": row[title_i] if title_i is not None and title_i < len(row) and row[title_i] else "Evento acadêmico", "tipo": row[type_i].casefold() if type_i is not None and type_i < len(row) and row[type_i] else "evento"})
    return eventos


@router.post("")
async def importar_calendario(arquivo: UploadFile = File(...)):
    """Recebe planilha de calendário ou cadastro em multipart.

    Entrada: campo `arquivo`. Saída: `{eventos: [...]}`. `.xlsx` é processado;
    `.xls` é reconhecido pela extensão, mas rejeitado com HTTP 415. Um arquivo
    sem eventos é classificado como planilha de servidores nesta versão. Esse
    critério provisório deverá ser substituído por campo explícito `tipo` ou
    validação dos cabeçalhos antes de ampliar o uso institucional.
    """
    nome = (arquivo.filename or "").lower()
    if not nome.endswith((".xls", ".xlsx")):
        raise HTTPException(status_code=400, detail="Envie um arquivo XLS ou XLSX.")
    conteudo = await arquivo.read(MAX_UPLOAD_BYTES + 1)
    await arquivo.close()
    if not conteudo:
        raise HTTPException(status_code=400, detail="O arquivo está vazio.")
    if len(conteudo) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="A planilha excede o limite de 10 MB.")
    if nome.endswith(".xls"):
        raise HTTPException(status_code=415, detail="Planilhas XLS binárias ainda não são suportadas. Salve como XLSX e tente novamente.")
    try:
        eventos = _planilha_xlsx(conteudo)
    except (BadZipFile, KeyError, ElementTree.ParseError, ValueError, IndexError) as erro:
        raise HTTPException(status_code=422, detail="Planilha XLSX inválida ou sem colunas de calendário reconhecíveis.") from erro
    STORAGE.mkdir(parents=True, exist_ok=True)
    is_calendar = bool(eventos)
    if is_calendar:
        (STORAGE / f"calendario-{uuid4().hex}.xlsx").write_bytes(conteudo)
    else:
        (STORAGE / f"servidores-{uuid4().hex}.xlsx").write_bytes(conteudo)
    return {"eventos": eventos}
