# Agent — Backend do Folha de Ponto

> Este arquivo complementa o contexto geral em [../Agent.md](../Agent.md). Leia o arquivo da raiz primeiro para entender o objetivo e o fluxo completo do sistema.

## Responsabilidade

O backend é responsável por receber arquivos e dados do frontend, validar as entradas, executar a extração e o processamento, organizar os resultados e encaminhar e-mails. A API está sendo desenvolvida com **FastAPI/Python**.

## Rotas e responsabilidades

As rotas são a camada HTTP de entrada: devem receber os dados, validar o formato e delegar o trabalho para funções/classes responsáveis pelo processamento. Evite concentrar OCR, manipulação de planilhas, organização de arquivos e SMTP diretamente nos handlers.

### Importação de planilhas Excel

- Receber arquivos .xls/.xlsx destinados às planilhas de referência, como cadastro de servidores e calendário acadêmico.
- Verificar a extensão/formato permitido e tratar erros de leitura.
- Encaminhar o conteúdo ao extrator de Excel (há trabalho anterior usando UploadFile, BytesIO e pandas.read_excel).
- Converter os dados extraídos para estruturas utilizáveis pela aplicação, como dicionários/listas e JSON quando necessário.
- Não confundir essa importação de planilhas de referência com o fluxo de folhas de ponto: **as folhas de ponto devem aceitar apenas PDF**.

### Recepção de folhas de ponto

- Receber um ou mais PDFs.
- Rejeitar arquivos que não sejam PDFs e retornar erros claros ao frontend.
- Encaminhar os documentos para o pipeline de processamento; a validação real deve considerar o conteúdo do arquivo, não apenas o nome.

### OCR e integração do fluxo

- O OCR é o principal foco de desenvolvimento atual.
- Extrair das folhas os campos necessários para identificar competência (mês/ano) e servidor.
- Integrar a saída do OCR com os dados de referência importados, a organização dos arquivos e o envio de e-mail.
- Tratar casos de baixa confiança, campos ausentes e documentos que não possam ser identificados, sem inventar dados nem salvar silenciosamente resultados incorretos.

### Envio de e-mail

- Utilizar SMTP por meio da configuração do ambiente (o desenvolvimento já considerou o servidor local Mercury SMTP).
- Manter o envio desacoplado das rotas para facilitar testes e tratamento de falhas.
- Não codificar host, credenciais ou outros segredos diretamente no código.

> **Nota sobre o estado das rotas:** os nomes e caminhos exatos dos endpoints não foram confirmados nesta documentação. Consulte os arquivos atuais de rotas e a inicialização da aplicação antes de referenciar endpoints específicos ou criar, renomear ou duplicar rotas. Atualize esta seção quando o mapa real de endpoints estiver confirmado.

## Foco de trabalho atual

1. Implementar e testar a extração OCR dos PDFs.
2. Definir um contrato consistente para os dados extraídos.
3. Integrar OCR, cadastro/calendário de referência, organização dos PDFs e envio de e-mail.
4. Melhorar validação, mensagens de erro e testes de cada etapa.

## Diretrizes de implementação

- Preferir rotas pequenas e específicas, com lógica de negócio em módulos de serviço/extratores.
- Usar UploadFile para uploads FastAPI e fechar/liberar recursos adequadamente.
- Tratar separadamente erros de arquivo inválido, falha de leitura, falha de OCR e falha de SMTP.
- Evitar ler ou manter arquivos inteiros em memória sem necessidade; considerar volume e tamanho dos PDFs.
- Manter caminhos de saída e nomes de arquivo seguros, removendo caracteres inadequados dos nomes.
- Não adicionar banco de dados, autenticação ou armazenamento em nuvem sem alinhar a decisão ao escopo do projeto.
- Ao alterar uma rota, explicar a responsabilidade dela, os dados de entrada/saída e como testar.
