# Melhorias UX V15 - Chat e Notificações

Esta versão foi feita em cima da V14 e mantém o escopo solicitado:

1. Respostas rápidas melhores.
2. Notificações separadas por tipo: Mensagens, Prazos e Sistema.
3. Melhor responsividade mobile.

## Arquivos adicionados

- `css/ux-features-v15.css`
- `js/ux-features-v15.js`

## O que mudou

### Respostas rápidas melhores

Foram adicionadas respostas rápidas agrupadas por contexto:

- Confirmação
- Conclusão
- Ação
- Pendência
- Documento
- Prazo

Elas funcionam no chat lateral e na resposta rápida das notificações.

### Separação das notificações por tipo

Além dos filtros já existentes, foi adicionada uma segunda camada de filtros:

- Todas
- Mensagens
- Prazos
- Sistema

A classificação é feita no front-end com base nos dados já renderizados pela API.

### Mobile melhorado

Em telas menores:

- O painel de notificações ocupa a tela inteira.
- O chat lateral vira tela cheia.
- Os botões ficam maiores e mais fáceis de tocar.
- As respostas rápidas ficam em uma coluna.
- O botão fechar permanece visível.

## Segurança do ajuste

A V15 não altera:

- Back-end
- Banco de dados
- Rotas da API
- Login
- Permissões
- Criação/edição/exclusão de tarefas
- Subitens
- Kanban

## Armazenamento local

A V15 não usa `localStorage` nem `sessionStorage`.
