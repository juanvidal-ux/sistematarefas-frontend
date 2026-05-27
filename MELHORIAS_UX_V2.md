# Melhorias UX V2

Esta versão aplica mudanças visuais mais perceptíveis sem alterar a lógica do sistema.

## Arquivo novo
- `css/ux-polish-v2.css`

## Arquivo atualizado
- `js/ux-polish.js`: adiciona a classe `ux-v2-loaded` no `body` para confirmar que o tema carregou.
- `index.html`: importa `ux-polish-v2.css` depois dos demais CSS.

## O que muda visualmente
- Sidebar com gradiente mais moderno.
- Topbar com efeito glass/blur e título com gradiente.
- Cards com sombras mais fortes e bordas arredondadas.
- Métricas com faixa lateral colorida.
- Kanban com colunas coloridas por status.
- Cards de tarefa com borda lateral, hover e etiqueta “Abrir”.
- Modais com cabeçalho em gradiente.
- Login com fundo mais moderno.
- Botões e campos com visual mais SaaS.
- Responsividade ajustada.

## Como confirmar que carregou
Ao abrir o sistema logado, deve aparecer um pequeno selo na topbar: `Design moderno ativo`.

## Como voltar atrás
Remova do `index.html`:

```html
<link rel="stylesheet" href="css/ux-polish-v2.css">
```

E, se quiser remover tudo da primeira camada também:

```html
<link rel="stylesheet" href="css/ux-polish.css">
<script src="js/ux-polish.js"></script>
```
