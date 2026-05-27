/* =========================================================
   UX V11 - Chat inteligente em notificações
   - Busca no histórico de conversa.
   - Separador por data.
   - Reações rápidas visuais salvas no localStorage.
   - Transformar mensagem em subitem usando rota existente.
   - Enter envia resposta rápida; Shift+Enter quebra linha.
   - Não altera login, permissões, Kanban, tarefas ou banco.
   ========================================================= */
(function () {
    "use strict";

    const STORAGE_REACTIONS = "taskflow_v11_reacoes_chat";
    const STORAGE_SUBITEMS_FROM_CHAT = "taskflow_v11_subitens_chat";
    let observerInstalado = false;

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

    function toast(msg, tipo) {
        if (typeof mostrarToast === "function") mostrarToast(msg, tipo);
        else console.log(msg);
    }

    function hashTexto(texto) {
        const str = String(texto || "");
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash).toString(36);
    }

    function keyMensagem(messageEl) {
        const card = messageEl.closest(".v9-notification-card[data-task-id]");
        const tarefaId = card?.dataset.taskId || "sem-tarefa";
        const texto = messageEl.querySelector(".v10-chat-bubble p")?.textContent || "";
        const autor = messageEl.querySelector(".v10-chat-meta strong")?.textContent || "";
        const data = messageEl.querySelector(".v10-chat-meta span")?.textContent || "";
        return `${tarefaId}:${hashTexto(`${autor}|${data}|${texto}`)}`;
    }

    function diaDaMensagem(messageEl) {
        const bruto = messageEl.querySelector(".v10-chat-meta span")?.textContent?.trim() || "Sem data";
        if (!bruto || bruto.toLowerCase() === "agora") return "Hoje";
        if (bruto.includes("/")) return bruto.split(/[ ,]/)[0];
        if (bruto.includes("-")) return bruto.slice(0, 10);
        return bruto.slice(0, 10) || "Sem data";
    }

    function destacarMencoes(messageEl) {
        const p = messageEl.querySelector(".v10-chat-bubble p");
        if (!p || p.dataset.v11Mentions === "1") return;
        const texto = p.textContent || "";
        const html = safe(texto).replace(/(^|\s)(@[\wÀ-ÿ._-]+)/g, '$1<span class="v11-mention">$2</span>');
        p.innerHTML = html;
        p.dataset.v11Mentions = "1";
    }

    function adicionarAcoesMensagem(messageEl) {
        const bubble = messageEl.querySelector(".v10-chat-bubble");
        if (!bubble || bubble.querySelector(".v11-message-actions")) return;

        const key = keyMensagem(messageEl);
        const reacoes = getJSON(STORAGE_REACTIONS, {});
        const reacoesMsg = reacoes[key] || {};
        const emojis = ["👍", "✅", "👀", "⚠️"];

        const wrap = document.createElement("div");
        wrap.className = "v11-message-actions";
        wrap.innerHTML = `
            <div class="v11-reactions" aria-label="Reações rápidas">
                ${emojis.map(emoji => {
                    const qtd = Number(reacoesMsg[emoji] || 0);
                    const active = qtd > 0 ? "active" : "";
                    return `<button type="button" class="v11-reaction-btn ${active}" data-v11-reaction="${emoji}" title="Reagir com ${emoji}">${emoji}${qtd ? ` <span>${qtd}</span>` : ""}</button>`;
                }).join("")}
            </div>
            <button type="button" class="v11-subitem-btn" data-v11-create-subitem>+ Criar subitem</button>
        `;
        bubble.appendChild(wrap);
    }

    function adicionarSeparadores(thread) {
        thread.querySelectorAll(".v11-date-separator, .v11-chat-empty-search").forEach(el => el.remove());
        let ultimoDia = "";
        thread.querySelectorAll(".v10-chat-message").forEach(msg => {
            const dia = diaDaMensagem(msg);
            if (dia !== ultimoDia) {
                const sep = document.createElement("div");
                sep.className = "v11-date-separator";
                sep.textContent = dia;
                msg.insertAdjacentElement("beforebegin", sep);
                ultimoDia = dia;
            }
        });
    }

    function adicionarBusca(historyEl) {
        const header = historyEl.querySelector(".v10-chat-header");
        if (!header || header.querySelector("[data-v11-chat-search]")) return;

        const tools = document.createElement("div");
        tools.className = "v11-chat-tools";
        tools.innerHTML = `
            <input type="search" class="v11-chat-search" data-v11-chat-search placeholder="Buscar nesta conversa...">
            <span class="v11-chat-count" data-v11-chat-count></span>
        `;
        header.appendChild(tools);
        atualizarContadorBusca(historyEl);
    }

    function atualizarContadorBusca(historyEl) {
        const count = historyEl.querySelector("[data-v11-chat-count]");
        const total = historyEl.querySelectorAll(".v10-chat-message").length;
        const visiveis = historyEl.querySelectorAll(".v10-chat-message:not(.v11-hidden)").length;
        if (count) count.textContent = total ? `${visiveis}/${total} mensagens` : "Sem mensagens";
    }

    function filtrarHistorico(input) {
        const history = input.closest(".v10-chat-history");
        const thread = history?.querySelector(".v10-chat-thread");
        if (!history || !thread) return;

        const termo = input.value.trim().toLowerCase();
        let visiveis = 0;
        thread.querySelectorAll(".v10-chat-message").forEach(msg => {
            const texto = msg.textContent.toLowerCase();
            const match = !termo || texto.includes(termo);
            msg.classList.toggle("v11-hidden", !match);
            msg.classList.toggle("v11-match", !!termo && match);
            if (match) visiveis++;
        });

        thread.querySelectorAll(".v11-date-separator").forEach(sep => {
            let next = sep.nextElementSibling;
            let temMensagemVisivel = false;
            while (next && !next.classList.contains("v11-date-separator")) {
                if (next.classList?.contains("v10-chat-message") && !next.classList.contains("v11-hidden")) {
                    temMensagemVisivel = true;
                    break;
                }
                next = next.nextElementSibling;
            }
            sep.style.display = temMensagemVisivel ? "flex" : "none";
        });

        thread.querySelector(".v11-chat-empty-search")?.remove();
        if (termo && visiveis === 0) {
            const empty = document.createElement("div");
            empty.className = "v11-chat-empty-search";
            empty.textContent = "Nenhuma mensagem encontrada com esse termo.";
            thread.appendChild(empty);
        }
        atualizarContadorBusca(history);
    }

    function melhorarHistorico(historyEl) {
        if (!historyEl || historyEl.dataset.v11Enhanced === "1") {
            // Mesmo já melhorado, novas mensagens podem ter entrado.
        }
        adicionarBusca(historyEl);
        const thread = historyEl.querySelector(".v10-chat-thread");
        if (!thread) return;

        thread.querySelectorAll(".v10-chat-message").forEach(msg => {
            destacarMencoes(msg);
            adicionarAcoesMensagem(msg);
        });
        adicionarSeparadores(thread);
        historyEl.dataset.v11Enhanced = "1";
        const input = historyEl.querySelector("[data-v11-chat-search]");
        if (input && input.value.trim()) filtrarHistorico(input);
        else atualizarContadorBusca(historyEl);
    }

    function melhorarCardsNotificacao() {
        document.querySelectorAll(".v9-notification-card[data-v9-notification]").forEach(card => {
            if (!card.classList.contains("v9-read") && !card.querySelector(".v11-unread-badge")) {
                const meta = card.querySelector(".v9-notif-meta") || card.querySelector(".v9-notif-preview");
                const badge = document.createElement("span");
                badge.className = "v11-unread-badge";
                badge.textContent = "● Não lida";
                meta?.insertAdjacentElement("afterend", badge);
            }
            if (card.classList.contains("v9-read")) {
                card.querySelector(".v11-unread-badge")?.remove();
            }
        });
    }

    async function criarSubitemPelaMensagem(button) {
        const msg = button.closest(".v10-chat-message");
        const card = button.closest(".v9-notification-card[data-task-id]");
        const tarefaId = card?.dataset.taskId;
        const texto = msg?.querySelector(".v10-chat-bubble p")?.textContent?.trim() || "";

        if (!tarefaId || !texto) {
            toast("Não foi possível identificar a tarefa ou a mensagem.", "erro");
            return;
        }

        const criados = getJSON(STORAGE_SUBITEMS_FROM_CHAT, {});
        const msgKey = keyMensagem(msg);
        if (criados[msgKey]) {
            toast("Este comentário já foi transformado em subitem nesta sessão.", "info");
            return;
        }

        const tituloBase = texto.replace(/\s+/g, " ").slice(0, 90);
        const payload = {
            titulo: tituloBase.length > 87 ? `${tituloBase.slice(0, 87)}...` : tituloBase,
            descricao: `Criado a partir de uma mensagem do chat/comentários:\n\n${texto}`,
            responsavelId: null,
            status: "PENDENTE",
            prazo: null,
            diasUteisPrevistos: null,
            custoEstimado: null,
            custoReal: null,
            ordem: 999
        };

        const textoOriginal = button.textContent;
        button.disabled = true;
        button.textContent = "Criando...";

        try {
            const response = await fetch(`${API_URL}/api/tarefas/${tarefaId}/itens`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...authHeaders()
                },
                body: JSON.stringify(payload)
            });

            if (typeof tratarSessao === "function") tratarSessao(response);
            if (!response.ok) {
                const erro = await response.text();
                console.error("V11 erro ao criar subitem pela conversa:", erro);
                throw new Error("Erro ao criar subitem a partir do chat.");
            }

            criados[msgKey] = true;
            setJSON(STORAGE_SUBITEMS_FROM_CHAT, criados);
            button.textContent = "Subitem criado";
            button.classList.add("active");
            toast("Subitem criado a partir da mensagem.");

            if (typeof tarefaSelecionada !== "undefined" && tarefaSelecionada && String(tarefaSelecionada.id) === String(tarefaId)) {
                if (typeof carregarSubitensTarefa === "function") await carregarSubitensTarefa(tarefaId);
                if (typeof carregarHistoricoTarefa === "function") await carregarHistoricoTarefa(tarefaId);
            }
        } catch (error) {
            toast(error.message || "Erro ao criar subitem.", "erro");
            button.disabled = false;
            button.textContent = textoOriginal || "+ Criar subitem";
        }
    }

    function alternarReacao(button) {
        const msg = button.closest(".v10-chat-message");
        if (!msg) return;
        const emoji = button.dataset.v11Reaction;
        const key = keyMensagem(msg);
        const all = getJSON(STORAGE_REACTIONS, {});
        all[key] = all[key] || {};
        all[key][emoji] = all[key][emoji] ? 0 : 1;
        if (!all[key][emoji]) delete all[key][emoji];
        setJSON(STORAGE_REACTIONS, all);

        const container = button.closest(".v11-reactions");
        if (container) container.remove();
        adicionarAcoesMensagem(msg);
    }

    function instalarEventos() {
        document.addEventListener("input", (event) => {
            const input = event.target.closest?.("[data-v11-chat-search]");
            if (input) filtrarHistorico(input);
        });

        document.addEventListener("click", (event) => {
            const reaction = event.target.closest?.("[data-v11-reaction]");
            if (reaction) {
                event.preventDefault();
                event.stopPropagation();
                alternarReacao(reaction);
                return;
            }

            const subitemBtn = event.target.closest?.("[data-v11-create-subitem]");
            if (subitemBtn) {
                event.preventDefault();
                event.stopPropagation();
                criarSubitemPelaMensagem(subitemBtn);
                return;
            }

            if (event.target.closest?.("[data-v9-read]")) {
                setTimeout(melhorarCardsNotificacao, 200);
            }
        });

        document.addEventListener("keydown", (event) => {
            const textarea = event.target.closest?.("[data-v9-reply-form] textarea");
            if (!textarea) return;
            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                const form = textarea.closest("form");
                form?.requestSubmit?.();
            }
        });
    }

    function melhorarHintsResposta() {
        document.querySelectorAll("[data-v9-reply-form]").forEach(form => {
            if (form.querySelector(".v11-reply-hint")) return;
            const small = form.querySelector("small");
            const hint = document.createElement("span");
            hint.className = "v11-reply-hint";
            hint.textContent = "Enter envia • Shift+Enter quebra linha";
            small?.insertAdjacentElement("afterend", hint);
        });
    }

    function varrerMelhorias() {
        document.querySelectorAll(".v10-chat-history.open, .v10-chat-history").forEach(melhorarHistorico);
        melhorarCardsNotificacao();
        melhorarHintsResposta();
    }

    function instalarObserver() {
        if (observerInstalado) return;
        observerInstalado = true;
        const alvo = document.getElementById("listaNotificacoes") || document.body;
        const observer = new MutationObserver(() => window.requestAnimationFrame(varrerMelhorias));
        observer.observe(alvo, { childList: true, subtree: true });
        varrerMelhorias();
        setInterval(varrerMelhorias, 2500);
    }

    function inicializar() {
        instalarEventos();
        instalarObserver();
        console.info("UX V11: chat inteligente nas notificações ativado.");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", inicializar);
    } else {
        inicializar();
    }
})();
