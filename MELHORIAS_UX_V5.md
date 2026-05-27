# Melhorias UX V5 - VidalSystem

Esta versão adiciona novas páginas e recursos visuais sem alterar a lógica principal do sistema, rotas da API, login, permissões ou estrutura das tarefas.

## Novos recursos adicionados

1. Minha área
- Visão focada no usuário logado.
- Mostra tarefas vencidas, próximas e atalhos rápidos.

2. Visualização em lista/tabela
- Tabela com busca, status, prioridade, responsável, projeto, prazo e ação para abrir tarefa.
- Útil para muitos cards.

3. Calendário de tarefas
- Visualização de 14 dias com tarefas agrupadas por prazo.
- Lista tarefas sem prazo para planejamento.

4. Relatórios
- KPIs gerais.
- Gráficos simples por status, responsável e projeto.
- Lista crítica com tarefas vencidas ou de alta prioridade.

5. Filtros salvos
- Permite salvar filtros frequentes no navegador usando localStorage.
- Aplica filtros no Board/tabela sem alterar o backend.

6. Ajuda interna
- Página com orientações rápidas de uso.

7. Modo apresentação geral
- Visão limpa para reuniões e acompanhamento executivo.

8. Barra de acessibilidade
- Botão flutuante para aumentar fonte e ativar contraste.

9. Onboarding inicial
- Guia de boas-vindas para apresentar as novas áreas.

10. Atalhos no Board
- Botões rápidos para Tabela, Calendário e Relatórios dentro da barra do Kanban.

## Arquivos adicionados

- css/ux-features-v5.css
- js/ux-features-v5.js
- MELHORIAS_UX_V5.md

## Segurança da alteração

Não foram alterados:

- endpoints da API
- funções principais existentes
- login
- permissões
- IDs originais usados pelo sistema
- estrutura do Kanban
- regras de criação/edição/exclusão de tarefas

Caso precise reverter, remova do index.html:

```html
<link rel="stylesheet" href="css/ux-features-v5.css">
<script src="js/ux-features-v5.js"></script>
```
