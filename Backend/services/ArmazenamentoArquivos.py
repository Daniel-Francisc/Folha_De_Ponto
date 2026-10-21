"""Armazenamento local de arquivos recebidos pela API.

Estrutura criada dentro da raiz configurada:

    Excel/Calendario_Academico/<arquivo recebido>.xlsx
    Excel/Lista_de_Servidores/<arquivo recebido>.xlsx
    PDFs/<id>_<nome do servidor>/<AAAA-MM>/<nome>-<AAAA-MM>.pdf

A raiz padrão é `Backend/arquivos/recebidos`. Pode ser substituída pela variável
`FOLHA_STORAGE_DIR`, por exemplo para usar um diretório institucional de rede.

Esta classe não executa OCR e não deduz matrícula, nome ou competência. Para
salvar PDF, o chamador precisa fornecer esses metadados já revisados/confirmados.
"""

from datetime import datetime
import os
from pathlib import Path
import re
from uuid import uuid4


class ArmazenamentoArquivos:
    """Grava planilhas e folhas de ponto em diretórios locais organizados.

    A substituição de um PDF é explícita. Com `substituir=False`, um documento
    existente nunca é sobrescrito. Com `substituir=True`, o atual é renomeado
    para `Nome-AAAA-MM_OLD_[AAAAMMDD-HHMMSS].pdf` antes de gravar a nova versão.
    """

    PASTAS_EXCEL = {
        "calendario": "Calendario_Academico",
        "servidores": "Lista_de_Servidores",
    }

    def __init__(self, raiz: str | Path | None = None):
        """Define a raiz do armazenamento.

        `raiz` é útil em desenvolvimento e em ambientes de teste. Sem ela, a
        classe consulta `FOLHA_STORAGE_DIR` e, por fim, usa `Backend/arquivos/recebidos`.
        """
        if raiz is None:
            raiz_configurada = os.getenv("FOLHA_STORAGE_DIR")
            raiz = (
                Path(raiz_configurada)
                if raiz_configurada
                else Path(__file__).resolve().parents[1] / "arquivos" / "recebidos"
            )
        self.raiz = Path(raiz).expanduser().resolve()
        self.pasta_excel = self.raiz / "Excel"
        self.pasta_pdfs = self.raiz / "PDFs"

    @staticmethod
    def _nome_seguro(valor: str) -> str:
        """Remove caracteres que poderiam criar caminhos ou nomes inválidos."""
        sem_caracteres_invalidos = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "", valor.strip())
        com_underscores = re.sub(r"\s+", "_", sem_caracteres_invalidos)
        nome = re.sub(r"_+", "_", com_underscores).strip(" ._")
        return nome or "Sem_nome"

    @staticmethod
    def _gravar_atomico(destino: Path, conteudo: bytes) -> None:
        """Escreve em arquivo temporário e só então o publica com o nome final.

        O temporário fica na mesma pasta do destino. `os.replace` faz a troca
        atômica no mesmo volume e reduz o risco de deixar arquivo parcial.
        """
        destino.parent.mkdir(parents=True, exist_ok=True)
        temporario = destino.with_name(f".{destino.name}.{uuid4().hex}.tmp")
        try:
            temporario.write_bytes(conteudo)
            os.replace(temporario, destino)
        finally:
            temporario.unlink(missing_ok=True)

    def salvar_excel(
        self,
        conteudo: bytes,
        nome_original: str,
        categoria: str,
    ) -> Path:
        """Salva uma planilha em `Excel/Calendario_Academico` ou `Lista_de_Servidores`.

        Args:
            conteudo: bytes da planilha recebida.
            nome_original: nome enviado pelo navegador; diretórios do nome são ignorados.
            categoria: `calendario` ou `servidores`.

        Returns:
            Caminho final onde a planilha foi gravada.

        Raises:
            ValueError: categoria desconhecida, conteúdo vazio ou extensão não Excel.
        """
        if categoria not in self.PASTAS_EXCEL:
            raise ValueError("Categoria deve ser 'calendario' ou 'servidores'.")
        if not conteudo:
            raise ValueError("A planilha está vazia.")

        extensao = Path(nome_original).suffix.lower()
        if extensao not in {".xls", ".xlsx"}:
            raise ValueError("A planilha precisa ter extensão .xls ou .xlsx.")

        nome_seguro = self._nome_seguro(Path(nome_original).stem) + extensao
        pasta_categoria = self.pasta_excel / self.PASTAS_EXCEL[categoria]
        destino = pasta_categoria / nome_seguro

        # Preserva planilhas anteriores. Em colisão, cria um nome único com hora e ID.
        if destino.exists():
            horario = datetime.now().strftime("%Y%m%d-%H%M%S")
            destino = pasta_categoria / (
                f"{Path(nome_seguro).stem}_{horario}_{uuid4().hex[:8]}{extensao}"
            )

        self._gravar_atomico(destino, conteudo)
        return destino

    def salvar_pdf(
        self,
        conteudo: bytes,
        servidor_id: str,
        nome_servidor: str,
        competencia: str,
        substituir: bool = False,
        agora: datetime | None = None,
    ) -> Path:
        """Salva uma folha em pasta de servidor e subpasta de competência.

        O destino segue `PDFs/{id}_{nome}/{AAAA-MM}/{nome}-{AAAA-MM}.pdf`.
        Ao substituir, preserva o atual com `_OLD_[AAAAMMDD-HHMMSS]` antes da
        extensão PDF. Sem autorização `substituir=True`, duplicatas geram erro.

        Args:
            conteudo: bytes de PDF. A assinatura `%PDF-` é conferida novamente.
            servidor_id: ID estável/matrícula do cadastro institucional.
            nome_servidor: nome extraído e confirmado, depois sanitizado.
            competencia: ano/mês no formato `AAAA-MM`, por exemplo `2026-09`.
            substituir: autorização explícita para arquivar o arquivo atual.
            agora: horário local opcional, útil para tornar o nome do backup previsível.

        Raises:
            ValueError: PDF vazio/inválido, ID inseguro ou competência malformada.
            FileExistsError: já existe folha sem autorização de substituição ou
                já existe backup gerado no mesmo segundo.
        """
        if not conteudo or not conteudo.startswith(b"%PDF-"):
            raise ValueError("O arquivo recebido não contém um PDF válido.")
        if not servidor_id or Path(servidor_id).name != servidor_id or servidor_id in {".", ".."}:
            raise ValueError("ID do servidor inválido.")
        if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", competencia):
            raise ValueError("Competência precisa seguir o padrão AAAA-MM.")

        id_seguro = self._nome_seguro(servidor_id)
        nome_seguro = self._nome_seguro(nome_servidor)
        pasta_servidor = self.pasta_pdfs / f"{id_seguro}_{nome_seguro}"
        pasta_competencia = pasta_servidor / competencia
        destino = pasta_competencia / f"{nome_seguro}-{competencia}.pdf"

        if not destino.exists():
            self._gravar_atomico(destino, conteudo)
            return destino

        if not substituir:
            raise FileExistsError(
                f"Já existe uma folha para {nome_servidor} na competência {competencia}. "
                "Confirme a substituição antes de atualizar."
            )

        instante = agora or datetime.now()
        carimbo = instante.strftime("%Y%m%d-%H%M%S")
        backup = destino.with_name(
            f"{nome_seguro}-{competencia}_OLD_[{carimbo}].pdf"
        )
        if backup.exists():
            raise FileExistsError(
                "Já existe um backup com esse horário; tente novamente em outro segundo."
            )

        # Move a versão antiga primeiro. Se a nova gravação falhar, restaura o original.
        destino.rename(backup)
        try:
            self._gravar_atomico(destino, conteudo)
        except OSError:
            backup.rename(destino)
            raise
        return destino

    def atualizar_pdf_existente(
        self,
        caminho_atual: str | Path,
        conteudo: bytes,
        servidor_id: str,
        nome_servidor: str,
        competencia: str,
        substituir: bool = False,
    ) -> Path:
        """Reposiciona um PDF corrigido e mantém colisões explícitas.

        O método é usado quando a revisão no frontend altera servidor, nome ou
        competência. O PDF de origem só é removido depois que o destino foi
        gravado com sucesso. Se houver outro arquivo no destino, ele só será
        arquivado quando `substituir=True`, usando a convenção `_OLD_`.

        Raises:
            ValueError: caminho fora da pasta PDFs ou metadados inválidos.
            FileExistsError: destino já ocupado sem autorização de substituição.
        """
        origem = Path(caminho_atual).expanduser().resolve()
        raiz_pdf = self.pasta_pdfs.resolve()
        if not origem.is_relative_to(raiz_pdf) or not origem.is_file():
            raise ValueError("O PDF atual não está disponível no armazenamento local.")

        # Reutiliza a validação e a regra de nomes já estabelecidas por salvar_pdf.
        if not conteudo or not conteudo.startswith(b"%PDF-"):
            raise ValueError("O arquivo recebido não contém um PDF válido.")
        if not servidor_id or Path(servidor_id).name != servidor_id or servidor_id in {".", ".."}:
            raise ValueError("ID do servidor inválido.")
        if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", competencia):
            raise ValueError("Competência precisa seguir o padrão AAAA-MM.")

        id_seguro = self._nome_seguro(servidor_id)
        nome_seguro = self._nome_seguro(nome_servidor)
        destino = (
            self.pasta_pdfs
            / f"{id_seguro}_{nome_seguro}"
            / competencia
            / f"{nome_seguro}-{competencia}.pdf"
        ).resolve()
        if not destino.is_relative_to(raiz_pdf):
            raise ValueError("Os dados informados geraram um caminho inválido.")
        if origem == destino:
            self._gravar_atomico(destino, conteudo)
            return destino

        backup: Path | None = None
        if destino.exists():
            if not substituir:
                raise FileExistsError(
                    "Já existe uma folha no destino. Confirme a substituição antes de atualizar."
                )
            instante = datetime.now().strftime("%Y%m%d-%H%M%S")
            backup = destino.with_name(
                f"{destino.stem}_OLD_[{instante}]{destino.suffix}"
            )
            if backup.exists():
                raise FileExistsError("Já existe um backup com esse horário; tente novamente.")
            destino.rename(backup)

        try:
            self._gravar_atomico(destino, conteudo)
        except OSError:
            if backup is not None and backup.exists():
                backup.rename(destino)
            raise

        # A versão corrigida já está segura no novo local. Removemos a cópia
        # antiga para não deixar um documento com metadados desatualizados; se
        # essa remoção falhar, desfazemos a gravação nova e restauramos eventual
        # arquivo que ocupava o destino, mantendo o registro original utilizável.
        try:
            origem.unlink()
        except OSError:
            destino.unlink(missing_ok=True)
            if backup is not None and backup.exists():
                backup.rename(destino)
            raise
        return destino
