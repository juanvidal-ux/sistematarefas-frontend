/* UX V18 - Estabilidade
   - Não usa localStorage/sessionStorage
   - Remove restos da V17 se existirem no DOM
   - Não usa MutationObserver global
*/
(function(){
  "use strict";

  function limparV17(){
    document.querySelectorAll('#v17ChatNotifPanel, .v17-chat-entry, .v17-alert-label')
      .forEach(el => el.remove());
    document.body.classList.remove('v17-chat-panel-open');
    const onboarding = document.getElementById('uxOnboarding');
    if (onboarding) onboarding.remove();
  }

  function instalar(){
    limparV17();
    document.addEventListener('keydown', function(event){
      if(event.key === 'Escape') limparV17();
    });
    setTimeout(limparV17, 500);
    setTimeout(limparV17, 1500);
    console.info('UX V18: versão estável sem painel V17 pesado e sem localStorage/sessionStorage novo.');
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', instalar);
  else instalar();
})();
