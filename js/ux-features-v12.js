/* =========================================================
   UX V12 - Chat profissional sem localStorage/sessionStorage
   - Histórico real por API: GET /api/tarefas/{id}/comentarios
   - Resposta real por API: POST /api/tarefas/{id}/comentarios
   - Subitem real por API: POST /api/tarefas/{id}/itens
   - Estados temporários ficam apenas em memória durante a sessão da página.
   ========================================================= */
(function () {
    "use strict";

    const estado = {
        filtro: "TODAS",
        notificacoes: [],
        lidas: new Set(),
        respondidas: new Set(),
        tarefaChatAberta: null,
        comentariosChat: [],
        respostaReferencia: null,
        carregandoNotificacoes: false,
        ultimaAtualizacao: null
    };

    const PALAVRAS_CRITICAS = ["urgente", "atrasado", "atrasada", "prazo", "cliente", "auditoria", "certificado", "relatório", "pendente", "risco", "revisar"];

    const sugestoes = [
        "Ok, vou verificar.",
        "Concluído.",
        "Pode revisar, por favor?",
        "Vou anexar o documento.",
        "Pendente de aprovação.",
        "Preciso de mais informações."
    ];

    function safe(value) {
        if (typeof escapeHtml === "function") return escapeHtml(value ?? "");
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function headersAuthJson() {
        const headers = { "Content-Type": "application/json" };
        if (typeof authHeaders === "function") return { ...headers, ...authHeaders() };
        if (typeof getAuthHeaders === "function") return { ...headers, ...getAuthHeaders() };
        return headers;
    }

    function headersAuth() {
        if (typeof authHeaders === "function") return authHeaders();
        if (typeof getAuthHeaders === "function") return getAuthHeaders();
        return {};
    }

    function toast(msg, tipo) {
        if (typeof mostrarToast === "function") mostrarToast(msg, tipo);
        else console.log(msg);
    }

    function obterTarefas() {
        const mapa = new Map();
        if (Array.isArray(window.todasTarefas)) window.todasTarefas.forEach(t => t?.id != null && mapa.set(String(t.id), t));
        try {
            if (typeof todasTarefas !== "undefined" && Array.isArray(todasTarefas)) todasTarefas.forEach(t => t?.id != null && mapa.set(String(t.id), t));
        } catch (_) { }
        return [...mapa.values()];
    }

    function tarefaPorId(id) {
        return obterTarefas().find(t => String(t.id) === String(id));
    }

    function statusNormalizado(status) {
        return String(status || "").toUpperCase();
    }

    function estaFinalizada(tarefa) {
        return ["CONCLUIDA", "CONCLUIDO", "CANCELADA", "CANCELADO"].includes(statusNormalizado(tarefa?.status));
    }

    function dataBaseHoje() {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }

    function formatarData(data) {
        if (!data) return "";
        try {
            if (typeof formatarDataHora === "function" && String(data).includes("T")) return formatarDataHora(data);
            if (typeof window.formatarData === "function" && /^\d{4}-\d{2}-\d{2}$/.test(String(data))) return window.formatarData(data);
            const d = new Date(data);
            if (!Number.isNaN(d.getTime())) return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
            return String(data).slice(0, 16).replace("T", " ");
        } catch (_) {
            return String(data).slice(0, 16).replace("T", " ");
        }
    }

    function separadorData(data) {
        if (!data) return "Sem data";
        const d = new Date(data);
        if (Number.isNaN(d.getTime())) return String(data).slice(0, 10);
        const hoje = dataBaseHoje();
        const base = new Date(d);
        base.setHours(0, 0, 0, 0);
        const diff = Math.round((base - hoje) / 86400000);
        if (diff === 0) return "Hoje";
        if (diff === -1) return "Ontem";
        return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    }

    function normalizarComentario(c) {
        return {
            id: c.id || c.comentarioId || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            autor: c.autorNome || c.usuarioNome || c.nomeUsuario || c.autor || c.usuario || "Usuário",
            email: c.autorEmail || c.usuarioEmail || "",
            mensagem: c.mensagem || c.texto || c.comentario || "",
            data: c.dataCriacao || c.criadoEm || c.createdAt || c.data || "",
            ativo: c.ativo !== false
        };
    }

    function comentarioEhMeu(c) {
        try {
            const usuario = typeof getUsuarioLogado === "function" ? getUsuarioLogado() : null;
            const emailAtual = String(usuario?.email || "").toLowerCase().trim();
            const nomeAtual = String(usuario?.nome || usuario?.name || "").toLowerCase().trim();
            const emailComentario = String(c.email || "").toLowerCase().trim();
            const nomeComentario = String(c.autor || "").toLowerCase().trim();
            return (emailAtual && emailAtual === emailComentario) || (nomeAtual && nomeAtual === nomeComentario);
        } catch (_) {
            return false;
        }
    }

    async function buscarComentarios(tarefaId) {
        const response = await fetch(`${API_URL}/api/tarefas/${tarefaId}/comentarios`, { headers: headersAuth() });
        if (typeof tratarSessao === "function") tratarSessao(response);
        if (!response.ok) {
            const erro = await response.text();
            console.error("V12 erro ao buscar comentários:", erro);
            throw new Error("Não foi possível carregar a conversa da tarefa.");
        }
        const dados = await response.json();
        return (Array.isArray(dados) ? dados : [])
            .map(normalizarComentario)
            .filter(c => c.ativo)
            .sort((a, b) => new Date(a.data || 0) - new Date(b.data || 0));
    }

    async function enviarComentario(tarefaId, mensagem) {
        const response = await fetch(`${API_URL}/api/tarefas/${tarefaId}/comentarios`, {
            method: "POST",
            headers: headersAuthJson(),
            body: JSON.stringify({ mensagem })
        });
        if (typeof tratarSessao === "function") tratarSessao(response);
        if (!response.ok) {
            const erro = await response.text();
            console.error("V12 erro ao enviar comentário:", erro);
            throw new Error("Erro ao enviar comentário.");
        }
        return response.status === 204 ? null : response.json().catch(() => null);
    }

    async function criarSubitemPelaMensagem(tarefaId, mensagem) {
        const tituloLimpo = String(mensagem || "")
            .replace(/^>.*$/gm, "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 120) || "Subitem criado pelo chat";

        const payload = {
            titulo: tituloLimpo,
            descricao: `Criado a partir de uma mensagem do chat da tarefa.`,
            responsavelId: null,
            status: "PENDENTE",
            prazo: null,
            diasUteisPrevistos: null,
            custoEstimado: null,
            custoReal: null,
            ordem: 999
        };

        const response = await fetch(`${API_URL}/api/tarefas/${tarefaId}/itens`, {
            method: "POST",
            headers: headersAuthJson(),
            body: JSON.stringify(payload)
        });
        if (typeof tratarSessao === "function") tratarSessao(response);
        if (!response.ok) {
            const erro = await response.text();
            console.error("V12 erro ao criar subitem pelo chat:", erro);
            throw new Error("Não foi possível criar o subitem.");
        }
        return response.status === 204 ? null : response.json().catch(() => null);
    }

    function criarNotificacao(base) {
        return {
            id: base.id,
            tipo: base.tipo || "info",
            origem: base.origem || "sistema",
            icone: base.icone || "🔔",
            titulo: base.titulo || "Notificação",
            texto: base.texto || "",
            detalhe: base.detalhe || "",
            tarefaId: base.tarefa?.id || base.tarefaId || "",
            tarefaTitulo: base.tarefa?.titulo || base.tarefaTitulo || "Tarefa",
            projeto: base.tarefa?.projetoNome || base.projeto || "",
            responsavel: base.tarefa?.responsavel || base.responsavel || "",
            data: base.data || "",
            prioridade: base.prioridade || 0,
            lida: estado.lidas.has(base.id),
            respondida: estado.respondidas.has(base.id)
        };
    }

    function notificacoesPorTarefas(tarefas) {
        const hoje = dataBaseHoje();
        const itens = [];

        (tarefas || []).filter(t => !estaFinalizada(t)).forEach(t => {
            if (t.prazo) {
                const prazo = new Date(`${t.prazo}T00:00:00`);
                const diff = Math.round((prazo - hoje) / 86400000);
                if (diff < 0) itens.push(criarNotificacao({ id: `prazo-atrasada-${t.id}`, tipo: "danger", origem: "prazo", icone: "⚠️", titulo: "Tarefa atrasada", texto: t.titulo, detalhe: `Atrasada há ${Math.abs(diff)} dia(s)`, tarefa: t, prioridade: 80 }));
                if (diff === 0) itens.push(criarNotificacao({ id: `prazo-hoje-${t.id}`, tipo: "warning", origem: "prazo", icone: "⏱️", titulo: "Vence hoje", texto: t.titulo, detalhe: t.responsavel || t.projetoNome || "", tarefa: t, prioridade: 70 }));
            }
            const prioridade = String(t.prioridade || "").toUpperCase();
            if (["ALTA", "URGENTE"].includes(prioridade)) itens.push(criarNotificacao({ id: `prioridade-${t.id}`, tipo: "danger", origem: "prioridade", icone: "🔥", titulo: "Alta prioridade", texto: t.titulo, detalhe: t.projetoNome || t.responsavel || "", tarefa: t, prioridade: 60 }));
        });

        return itens;
    }

    async function notificacoesDeComentarios(tarefas) {
        const candidatas = (tarefas || [])
            .filter(t => t?.id != null)
            .sort((a, b) => new Date(b.atualizadoEm || b.dataAtualizacao || b.dataCriacao || 0) - new Date(a.atualizadoEm || a.dataAtualizacao || a.dataCriacao || 0))
            .slice(0, 18);

        const resultados = await Promise.allSettled(candidatas.map(async tarefa => {
            const comentarios = await buscarComentarios(tarefa.id);
            const ultimo = comentarios[comentarios.length - 1];
            if (!ultimo) return null;
            return criarNotificacao({
                id: `chat-${tarefa.id}-${ultimo.id}`,
                tipo: "chat",
                origem: "chat",
                icone: "💬",
                titulo: `Comentário de ${ultimo.autor || "usuário"}`,
                texto: ultimo.mensagem || "Novo comentário na tarefa.",
                detalhe: "Responder ou abrir histórico da conversa.",
                tarefa,
                data: ultimo.data,
                prioridade: 100
            });
        }));

        return resultados
            .filter(r => r.status === "fulfilled" && r.value)
            .map(r => r.value);
    }

    async function atualizarNotificacoesV12(tarefas = obterTarefas()) {
        estado.carregandoNotificacoes = true;
        renderizarNotificacoes();

        const base = notificacoesPorTarefas(tarefas);
        let chats = [];
        try {
            chats = await notificacoesDeComentarios(tarefas);
        } catch (error) {
            console.warn("V12: comentários não carregados para notificações", error);
        }

        const mapa = new Map();
        [...chats, ...base]
            .sort((a, b) => (b.prioridade || 0) - (a.prioridade || 0))
            .forEach(n => { if (!mapa.has(n.id)) mapa.set(n.id, n); });

        estado.notificacoes = [...mapa.values()].slice(0, 30).map(n => ({ ...n, lida: estado.lidas.has(n.id), respondida: estado.respondidas.has(n.id) }));
        estado.ultimaAtualizacao = new Date();
        estado.carregandoNotificacoes = false;
        renderizarNotificacoes();
    }

    function visivel(n) {
        if (estado.filtro === "CHAT") return n.origem === "chat";
        if (estado.filtro === "CRITICAS") return ["danger", "warning"].includes(n.tipo);
        if (estado.filtro === "NAO_LIDAS") return !estado.lidas.has(n.id);
        return true;
    }

    function renderizarNotificacoes() {
        const painel = document.getElementById("painelNotificacoes");
        const lista = document.getElementById("listaNotificacoes");
        const badge = document.getElementById("badgeNotificacoes");
        if (!lista) return;

        painel?.classList.add("v12-notifications-panel");

        const totalNaoLidas = estado.notificacoes.filter(n => !estado.lidas.has(n.id)).length;
        const totalChat = estado.notificacoes.filter(n => n.origem === "chat").length;
        const totalCriticas = estado.notificacoes.filter(n => ["danger", "warning"].includes(n.tipo)).length;

        if (badge) {
            badge.innerText = totalNaoLidas;
            badge.classList.toggle("hidden", totalNaoLidas === 0);
        }

        const toolbar = `
            <div class="v12-notif-toolbar">
                <div class="v12-notif-tabs">
                    ${botaoFiltro("TODAS", "Todas", estado.notificacoes.length)}
                    ${botaoFiltro("CHAT", "Chat", totalChat)}
                    ${botaoFiltro("CRITICAS", "Críticas", totalCriticas)}
                    ${botaoFiltro("NAO_LIDAS", "Não lidas", totalNaoLidas)}
                </div>
                <div class="v12-notif-actions">
                    <button type="button" data-v12-refresh>Atualizar</button>
                    <button type="button" data-v12-mark-all>Marcar lidas</button>
                </div>
            </div>
            <div class="v12-storage-note">Chat sem localStorage: histórico e respostas vêm da API.</div>
        `;

        if (estado.carregandoNotificacoes) {
            lista.innerHTML = toolbar + `<div class="v12-loading"><span></span><span></span><span></span> Carregando notificações e conversas...</div>`;
            return;
        }

        const itens = estado.notificacoes.filter(visivel);
        if (!itens.length) {
            lista.innerHTML = toolbar + `<div class="v12-empty"><strong>Nenhuma notificação neste filtro.</strong><span>Abra o chat de uma tarefa ou atualize para buscar comentários recentes.</span></div>`;
            return;
        }

        lista.innerHTML = toolbar + itens.map(renderizarNotificacao).join("");
    }

    function botaoFiltro(valor, label, count) {
        return `<button type="button" class="${estado.filtro === valor ? "active" : ""}" data-v12-filter="${safe(valor)}">${safe(label)} <span>${count}</span></button>`;
    }

    function renderizarNotificacao(n) {
        const lida = estado.lidas.has(n.id);
        const respondida = estado.respondidas.has(n.id);
        const chips = [
            n.origem === "chat" ? `<span class="v12-chip chat">Chat</span>` : "",
            n.tipo === "danger" ? `<span class="v12-chip danger">Crítica</span>` : "",
            n.tipo === "warning" ? `<span class="v12-chip warning">Atenção</span>` : "",
            n.projeto ? `<span class="v12-chip">${safe(n.projeto)}</span>` : "",
            n.responsavel ? `<span class="v12-chip">${safe(n.responsavel)}</span>` : ""
        ].filter(Boolean).join("");

        return `
            <article class="v12-notif-card ${safe(n.tipo)} ${lida ? "read" : "unread"} ${respondida ? "replied" : ""}" data-v12-notification="${safe(n.id)}" data-task-id="${safe(n.tarefaId)}">
                <div class="v12-notif-icon">${safe(n.icone)}</div>
                <div class="v12-notif-main">
                    <div class="v12-notif-head">
                        <strong>${safe(n.titulo)}</strong>
                        <small>${safe(n.data ? formatarData(n.data) : "agora")}</small>
                    </div>
                    <span class="v12-task-title">${safe(n.tarefaTitulo)}</span>
                    <p>${destacarTexto(n.texto || "")}</p>
                    ${chips ? `<div class="v12-notif-chips">${chips}</div>` : ""}
                    <div class="v12-notif-buttons">
                        <button type="button" class="primary" data-v12-open-chat>Abrir chat</button>
                        <button type="button" data-v12-quick-reply>Responder</button>
                        <button type="button" data-v12-open-task>Abrir tarefa</button>
                        <button type="button" data-v12-read>${lida ? "Lida" : "Marcar lida"}</button>
                        ${respondida ? `<span class="v12-replied">Respondida</span>` : ""}
                    </div>
                    <form class="v12-inline-reply" data-v12-inline-form>
                        <textarea maxlength="1500" placeholder="Responder comentário nesta tarefa..."></textarea>
                        <div><small>Enter envia • Shift+Enter quebra linha</small><button type="submit">Enviar</button></div>
                    </form>
                </div>
            </article>
        `;
    }

    function destacarTexto(texto) {
        let html = safe(texto);
        html = html.replace(/(^|\s)(@[\wÀ-ÿ._-]+)/g, '$1<span class="v12-mention">$2</span>');
        PALAVRAS_CRITICAS.forEach(p => {
            const re = new RegExp(`\\b(${p})\\b`, "gi");
            html = html.replace(re, '<span class="v12-critical-word">$1</span>');
        });
        return html;
    }

    function garantirChatLateral() {
        let painel = document.getElementById("v12ChatPanel");
        if (painel) return painel;
        painel = document.createElement("aside");
        painel.id = "v12ChatPanel";
        painel.className = "v12-chat-panel hidden";
        painel.innerHTML = `
            <div class="v12-chat-header">
                <div>
                    <span>Chat da tarefa</span>
                    <strong id="v12ChatTitle">Selecione uma tarefa</strong>
                </div>
                <button type="button" data-v12-close-chat>×</button>
            </div>
            <div class="v12-chat-search-row">
                <input id="v12ChatSearch" type="search" placeholder="Buscar nesta conversa...">
                <button type="button" data-v12-chat-refresh>Atualizar</button>
            </div>
            <div id="v12ReplyContext" class="v12-reply-context hidden"></div>
            <div id="v12ChatThread" class="v12-chat-thread"></div>
            <div class="v12-suggestions">
                ${sugestoes.map(s => `<button type="button" data-v12-suggestion="${safe(s)}">${safe(s)}</button>`).join("")}
            </div>
            <form id="v12ChatForm" class="v12-chat-form">
                <textarea id="v12ChatInput" maxlength="1500" placeholder="Digite uma mensagem... Enter envia, Shift+Enter quebra linha"></textarea>
                <button type="submit">Enviar</button>
            </form>
        `;
        document.body.appendChild(painel);
        return painel;
    }

    async function abrirChat(tarefaId, marcarComoLidaId = null) {
        const tarefa = tarefaPorId(tarefaId);
        if (!tarefaId) return;
        estado.tarefaChatAberta = String(tarefaId);
        estado.respostaReferencia = null;
        if (marcarComoLidaId) estado.lidas.add(marcarComoLidaId);
        const painel = garantirChatLateral();
        painel.classList.remove("hidden");
        document.getElementById("v12ChatTitle").innerText = tarefa?.titulo || `Tarefa #${tarefaId}`;
        document.getElementById("v12ChatThread").innerHTML = `<div class="v12-chat-loading"><span></span><span></span><span></span> Carregando conversa real...</div>`;
        atualizarContextoResposta();
        renderizarNotificacoes();
        await carregarChatAtual(true);
    }

    async function carregarChatAtual() {
        if (!estado.tarefaChatAberta) return;
        try {
            estado.comentariosChat = await buscarComentarios(estado.tarefaChatAberta);
            renderizarChat();
        } catch (error) {
            document.getElementById("v12ChatThread").innerHTML = `<div class="v12-chat-error">${safe(error.message || "Erro ao carregar chat.")}</div>`;
        }
    }

    function renderizarChat() {
        const thread = document.getElementById("v12ChatThread");
        if (!thread) return;
        const termo = String(document.getElementById("v12ChatSearch")?.value || "").toLowerCase().trim();
        const comentarios = estado.comentariosChat.filter(c => !termo || `${c.autor} ${c.mensagem}`.toLowerCase().includes(termo));

        if (!comentarios.length) {
            thread.innerHTML = `<div class="v12-chat-empty">Nenhuma mensagem encontrada nesta conversa.</div>`;
            return;
        }

        let dataAtual = "";
        thread.innerHTML = comentarios.map(c => {
            const sep = separadorData(c.data);
            const separador = sep !== dataAtual ? (dataAtual = sep, `<div class="v12-date-separator">${safe(sep)}</div>`) : "";
            return separador + renderMensagem(c);
        }).join("");
        thread.scrollTop = thread.scrollHeight;
    }

    function renderMensagem(c) {
        const mine = comentarioEhMeu(c);
        const iniciais = String(c.autor || "U").split(/\s+/).slice(0, 2).map(p => p[0]).join("").toUpperCase() || "U";
        return `
            <div class="v12-message ${mine ? "mine" : "other"}" data-comment-id="${safe(c.id)}">
                <div class="v12-avatar">${safe(iniciais)}</div>
                <div class="v12-bubble">
                    <div class="v12-msg-meta"><strong>${safe(c.autor)}</strong><span>${safe(formatarData(c.data))}</span></div>
                    <div class="v12-msg-text">${destacarTexto(c.mensagem)}</div>
                    <div class="v12-msg-actions">
                        <button type="button" data-v12-reply-msg>Responder</button>
                        <button type="button" data-v12-copy-msg>Copiar</button>
                        <button type="button" data-v12-subitem-msg>Criar subitem</button>
                    </div>
                </div>
            </div>
        `;
    }

    function atualizarContextoResposta() {
        const ctx = document.getElementById("v12ReplyContext");
        if (!ctx) return;
        if (!estado.respostaReferencia) {
            ctx.classList.add("hidden");
            ctx.innerHTML = "";
            return;
        }
        ctx.classList.remove("hidden");
        ctx.innerHTML = `
            <div><strong>Respondendo a ${safe(estado.respostaReferencia.autor)}</strong><span>${safe(estado.respostaReferencia.mensagem.slice(0, 120))}</span></div>
            <button type="button" data-v12-clear-reply>Cancelar</button>
        `;
    }

    function montarMensagemComReferencia(texto) {
        const mensagem = texto.trim();
        if (!estado.respostaReferencia) return mensagem;
        const trecho = estado.respostaReferencia.mensagem.replace(/\s+/g, " ").trim().slice(0, 180);
        return `Respondendo a ${estado.respostaReferencia.autor}: "${trecho}"\n\n${mensagem}`;
    }

    async function enviarPeloChat(texto, botao = null) {
        if (!estado.tarefaChatAberta) return;
        const mensagemFinal = montarMensagemComReferencia(texto);
        if (!texto.trim()) {
            toast("Digite uma mensagem antes de enviar.", "erro");
            return;
        }
        const original = botao?.innerText;
        if (botao) { botao.disabled = true; botao.innerText = "Enviando..."; }
        try {
            await enviarComentario(estado.tarefaChatAberta, mensagemFinal);
            estado.respostaReferencia = null;
            const input = document.getElementById("v12ChatInput");
            if (input) input.value = "";
            atualizarContextoResposta();
            await carregarChatAtual();
            await atualizarNotificacoesV12();
            toast("Mensagem enviada.");
        } catch (error) {
            toast(error.message || "Erro ao enviar mensagem.", "erro");
        } finally {
            if (botao) { botao.disabled = false; botao.innerText = original || "Enviar"; }
        }
    }

    async function enviarRespostaInline(card, texto) {
        const tarefaId = card?.dataset.taskId;
        const notificationId = card?.dataset.v12Notification;
        if (!tarefaId || !texto.trim()) {
            toast("Digite uma resposta antes de enviar.", "erro");
            return;
        }
        const btn = card.querySelector("[data-v12-inline-form] button");
        const original = btn?.innerText;
        if (btn) { btn.disabled = true; btn.innerText = "Enviando..."; }
        try {
            await enviarComentario(tarefaId, texto.trim());
            if (notificationId) {
                estado.respondidas.add(notificationId);
                estado.lidas.add(notificationId);
            }
            toast("Resposta enviada nos comentários.");
            await atualizarNotificacoesV12();
            if (String(estado.tarefaChatAberta) === String(tarefaId)) await carregarChatAtual();
        } catch (error) {
            toast(error.message || "Erro ao responder.", "erro");
        } finally {
            if (btn) { btn.disabled = false; btn.innerText = original || "Enviar"; }
        }
    }

    async function transformarMensagemEmSubitem(elementoMensagem) {
        if (!estado.tarefaChatAberta || !elementoMensagem) return;
        const id = elementoMensagem.dataset.commentId;
        const comentario = estado.comentariosChat.find(c => String(c.id) === String(id));
        if (!comentario) return;
        try {
            await criarSubitemPelaMensagem(estado.tarefaChatAberta, comentario.mensagem);
            toast("Subitem criado a partir da mensagem.");
            if (typeof tarefaSelecionada !== "undefined" && tarefaSelecionada && String(tarefaSelecionada.id) === String(estado.tarefaChatAberta)) {
                if (typeof carregarSubitensTarefa === "function") await carregarSubitensTarefa(estado.tarefaChatAberta);
                if (typeof carregarHistoricoTarefa === "function") await carregarHistoricoTarefa(estado.tarefaChatAberta);
            }
        } catch (error) {
            toast(error.message || "Erro ao criar subitem.", "erro");
        }
    }

    function instalarEventos() {
        document.addEventListener("click", async (event) => {
            const filtro = event.target.closest?.("[data-v12-filter]");
            if (filtro) {
                estado.filtro = filtro.dataset.v12Filter || "TODAS";
                renderizarNotificacoes();
                return;
            }

            if (event.target.closest?.("[data-v12-refresh]")) {
                await atualizarNotificacoesV12();
                return;
            }

            if (event.target.closest?.("[data-v12-mark-all]")) {
                estado.notificacoes.forEach(n => estado.lidas.add(n.id));
                renderizarNotificacoes();
                return;
            }

            const card = event.target.closest?.("[data-v12-notification]");
            if (card) {
                const notificationId = card.dataset.v12Notification;
                const tarefaId = card.dataset.taskId;

                if (event.target.closest?.("[data-v12-open-chat]")) {
                    await abrirChat(tarefaId, notificationId);
                    return;
                }
                if (event.target.closest?.("[data-v12-quick-reply]")) {
                    const form = card.querySelector("[data-v12-inline-form]");
                    form?.classList.toggle("open");
                    form?.querySelector("textarea")?.focus();
                    return;
                }
                if (event.target.closest?.("[data-v12-open-task]")) {
                    estado.lidas.add(notificationId);
                    renderizarNotificacoes();
                    if (typeof abrirModalTarefa === "function") await abrirModalTarefa(Number(tarefaId));
                    return;
                }
                if (event.target.closest?.("[data-v12-read]")) {
                    estado.lidas.add(notificationId);
                    renderizarNotificacoes();
                    return;
                }
            }

            if (event.target.closest?.("[data-v12-close-chat]")) {
                document.getElementById("v12ChatPanel")?.classList.add("hidden");
                return;
            }
            if (event.target.closest?.("[data-v12-chat-refresh]")) {
                await carregarChatAtual();
                return;
            }
            if (event.target.closest?.("[data-v12-clear-reply]")) {
                estado.respostaReferencia = null;
                atualizarContextoResposta();
                return;
            }
            const sugestao = event.target.closest?.("[data-v12-suggestion]");
            if (sugestao) {
                const input = document.getElementById("v12ChatInput");
                if (input) { input.value = sugestao.dataset.v12Suggestion || ""; input.focus(); }
                return;
            }
            const msg = event.target.closest?.(".v12-message");
            if (msg && event.target.closest?.("[data-v12-reply-msg]")) {
                const comentario = estado.comentariosChat.find(c => String(c.id) === String(msg.dataset.commentId));
                if (comentario) {
                    estado.respostaReferencia = comentario;
                    atualizarContextoResposta();
                    document.getElementById("v12ChatInput")?.focus();
                }
                return;
            }
            if (msg && event.target.closest?.("[data-v12-copy-msg]")) {
                const comentario = estado.comentariosChat.find(c => String(c.id) === String(msg.dataset.commentId));
                if (comentario && navigator.clipboard) {
                    await navigator.clipboard.writeText(comentario.mensagem);
                    toast("Mensagem copiada.");
                }
                return;
            }
            if (msg && event.target.closest?.("[data-v12-subitem-msg]")) {
                await transformarMensagemEmSubitem(msg);
            }
        });

        document.addEventListener("submit", async (event) => {
            const inline = event.target.closest?.("[data-v12-inline-form]");
            if (inline) {
                event.preventDefault();
                const card = inline.closest("[data-v12-notification]");
                const textarea = inline.querySelector("textarea");
                await enviarRespostaInline(card, textarea?.value || "");
                return;
            }
            const formChat = event.target.closest?.("#v12ChatForm");
            if (formChat) {
                event.preventDefault();
                const input = document.getElementById("v12ChatInput");
                await enviarPeloChat(input?.value || "", formChat.querySelector("button"));
            }
        });

        document.addEventListener("keydown", async (event) => {
            const input = event.target.closest?.("#v12ChatInput, [data-v12-inline-form] textarea");
            if (!input) return;
            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                const form = input.closest("form");
                form?.requestSubmit();
            }
        });

        document.addEventListener("input", (event) => {
            if (event.target?.id === "v12ChatSearch") renderizarChat();
        });
    }

    function instalarOverrides() {
        if (typeof atualizarNotificacoesInternas === "function") {
            window.atualizarNotificacoesInternasOriginalV12 = atualizarNotificacoesInternas;
            atualizarNotificacoesInternas = function atualizarNotificacoesInternasV12(tarefas = []) {
                atualizarNotificacoesV12(tarefas);
            };
        }

        if (typeof alternarPainelNotificacoes === "function") {
            window.alternarPainelNotificacoesOriginalV12 = alternarPainelNotificacoes;
            alternarPainelNotificacoes = function alternarPainelNotificacoesV12() {
                window.alternarPainelNotificacoesOriginalV12();
                if (!document.getElementById("painelNotificacoes")?.classList.contains("hidden")) {
                    atualizarNotificacoesV12();
                }
            };
        }

        if (typeof fecharPainelNotificacoes === "function") {
            window.fecharPainelNotificacoesOriginalV12 = fecharPainelNotificacoes;
            fecharPainelNotificacoes = function fecharPainelNotificacoesV12() {
                window.fecharPainelNotificacoesOriginalV12();
            };
        }
    }

    function inicializar() {
        instalarEventos();
        instalarOverrides();
        garantirChatLateral();
        atualizarNotificacoesV12();
        console.info("UX V12: chat profissional ativado sem localStorage/sessionStorage para dados de chat.");
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inicializar);
    else inicializar();
})();
