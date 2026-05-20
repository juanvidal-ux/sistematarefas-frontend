# TaskFlow Frontend Modularizado

Esta versão reorganiza o frontend em pastas `css/` e `js/`, mantendo os endpoints, `API_URL`, ids, classes e funções globais usados pelo HTML.

## Estrutura

```text
index.html
css/
  base.css
  login.css
  forms-buttons.css
  layout.css
  projetos.css
  board-kanban.css
  modals.css
  responsive.css
  extras.css
  subitens.css
  enhancements.css
  ios-theme.css
  responsive-ios.css
js/
  config.js
  state.js
  auth.js
  navigation.js
  board.js
  tarefas.js
  usuarios.js
  projetos.js
  subitens.js
  interacoes.js
  dashboard-ui.js
  senha.js
  utils.js
  main.js
```

## Observações

- O backend não foi alterado.
- O `API_URL` continua apontando para `localhost:8081` em ambiente local e para o Render em produção.
- Os `onclick` do HTML continuam funcionando porque os scripts são carregados como scripts clássicos, não como módulos.
- Para publicar no GitHub Pages, suba `index.html` e as pastas `css/` e `js/`.


## Módulos adicionados nesta versão

```text
js/exportacoes.js
  - PDF executivo do projeto
  - Excel analítico do projeto
  - Copiar resumo executivo

js/timeline-horizontal.js
  - Linha do tempo horizontal consolidada do projeto

js/graficos.js
  - Saúde do projeto
  - Tarefas por status
  - Custo estimado x real
  - Tarefas por responsável

css/relatorios-graficos.css
  - Estilos dos gráficos, exportações e timeline horizontal
```


## Pacote de 8 melhorias frontend

1. Aba Exportações no detalhe do projeto.
2. PDF executivo melhorado com capa e ranking financeiro.
3. Excel melhorado com aba Análise financeira e % de variação.
4. Saúde do projeto mais forte no painel.
5. Linha do tempo horizontal com filtros e limite de eventos.
6. Tela de projeto organizada por abas.
7. Busca interna no detalhe do projeto.
8. Modo apresentação do projeto.


## Atualização: Checklist estruturada dos subitens

Arquivos adicionados/alterados:

```text
js/checklist.js
css/checklist.css
js/subitens.js
js/exportacoes.js
index.html
```

Funcionalidades:

```text
- Checklist dentro de cada subitem
- Adicionar item de checklist
- Marcar/desmarcar item como concluído
- Editar item da checklist
- Excluir item da checklist
- Progresso visual da checklist
- Sugestão para concluir subitem quando a checklist estiver 100%
- Aba Checklist no Excel do projeto
- Seção Checklist no PDF do projeto
```
