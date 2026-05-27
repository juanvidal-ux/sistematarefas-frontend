/* =========================================================
   UX V10 - Histórico de conversa dentro das notificações
   - Mostra comentários da tarefa direto no painel de notificações.
   - Usa somente GET/POST já existentes de comentários.
   - Não altera login, permissões, rotas principais ou regras do Kanban.
   ========================================================= */
(function () {
    "use strict";

    const CACHE_KEY = "taskflow_v10_historico_comentarios";
    const OPEN_KEY = "taskflow_v10_historicos_abertos";
    let observadorAtivo = false;

    const safe = (value) => {
        if (typeof escapeHtml === "function") return escapeHtml(value ?? "");
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    };

    const getJSON = (key, fallback) => {
        try { return JSON.parse(localStorage.getItem(key) || ""); }
        catch { return fallback; }
    };

    const setJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));

    function mostrarToastSeguro(msg, tipo) {
        if (typeof mostrarToast === "function") mostrarToast(msg, tipo);
        else console.log(msg);
    }

    function formatarDataMensagem(data) {
        if (!data) return "Agora";
        try {
            if (typeof formatarDataHora === "function") return formatarDataHora(data);
            return String(data).slice(0, 16).replace("T", " ");
        } catch {
            return String(data).slice(0, 16).replace("T", " ");
        }
    }

    function normalizarComentario(comentario) {
        return {
            id: comentario.id || `${Date.now()}-${Math.random()}`,
            autor: comentario.autorNome || comentario.usuarioNome || comentario.autor || "Usuário",
            email: comentario.autorEmail || comentario.usuarioEmail || "",
            mensagem: comentario.mensagem || comentario.texto || comentario.comentario || "",
            data: comentario.dataCriacao || comentario.criadoEm || comentario.createdAt || comentario.data || "",
            ativo: comentario.ativo !== false
        };
    }

    function comentarioEhMeu(comentario) {
        try {
            const usuario = typeof getUsuarioLogado === "function" ? getUsuarioLogado() : null;
            const emailAtual = String(usuario?.email || "").toLowerCase().trim();
            const nomeAtual = String(usuario?.nome || usuario?.name || "").toLowerCase().trim();
            const emailComentario = String(comentario.email || "").toLowerCase().trim();
            const nomeComentario = String(comentario.autor || "").toLowerCase().trim();
            return (emailAtual && emailAtual === emailComentario) || (nomeAtual && nomeAtual === nomeComentario);
        } catch {
            return false;
        }
    }

    function obterCache(tarefaId) {
        const cache = getJSON(CACHE_KEY, {});
        return Array.isArray(cache[String(tarefaId)]) ? cache[String(tarefaId)] : [];
    }

    function salvarCache(tarefaId, comentarios) {
        const cache = getJSON(CACHE_KEY, {});
        cache[String(tarefaId)] = comentarios;
        setJSON(CACHE_KEY, cache);
    }

    async function buscarHistorico(tarefaId, forcarAtualizacao = false) {
        const emCache = obterCache(tarefaId);
        if (!forcarAtualizacao && emCache.length) return emCache;

        const response = await fetch(`${API_URL}/api/tarefas/${tarefaId}/comentarios`, {
            headers: { ...authHeaders() }
        });

        if (typeof tratarSessao === "function") tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("V10 erro ao carregar histórico de conversa:", erro);
            throw new Error("Não foi possível carregar o histórico de conversa.");
        }

        const dados = await response.json();
        const comentarios = (Array.isArray(dados) ? dados : [])
            .map(normalizarComentario)
            .filter(c => c.ativo)
            .sort((a, b) => new Date(a.data || 0) - new Date(b.data || 0));

        salvarCache(tarefaId, comentarios);
        return comentarios;
    }

    function historicosAbertos() {
        return getJSON(OPEN_KEY, {});
    }

    function definirHistoricoAberto(tarefaId, aberto) {
        const estado = historicosAbertos();
        if (aberto) estado[String(tarefaId)] = true;
        else delete estado[String(tarefaId)];
        setJSON(OPEN_KEY, estado);
    }

    function renderHistorico(card, tarefaId, comentarios, carregando = false) {
        let area = card.querySelector("[data-v10-chat-history]");
        if (!area) {
            area = document.createElement("section");
            area.className = "v10-chat-history";
            area.setAttribute("data-v10-chat-history", "");
            const form = card.querySelector("[data-v9-reply-form]");
            if (form) form.insertAdjacentElement("beforebegin", area);
            else card.querySelector(".v9-notif-content")?.appendChild(area);
        }

        if (carregando) {
            area.innerHTML = `
                <div class="v10-chat-loading">
                    <span></span><span></span><span></span>
                    Carregando conversa...
                </div>
            `;
            area.classList.add("open");
            return;
        }

        const ultimos = comentarios.slice(-8);
        const totalExtra = Math.max(0, comentarios.length - ultimos.length);

        area.innerHTML = `
            <div class="v10-chat-header">
                <div>
                    <strong>Histórico da conversa</strong>
                    <small>${comentarios.length} ${comentarios.length === 1 ? "mensagem" : "mensagens"} nesta tarefa</small>
                </div>
                <button type="button" class="v10-refresh-chat" data-v10-refresh>Atualizar</button>
            </div>
            ${totalExtra ? `<div class="v10-chat-more">Mostrando as últimas ${ultimos.length}. Abra a tarefa para ver tudo.</div>` : ""}
            <div class="v10-chat-thread">
                ${ultimos.length ? ultimos.map(renderMensagem).join("") : `
                    <div class="v10-chat-empty">
                        Ainda não há comentários nesta tarefa. Responda abaixo para iniciar a conversa.
                    </div>
                `}
            </div>
        `;
        area.classList.add("open");
        const thread = area.querySelector(".v10-chat-thread");
        if (thread) thread.scrollTop = thread.scrollHeight;
    }

    function renderMensagem(comentario) {
        const minha = comentarioEhMeu(comentario) ? "mine" : "other";
        const iniciais = String(comentario.autor || "U")
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(p => p[0])
            .join("")
            .toUpperCase() || "U";

        return `
            <div class="v10-chat-message ${minha}">
                <div class="v10-chat-avatar">${safe(iniciais)}</div>
                <div class="v10-chat-bubble">
                    <div class="v10-chat-meta">
                        <strong>${safe(comentario.autor)}</strong>
                        <span>${safe(formatarDataMensagem(comentario.data))}</span>
                    </div>
                    <p>${safe(comentario.mensagem)}</p>
                </div>
            </div>
        `;
    }

    function prepararCards() {
        document.querySelectorAll(".v9-notification-card[data-task-id]").forEach(card => {
            const tarefaId = card.dataset.taskId;
            if (!tarefaId) return;

            const botoes = card.querySelector(".v9-notif-buttons");
            if (botoes && !botoes.querySelector("[data-v10-toggle-history]")) {
                const botao = document.createElement("button");
                botao.className = "v9-mini-btn v10-history-btn";
                botao.type = "button";
                botao.setAttribute("data-v10-toggle-history", "");
                botao.textContent = "Histórico";
                const responder = botoes.querySelector("[data-v9-reply]");
                if (responder) responder.insertAdjacentElement("afterend", botao);
                else botoes.prepend(botao);
            }

            const aberto = !!historicosAbertos()[String(tarefaId)];
            if (aberto && !card.querySelector("[data-v10-chat-history]")) {
                const cache = obterCache(tarefaId);
                if (cache.length) renderHistorico(card, tarefaId, cache);
            }
        });
    }

    async function alternarHistorico(card, forcarAtualizacao = false) {
        const tarefaId = card.dataset.taskId;
        if (!tarefaId) return;

        const area = card.querySelector("[data-v10-chat-history]");
        const jaAberto = area?.classList.contains("open");

        if (jaAberto && !forcarAtualizacao) {
            area.classList.remove("open");
            definirHistoricoAberto(tarefaId, false);
            return;
        }

        definirHistoricoAberto(tarefaId, true);
        renderHistorico(card, tarefaId, obterCache(tarefaId), true);

        try {
            const comentarios = await buscarHistorico(tarefaId, forcarAtualizacao);
            renderHistorico(card, tarefaId, comentarios);
        } catch (error) {
            mostrarToastSeguro(error.message || "Erro ao carregar conversa.", "erro");
            renderHistorico(card, tarefaId, obterCache(tarefaId));
        }
    }

    function instalarEventosV10() {
        document.addEventListener("click", async (event) => {
            const botaoHistorico = event.target.closest?.("[data-v10-toggle-history]");
            if (botaoHistorico) {
                event.preventDefault();
                event.stopPropagation();
                const card = botaoHistorico.closest(".v9-notification-card[data-task-id]");
                if (card) await alternarHistorico(card);
                return;
            }

            const botaoAtualizar = event.target.closest?.("[data-v10-refresh]");
            if (botaoAtualizar) {
                event.preventDefault();
                event.stopPropagation();
                const card = botaoAtualizar.closest(".v9-notification-card[data-task-id]");
                if (card) await alternarHistorico(card, true);
            }
        });

        document.addEventListener("submit", (event) => {
            const form = event.target.closest?.("[data-v9-reply-form]");
            if (!form) return;
            const card = form.closest(".v9-notification-card[data-task-id]");
            if (!card) return;

            const tarefaId = card.dataset.taskId;
            setTimeout(async () => {
                const textarea = form.querySelector("textarea");
                if (textarea && textarea.value.trim()) return;
                try {
                    const comentarios = await buscarHistorico(tarefaId, true);
                    renderHistorico(card, tarefaId, comentarios);
                } catch {
                    // A própria V9 já trata erro de envio; aqui só tentamos atualizar visualmente.
                }
            }, 900);
        });
    }

    function instalarObserver() {
        if (observadorAtivo) return;
        observadorAtivo = true;
        const alvo = document.getElementById("listaNotificacoes") || document.body;
        const observer = new MutationObserver(() => prepararCards());
        observer.observe(alvo, { childList: true, subtree: true });
        prepararCards();
    }

    function inicializar() {
        instalarEventosV10();
        instalarObserver();
        console.info("UX V10: histórico de conversa nas notificações ativado.");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", inicializar);
    } else {
        inicializar();
    }
})();
