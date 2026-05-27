# V18 - Correção de travamento e estabilidade

Esta versão corrige a instabilidade percebida na V17.

## O que foi feito

- Removido o painel separado da V17, que podia deixar a tela lenta.
- Removido o uso de observador global pesado no DOM.
- Mantidas as notificações refinadas da V16.
- Mantido o botão de fechar visível.
- Onboarding automático desativado para não bloquear a tela ao atualizar.
- Adicionado ajuste leve para mobile.

## O que não foi alterado

- Back-end
- Banco de dados
- Login
- Permissões
- Rotas da API
- Kanban
- Tarefas
- Subitens
- Comentários reais pela API

## Observação

A V18 não adiciona localStorage/sessionStorage novo.
O sistema original ainda pode usar localStorage para token/login ou tema, mas esta camada UX não salva dados novos no navegador.
