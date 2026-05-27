# V23 - Chat Premium Leve

Esta versão melhora o chat mantendo as regras combinadas:

- Sem `localStorage`.
- Sem `sessionStorage`.
- Sem `setInterval`.
- Sem `MutationObserver`.
- Sem dados fake persistidos no navegador.
- Sem alteração no back-end.
- Sem alteração no banco de dados.

## Melhorias aplicadas

1. Layout premium no painel lateral do chat.
2. Campo de resposta mais profissional e fixo no rodapé.
3. Visual mais limpo para balões de conversa.
4. Melhor responsividade mobile.
5. Busca com destaque visual do termo encontrado.
6. Mensagens continuam agrupadas por data pela base V22.
7. Confirmação antes de transformar mensagem em subitem.
8. Nota discreta informando que o chat usa histórico real da API.

## Rotas usadas

A versão continua usando apenas rotas já existentes:

- `GET /api/tarefas/{id}/comentarios`
- `POST /api/tarefas/{id}/comentarios`
- `POST /api/tarefas/{id}/itens`

## Observação

Esta versão é um acabamento visual e de usabilidade sobre a V22. Para recursos reais como leitura/não leitura persistente, reações sincronizadas, anexos no chat e tempo real, será necessário evoluir o back-end.
