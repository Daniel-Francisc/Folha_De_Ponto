# Agent — Folha de Ponto

> Documento de contexto geral do projeto. Para detalhes de implementação do backend, leia também [backend/Agent.md](backend/Agent.md).

## Objetivo

O **Folha de Ponto** é uma aplicação de apoio ao processamento de folhas de ponto físicas assinadas. O fluxo pretendido é receber PDFs digitalizados, extrair informações por OCR, organizar os documentos por mês/ano e servidor e apoiar o envio dos arquivos por e-mail.

O projeto é desenvolvido no contexto acadêmico e tem como foco inicial o processamento local/interno da instituição, sem depender de armazenamento externo ou banco de dados em nuvem.

## Fluxo funcional previsto

1. Receber e validar arquivos enviados pelo usuário.
2. Aceitar apenas PDFs no fluxo de folhas de ponto.
3. Identificar mês, ano e informações dos servidores a partir do conteúdo processado.
4. Aplicar OCR para extrair os dados necessários.
5. Organizar os arquivos em diretórios por competência (por exemplo, 'Folhas_YYYY-MM/') e nomear os documentos de forma segura (por exemplo, 'Nome_do_servidor-YYYY-MM.pdf').
6. Utilizar os dados de referência importados de planilhas Excel para apoiar a identificação e organização.
7. Enviar os documentos por e-mail via SMTP, conforme a configuração do ambiente.

## Estado e foco de trabalho

O backend já avançou na leitura de dados de planilhas Excel e no envio de e-mails. O trabalho pendente de maior relevância é implementar/integrar o OCR e conectar as etapas do fluxo em um processamento coerente.

Os detalhes concretos das rotas e o estado do código devem ser confirmados no repositório antes de alterar a implementação. Não presumir que funcionalidades planejadas já estão concluídas.

## Orientações para agentes de código

- Leia este arquivo antes de trabalhar no projeto.
- Para tarefas de backend, leia também [backend/Agent.md](backend/Agent.md).
- Preserve o escopo atual: processamento de PDFs, extração/organização de dados e envio de e-mails.
- Não introduza serviços externos, bancos ou autenticação sem discutir a necessidade e o impacto primeiro.
- Valide arquivos e dados de entrada; não confie apenas no nome ou na extensão do arquivo.
- Mantenha credenciais e configurações locais em variáveis de ambiente; nunca grave segredos no repositório.
- Antes de modificar código, explique a abordagem e os impactos esperados. Depois, descreva o comportamento esperado e o que foi efetivamente testado.
- Diferencie claramente funcionalidades implementadas, em desenvolvimento e apenas planejadas.
