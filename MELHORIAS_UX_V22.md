# V22 - Correção do contador de mensagens

Correção focada na aba **Mensagens** das notificações.

## Ajustes

- O contador de Mensagens agora usa comentários reais vindos da API.
- Ao abrir o painel de notificações, o sistema busca os comentários uma única vez, com limite e sem loop.
- O botão Atualizar força nova leitura dos comentários pela API.
- Ao abrir uma conversa, o resumo da tarefa também é atualizado.
- Corrigido HTML duplicado dos filtros no painel de notificações.

## Regras mantidas

- Sem localStorage.
- Sem sessionStorage.
- Sem setInterval.
- Sem MutationObserver.
- Sem alteração no back-end.
- Sem alteração no banco de dados.
