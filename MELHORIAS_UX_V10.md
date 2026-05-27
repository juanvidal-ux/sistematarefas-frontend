# Melhorias UX V10 - Histórico de conversa nas notificações

Esta versão evolui a V9 mantendo a mesma lógica principal do sistema.

## O que foi adicionado

- Botão **Histórico** nas notificações vinculadas a tarefas.
- Visualização do histórico de comentários direto no painel de notificações.
- Conversa em formato de chat, com balões, autor e horário.
- Botão **Atualizar** para recarregar os comentários da tarefa.
- Cache local do histórico para abertura mais rápida.
- Após responder pela notificação, o histórico tenta atualizar automaticamente.

## O que não foi alterado

- Login.
- Permissões.
- Rotas principais da API.
- Criação, edição e exclusão de tarefas.
- Subitens.
- Regras do Kanban.
- Banco de dados.

## API reaproveitada

A V10 usa a rota já existente:

- `GET /api/tarefas/{id}/comentarios`
- `POST /api/tarefas/{id}/comentarios`

Ou seja, a melhoria continua sendo segura e focada no front-end.
