# V21 - Chat profissional leve e estável

Versão focada em melhorar o chat respeitando as regras combinadas.

## Regras mantidas

- Não usa localStorage.
- Não usa sessionStorage.
- Não cria dados fake persistentes no navegador.
- Não altera back-end.
- Não altera banco de dados.
- Não usa setInterval.
- Não usa MutationObserver.
- Não busca comentários em massa automaticamente.

## Melhorias do chat

- Painel lateral de conversa mais profissional.
- Cabeçalho com dados da tarefa: status, prioridade, prazo, responsável e projeto.
- Histórico real carregado apenas ao clicar em **Abrir conversa**.
- Campo de busca dentro da conversa.
- Contador de mensagens encontradas.
- Botão **Últimas** para rolar ao fim da conversa.
- Respostas rápidas melhores.
- Resposta específica com citação visual.
- Mensagens citadas aparecem em bloco destacado.
- Botão para copiar mensagem.
- Botão para transformar mensagem em subitem usando a rota existente.
- Contador de caracteres no campo de mensagem.
- Enter envia; Shift + Enter quebra linha.

## Notificações

- Mantido filtro único: Todas, Mensagens, Prazos e Sistema.
- Botão Fechar visível e sem MutationObserver.
- Chat só carrega histórico quando o usuário abre a conversa.
