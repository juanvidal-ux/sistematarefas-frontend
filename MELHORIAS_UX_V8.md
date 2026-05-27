# Melhorias UX V8

Esta versão adiciona uma camada visual e de usabilidade mais avançada, sem alterar rotas, login, permissões ou integração com o back-end.

## Melhorias adicionadas

- Cards do Kanban mais informativos, com avatar, tags, prioridade visual e progresso aproximado.
- Destaque mais forte para tarefas vencidas, vencendo hoje e alta prioridade.
- Drag and drop com feedback visual: card em movimento, coluna destacada e indicação "Solte aqui".
- Central de notificações mais rica, com resumo de tarefas atrasadas, vencendo hoje e alta prioridade.
- Modal da tarefa com resumo visual adicional.
- Área visual de anexos preparada para quando a API de arquivos estiver ativa.
- Timeline/histórico com visual mais profissional.
- Comentários com acabamento visual mais moderno.
- Atalho Ctrl + Shift + N para abrir notificações.
- Esc fecha o painel de notificações.

## Segurança da alteração

Foram adicionados apenas:

- `css/ux-features-v8.css`
- `js/ux-features-v8.js`
- `MELHORIAS_UX_V8.md`

E o `index.html` foi atualizado para carregar esses arquivos no final.

## Como desfazer rapidamente

Remova do `index.html`:

```html
<link rel="stylesheet" href="css/ux-features-v8.css">
<script src="js/ux-features-v8.js"></script>
```
