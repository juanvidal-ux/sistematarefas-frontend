/* =========================================================
   UX V23 - Refinamento premium do chat
   - Sem localStorage/sessionStorage
   - Sem setInterval e sem MutationObserver
   - Sem alterar back-end ou banco
   - Só melhora layout, busca com destaque e confirmação de ação
   ========================================================= */
(function () {
  'use strict';

  function safe(v) {
    return String(v ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function toast(msg, tipo) {
    if (typeof mostrarToast === 'function') mostrarToast(msg, tipo);
    else console.log(msg);
  }

  function headersAuthJson() {
    const headers = { 'Content-Type': 'application/json' };
    if (typeof authHeaders === 'function') return { ...headers, ...authHeaders() };
    if (typeof getAuthHeaders === 'function') return { ...headers, ...getAuthHeaders() };
    return headers;
  }

  function textoDaMensagem(el) {
    return el?.querySelector('.v21-msg-text')?.innerText?.trim() || '';
  }

  function tarefaChatAberta() {
    const painel = document.getElementById('v21ChatPanel');
    if (!painel || painel.classList.contains('hidden')) return '';
    const abrirTarefa = painel.querySelector('[data-v21-open-task-chat]');
    // O ID real fica fechado na V22, então pegamos a tarefa pelo botão da conversa aberta quando possível.
    // O fallback tenta obter pelo card aberto mais recente nas notificações.
    return painel.dataset.taskId || abrirTarefa?.dataset.taskId || window.__v23LastChatTaskId || '';
  }

  function capturarTaskIdPorClique(event) {
    const card = event.target.closest?.('[data-v21-notification]');
    if (card?.dataset?.taskId) window.__v23LastChatTaskId = card.dataset.taskId;
  }

  function adicionarNotaPremium() {
    const painel = document.getElementById('v21ChatPanel');
    if (!painel || painel.classList.contains('hidden')) return;
    if (!painel.querySelector('.v23-premium-note')) {
      const stats = painel.querySelector('#v21ChatStats');
      const note = document.createElement('div');
      note.className = 'v23-premium-note';
      note.textContent = 'Chat premium: histórico real pela API, sem armazenamento local e sem atualização automática pesada.';
      stats?.insertAdjacentElement('afterend', note);
    }
  }

  function removerDestaquesBusca() {
    document.querySelectorAll('.v23-search-hit').forEach(mark => {
      const text = document.createTextNode(mark.textContent || '');
      mark.replaceWith(text);
      text.parentNode?.normalize();
    });
  }

  function destacarBusca() {
    removerDestaquesBusca();
    const input = document.getElementById('v21ChatSearch');
    const termo = String(input?.value || '').trim();
    if (!termo || termo.length < 2) return;

    const areas = document.querySelectorAll('#v21ChatThread .v21-msg-text, #v21ChatThread .v21-quote span');
    const lower = termo.toLowerCase();

    areas.forEach(area => {
      const walker = document.createTreeWalker(area, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (!node.nodeValue || !node.nodeValue.toLowerCase().includes(lower)) return NodeFilter.FILTER_REJECT;
          if (node.parentElement?.closest('.v23-search-hit')) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });

      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);

      nodes.forEach(node => {
        const value = node.nodeValue;
        const idx = value.toLowerCase().indexOf(lower);
        if (idx < 0) return;
        const before = value.slice(0, idx);
        const match = value.slice(idx, idx + termo.length);
        const after = value.slice(idx + termo.length);
        const frag = document.createDocumentFragment();
        if (before) frag.appendChild(document.createTextNode(before));
        const mark = document.createElement('mark');
        mark.className = 'v23-search-hit';
        mark.textContent = match;
        frag.appendChild(mark);
        if (after) frag.appendChild(document.createTextNode(after));
        node.replaceWith(frag);
      });
    });
  }

  function confirmarPremium({ titulo, mensagem, confirmar = 'Confirmar', cancelar = 'Cancelar' }) {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'v23-confirm-overlay';
      overlay.innerHTML = `
        <div class="v23-confirm-box" role="dialog" aria-modal="true">
          <h3>${safe(titulo)}</h3>
          <p>${safe(mensagem)}</p>
          <div class="v23-confirm-actions">
            <button type="button" data-v23-cancel>${safe(cancelar)}</button>
            <button type="button" class="primary" data-v23-confirm>${safe(confirmar)}</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', (event) => {
        if (event.target.matches('[data-v23-confirm]')) { overlay.remove(); resolve(true); }
        if (event.target.matches('[data-v23-cancel]') || event.target === overlay) { overlay.remove(); resolve(false); }
      });
      overlay.querySelector('[data-v23-confirm]')?.focus();
    });
  }

  async function criarSubitemSeguro(tarefaId, mensagem) {
    const texto = String(mensagem || '').replace(/\s+/g, ' ').trim();
    if (!tarefaId || !texto) return;
    const payload = {
      titulo: texto.slice(0, 90),
      descricao: `Criado a partir de uma mensagem do chat:\n\n${texto}`,
      status: 'PENDENTE',
      prazo: null,
      responsavelId: null,
      ordem: 1
    };
    const response = await fetch(`${API_URL}/api/tarefas/${tarefaId}/itens`, {
      method: 'POST',
      headers: headersAuthJson(),
      body: JSON.stringify(payload)
    });
    if (typeof tratarSessao === 'function') tratarSessao(response);
    if (!response.ok) throw new Error('Não foi possível criar subitem a partir da mensagem.');
  }

  function atualizarTaskIdNoPainel() {
    const painel = document.getElementById('v21ChatPanel');
    if (painel && window.__v23LastChatTaskId) painel.dataset.taskId = window.__v23LastChatTaskId;
  }

  function aposRenderChat() {
    adicionarNotaPremium();
    atualizarTaskIdNoPainel();
    destacarBusca();
  }

  function instalarEventos() {
    document.addEventListener('click', capturarTaskIdPorClique, true);

    document.addEventListener('click', async (event) => {
      if (event.target.closest?.('[data-v21-open-chat]')) {
        setTimeout(aposRenderChat, 80);
        setTimeout(aposRenderChat, 450);
      }

      const botaoSubitem = event.target.closest?.('[data-v21-create-subitem]');
      if (botaoSubitem) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const msg = botaoSubitem.closest('.v21-message');
        const texto = textoDaMensagem(msg);
        const tarefaId = tarefaChatAberta();
        const ok = await confirmarPremium({
          titulo: 'Transformar mensagem em subitem?',
          mensagem: texto ? `Será criado um subitem com: "${texto.slice(0, 130)}${texto.length > 130 ? '...' : ''}"` : 'Deseja criar um subitem a partir desta mensagem?',
          confirmar: 'Criar subitem'
        });
        if (!ok) return;
        try {
          await criarSubitemSeguro(tarefaId, texto);
          toast('Subitem criado a partir da mensagem.');
        } catch (e) {
          toast(e.message || 'Erro ao criar subitem.', 'erro');
        }
      }

      if (event.target.closest?.('[data-v21-chat-refresh], [data-v21-chat-bottom], [data-v21-suggestion], [data-v21-reply-msg]')) {
        setTimeout(aposRenderChat, 80);
      }
    }, true);

    document.addEventListener('input', (event) => {
      if (event.target?.id === 'v21ChatSearch') setTimeout(destacarBusca, 0);
    });

    document.addEventListener('submit', (event) => {
      if (event.target?.id === 'v21ChatForm') setTimeout(aposRenderChat, 450);
    });
  }

  function inicializar() {
    instalarEventos();
    setTimeout(aposRenderChat, 300);
    console.info('UX V23: refinamento premium do chat ativado sem localStorage/sessionStorage, sem loops e sem back-end novo.');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inicializar);
  else inicializar();
})();
