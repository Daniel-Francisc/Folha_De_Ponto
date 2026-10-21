"""Edição dos metadados revisados de uma folha de ponto.

Este módulo mantém a edição em seu próprio arquivo de rota, conforme o padrão
do backend. O frontend pode corrigir servidor, competência e horários depois do
OCR; o backend persiste os campos e garante que o PDF fique na pasta derivada
desses dados.
"""

from datetime import datetime, timezone
from pathlib import Path
import unicodedata

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from Backend.services.ArmazenamentoArquivos import ArmazenamentoArquivos
from Backend.services.PreprocessadorPDF import PreprocessadorPDF
from Backend.services.RepositorioLocal import RepositorioLocal
from Backend.services.TesseractOCR import OCRNaoConfigurado, PDFNaoProcessavel
from Backend.routes.Servidores import listar_servidores

router = APIRouter(prefix="/folhas", tags=["Folhas de ponto"])
armazenamento = ArmazenamentoArquivos()
preprocessador = PreprocessadorPDF(limite_paginas=50)
repositorio = RepositorioLocal()
MAX_UPLOAD_BYTES = 25 * 1024 * 1024


def _competencia_para_armazenamento(valor: str) -> str:
    """Normaliza MM/AAAA ou AAAA-MM para a convenção de pastas AAAA-MM."""
    texto = valor.strip()
    if len(texto) == 7 and texto[4] == "-":
        return texto
    partes = texto.split("/")
    if len(partes) == 2 and len(partes[1]) == 4:
        return f"{partes[1]}-{partes[0].zfill(2)}"
    return texto


def _competencia_para_tela(valor: str) -> str:
    """Converte AAAA-MM para MM/AAAA, formato usado nos registros da fila."""
    if len(valor) == 7 and valor[4] == "-":
        return f"{valor[5:7]}/{valor[:4]}"
    return valor


def _normalizar_nome(valor: str) -> str:
    """Normaliza acentos e espaços para comparar nomes completos do cadastro."""
    sem_acentos = "".join(
        caractere
        for caractere in unicodedata.normalize("NFKD", valor)
        if not unicodedata.combining(caractere)
    )
    return " ".join(sem_acentos.casefold().split())


@router.put(
    "/{documento_id}/editar",
    summary="Salvar dados corrigidos e organizar novamente o PDF",
    responses={
        404: {"description": "Documento de OCR ou folha salva não encontrado."},
        409: {"description": "Folha em envio ou arquivo de destino já existente."},
        422: {"description": "Campos, PDF ou página inválidos."},
    },
)
async def editar_folha(
    documento_id: str,
    servidor_id: str | None = Form(default=None, description="Matrícula; opcional quando o nome completo for enviado."),
    servidor_nome: str | None = Form(default=None, description="Nome completo; opcional quando a matrícula for enviada."),
    email: str | None = Form(default=None, description="E-mail revisado do servidor."),
    competencia: str | None = Form(default=None, description="Competência MM/AAAA ou AAAA-MM; pode ser reutilizada do OCR/registro."),
    horarios: str = Form(default="", description="Horários corrigidos, separados por vírgula."),
    pagina: int | None = Form(default=None, ge=1, description="Página de origem (1-based)."),
    substituir: bool = Form(default=False),
    arquivo: UploadFile | None = File(default=None, description="PDF original quando o OCR ainda não foi salvo."),
):
    """Persiste correções do frontend e salva uma página PDF no destino correto.

    Basta informar matrícula ou nome completo: o outro dado é resolvido pelo
    cadastro de servidores. Campos existentes no documento/OCR são usados como
    fallback. A competência pode ser omitida quando já foi identificada antes.

    Para uma folha já salva, `arquivo` pode ser omitido: o backend usa o PDF
    existente. Para um resultado de OCR ainda não salvo, envie o PDF original;
    se ele tiver várias páginas, informe `pagina` para selecionar a página que
    foi revisada. A rota persiste horários como lista e preserva o status da
    folha na fila, sem modificar folhas já enviadas/em envio.
    """
    todos = repositorio.listar("documentos")
    documento = next(
        (item for item in todos if str(item.get("id", "")) == documento_id),
        None,
    )
    processamento = None
    if documento is None:
        for lote in repositorio.listar("processamentos"):
            processamento = next(
                (
                    item
                    for item in lote.get("documentos", [])
                    if str(item.get("id", "")) == documento_id
                ),
                None,
            )
            if processamento is not None:
                break

    if documento is None and processamento is None:
        raise HTTPException(status_code=404, detail="Documento não encontrado para edição.")
    if documento and documento.get("statusEnvio") in {"enviando", "enviado"}:
        raise HTTPException(status_code=409, detail="Folhas enviadas ou em envio não podem ser editadas.")

    try:
        campos_ocr = (processamento or {}).get("campos", {})
        id_existente = str(
            (documento or {}).get("servidorId")
            or (processamento or {}).get("servidorId")
            or campos_ocr.get("matricula", "")
        ).strip()
        nome_existente = str(
            (documento or {}).get("servidor") or campos_ocr.get("servidor", "")
        ).strip()

        # A identidade é resolvida pelo cadastro. Matrícula e nome são aceitos
        # isoladamente; se ambos vierem, precisam apontar para a mesma pessoa.
        id_informado = (servidor_id or "").strip()
        nome_informado = (servidor_nome or "").strip()
        cadastro = listar_servidores()
        por_matricula = next(
            (item for item in cadastro if str(item.get("matricula", item.get("id", ""))).strip() == id_informado),
            None,
        ) if id_informado else None
        nome_normalizado = _normalizar_nome(nome_informado) if nome_informado else ""
        por_nome = [
            item for item in cadastro
            if nome_normalizado and _normalizar_nome(str(item.get("nome", ""))) == nome_normalizado
        ]
        if id_informado and nome_informado and por_matricula and por_nome:
            id_por_nome = str(por_nome[0].get("matricula", por_nome[0].get("id", ""))).strip()
            if id_por_nome != id_informado:
                raise HTTPException(status_code=422, detail="A matrícula e o nome informados pertencem a servidores diferentes.")

        if id_informado:
            if por_matricula:
                servidor_cadastro = por_matricula
                servidor_id_final = id_informado
                servidor_nome_final = str(servidor_cadastro.get("nome", "")).strip()
            elif len(por_nome) == 1:
                # Se a matrícula enviada não existe mas o nome completo confere,
                # o nome é suficiente para recuperar a matrícula correta.
                servidor_cadastro = por_nome[0]
                servidor_id_final = str(
                    servidor_cadastro.get("matricula", servidor_cadastro.get("id", ""))
                ).strip()
                servidor_nome_final = str(servidor_cadastro.get("nome", "")).strip()
            else:
                servidor_cadastro = None
                servidor_id_final = id_informado
                servidor_nome_final = nome_informado or nome_existente
        elif nome_informado:
            if len(por_nome) > 1:
                raise HTTPException(status_code=422, detail="Nome duplicado no cadastro; informe a matrícula.")
            servidor_cadastro = por_nome[0] if por_nome else None
            servidor_id_final = (
                str(servidor_cadastro.get("matricula", servidor_cadastro.get("id", ""))).strip()
                if servidor_cadastro
                else id_existente
            )
            servidor_nome_final = (
                str(servidor_cadastro.get("nome", "")).strip()
                if servidor_cadastro
                else nome_informado
            )
        else:
            servidor_cadastro = next(
                (
                    item for item in cadastro
                    if str(item.get("matricula", item.get("id", ""))).strip() == id_existente
                ),
                None,
            ) if id_existente else None
            servidor_id_final = id_existente or str(
                servidor_cadastro.get("matricula", servidor_cadastro.get("id", ""))
                if servidor_cadastro else ""
            ).strip()
            servidor_nome_final = (
                str(servidor_cadastro.get("nome", "")).strip()
                if servidor_cadastro
                else nome_existente
            )

        if not servidor_id_final or not servidor_nome_final:
            raise HTTPException(
                status_code=422,
                detail="Informe a matrícula ou o nome completo de um servidor do cadastro.",
            )

        competencia_informada = (competencia or "").strip()
        competencia_existente = str(
            (documento or {}).get("competencia")
            or (processamento or {}).get("competencia")
            or campos_ocr.get("competencia", "")
        ).strip()
        competencia_destino = _competencia_para_armazenamento(
            competencia_informada or competencia_existente
        )
        if not competencia_destino:
            raise HTTPException(
                status_code=422,
                detail="A competência não foi identificada. Informe o mês e o ano para organizar o PDF.",
            )
        competencia_tela = _competencia_para_tela(competencia_destino)
        documentos_conflitantes = [
            item
            for item in todos
            if str(item.get("id", "")) != documento_id
            and str(item.get("servidorId", "")) == servidor_id_final
            and item.get("competencia") == competencia_tela
            and item.get("statusEnvio") in {"pendente", "enviando", "enviado"}
        ]
        if any(item.get("statusEnvio") in {"enviando", "enviado"} for item in documentos_conflitantes):
            raise HTTPException(
                status_code=409,
                detail="Já existe uma folha enviada ou em envio para essa competência.",
            )
        if documentos_conflitantes and not substituir:
            raise HTTPException(
                status_code=409,
                detail="Já existe uma folha para esse servidor e competência. Confirme a substituição.",
            )
        # A validação final do padrão fica centralizada no serviço de arquivos.
        if arquivo is not None:
            nome_original = arquivo.filename or "folha.pdf"
            conteudo_original = await arquivo.read(MAX_UPLOAD_BYTES + 1)
            await arquivo.close()
            if len(conteudo_original) > MAX_UPLOAD_BYTES:
                raise HTTPException(status_code=413, detail="O PDF excede o limite de 25 MB.")
            if not nome_original.lower().endswith(".pdf") or not conteudo_original.startswith(b"%PDF-"):
                raise HTTPException(status_code=415, detail="O arquivo enviado não é um PDF válido.")
            paginas = await run_in_threadpool(preprocessador.separar, conteudo_original)
            numero_pagina = pagina or (processamento or {}).get("paginaOrigem")
            if numero_pagina is None:
                if len(paginas) != 1:
                    raise HTTPException(
                        status_code=422,
                        detail="Informe a página revisada para um PDF com várias folhas.",
                    )
                numero_pagina = 1
            if numero_pagina > len(paginas):
                raise HTTPException(status_code=422, detail="A página informada não existe no PDF enviado.")
            conteudo_pdf = paginas[numero_pagina - 1].conteudo
        elif documento:
            caminho_atual = Path(documento.get("caminho", "")).expanduser().resolve()
            if (
                not caminho_atual.is_relative_to(armazenamento.pasta_pdfs.resolve())
                or not caminho_atual.is_file()
            ):
                raise HTTPException(
                    status_code=422,
                    detail="O PDF associado a essa folha não está disponível no armazenamento.",
                )
            conteudo_pdf = caminho_atual.read_bytes()
        else:
            raise HTTPException(
                status_code=422,
                detail="Envie o PDF original para salvar uma folha ainda não armazenada.",
            )

        if documento:
            caminho = armazenamento.atualizar_pdf_existente(
                caminho_atual=documento.get("caminho", ""),
                conteudo=conteudo_pdf,
                servidor_id=servidor_id_final,
                nome_servidor=servidor_nome_final,
                competencia=competencia_destino,
                substituir=substituir,
            )
            # O arquivo que ocupava o destino foi arquivado pelo serviço; seu
            # antigo registro também sai da fila para não apontar para o novo PDF.
            for conflito in documentos_conflitantes:
                conflito["statusEnvio"] = "arquivado"
            documento.update(
                {
                    "nome": caminho.name,
                    "servidorId": servidor_id_final,
                    "servidor": servidor_nome_final,
                    "email": (email or "").strip() or (servidor_cadastro or {}).get("email", documento.get("email", "")),
                    "competencia": competencia_tela,
                    "horarios": [item.strip() for item in horarios.split(",") if item.strip()],
                    "caminho": str(caminho.resolve()),
                    "atualizadoEm": datetime.now(timezone.utc).isoformat(),
                }
            )
            repositorio.salvar_todos("documentos", todos)
        else:
            caminho = armazenamento.salvar_pdf(
                conteudo=conteudo_pdf,
                servidor_id=servidor_id_final,
                nome_servidor=servidor_nome_final,
                competencia=competencia_destino,
                substituir=substituir,
            )
            for conflito in documentos_conflitantes:
                conflito["statusEnvio"] = "arquivado"
            documento = {
                "id": documento_id,
                "nome": caminho.name,
                "servidorId": servidor_id_final,
                "servidor": servidor_nome_final,
                "email": (email or "").strip() or (servidor_cadastro or {}).get("email", campos_ocr.get("email", "")),
                "competencia": competencia_tela,
                "horarios": [item.strip() for item in horarios.split(",") if item.strip()],
                "score": (processamento or {}).get("score"),
                "caminho": str(caminho.resolve()),
                "statusEnvio": "pendente",
                "recebidoEm": datetime.now(timezone.utc).isoformat(),
            }
            todos.append(documento)
            repositorio.salvar_todos("documentos", todos)

        # Atualiza também o resultado de OCR para a tela manter o status/campos
        # coerentes quando o frontend consulta novamente o processamento.
        lotes = repositorio.listar("processamentos")
        houve_atualizacao_processamento = False
        for lote in lotes:
            for item in lote.get("documentos", []):
                if str(item.get("id", "")) == documento_id:
                    houve_atualizacao_processamento = True
                    item.update(
                        {
                            "competencia": documento["competencia"],
                            "servidorId": servidor_id_final,
                            "armazenado": True,
                            "campos": {
                                **item.get("campos", {}),
                                "servidor": servidor_nome_final,
                                "matricula": servidor_id_final,
                                "competencia": documento["competencia"],
                                "horarios": documento["horarios"],
                            },
                        }
                    )
        if houve_atualizacao_processamento:
            repositorio.salvar_todos("processamentos", lotes)

        return {chave: valor for chave, valor in documento.items() if chave != "caminho"}
    except HTTPException:
        raise
    except OCRNaoConfigurado as erro:
        raise HTTPException(status_code=503, detail=str(erro)) from erro
    except PDFNaoProcessavel as erro:
        raise HTTPException(status_code=422, detail=str(erro)) from erro
    except FileExistsError as erro:
        raise HTTPException(status_code=409, detail=str(erro)) from erro
    except ValueError as erro:
        raise HTTPException(status_code=422, detail=str(erro)) from erro
    except OSError as erro:
        raise HTTPException(status_code=500, detail="Não foi possível atualizar o arquivo no armazenamento.") from erro
