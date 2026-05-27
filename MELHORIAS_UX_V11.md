# Melhorias UX V11 - Chat inteligente nas notificações

Esta versão evolui a V10, mantendo a lógica principal do sistema intacta.

## O que foi adicionado

- Busca dentro do histórico de conversa exibido na notificação.
- Separadores por data no histórico do chat.
- Destaque visual para menções com @.
- Reações rápidas visuais nas mensagens: 👍 ✅ 👀 ⚠️.
- Botão para transformar uma mensagem do chat em subitem da tarefa.
- Indicador visual de notificação não lida.
- Atalho no campo de resposta rápida: Enter envia e Shift+Enter quebra linha.

## Rotas reutilizadas

A V11 continua usando as rotas existentes:

- GET /api/tarefas/{id}/comentarios
- POST /api/tarefas/{id}/comentarios
- POST /api/tarefas/{id}/itens

## O que não foi alterado

- Login
- Permissões
- Rotas principais
- Kanban
- Criação, edição e exclusão de tarefas
- Banco de dados
- Back-end

## Observação

As reações rápidas são visuais e ficam salvas no localStorage do navegador. Para reações reais entre usuários, seria necessário criar suporte no back-end.
