/* =========================================================
   UX V22 - Chat leve com contador real de mensagens
   Regras mantidas:
   - Sem localStorage/sessionStorage
   - Sem setInterval, MutationObserver ou busca automática pesada
   - Sem mexer no back-end: usa apenas rotas já existentes
   - Contador de mensagens usa comentários reais da API, carregados uma vez ao abrir notificações
   - O histórico do chat só é carregado quando o usuário abre a conversa
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
    resumoComentarios: new Map(),
    resumoCarregado: false,
    carregandoResumo: false,
    respostaReferencia: null,
    termoBusca: '',
    carregandoChat: false
  };

  const sugestoes = [
    'Ok, vou verificar.',
    'Concluído conforme solicitado.',
    'Pode revisar, por favor?',
    'Preciso de mais informações para concluir.',
    'Vou anexar o documento assim que possível.',
    'Pendente de aprovação.',
    'Atualização realizada.',
    'Vou tratar essa pendência hoje.'
  ];

  const palavrasCriticas = ['urgente', 'atrasado', 'atrasada', 'prazo', 'auditoria', 'certificado', 'relatório', 'pendente', 'não conformidade', 'não conformidades', 'cliente', 'vencido', 'vencida'];

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
    // Prioriza o contexto visual atual do Board.
    // Ex.: ao escolher um projeto, o painel de notificações deve mostrar
    // as notificações daquele projeto, não voltar para “minhas tarefas”.
    if (Array.isArray(window.tarefasContextoAtual) && window.tarefasContextoAtual.length) {
      window.tarefasContextoAtual.forEach(t => t?.id != null && mapa.set(String(t.id), t));
      return [...mapa.values()];
    }
    if (Array.isArray(window.todasTarefas)) window.todasTarefas.forEach(t => t?.id != null && mapa.set(String(t.id), t));
    try {
      if (typeof todasTarefas !== 'undefined' && Array.isArray(todasTarefas)) todasTarefas.forEach(t => t?.id != null && mapa.set(String(t.id), t));
    } catch (_) {}
    return [...mapa.values()];
  }

  function tarefaPorId(id) { return obterTarefas().find(t => String(t.id) === String(id)); }
  function titulo(t) { return t?.titulo || t?.nome || 'Tarefa sem título'; }
  function projeto(t) { return t?.projetoNome || t?.projeto || 'Sem projeto'; }
  function responsavel(t) { return t?.responsavel || t?.responsavelNome || t?.usuarioNome || 'Sem responsável'; }
  function status(t) { return String(t?.status || 'PENDENTE').replaceAll('_', ' '); }
  function prioridade(t) { return String(t?.prioridade || 'Média'); }

  function hojeBase() {
    const h = new Date();
    h.setHours(0,0,0,0);
    return h;
  }

  function finalizada(t) {
    const s = String(t?.status || '').toUpperCase();
    return ['CONCLUIDA','CONCLUIDO','CANCELADA','CANCELADO'].includes(s);
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

  function formatarPrazo(t) {
    if (!t?.prazo) return 'Sem prazo';
    try {
      const data = new Date(`${t.prazo}T00:00:00`);
      if (!Number.isNaN(data.getTime())) return data.toLocaleDateString('pt-BR');
    } catch (_) {}
    return String(t.prazo);
  }

  function destacar(texto) {
    let html = safe(texto);
    html = html.replace(/(^|\s)(@[\wÀ-ÿ._-]+)/g, '$1<span class="v21-mention">$2</span>');
    palavrasCriticas.forEach(p => {
      html = html.replace(new RegExp(`\\b(${p})\\b`, 'gi'), '<span class="v21-critical">$1</span>');
    });
    return html;
  }

  function criarNotificacao(base) {
    const id = base.id || `${base.origem || 'sistema'}-${base.tarefaId || Math.random().toString(36).slice(2)}`;
    return {
      id,
      origem: base.origem || 'sistema',
      tipo: base.tipo || 'info',
      icone: base.icone || '🔔',
      titulo: base.titulo || 'Notificação',
      texto: base.texto || '',
      tarefaId: base.tarefa?.id || base.tarefaId || '',
      tarefaTitulo: base.tarefa ? titulo(base.tarefa) : (base.tarefaTitulo || 'Tarefa'),
      projeto: base.tarefa ? projeto(base.tarefa) : (base.projeto || ''),
      responsavel: base.tarefa ? responsavel(base.tarefa) : (base.responsavel || ''),
      data: base.data || '',
      prioridade: base.prioridade || 0
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
          if (diff < 0) itens.push(criarNotificacao({ id:`prazo-atrasada-${t.id}`, origem:'prazo', tipo:'danger', icone:'⚠️', titulo:'Tarefa atrasada', texto: titulo(t), tarefa:t, prioridade:90 }));
          if (diff === 0) itens.push(criarNotificacao({ id:`prazo-hoje-${t.id}`, origem:'prazo', tipo:'warning', icone:'⏱️', titulo:'Vence hoje', texto: titulo(t), tarefa:t, prioridade:80 }));
        }
      }

      const pr = String(t.prioridade || '').toUpperCase();
      if (['ALTA','URGENTE','CRITICA','CRÍTICA'].includes(pr)) {
        itens.push(criarNotificacao({ id:`sistema-prioridade-${t.id}`, origem:'sistema', tipo:'danger', icone:'🔥', titulo:'Alta prioridade', texto: titulo(t), tarefa:t, prioridade:70 }));
      }

      const resumoMsg = resumoMensagemDaTarefa(t);
      if (resumoMsg && resumoMsg.total > 0) {
        const labelTotal = resumoMsg.total > 1 ? `${resumoMsg.total} mensagens` : '1 mensagem';
        itens.push(criarNotificacao({
          id:`chat-${t.id}-${String(resumoMsg.ultimoId || resumoMsg.data || resumoMsg.total).slice(0,30)}`,
          origem:'chat', tipo:'chat', icone:'💬', titulo:`Comentário recente · ${labelTotal}`,
          texto: resumoMsg.texto || labelTotal, tarefa:t, data:resumoMsg.data || t.atualizadoEm || '', prioridade:100
        }));
      }
    });

    const mapa = new Map();
    itens.sort((a,b) => (b.prioridade||0) - (a.prioridade||0)).forEach(n => {
      if (!mapa.has(n.id)) mapa.set(n.id, n);
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
    return `<button type="button" class="${estado.filtro === tipo ? 'active' : ''}" data-v21-filter="${tipo}">${safe(label)} <span>${contador(tipo)}</span></button>`;
  }

  function garantirBotaoFecharNotificacoes() {
    let btn = document.getElementById('v21CloseNotifications');
    if (btn) return btn;
    btn = document.createElement('button');
    btn.id = 'v21CloseNotifications';
    btn.type = 'button';
    btn.innerHTML = '<span>×</span> Fechar';
    btn.title = 'Fechar notificações';
    btn.addEventListener('click', fecharPainelNotificacoesSeguro);
    document.body.appendChild(btn);
    return btn;
  }

  function atualizarBotaoFechar() {
    const painel = document.getElementById('painelNotificacoes');
    const btn = garantirBotaoFecharNotificacoes();
    btn.classList.toggle('visible', Boolean(painel && !painel.classList.contains('hidden')));
  }

  function fecharPainelNotificacoesSeguro() {
    const painel = document.getElementById('painelNotificacoes');
    painel?.classList.add('hidden');
    atualizarBotaoFechar();
  }

  function renderizarNotificacoes() {
    const painel = document.getElementById('painelNotificacoes');
    const lista = document.getElementById('listaNotificacoes');
    const badge = document.getElementById('badgeNotificacoes');
    if (!lista) return;

    painel?.classList.add('v21-notifications-panel');
    const naoLidas = estado.notificacoes.filter(n => !estado.lidas.has(n.id)).length;
    if (badge) {
      badge.innerText = naoLidas;
      badge.classList.toggle('hidden', naoLidas === 0);
    }

    const toolbar = `
      <div class="v21-toolbar">
        <div class="v21-tabs">
          ${botaoFiltro('TODAS', 'Todas')}
          ${botaoFiltro('MENSAGENS', 'Mensagens')}
          ${botaoFiltro('PRAZOS', 'Prazos')}
          ${botaoFiltro('SISTEMA', 'Sistema')}
        </div>
        <div class="v21-actions">
          <button type="button" data-v21-refresh>Atualizar</button>
          <button type="button" data-v21-mark-all>Marcar lidas</button>
        </div>
      </div>`;

    const itens = estado.notificacoes.filter(visivel);
    if (!itens.length) {
      lista.innerHTML = toolbar + `<div class="v21-empty"><strong>Nenhuma notificação neste filtro.</strong><span>Os avisos são gerados pelas tarefas já carregadas.</span></div>`;
      atualizarBotaoFechar();
      return;
    }
    lista.innerHTML = toolbar + itens.map(renderizarCard).join('');
    atualizarBotaoFechar();
  }

  function renderizarCard(n) {
    const lida = estado.lidas.has(n.id);
    const chipTipo = n.origem === 'chat' ? 'Mensagem' : n.origem === 'prazo' ? 'Prazo' : 'Sistema';
    return `
      <article class="v21-notif-card ${safe(n.tipo)} ${lida ? 'read' : 'unread'}" data-v21-notification="${safe(n.id)}" data-task-id="${safe(n.tarefaId)}">
        <div class="v21-icon">${safe(n.icone)}</div>
        <div class="v21-main">
          <div class="v21-head"><strong>${safe(n.titulo)}</strong><small>${safe(n.data ? formatarData(n.data) : 'agora')}</small></div>
          <div class="v21-task-title">${safe(n.tarefaTitulo)}</div>
          <p>${destacar(n.texto)}</p>
          <div class="v21-chips"><span>${safe(chipTipo)}</span>${n.projeto ? `<span>${safe(n.projeto)}</span>` : ''}${n.responsavel ? `<span>${safe(n.responsavel)}</span>` : ''}</div>
          <div class="v21-buttons">
            <button type="button" class="primary" data-v21-open-chat>Abrir conversa</button>
            <button type="button" data-v21-quick-reply>Responder</button>
            <button type="button" data-v21-open-task>Abrir tarefa</button>
            <button type="button" data-v21-read>${lida ? 'Lida' : 'Marcar lida'}</button>
          </div>
          <form class="v21-inline-reply" data-v21-inline-form>
            <textarea maxlength="1500" placeholder="Responder nos comentários desta tarefa..."></textarea>
            <div><small>Enter envia • Shift + Enter quebra linha</small><button type="submit">Enviar</button></div>
          </form>
        </div>
      </article>`;
  }

  function garantirChat() {
    let p = document.getElementById('v21ChatPanel');
    if (p) return p;
    p = document.createElement('aside');
    p.id = 'v21ChatPanel';
    p.className = 'v21-chat-panel hidden';
    p.innerHTML = `
      <div class="v21-chat-header">
        <div class="v21-chat-titleblock">
          <span>Conversa da tarefa</span>
          <strong id="v21ChatTitle">Selecione uma tarefa</strong>
          <div id="v21ChatMeta" class="v21-chat-meta"></div>
        </div>
        <div class="v21-chat-header-actions">
          <button type="button" data-v21-open-task-chat title="Abrir tarefa completa">Abrir tarefa</button>
          <button type="button" data-v21-close-chat title="Fechar conversa">×</button>
        </div>
      </div>
      <div class="v21-chat-tools">
        <input id="v21ChatSearch" type="search" placeholder="Buscar nesta conversa...">
        <button type="button" data-v21-chat-bottom>Últimas</button>
        <button type="button" data-v21-chat-refresh>Atualizar</button>
      </div>
      <div id="v21ChatStats" class="v21-chat-stats"></div>
      <div id="v21ReplyContext" class="v21-reply-context hidden"></div>
      <div id="v21ChatThread" class="v21-chat-thread"></div>
      <div class="v21-suggestions" aria-label="Respostas rápidas">${sugestoes.map(s => `<button type="button" data-v21-suggestion="${safe(s)}">${safe(s)}</button>`).join('')}</div>
      <form id="v21ChatForm" class="v21-chat-form">
        <textarea id="v21ChatInput" maxlength="1500" placeholder="Digite uma mensagem..."></textarea>
        <div class="v21-form-side"><small id="v21CharCount">0/1500</small><button type="submit">Enviar</button></div>
      </form>`;
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



  function atualizarResumoComentarios(tarefaId, comentarios) {
    const lista = (Array.isArray(comentarios) ? comentarios : [])
      .map(normalizarComentario)
      .filter(c => c.ativo && String(c.mensagem || '').trim());
    const ultimo = lista[lista.length - 1];
    estado.resumoComentarios.set(String(tarefaId), {
      total: lista.length,
      texto: ultimo?.mensagem || '',
      data: ultimo?.data || '',
      autor: ultimo?.autor || '',
      ultimoId: ultimo?.id || ''
    });
  }

  function resumoMensagemDaTarefa(t) {
    if (!t) return null;
    const id = String(t.id);
    const resumo = estado.resumoComentarios.get(id);
    if (resumo && resumo.total > 0) return resumo;

    const texto = t.ultimoComentario || t.ultimoComentarioTexto || t.comentarioRecente || t.ultimaMensagem || '';
    const total = Number(t.quantidadeComentarios ?? t.totalComentarios ?? t.qtdComentarios ?? t.comentariosCount ?? t.numeroComentarios ?? 0) || 0;
    if (texto || total > 0) {
      return {
        total: total || 1,
        texto: texto || `${total} comentário${total === 1 ? '' : 's'} nesta tarefa.`,
        data: t.dataUltimoComentario || t.atualizadoEm || t.updatedAt || '',
        autor: '',
        ultimoId: String(t.dataUltimoComentario || t.atualizadoEm || total || '')
      };
    }
    return null;
  }

  async function carregarResumoComentariosDasTarefas(forcar = false) {
    if (estado.carregandoResumo) return;
    const tarefas = obterTarefas().filter(t => t?.id != null && !finalizada(t));
    const pendentes = tarefas
      .filter(t => forcar || !estado.resumoComentarios.has(String(t.id)))
      .slice(0, 30);
    if (!pendentes.length) return;

    estado.carregandoResumo = true;
    renderizarNotificacoes();
    try {
      const limite = 4;
      let indice = 0;
      async function worker() {
        while (indice < pendentes.length) {
          const tarefa = pendentes[indice++];
          try {
            const comentarios = await buscarComentarios(tarefa.id);
            atualizarResumoComentarios(tarefa.id, comentarios);
          } catch (_) {
            if (!estado.resumoComentarios.has(String(tarefa.id))) {
              estado.resumoComentarios.set(String(tarefa.id), { total: 0, texto: '', data: '', autor: '', ultimoId: '' });
            }
          }
        }
      }
      await Promise.all(Array.from({ length: Math.min(limite, pendentes.length) }, worker));
      estado.resumoCarregado = true;
      montarNotificacoes(obterTarefas());
    } finally {
      estado.carregandoResumo = false;
      renderizarNotificacoes();
    }
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

  async function criarSubitemDaMensagem(tarefaId, mensagem) {
    const texto = String(mensagem || '').replace(/\s+/g, ' ').trim();
    if (!texto) return;
    const payload = {
      titulo: texto.slice(0, 90),
      descricao: `Criado a partir de uma mensagem do chat:\n\n${texto}`,
      status: 'PENDENTE',
      prazo: null,
      responsavelId: null,
      ordem: 1
    };
    const response = await fetch(`${API_URL}/api/tarefas/${tarefaId}/itens`, {
      method: 'POST', headers: headersAuthJson(), body: JSON.stringify(payload)
    });
    if (typeof tratarSessao === 'function') tratarSessao(response);
    if (!response.ok) throw new Error('Não foi possível criar subitem a partir da mensagem.');
    return response.status === 204 ? null : response.json().catch(() => null);
  }

  async function abrirChat(tarefaId, notificacaoId) {
    if (!tarefaId) return;
    const tarefa = tarefaPorId(tarefaId);
    estado.tarefaChatAberta = String(tarefaId);
    estado.respostaReferencia = null;
    estado.termoBusca = '';
    if (notificacaoId) estado.lidas.add(notificacaoId);
    const painel = garantirChat();
    painel.classList.remove('hidden');
    document.getElementById('v21ChatTitle').innerText = tarefa ? titulo(tarefa) : `Tarefa #${tarefaId}`;
    atualizarMetaChat(tarefa);
    const search = document.getElementById('v21ChatSearch');
    if (search) search.value = '';
    document.getElementById('v21ChatThread').innerHTML = '<div class="v21-loading">Carregando conversa...</div>';
    atualizarContextoResposta();
    atualizarContadorCaracteres();
    renderizarNotificacoes();
    await carregarChatAtual();
  }

  function atualizarMetaChat(tarefa) {
    const meta = document.getElementById('v21ChatMeta');
    if (!meta) return;
    if (!tarefa) { meta.innerHTML = ''; return; }
    meta.innerHTML = `
      <span>${safe(status(tarefa))}</span>
      <span>${safe(prioridade(tarefa))}</span>
      <span>${safe(formatarPrazo(tarefa))}</span>
      <span>${safe(responsavel(tarefa))}</span>
      <span>${safe(projeto(tarefa))}</span>`;
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

  function parseReferencia(mensagem) {
    const m = String(mensagem || '').match(/^Respondendo a ([^:]+): "([\s\S]{1,240}?)"\n\n([\s\S]*)$/);
    if (!m) return null;
    return { autor: m[1], trecho: m[2], texto: m[3] };
  }

  async function carregarChatAtual() {
    if (!estado.tarefaChatAberta) return;
    try {
      estado.carregandoChat = true;
      estado.comentariosChat = await buscarComentarios(estado.tarefaChatAberta);
      atualizarResumoComentarios(estado.tarefaChatAberta, estado.comentariosChat);
      renderizarChat(true);
      montarNotificacoes(obterTarefas());
    } catch (e) {
      document.getElementById('v21ChatThread').innerHTML = `<div class="v21-error">${safe(e.message || 'Erro ao carregar conversa.')}</div>`;
    } finally { estado.carregandoChat = false; }
  }

  function atualizarEstatisticasChat(total, filtradas) {
    const el = document.getElementById('v21ChatStats');
    if (!el) return;
    const tarefa = tarefaPorId(estado.tarefaChatAberta);
    el.innerHTML = `<strong>${filtradas}</strong> de ${total} mensagem(ns) ${tarefa ? `• ${safe(titulo(tarefa))}` : ''}`;
  }

  function renderizarChat(rolarFim = false) {
    const thread = document.getElementById('v21ChatThread');
    if (!thread) return;
    const termo = String(document.getElementById('v21ChatSearch')?.value || '').toLowerCase().trim();
    estado.termoBusca = termo;
    const lista = estado.comentariosChat.filter(c => !termo || `${c.autor} ${c.mensagem}`.toLowerCase().includes(termo));
    atualizarEstatisticasChat(estado.comentariosChat.length, lista.length);
    if (!lista.length) { thread.innerHTML = '<div class="v21-empty-chat">Nenhuma mensagem encontrada.</div>'; return; }
    let atual = '';
    thread.innerHTML = lista.map(c => {
      const sep = separadorData(c.data);
      const sepHtml = sep !== atual ? (atual = sep, `<div class="v21-date-separator">${safe(sep)}</div>`) : '';
      const mine = comentarioEhMeu(c);
      const iniciais = String(c.autor || 'U').split(/\s+/).slice(0,2).map(p => p[0]).join('').toUpperCase() || 'U';
      const ref = parseReferencia(c.mensagem);
      const texto = ref ? ref.texto : c.mensagem;
      const quote = ref ? `<div class="v21-quote"><strong>${safe(ref.autor)}</strong><span>${safe(ref.trecho)}</span></div>` : '';
      return `${sepHtml}<div class="v21-message ${mine ? 'mine' : 'other'}" data-comment-id="${safe(c.id)}"><div class="v21-avatar">${safe(iniciais)}</div><div class="v21-bubble"><div class="v21-msg-meta"><strong>${safe(c.autor)}</strong><span>${safe(formatarData(c.data))}</span></div>${quote}<div class="v21-msg-text">${destacar(texto)}</div><div class="v21-msg-actions"><button type="button" data-v21-reply-msg>Responder</button><button type="button" data-v21-copy-msg>Copiar</button><button type="button" data-v21-create-subitem>Virar subitem</button></div></div></div>`;
    }).join('');
    if (rolarFim) rolarFimChat();
  }

  function rolarFimChat() {
    const thread = document.getElementById('v21ChatThread');
    if (thread) thread.scrollTop = thread.scrollHeight;
  }

  function atualizarContextoResposta() {
    const ctx = document.getElementById('v21ReplyContext');
    if (!ctx) return;
    if (!estado.respostaReferencia) { ctx.classList.add('hidden'); ctx.innerHTML = ''; return; }
    ctx.classList.remove('hidden');
    ctx.innerHTML = `<div><strong>Respondendo a ${safe(estado.respostaReferencia.autor)}</strong><span>${safe(estado.respostaReferencia.mensagem.slice(0,140))}</span></div><button type="button" data-v21-clear-reply>Cancelar</button>`;
  }

  function mensagemComReferencia(texto) {
    const msg = String(texto || '').trim();
    if (!estado.respostaReferencia) return msg;
    const trecho = estado.respostaReferencia.mensagem.replace(/\s+/g, ' ').trim().slice(0,180);
    return `Respondendo a ${estado.respostaReferencia.autor}: "${trecho}"\n\n${msg}`;
  }

  function atualizarContadorCaracteres() {
    const input = document.getElementById('v21ChatInput');
    const count = document.getElementById('v21CharCount');
    if (count) count.innerText = `${String(input?.value || '').length}/1500`;
  }

  function inserirSugestao(texto) {
    const input = document.getElementById('v21ChatInput');
    if (!input) return;
    const atual = String(input.value || '').trim();
    input.value = atual ? `${atual}\n${texto}` : texto;
    input.focus();
    atualizarContadorCaracteres();
  }

  async function enviarPeloChat(texto, botao) {
    if (!estado.tarefaChatAberta || !String(texto).trim()) { toast('Digite uma mensagem antes de enviar.', 'erro'); return; }
    const original = botao?.innerText;
    if (botao) { botao.disabled = true; botao.innerText = 'Enviando...'; }
    try {
      await enviarComentario(estado.tarefaChatAberta, mensagemComReferencia(texto));
      estado.respostaReferencia = null;
      const input = document.getElementById('v21ChatInput');
      if (input) input.value = '';
      atualizarContextoResposta();
      atualizarContadorCaracteres();
      await carregarChatAtual();
      toast('Mensagem enviada.');
    } catch (e) { toast(e.message || 'Erro ao enviar mensagem.', 'erro'); }
    finally { if (botao) { botao.disabled = false; botao.innerText = original || 'Enviar'; } }
  }

  async function enviarInline(card, texto) {
    const tarefaId = card?.dataset.taskId;
    const notifId = card?.dataset.v21Notification;
    if (!tarefaId || !String(texto).trim()) { toast('Digite uma resposta antes de enviar.', 'erro'); return; }
    try {
      await enviarComentario(tarefaId, String(texto).trim());
      if (notifId) { estado.lidas.add(notifId); estado.respondidas.add(notifId); }
      const area = card.querySelector('[data-v21-inline-form] textarea');
      if (area) area.value = '';
      toast('Resposta enviada nos comentários.');
      montarNotificacoes();
    } catch (e) { toast(e.message || 'Erro ao responder.', 'erro'); }
  }

  function instalarEventos() {
    document.addEventListener('click', async (event) => {
      const filtro = event.target.closest?.('[data-v21-filter]');
      if (filtro) { estado.filtro = filtro.dataset.v21Filter || 'TODAS'; renderizarNotificacoes(); return; }
      if (event.target.closest?.('[data-v21-refresh]')) { montarNotificacoes(); await carregarResumoComentariosDasTarefas(true); return; }
      if (event.target.closest?.('[data-v21-mark-all]')) { estado.notificacoes.forEach(n => estado.lidas.add(n.id)); renderizarNotificacoes(); return; }

      const card = event.target.closest?.('[data-v21-notification]');
      if (card) {
        const notif = card.dataset.v21Notification;
        const tarefaId = card.dataset.taskId;
        if (event.target.closest?.('[data-v21-open-chat]')) { await abrirChat(tarefaId, notif); return; }
        if (event.target.closest?.('[data-v21-quick-reply]')) { const f = card.querySelector('[data-v21-inline-form]'); f?.classList.toggle('open'); f?.querySelector('textarea')?.focus(); return; }
        if (event.target.closest?.('[data-v21-open-task]')) { estado.lidas.add(notif); renderizarNotificacoes(); if (typeof abrirModalTarefa === 'function') await abrirModalTarefa(Number(tarefaId)); return; }
        if (event.target.closest?.('[data-v21-read]')) { estado.lidas.add(notif); renderizarNotificacoes(); return; }
      }

      if (event.target.closest?.('[data-v21-close-chat]')) { document.getElementById('v21ChatPanel')?.classList.add('hidden'); return; }
      if (event.target.closest?.('[data-v21-chat-refresh]')) { await carregarChatAtual(); return; }
      if (event.target.closest?.('[data-v21-chat-bottom]')) { rolarFimChat(); return; }
      if (event.target.closest?.('[data-v21-open-task-chat]')) { if (estado.tarefaChatAberta && typeof abrirModalTarefa === 'function') await abrirModalTarefa(Number(estado.tarefaChatAberta)); return; }
      if (event.target.closest?.('[data-v21-clear-reply]')) { estado.respostaReferencia = null; atualizarContextoResposta(); return; }
      const sugestao = event.target.closest?.('[data-v21-suggestion]');
      if (sugestao) { inserirSugestao(sugestao.textContent || ''); return; }

      const msg = event.target.closest?.('.v21-message');
      if (msg && event.target.closest?.('[data-v21-reply-msg]')) {
        const comentario = estado.comentariosChat.find(c => String(c.id) === String(msg.dataset.commentId));
        if (comentario) { estado.respostaReferencia = comentario; atualizarContextoResposta(); document.getElementById('v21ChatInput')?.focus(); }
        return;
      }
      if (msg && event.target.closest?.('[data-v21-copy-msg]')) {
        const comentario = estado.comentariosChat.find(c => String(c.id) === String(msg.dataset.commentId));
        if (comentario && navigator.clipboard) { await navigator.clipboard.writeText(comentario.mensagem); toast('Mensagem copiada.'); }
        return;
      }
      if (msg && event.target.closest?.('[data-v21-create-subitem]')) {
        const comentario = estado.comentariosChat.find(c => String(c.id) === String(msg.dataset.commentId));
        if (comentario && estado.tarefaChatAberta) {
          try { await criarSubitemDaMensagem(estado.tarefaChatAberta, comentario.mensagem); toast('Subitem criado a partir da mensagem.'); }
          catch (e) { toast(e.message || 'Erro ao criar subitem.', 'erro'); }
        }
      }
    });

    document.addEventListener('submit', async (event) => {
      const inline = event.target.closest?.('[data-v21-inline-form]');
      if (inline) { event.preventDefault(); await enviarInline(inline.closest('[data-v21-notification]'), inline.querySelector('textarea')?.value || ''); return; }
      const chatForm = event.target.closest?.('#v21ChatForm');
      if (chatForm) { event.preventDefault(); await enviarPeloChat(document.getElementById('v21ChatInput')?.value || '', chatForm.querySelector('button[type="submit"]')); }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { document.getElementById('v21ChatPanel')?.classList.add('hidden'); fecharPainelNotificacoesSeguro(); }
      const input = event.target.closest?.('#v21ChatInput, [data-v21-inline-form] textarea');
      if (input && event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); input.closest('form')?.requestSubmit(); }
    });

    document.addEventListener('input', (event) => {
      if (event.target?.id === 'v21ChatSearch') renderizarChat(false);
      if (event.target?.id === 'v21ChatInput') atualizarContadorCaracteres();
    });
  }

  function instalarOverrides() {
    if (typeof atualizarNotificacoesInternas === 'function') {
      window.atualizarNotificacoesInternasOriginalV21 = atualizarNotificacoesInternas;
      atualizarNotificacoesInternas = function(tarefas = []) { montarNotificacoes(tarefas); };
    }
    if (typeof alternarPainelNotificacoes === 'function') {
      window.alternarPainelNotificacoesOriginalV21 = alternarPainelNotificacoes;
      alternarPainelNotificacoes = function() {
        window.alternarPainelNotificacoesOriginalV21();
        const aberto = !document.getElementById('painelNotificacoes')?.classList.contains('hidden');
        if (aberto) { montarNotificacoes(obterTarefas()); carregarResumoComentariosDasTarefas(false); }
        atualizarBotaoFechar();
      };
    }
    if (typeof fecharPainelNotificacoes === 'function') {
      window.fecharPainelNotificacoesOriginalV21 = fecharPainelNotificacoes;
      fecharPainelNotificacoes = function() { fecharPainelNotificacoesSeguro(); };
    }
  }

  function inicializar() {
    instalarEventos();
    instalarOverrides();
    garantirChat();
    garantirBotaoFecharNotificacoes();
    montarNotificacoes();
    atualizarBotaoFechar();
    console.info('UX V22: chat leve ativado, contador de mensagens por API, sem localStorage/sessionStorage e sem atualização automática pesada.');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inicializar);
  else inicializar();
})();
