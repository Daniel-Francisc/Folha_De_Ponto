"""Importação das planilhas de referência recebidas pelo sistema.

A planilha é gravada pela classe `ArmazenamentoArquivos` em uma das pastas:
`Excel/Calendario_Academico` ou `Excel/Lista_de_Servidores`. O leitor de eventos
usa a biblioteca padrão para `.xlsx` e `xlrd` para o formato binário `.xls`.
"""
from datetime import date, datetime, timedelta
from io import BytesIO
import re
from pathlib import Path
from xml.etree import ElementTree
from zipfile import BadZipFile, ZipFile

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from Backend.services.ArmazenamentoArquivos import ArmazenamentoArquivos

router = APIRouter(prefix="/calendario", tags=["Calendário e planilhas"])
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
NAMESPACES = {
    "m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}
armazenamento = ArmazenamentoArquivos()


def _ler_eventos_xls(conteudo: bytes) -> list[dict[str, str]]:
    """Lê eventos do formato Excel binário usando a dependência opcional xlrd."""
    try:
        import xlrd
    except ImportError as erro:
        raise RuntimeError("O suporte a .xls exige xlrd; instale a dependência do requirements.") from erro
    try:
        livro = xlrd.open_workbook(file_contents=conteudo)
        planilha = livro.sheet_by_index(0)
    except Exception as erro:
        raise ValueError("O arquivo XLS não pôde ser aberto.") from erro
    linhas = [[str(planilha.cell_value(r, c)).strip() for c in range(planilha.ncols)] for r in range(planilha.nrows)]
    if not linhas:
        return []
    cabecalhos = [valor.casefold() for valor in linhas[0]]
    indice_data = next((i for i, nome in enumerate(cabecalhos) if nome in {"data", "dia", "date"}), None)
    indice_titulo = next((i for i, nome in enumerate(cabecalhos) if nome in {"titulo", "título", "evento", "descrição", "descricao", "especificação", "especificacao", "feriado"}), None)
    indice_tipo = next((i for i, nome in enumerate(cabecalhos) if nome in {"tipo", "categoria"}), None)
    if indice_data is None:
        raise ValueError("A planilha de calendário precisa ter uma coluna Data.")
    eventos = []
    for numero_linha in range(1, planilha.nrows):
        linha = linhas[numero_linha]
        if indice_data >= len(linha) or not linha[indice_data]:
            continue
        celula = planilha.cell(numero_linha, indice_data)
        if celula.ctype == xlrd.XL_CELL_DATE:
            data_evento = xlrd.xldate_as_datetime(celula.value, livro.datemode).date()
        else:
            texto = linha[indice_data]
            if texto.isdigit():
                data_evento = date(1899, 12, 30) + timedelta(days=int(texto))
            elif "/" in texto:
                data_evento = datetime.strptime(texto, "%d/%m/%Y").date()
            else:
                data_evento = date.fromisoformat(texto)
        eventos.append({
            "data": data_evento.isoformat(),
            "titulo": linha[indice_titulo] if indice_titulo is not None and indice_titulo < len(linha) and linha[indice_titulo] else "Evento acadêmico",
            "tipo": linha[indice_tipo].casefold() if indice_tipo is not None and indice_tipo < len(linha) and linha[indice_tipo] else "evento",
        })
    return eventos


def _ler_eventos_arquivo(caminho: Path) -> list[dict[str, str]]:
    """Escolhe o leitor compatível com a extensão de uma referência salva."""
    conteudo = caminho.read_bytes()
    if caminho.suffix.casefold() == ".xls":
        return _ler_eventos_xls(conteudo)
    return _ler_eventos_xlsx(conteudo)


@router.get("", summary="Listar eventos acadêmicos importados")
def listar_eventos():
    """Lê planilhas importadas e devolve eventos únicos ordenados por data."""
    pasta = armazenamento.pasta_excel / ArmazenamentoArquivos.PASTAS_EXCEL["calendario"]
    eventos = {}
    for caminho in sorted(pasta.glob("*")) if pasta.is_dir() else []:
        if caminho.suffix.casefold() not in {".xls", ".xlsx"} or not caminho.is_file():
            continue
        try:
            for evento in _ler_eventos_arquivo(caminho):
                chave = (evento["data"], evento["titulo"], evento["tipo"])
                eventos[chave] = evento
        except RuntimeError as erro:
            raise HTTPException(status_code=503, detail=str(erro)) from erro
        except (BadZipFile, KeyError, ElementTree.ParseError, ValueError, IndexError):
            # Uma planilha inválida não derruba eventos válidos de outras fontes.
            continue
    return {"eventos": sorted(eventos.values(), key=lambda item: (item["data"], item["titulo"]))}


def _ler_eventos_xlsx(conteudo: bytes) -> list[dict[str, str]]:
    """Lê eventos da primeira aba de uma planilha `.xlsx` de calendário.

    O XLSX é um ZIP de documentos XML. Texto em muitas células fica em
    `sharedStrings.xml`; a referência da célula (como C4) informa sua coluna.
    Aqui reconstruímos as colunas para células vazias não deslocarem valores.

    Cabeçalhos aceitos: Data/Dia/Date (obrigatório); Título/Evento/Descrição/
    Feriado (opcional); Tipo/Categoria (opcional). Retorna ISO date (`YYYY-MM-DD`).
    Para lista de servidores, o chamador não usa esta função.
    """
    with ZipFile(BytesIO(conteudo)) as planilha:
        workbook = ElementTree.fromstring(planilha.read("xl/workbook.xml"))
        relationships = ElementTree.fromstring(
            planilha.read("xl/_rels/workbook.xml.rels")
        )
        targets = {item.attrib["Id"]: item.attrib["Target"] for item in relationships}
        primeira_aba = workbook.find("m:sheets/m:sheet", NAMESPACES)
        if primeira_aba is None:
            return []

        relationship_id = primeira_aba.attrib[f"{{{NAMESPACES['r']}}}id"]
        caminho_aba = targets[relationship_id].lstrip("/")
        if not caminho_aba.startswith("xl/"):
            caminho_aba = f"xl/{caminho_aba}"
        aba = ElementTree.fromstring(planilha.read(caminho_aba))

        strings_compartilhadas: list[str] = []
        if "xl/sharedStrings.xml" in planilha.namelist():
            xml_strings = ElementTree.fromstring(planilha.read("xl/sharedStrings.xml"))
            strings_compartilhadas = [
                "".join(texto.text or "" for texto in item.findall(".//m:t", NAMESPACES))
                for item in xml_strings.findall("m:si", NAMESPACES)
            ]

        linhas: list[list[str]] = []
        for linha_xml in aba.findall(".//m:sheetData/m:row", NAMESPACES):
            valores: list[str] = []
            for celula in linha_xml.findall("m:c", NAMESPACES):
                referencia = re.match(r"[A-Z]+", celula.attrib.get("r", "A"))
                indice_coluna = 0
                for letra in referencia.group(0) if referencia else "A":
                    indice_coluna = indice_coluna * 26 + ord(letra) - ord("A") + 1
                while len(valores) < indice_coluna:
                    valores.append("")

                valor = celula.findtext("m:v", default="", namespaces=NAMESPACES)
                if celula.attrib.get("t") == "s" and valor:
                    valor = strings_compartilhadas[int(valor)]
                elif celula.attrib.get("t") == "inlineStr":
                    valor = "".join(
                        texto.text or ""
                        for texto in celula.findall(".//m:t", NAMESPACES)
                    )
                valores[indice_coluna - 1] = valor.strip()
            linhas.append(valores)

    if not linhas:
        return []
    cabecalhos = [valor.strip().casefold() for valor in linhas[0]]
    indice_data = next(
        (i for i, nome in enumerate(cabecalhos) if nome in {"data", "dia", "date"}),
        None,
    )
    indice_titulo = next(
        (
            i for i, nome in enumerate(cabecalhos)
            if nome in {"titulo", "título", "evento", "descrição", "descricao", "especificação", "especificacao", "feriado"}
        ),
        None,
    )
    indice_tipo = next(
        (i for i, nome in enumerate(cabecalhos) if nome in {"tipo", "categoria"}),
        None,
    )
    if indice_data is None:
        raise ValueError("A planilha de calendário precisa ter uma coluna Data.")

    eventos = []
    for linha in linhas[1:]:
        if indice_data >= len(linha) or not linha[indice_data]:
            continue
        valor_data = linha[indice_data]
        if valor_data.isdigit():
            valor_data = (date(1899, 12, 30) + timedelta(days=int(valor_data))).isoformat()
        elif "/" in valor_data:
            valor_data = datetime.strptime(valor_data, "%d/%m/%Y").date().isoformat()
        else:
            # Já pode estar em ISO; valida para não devolver datas impossíveis.
            valor_data = date.fromisoformat(valor_data).isoformat()

        titulo = (
            linha[indice_titulo]
            if indice_titulo is not None and indice_titulo < len(linha)
            else ""
        )
        tipo = (
            linha[indice_tipo].casefold()
            if indice_tipo is not None and indice_tipo < len(linha)
            else ""
        )
        eventos.append(
            {
                "data": valor_data,
                "titulo": titulo or "Evento acadêmico",
                "tipo": tipo or "evento",
            }
        )
    return eventos


@router.post("", summary="Importar uma planilha de referência")
async def importar_planilha(
    arquivo: UploadFile = File(..., description="Arquivo .xlsx de calendário ou servidores."),
    categoria: str = Form(
        default="calendario",
        description="Use 'calendario' ou 'servidores' para definir a pasta de destino.",
    ),
):
    """Valida, processa e armazena uma planilha Excel localmente.

    Multipart: `arquivo` e `categoria`. A categoria é explícita para não
    classificar planilhas vazias ou layouts diferentes por suposição. Arquivos
    XLS e XLSX são preservados na pasta de referência correspondente.
    """
    nome_original = arquivo.filename or ""
    nome_minusculo = nome_original.lower()
    if not nome_minusculo.endswith((".xls", ".xlsx")):
        raise HTTPException(status_code=400, detail="Envie um arquivo .xls ou .xlsx.")
    if categoria not in ArmazenamentoArquivos.PASTAS_EXCEL:
        raise HTTPException(
            status_code=400,
            detail="Categoria inválida. Use 'calendario' ou 'servidores'.",
        )

    conteudo = await arquivo.read(MAX_UPLOAD_BYTES + 1)
    await arquivo.close()
    if not conteudo:
        raise HTTPException(status_code=400, detail="O arquivo está vazio.")
    if len(conteudo) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="A planilha excede o limite de 10 MB.")
    eventos: list[dict[str, str]] = []
    if categoria == "calendario":
        try:
            eventos = (
                _ler_eventos_xls(conteudo)
                if nome_minusculo.endswith(".xls")
                else _ler_eventos_xlsx(conteudo)
            )
        except RuntimeError as erro:
            raise HTTPException(status_code=503, detail=str(erro)) from erro
        except (BadZipFile, KeyError, ElementTree.ParseError, ValueError, IndexError) as erro:
            raise HTTPException(
                status_code=422,
                detail="Não foi possível ler a planilha de calendário. Confira o arquivo e a coluna Data.",
            ) from erro

    try:
        caminho = armazenamento.salvar_excel(conteudo, nome_original, categoria)
    except ValueError as erro:
        raise HTTPException(status_code=400, detail=str(erro)) from erro

    return {"eventos": eventos, "categoria": categoria, "arquivo": caminho.name}
