# V14 - Correção do botão Fechar nas notificações

## Correção principal

Foi adicionado um botão global e fixo para fechar o painel de notificações.

Agora o botão aparece no canto superior direito sempre que o painel de notificações estiver aberto, independentemente de:

- rolagem interna do painel;
- cor do tema;
- sobreposição de CSS;
- cabeçalho escondido;
- overflow do painel.

## Melhorias adicionais

- Tecla `Esc` fecha as notificações.
- O botão antigo do cabeçalho também foi reforçado visualmente.
- O painel ganhou espaçamento superior para o botão não cobrir o conteúdo.
- Não foi usado `localStorage` nem `sessionStorage`.
- Nenhuma rota, API, login, permissão ou lógica principal foi alterada.

## Arquivos adicionados

- `css/ux-features-v14.css`
- `js/ux-features-v14.js`
