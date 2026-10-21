import smtplib
import os


class EmailConnection:
    """Abre uma sessão SMTP usando somente configuração fornecida no ambiente."""

    def __init__(self):
        """Lê host, porta, timeout, TLS e credenciais sem armazená-los no código."""
        self.host = os.getenv("SMTP_HOST", "localhost")
        self.port = int(os.getenv("SMTP_PORT", "25"))
        self.timeout = int(os.getenv("SMTP_TIMEOUT", "10"))
        self.usuario = os.getenv("SMTP_USER", "").strip()
        self.senha = os.getenv("SMTP_PASSWORD", "")
        self.usar_tls = os.getenv("SMTP_STARTTLS", "false").casefold() == "true"

    def conectar(self):
        """Conecta e autentica se configurado; devolve sessão no contexto SMTP."""
        smtp = smtplib.SMTP(
            self.host,
            self.port,
            timeout=self.timeout
        )
        try:
            smtp.ehlo()
            if self.usar_tls:
                smtp.starttls()
                smtp.ehlo()
            if self.usuario or self.senha:
                if not self.usuario or not self.senha:
                    raise ValueError("SMTP_USER e SMTP_PASSWORD precisam ser configurados juntos.")
                smtp.login(self.usuario, self.senha)
            return smtp
        except Exception:
            try:
                smtp.quit()
            except Exception:
                smtp.close()
            raise
