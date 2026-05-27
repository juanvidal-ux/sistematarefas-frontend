# Melhorias UX V9 - Notificações com resposta rápida

Esta versão mantém a lógica principal do sistema e adiciona uma camada de experiência para notificações de chat/comentários.

## O que foi adicionado

- Painel de notificações mais completo.
- Filtro por: Todas, Chat, Críticas e Não lidas.
- Notificações associadas a tarefas com botão **Responder comentário**.
- Campo de resposta rápida dentro da própria notificação.
- Envio da resposta para a API já existente de comentários:
  - `POST /api/tarefas/{id}/comentarios`
- Botão **Abrir tarefa** direto pela notificação.
- Botão **Marcar lida**.
- Notificações respondidas ficam marcadas visualmente.
- Cache local leve para lembrar comentários carregados no modal da tarefa.

## O que não foi alterado

- Login.
- Permissões.
- Rotas principais da API.
- Criação, edição e exclusão de tarefas.
- Regras do Kanban.
- Estrutura original das funções.
- Banco de dados.

## Observação importante

A V9 permite responder comentários direto pelo front-end usando a API de comentários já existente. Para notificações reais entre usuários, persistentes e em tempo real, a próxima etapa deve ser criar suporte no back-end.
