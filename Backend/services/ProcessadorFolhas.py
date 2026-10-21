"""Transforma a saída do OCR em campos que a tela Servidor já consome.

Os valores são sugestões para revisão humana. A extração por texto não confirma
a identidade de uma pessoa nem autoriza salvar automaticamente o documento.
"""

import re
import unicodedata

from Backend.services.TesseractOCR import ResultadoOCR, TesseractOCR


def _sem_acentos(valor: str) -> str:
    """Facilita reconhecer rótulos mesmo quando o OCR confunde acentos."""
    normalizado = unicodedata.normalize("NFKD", valor)
    return "".join(
        caractere
        for caractere in normalizado
        if not unicodedata.combining(caractere)
    )


def _competencia_em_linha(linha: str) -> str:
    """Converte uma competência numérica ou textual para MM/YYYY."""
    numerica = re.search(
        r"(?<![\d/])(0?[1-9]|1[0-2])\s*[/.-]\s*((?:19|20)\d{2})(?!\d)",
        linha,
    )
    if numerica:
        return f"{int(numerica.group(1)):02d}/{numerica.group(2)}"

    ano_mes = re.search(
        r"\b((?:19|20)\d{2})\s*[-/.]\s*(0?[1-9]|1[0-2])\b",
        linha,
    )
    if ano_mes:
        return f"{int(ano_mes.group(2)):02d}/{ano_mes.group(1)}"

    meses = {
        "janeiro": 1, "jan": 1, "fevereiro": 2, "fev": 2,
        "marco": 3, "mar": 3, "abril": 4, "abr": 4, "maio": 5,
        "mai": 5, "junho": 6, "jun": 6, "julho": 7, "jul": 7,
        "agosto": 8, "ago": 8, "setembro": 9, "set": 9,
        "outubro": 10, "out": 10, "novembro": 11, "nov": 11,
        "dezembro": 12, "dez": 12,
    }
    normalizada = _sem_acentos(linha).casefold()
    for nome_mes, numero_mes in meses.items():
        achado = re.search(
            rf"\b{re.escape(nome_mes)}\b\D{{0,12}}((?:19|20)\d{{2}})\b",
            normalizada,
        )
        if achado:
            return f"{numero_mes:02d}/{achado.group(1)}"
    return ""


def _extrair_horarios(texto: str) -> list[str]:
    """Localiza horários `HH:MM` no texto reconhecido, sem duplicá-los.

    Algumas folhas usam ponto ou a letra ``h`` como separador (por exemplo,
    `08.30` ou `8h30`). O frontend recebe todos os horários em ordem de leitura
    para que uma pessoa possa corrigir erros comuns do OCR antes de salvar.
    """
    encontrados: list[str] = []
    padrao = re.compile(r"(?<!\d)([01]?\d|2[0-3])\s*[:.hH]\s*([0-5]\d)(?!\d)")
    for achado in padrao.finditer(texto):
        horario = f"{int(achado.group(1)):02d}:{achado.group(2)}"
        if horario not in encontrados:
            encontrados.append(horario)
    return encontrados


def extrair_campos(texto: str) -> dict[str, str | list[str]]:
    """Extrai somente rótulos conhecidos; não inventa valores ausentes."""
    linhas = [linha.strip() for linha in texto.splitlines() if linha.strip()]
    campos = {
        "servidor": "",
        "matricula": "",
        "email": "",
        "competencia": "",
        "horarios": _extrair_horarios(texto),
    }

    # Primeiro procura a competência em uma linha explicitamente identificada.
    for linha in linhas:
        rotulo = _sem_acentos(linha).casefold()
        # Algumas folhas identificam a competência sob o título "Cargo".
        # Nesse layout, esse rótulo significa mês/ano; não é o cargo funcional.
        if "competencia" in rotulo or "referencia" in rotulo or re.search(r"\bcargo\b", rotulo):
            data_completa = re.search(
                r"\b\d{1,2}[/.-](0?[1-9]|1[0-2])[/.-]((?:19|20)\d{2})\b",
                linha,
            )
            if data_completa:
                campos["competencia"] = (
                    f"{int(data_completa.group(1)):02d}/{data_completa.group(2)}"
                )
            else:
                campos["competencia"] = _competencia_em_linha(linha)
            if campos["competencia"]:
                break

    # Sem rótulo, aceita mês/ano isolado. A expressão evita interpretar a
    # segunda parte de uma data diária como competência.
    if not campos["competencia"]:
        campos["competencia"] = _competencia_em_linha(_sem_acentos(texto))

    rotulo_nome = re.compile(
        r"\b(?:nome\s+do\s+servidor|servidor(?:\s*\(a\))?|nome)\s*[:\-]\s*(.+)",
        re.IGNORECASE,
    )
    for linha in linhas:
        achado = rotulo_nome.search(linha)
        if achado:
            nome = re.split(
                r"\b(?:matr[ií]cula|siape|cpf|e[\-\s]?mail)\b",
                achado.group(1),
                maxsplit=1,
                flags=re.IGNORECASE,
            )[0]
            campos["servidor"] = nome.strip(" :;|-\t")
            if campos["servidor"]:
                break

    rotulo_matricula = re.compile(
        r"\b(?:matr[ií]cula|siape)\b[^\d]{0,16}([\d./ -]{5,20})",
        re.IGNORECASE,
    )
    for linha in linhas:
        achado = rotulo_matricula.search(linha)
        if achado:
            matricula = re.sub(r"\D", "", achado.group(1))
            if 5 <= len(matricula) <= 12:
                campos["matricula"] = matricula
                break

    email = re.search(
        r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b",
        texto,
        re.IGNORECASE,
    )
    if email:
        campos["email"] = email.group(0)

    return campos


class ProcessadorFolhas:
    """Coordena OCR, extração de campos e o status consumido pelo front-end."""

    LIMITE_SCORE_BOM = 0.95

    def __init__(self, ocr: TesseractOCR | None = None):
        self.ocr = ocr or TesseractOCR()

    def processar(self, conteudo_pdf: bytes) -> dict:
        """Devolve campos sugeridos e confiança, sem persistir o PDF."""
        resultado: ResultadoOCR = self.ocr.processar(conteudo_pdf)
        campos = extrair_campos(resultado.texto)

        if resultado.confianca is None:
            status = "nao_escaneado"
        elif (
            resultado.confianca < self.LIMITE_SCORE_BOM
            or not campos["matricula"]
            or not campos["competencia"]
        ):
            # O texto pode estar nítido e ainda faltar dado para associar o
            # documento. O front deve pedir revisão antes de seguir.
            status = "baixo"
        else:
            status = "ok"

        mensagem = (
            "Revise os campos extraídos antes de salvar a folha."
            if resultado.texto
            else "Nenhum texto foi reconhecido neste PDF."
        )
        return {
            "status": status,
            "score": resultado.confianca,
            "competencia": campos["competencia"],
            "servidorId": campos["matricula"] or None,
            "campos": campos,
            "paginas_lidas": resultado.paginas_lidas,
            "mensagem": mensagem,
        }
