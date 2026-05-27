# V20 - Notificações estáveis e leves

Esta versão corrige a lentidão/travamento das versões anteriores.

## O que mudou

- Removidos scripts pesados e duplicados das notificações.
- Removida busca automática de comentários em massa ao abrir a página.
- Mantido somente um filtro de notificações: Todas, Mensagens, Prazos e Sistema.
- Chat carrega o histórico real apenas quando o usuário clica em “Abrir chat”.
- Sem `localStorage` ou `sessionStorage` para chat/notificações.
- Sem `MutationObserver` global, `setInterval` ou loops de varredura.
- Mantém botão de fechar visível da V14.

## Mantido

- Login
- Permissões
- Kanban
- Tarefas
- Subitens
- Back-end
- Banco de dados
- Rotas principais

## Observação

Para notificações reais de novos comentários em tempo real, o ideal é evoluir o back-end com notificações persistentes ou WebSocket/SSE no futuro.
