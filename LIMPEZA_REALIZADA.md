# Limpeza segura do frontend

Limpeza realizada sem alterar a lógica ativa do sistema.

## Mantido
- index.html
- todos os CSS carregados pelo index.html
- todos os JS carregados pelo index.html
- README.md

## Removido
- pasta .git do pacote
- arquivos CSS que não eram carregados pelo index.html
- arquivos JS que não eram carregados pelo index.html
- arquivo de rascunho MODELO-MENU-SLIM-CLEAN.txt

## Arquivos removidos
- js/sidebar-dock-premium.js
- js/timeline-horizontal.js
- js/ux-features-v10.js
- js/ux-features-v11.js
- js/ux-features-v12.js
- js/ux-features-v13.js
- js/ux-features-v14.js
- js/ux-features-v15.js
- js/ux-features-v16.js
- js/ux-features-v18.js
- js/ux-features-v20.js
- js/ux-features-v9.js
- css/sidebar-compact-final.css
- css/sidebar-dock-clean.css
- css/sidebar-dock-premium.css
- css/sidebar-stable-final.css
- css/ux-features-v10.css
- css/ux-features-v11.css
- css/ux-features-v12.css
- css/ux-features-v13.css
- css/ux-features-v14.css
- css/ux-features-v15.css
- css/ux-features-v16.css
- css/ux-features-v18.css
- css/ux-features-v20.css
- css/ux-features-v9.css
- MODELO-MENU-SLIM-CLEAN.txt

## Observação
Esta limpeza é conservadora: não consolida CSS/JS ainda. Apenas remove arquivos não referenciados para reduzir bagunça sem risco alto de quebra.


## Limpeza adicional: Configurações
- Removido botão Configurações do menu.
- Removido painel Configurações do Cliente do index.html.
- Removido js/configuracoes-cliente.js.
- css/configuracoes-documentos.css foi renomeado para css/documentos.css, mantendo apenas estilos de documentos.
- Removidas referências CONFIGURACOES_CLIENTE dos scripts de navegação/menu.


## Limpeza adicional: Filtros salvos
- Removido item Filtros salvos do menu.
- Removido painel uxFiltrosPanel.
- Removidas funções de salvar/aplicar/excluir filtros salvos.
- Removido botão Salvar filtro da visualização em lista/tabela.
- Removidas referências UX_FILTROS da navegação, menu flyout e accordion.


## Ajuste adicional: Notificações fora do menu
- Removido botão Notificações do menu lateral.
- Adicionado sino de notificações na topbar, ao lado das ações rápidas.
- Mantido o mesmo painel e a mesma função alternarPainelNotificacoes().
- Mantido o badge badgeNotificacoes, agora no botão superior.
