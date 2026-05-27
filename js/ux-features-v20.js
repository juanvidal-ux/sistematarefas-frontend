/* =========================================================
   UX V20 - Notificações estáveis e leves
   - Sem localStorage/sessionStorage
   - Sem MutationObserver, setInterval ou busca automática de comentários em massa
   - Chat carrega histórico real apenas quando o usuário abre uma conversa
   ========================================================= */
(function () {
  'use strict';

  const estado = {
    filtro: 'TODAS',
    notificacoes: [],
    lidas: new Set(),
    respondidas: new Set(),
    tarefaChatAberta: null,
    comentariosChat: [],
    respostaReferencia: null,
    carregandoChat: false
  };

  const sugestoes = [
    'Ok, vou verificar.',
    'Concluído.',
    'Pode revisar, por favor?',
    'Vou anexar o documento.',
    'Pendente de aprovação.',
    'Preciso de mais informações.'
  ];

  const palavrasCriticas = ['urgente', 'atrasado', 'atrasada', 'prazo', 'auditoria', 'certificado', 'relatório', 'pendente', 'não conformidade'];

  function safe(v) {
    return String(v ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function headersAuthJson() {
    const headers = { 'Content-Type': 'application/json' };
    if (typeof authHeaders === 'function') return { ...headers, ...authHeaders() };
    if (typeof getAuthHeaders === 'function') return { ...headers, ...getAuthHeaders() };
    return headers;
  }

  function headersAuth() {
    if (typeof authHeaders === 'function') return authHeaders();
    if (typeof getAuthHeaders === 'function') return getAuthHeaders();
    return {};
  }

  function toast(msg, tipo) {
    if (typeof mostrarToast === 'function') mostrarToast(msg, tipo);
    else console.log(msg);
  }

  function obterTarefas() {
    const mapa = new Map();
    if (Array.isArray(window.todasTarefas)) window.todasTarefas.forEach(t => t?.id != null && mapa.set(String(t.id), t));
    try {
      if (typeof todasTarefas !== 'undefined' && Array.isArray(todasTarefas)) todasTarefas.forEach(t => t?.id != null && mapa.set(String(t.id), t));
    } catch (_) {}
    return [...mapa.values()];
  }

  function tarefaPorId(id) {
    return obterTarefas().find(t => String(t.id) === String(id));
  }

  function hojeBase() {
    const h = new Date();
    h.setHours(0,0,0,0);
    return h;
  }

  function statusNormalizado(t) {
    return String(t?.status || '').toUpperCase();
  }

  function finalizada(t) {
    return ['CONCLUIDA','CONCLUIDO','CANCELADA','CANCELADO'].includes(statusNormalizado(t));
  }

  function formatarData(v) {
    if (!v) return 'agora';
    try {
      if (typeof formatarDataHora === 'function' && String(v).includes('T')) return formatarDataHora(v);
      if (typeof window.formatarData === 'function' && /^\d{4}-\d{2}-\d{2}$/.test(String(v))) return window.formatarData(v);
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) return d.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
    } catch (_) {}
    return String(v).slice(0,16).replace('T',' ');
  }

  function titulo(t) { return t?.titulo || t?.nome || 'Tarefa sem título'; }
  function projeto(t) { return t?.projetoNome || t?.projeto || 'Sem projeto'; }
  function responsavel(t) { return t?.responsavel || t?.responsavelNome || t?.usuarioNome || ''; }

  function criarNotificacao(base) {
    const id = base.id || `${base.origem || 'sistema'}-${base.tarefaId || Math.random().toString(36).slice(2)}`;
    return {
      id,
      origem: base.origem || 'sistema',
      tipo: base.tipo || 'info',
      icone: base.icone || '🔔',
      titulo: base.titulo || 'Notificação',
      texto: base.texto || '',
      detalhe: base.detalhe || '',
      tarefaId: base.tarefa?.id || base.tarefaId || '',
      tarefaTitulo: base.tarefa ? titulo(base.tarefa) : (base.tarefaTitulo || 'Tarefa'),
      projeto: base.tarefa ? projeto(base.tarefa) : (base.projeto || ''),
      responsavel: base.tarefa ? responsavel(base.tarefa) : (base.responsavel || ''),
      data: base.data || '',
      prioridade: base.prioridade || 0,
      lida: estado.lidas.has(id),
      respondida: estado.respondidas.has(id)
    };
  }

  function montarNotificacoes(tarefas = obterTarefas()) {
    const hoje = hojeBase();
    const itens = [];

    (tarefas || []).filter(t => !finalizada(t)).forEach(t => {
      if (t.prazo) {
        const p = new Date(`${t.prazo}T00:00:00`);
        if (!Number.isNaN(p.getTime())) {
          const diff = Math.round((p - hoje) / 86400000);
          if (diff < 0) itens.push(criarNotificacao({ id:`prazo-atrasada-${t.id}`, origem:'prazo', tipo:'danger', icone:'⚠️', titulo:'Tarefa atrasada', texto: titulo(t), detalhe:`Atrasada há ${Math.abs(diff)} dia(s)`, tarefa:t, prioridade:90 }));
          if (diff === 0) itens.push(criarNotificacao({ id:`prazo-hoje-${t.id}`, origem:'prazo', tipo:'warning', icone:'⏱️', titulo:'Vence hoje', texto: titulo(t), detalhe: responsavel(t) || projeto(t), tarefa:t, prioridade:80 }));
        }
      }

      const pr = String(t.prioridade || '').toUpperCase();
      if (['ALTA','URGENTE','CRITICA','CRÍTICA'].includes(pr)) {
        itens.push(criarNotificacao({ id:`sistema-prioridade-${t.id}`, origem:'sistema', tipo:'danger', icone:'🔥', titulo:'Alta prioridade', texto: titulo(t), detalhe: projeto(t), tarefa:t, prioridade:70 }));
      }

      const msg = t.ultimoComentario || t.ultimoComentarioTexto || t.comentarioRecente || t.ultimaMensagem || '';
      if (msg) {
        itens.push(criarNotificacao({ id:`chat-${t.id}-${String(t.dataUltimoComentario || t.atualizadoEm || '').slice(0,19)}`, origem:'chat', tipo:'chat', icone:'💬', titulo:'Comentário recente', texto: msg, detalhe:'Abrir conversa da tarefa.', tarefa:t, data:t.dataUltimoComentario || t.atualizadoEm || '', prioridade:100 }));
      }
    });

    const mapa = new Map();
    itens.sort((a,b) => (b.prioridade||0) - (a.prioridade||0)).forEach(n => {
      if (!mapa.has(n.id)) mapa.set(n.id, { ...n, lida: estado.lidas.has(n.id), respondida: estado.respondidas.has(n.id) });
    });
    estado.notificacoes = [...mapa.values()].slice(0, 30);
    renderizarNotificacoes();
  }

  function visivel(n) {
    if (estado.filtro === 'MENSAGENS') return n.origem === 'chat';
    if (estado.filtro === 'PRAZOS') return n.origem === 'prazo';
    if (estado.filtro === 'SISTEMA') return n.origem === 'sistema';
    return true;
  }

  function contador(tipo) {
    if (tipo === 'TODAS') return estado.notificacoes.length;
    if (tipo === 'MENSAGENS') return estado.notificacoes.filter(n => n.origem === 'chat').length;
    if (tipo === 'PRAZOS') return estado.notificacoes.filter(n => n.origem === 'prazo').length;
    if (tipo === 'SISTEMA') return estado.notificacoes.filter(n => n.origem === 'sistema').length;
    return 0;
  }

  function botaoFiltro(tipo, label) {
    return `<button type="button" class="${estado.filtro === tipo ? 'active' : ''}" data-v20-filter="${tipo}">${safe(label)} <span>${contador(tipo)}</span></button>`;
  }

  function destacar(texto) {
    let html = safe(texto);
    html = html.replace(/(^|\s)(@[\wÀ-ÿ._-]+)/g, '$1<span class="v20-mention">$2</span>');
    palavrasCriticas.forEach(p => {
      html = html.replace(new RegExp(`\\b(${p})\\b`, 'gi'), '<span class="v20-critical">$1</span>');
    });
    return html;
  }

  function renderizarNotificacoes() {
    const painel = document.getElementById('painelNotificacoes');
    const lista = document.getElementById('listaNotificacoes');
    const badge = document.getElementById('badgeNotificacoes');
    if (!lista) return;

    painel?.classList.add('v20-notifications-panel');
    const naoLidas = estado.notificacoes.filter(n => !estado.lidas.has(n.id)).length;
    if (badge) {
      badge.innerText = naoLidas;
      badge.classList.toggle('hidden', naoLidas === 0);
    }

    const toolbar = `
      <div class="v20-toolbar">
        <div class="v20-tabs">
          ${botaoFiltro('TODAS', 'Todas')}
          ${botaoFiltro('MENSAGENS', 'Mensagens')}
          ${botaoFiltro('PRAZOS', 'Prazos')}
          ${botaoFiltro('SISTEMA', 'Sistema')}
        </div>
        <div class="v20-actions">
          <button type="button" data-v20-refresh>Atualizar</button>
          <button type="button" data-v20-mark-all>Marcar lidas</button>
        </div>
      </div>`;

    const itens = estado.notificacoes.filter(visivel);
    if (!itens.length) {
      lista.innerHTML = toolbar + `<div class="v20-empty"><strong>Nenhuma notificação neste filtro.</strong><span>Os avisos são gerados pelas tarefas já carregadas.</span></div>`;
      return;
    }
    lista.innerHTML = toolbar + itens.map(renderizarCard).join('');
  }

  function renderizarCard(n) {
    const lida = estado.lidas.has(n.id);
    const chipTipo = n.origem === 'chat' ? 'Mensagem' : n.origem === 'prazo' ? 'Prazo' : 'Sistema';
    return `
      <article class="v20-notif-card ${safe(n.tipo)} ${lida ? 'read' : 'unread'}" data-v20-notification="${safe(n.id)}" data-task-id="${safe(n.tarefaId)}">
        <div class="v20-icon">${safe(n.icone)}</div>
        <div class="v20-main">
          <div class="v20-head"><strong>${safe(n.titulo)}</strong><small>${safe(n.data ? formatarData(n.data) : 'agora')}</small></div>
          <div class="v20-task-title">${safe(n.tarefaTitulo)}</div>
          <p>${destacar(n.texto)}</p>
          <div class="v20-chips"><span>${safe(chipTipo)}</span>${n.projeto ? `<span>${safe(n.projeto)}</span>` : ''}${n.responsavel ? `<span>${safe(n.responsavel)}</span>` : ''}</div>
          <div class="v20-buttons">
            <button type="button" class="primary" data-v20-open-chat>Abrir chat</button>
            <button type="button" data-v20-quick-reply>Responder</button>
            <button type="button" data-v20-open-task>Abrir tarefa</button>
            <button type="button" data-v20-read>${lida ? 'Lida' : 'Marcar lida'}</button>
          </div>
          <form class="v20-inline-reply" data-v20-inline-form>
            <textarea maxlength="1500" placeholder="Responder nos comentários desta tarefa..."></textarea>
            <div><small>Enter envia • Shift + Enter quebra linha</small><button type="submit">Enviar</button></div>
          </form>
        </div>
      </article>`;
  }

  function garantirChat() {
    let p = document.getElementById('v20ChatPanel');
    if (p) return p;
    p = document.createElement('aside');
    p.id = 'v20ChatPanel';
    p.className = 'v20-chat-panel hidden';
    p.innerHTML = `
      <div class="v20-chat-header">
        <div><span>Chat da tarefa</span><strong id="v20ChatTitle">Selecione uma tarefa</strong></div>
        <button type="button" data-v20-close-chat>×</button>
      </div>
      <div class="v20-chat-search"><input id="v20ChatSearch" type="search" placeholder="Buscar nesta conversa..."><button type="button" data-v20-chat-refresh>Atualizar</button></div>
      <div id="v20ReplyContext" class="v20-reply-context hidden"></div>
      <div id="v20ChatThread" class="v20-chat-thread"></div>
      <div class="v20-suggestions">${sugestoes.map(s => `<button type="button" data-v20-suggestion="${safe(s)}">${safe(s)}</button>`).join('')}</div>
      <form id="v20ChatForm" class="v20-chat-form"><textarea id="v20ChatInput" maxlength="1500" placeholder="Digite uma mensagem..."></textarea><button type="submit">Enviar</button></form>`;
    document.body.appendChild(p);
    return p;
  }

  function normalizarComentario(c) {
    return {
      id: c.id || c.comentarioId || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      autor: c.autorNome || c.usuarioNome || c.nomeUsuario || c.autor || c.usuario || 'Usuário',
      email: c.autorEmail || c.usuarioEmail || '',
      mensagem: c.mensagem || c.texto || c.comentario || '',
      data: c.dataCriacao || c.criadoEm || c.createdAt || c.data || '',
      ativo: c.ativo !== false
    };
  }

  async function buscarComentarios(tarefaId) {
    const response = await fetch(`${API_URL}/api/tarefas/${tarefaId}/comentarios`, { headers: headersAuth() });
    if (typeof tratarSessao === 'function') tratarSessao(response);
    if (!response.ok) throw new Error('Não foi possível carregar a conversa.');
    const dados = await response.json();
    return (Array.isArray(dados) ? dados : []).map(normalizarComentario).filter(c => c.ativo).sort((a,b) => new Date(a.data||0) - new Date(b.data||0));
  }

  async function enviarComentario(tarefaId, mensagem) {
    const response = await fetch(`${API_URL}/api/tarefas/${tarefaId}/comentarios`, {
      method:'POST', headers: headersAuthJson(), body: JSON.stringify({ mensagem })
    });
    if (typeof tratarSessao === 'function') tratarSessao(response);
    if (!response.ok) throw new Error('Erro ao enviar comentário.');
    return response.status === 204 ? null : response.json().catch(() => null);
  }

  async function abrirChat(tarefaId, notificacaoId) {
    if (!tarefaId) return;
    const tarefa = tarefaPorId(tarefaId);
    estado.tarefaChatAberta = String(tarefaId);
    estado.respostaReferencia = null;
    if (notificacaoId) estado.lidas.add(notificacaoId);
    const painel = garantirChat();
    painel.classList.remove('hidden');
    document.getElementById('v20ChatTitle').innerText = tarefa ? titulo(tarefa) : `Tarefa #${tarefaId}`;
    document.getElementById('v20ChatThread').innerHTML = '<div class="v20-loading">Carregando conversa...</div>';
    renderizarNotificacoes();
    await carregarChatAtual();
  }

  function separadorData(d) {
    if (!d) return 'Sem data';
    const data = new Date(d);
    if (Number.isNaN(data.getTime())) return String(d).slice(0,10);
    const hoje = hojeBase();
    const base = new Date(data); base.setHours(0,0,0,0);
    const diff = Math.round((base - hoje) / 86400000);
    if (diff === 0) return 'Hoje';
    if (diff === -1) return 'Ontem';
    return data.toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
  }

  function comentarioEhMeu(c) {
    try {
      const u = typeof getUsuarioLogado === 'function' ? getUsuarioLogado() : null;
      const email = String(u?.email || '').toLowerCase().trim();
      const nome = String(u?.nome || u?.name || '').toLowerCase().trim();
      return (email && email === String(c.email || '').toLowerCase().trim()) || (nome && nome === String(c.autor || '').toLowerCase().trim());
    } catch (_) { return false; }
  }

  async function carregarChatAtual() {
    if (!estado.tarefaChatAberta) return;
    try {
      estado.carregandoChat = true;
      estado.comentariosChat = await buscarComentarios(estado.tarefaChatAberta);
      renderizarChat();
    } catch (e) {
      document.getElementById('v20ChatThread').innerHTML = `<div class="v20-error">${safe(e.message || 'Erro ao carregar conversa.')}</div>`;
    } finally { estado.carregandoChat = false; }
  }

  function renderizarChat() {
    const thread = document.getElementById('v20ChatThread');
    if (!thread) return;
    const termo = String(document.getElementById('v20ChatSearch')?.value || '').toLowerCase().trim();
    const lista = estado.comentariosChat.filter(c => !termo || `${c.autor} ${c.mensagem}`.toLowerCase().includes(termo));
    if (!lista.length) { thread.innerHTML = '<div class="v20-empty-chat">Nenhuma mensagem encontrada.</div>'; return; }
    let atual = '';
    thread.innerHTML = lista.map(c => {
      const sep = separadorData(c.data);
      const sepHtml = sep !== atual ? (atual = sep, `<div class="v20-date-separator">${safe(sep)}</div>`) : '';
      const mine = comentarioEhMeu(c);
      const iniciais = String(c.autor || 'U').split(/\s+/).slice(0,2).map(p => p[0]).join('').toUpperCase() || 'U';
      return `${sepHtml}<div class="v20-message ${mine ? 'mine' : 'other'}" data-comment-id="${safe(c.id)}"><div class="v20-avatar">${safe(iniciais)}</div><div class="v20-bubble"><div class="v20-msg-meta"><strong>${safe(c.autor)}</strong><span>${safe(formatarData(c.data))}</span></div><div class="v20-msg-text">${destacar(c.mensagem)}</div><div class="v20-msg-actions"><button type="button" data-v20-reply-msg>Responder</button><button type="button" data-v20-copy-msg>Copiar</button></div></div></div>`;
    }).join('');
    thread.scrollTop = thread.scrollHeight;
  }

  function atualizarContextoResposta() {
    const ctx = document.getElementById('v20ReplyContext');
    if (!ctx) return;
    if (!estado.respostaReferencia) { ctx.classList.add('hidden'); ctx.innerHTML = ''; return; }
    ctx.classList.remove('hidden');
    ctx.innerHTML = `<div><strong>Respondendo a ${safe(estado.respostaReferencia.autor)}</strong><span>${safe(estado.respostaReferencia.mensagem.slice(0,120))}</span></div><button type="button" data-v20-clear-reply>Cancelar</button>`;
  }

  function mensagemComReferencia(texto) {
    const msg = String(texto || '').trim();
    if (!estado.respostaReferencia) return msg;
    const trecho = estado.respostaReferencia.mensagem.replace(/\s+/g, ' ').trim().slice(0,180);
    return `Respondendo a ${estado.respostaReferencia.autor}: "${trecho}"\n\n${msg}`;
  }

  async function enviarPeloChat(texto, botao) {
    if (!estado.tarefaChatAberta || !String(texto).trim()) { toast('Digite uma mensagem antes de enviar.', 'erro'); return; }
    const original = botao?.innerText;
    if (botao) { botao.disabled = true; botao.innerText = 'Enviando...'; }
    try {
      await enviarComentario(estado.tarefaChatAberta, mensagemComReferencia(texto));
      estado.respostaReferencia = null;
      const input = document.getElementById('v20ChatInput');
      if (input) input.value = '';
      atualizarContextoResposta();
      await carregarChatAtual();
      toast('Mensagem enviada.');
    } catch (e) { toast(e.message || 'Erro ao enviar mensagem.', 'erro'); }
    finally { if (botao) { botao.disabled = false; botao.innerText = original || 'Enviar'; } }
  }

  async function enviarInline(card, texto) {
    const tarefaId = card?.dataset.taskId;
    const notifId = card?.dataset.v20Notification;
    if (!tarefaId || !String(texto).trim()) { toast('Digite uma resposta antes de enviar.', 'erro'); return; }
    try {
      await enviarComentario(tarefaId, String(texto).trim());
      if (notifId) { estado.lidas.add(notifId); estado.respondidas.add(notifId); }
      toast('Resposta enviada nos comentários.');
      montarNotificacoes();
    } catch (e) { toast(e.message || 'Erro ao responder.', 'erro'); }
  }

  function instalarEventos() {
    document.addEventListener('click', async (event) => {
      const filtro = event.target.closest?.('[data-v20-filter]');
      if (filtro) { estado.filtro = filtro.dataset.v20Filter || 'TODAS'; renderizarNotificacoes(); return; }
      if (event.target.closest?.('[data-v20-refresh]')) { montarNotificacoes(); return; }
      if (event.target.closest?.('[data-v20-mark-all]')) { estado.notificacoes.forEach(n => estado.lidas.add(n.id)); renderizarNotificacoes(); return; }

      const card = event.target.closest?.('[data-v20-notification]');
      if (card) {
        const notif = card.dataset.v20Notification;
        const tarefaId = card.dataset.taskId;
        if (event.target.closest?.('[data-v20-open-chat]')) { await abrirChat(tarefaId, notif); return; }
        if (event.target.closest?.('[data-v20-quick-reply]')) { const f = card.querySelector('[data-v20-inline-form]'); f?.classList.toggle('open'); f?.querySelector('textarea')?.focus(); return; }
        if (event.target.closest?.('[data-v20-open-task]')) { estado.lidas.add(notif); renderizarNotificacoes(); if (typeof abrirModalTarefa === 'function') await abrirModalTarefa(Number(tarefaId)); return; }
        if (event.target.closest?.('[data-v20-read]')) { estado.lidas.add(notif); renderizarNotificacoes(); return; }
      }

      if (event.target.closest?.('[data-v20-close-chat]')) { document.getElementById('v20ChatPanel')?.classList.add('hidden'); return; }
      if (event.target.closest?.('[data-v20-chat-refresh]')) { await carregarChatAtual(); return; }
      if (event.target.closest?.('[data-v20-clear-reply]')) { estado.respostaReferencia = null; atualizarContextoResposta(); return; }
      const sugestao = event.target.closest?.('[data-v20-suggestion]');
      if (sugestao) { const input = document.getElementById('v20ChatInput'); if (input) { input.value = sugestao.textContent || ''; input.focus(); } return; }

      const msg = event.target.closest?.('.v20-message');
      if (msg && event.target.closest?.('[data-v20-reply-msg]')) {
        const comentario = estado.comentariosChat.find(c => String(c.id) === String(msg.dataset.commentId));
        if (comentario) { estado.respostaReferencia = comentario; atualizarContextoResposta(); document.getElementById('v20ChatInput')?.focus(); }
        return;
      }
      if (msg && event.target.closest?.('[data-v20-copy-msg]')) {
        const comentario = estado.comentariosChat.find(c => String(c.id) === String(msg.dataset.commentId));
        if (comentario && navigator.clipboard) { await navigator.clipboard.writeText(comentario.mensagem); toast('Mensagem copiada.'); }
      }
    });

    document.addEventListener('submit', async (event) => {
      const inline = event.target.closest?.('[data-v20-inline-form]');
      if (inline) { event.preventDefault(); await enviarInline(inline.closest('[data-v20-notification]'), inline.querySelector('textarea')?.value || ''); return; }
      const chatForm = event.target.closest?.('#v20ChatForm');
      if (chatForm) { event.preventDefault(); await enviarPeloChat(document.getElementById('v20ChatInput')?.value || '', chatForm.querySelector('button')); }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') document.getElementById('v20ChatPanel')?.classList.add('hidden');
      const input = event.target.closest?.('#v20ChatInput, [data-v20-inline-form] textarea');
      if (input && event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); input.closest('form')?.requestSubmit(); }
    });

    document.addEventListener('input', (event) => { if (event.target?.id === 'v20ChatSearch') renderizarChat(); });
  }

  function instalarOverrides() {
    if (typeof atualizarNotificacoesInternas === 'function') {
      window.atualizarNotificacoesInternasOriginalV20 = atualizarNotificacoesInternas;
      atualizarNotificacoesInternas = function(tarefas = []) { montarNotificacoes(tarefas); };
    }
    if (typeof alternarPainelNotificacoes === 'function') {
      window.alternarPainelNotificacoesOriginalV20 = alternarPainelNotificacoes;
      alternarPainelNotificacoes = function() {
        window.alternarPainelNotificacoesOriginalV20();
        if (!document.getElementById('painelNotificacoes')?.classList.contains('hidden')) montarNotificacoes();
      };
    }
  }

  function inicializar() {
    instalarEventos();
    instalarOverrides();
    garantirChat();
    montarNotificacoes();
    console.info('UX V20 estável: notificações leves ativadas, sem localStorage/sessionStorage.');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inicializar);
  else inicializar();
})();
