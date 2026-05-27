# Melhorias UX V12 - Chat profissional sem localStorage

Esta versão evolui o chat/comentários sem alterar o back-end e sem salvar dados de chat no `localStorage` ou `sessionStorage`.

## O que foi adicionado

- Painel lateral de chat da tarefa.
- Histórico real carregado por `GET /api/tarefas/{id}/comentarios`.
- Resposta real enviada por `POST /api/tarefas/{id}/comentarios`.
- Resposta direta pela notificação.
- Responder uma mensagem específica usando citação dentro do comentário real.
- Campo de chat moderno com Enter para enviar e Shift + Enter para quebrar linha.
- Busca dentro da conversa carregada da API.
- Sugestões rápidas de resposta.
- Separadores por data: Hoje, Ontem ou data completa.
- Destaque visual para menções com `@`.
- Destaque de palavras críticas como urgente, prazo, atrasado, auditoria e relatório.
- Botão para copiar mensagem.
- Botão para criar subitem a partir de uma mensagem usando `POST /api/tarefas/{id}/itens`.
- Filtros de notificações: Todas, Chat, Críticas e Não lidas.

## O que não foi usado

- Nenhum dado de chat foi salvo em `localStorage`.
- Nenhum dado de chat foi salvo em `sessionStorage`.
- Não foram criados dados falsos permanentes no navegador.

## Observação

A autenticação original do sistema pode continuar usando o armazenamento já existente do projeto para manter o login. Esta V12 não adiciona armazenamento local para chat, histórico, respostas, lidas ou reações.

## Arquivos adicionados

- `css/ux-features-v12.css`
- `js/ux-features-v12.js`
- `MELHORIAS_UX_V12.md`
