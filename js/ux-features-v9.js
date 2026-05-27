/* =========================================================
   UX V9 - Notificações de chat/comentários com resposta rápida
   - Responde direto pela notificação usando a API de comentários existente.
   - Não altera banco, rotas, login, permissões ou regras do Kanban.
   ========================================================= */
(function () {
    "use strict";

    const STORAGE_READ = "taskflow_v9_notificacoes_lidas";
    const STORAGE_REPLIED = "taskflow_v9_notificacoes_respondidas";
    const STORAGE_COMMENT_CACHE = "taskflow_v9_comentarios_cache";

    let filtroAtual = "TODAS";
    let ultimoPacote = { itens: [], resumo: { total: 0, chat: 0, criticas: 0 } };

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

    const normalizarStatus = (status) => String(status || "").toUpperCase();

    const formatarDataCurta = (data) => {
        if (!data) return "";
        try {
            if (typeof formatarData === "function" && /^\d{4}-\d{2}-\d{2}$/.test(String(data))) return formatarData(data);
            if (typeof formatarDataHora === "function" && String(data).includes("T")) return formatarDataHora(data);
            return String(data).slice(0, 16).replace("T", " ");
        } catch {
            return String(data).slice(0, 16).replace("T", " ");
        }
    };

    const obterTarefas = () => {
        const lista = [];
        if (Array.isArray(window.todasTarefas)) lista.push(...window.todasTarefas);
        if (typeof todasTarefas !== "undefined" && Array.isArray(todasTarefas)) lista.push(...todasTarefas);
        const unicas = new Map();
        lista.forEach(t => { if (t && t.id != null) unicas.set(String(t.id), t); });
        return [...unicas.values()];
    };

    const tarefaPorId = (id) => obterTarefas().find(t => String(t.id) === String(id));

    function hojeBase() {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        return hoje;
    }

    function prazoInfo(tarefa) {
        if (!tarefa?.prazo) return { texto: "Sem prazo", classe: "neutro" };
        const hoje = hojeBase();
        const prazo = new Date(`${tarefa.prazo}T00:00:00`);
        const diff = Math.round((prazo - hoje) / 86400000);
        if (diff < 0) return { texto: `Atrasada há ${Math.abs(diff)} dia(s)`, classe: "danger" };
        if (diff === 0) return { texto: "Vence hoje", classe: "warning" };
        if (diff === 1) return { texto: "Vence amanhã", classe: "warning" };
        return { texto: `Prazo: ${formatarDataCurta(tarefa.prazo)}`, classe: "info" };
    }

    function cacheComentarios() {
        return getJSON(STORAGE_COMMENT_CACHE, {});
    }

    function salvarUltimoComentarioDaTarefa(tarefaId) {
        try {
            const lista = (typeof comentariosTarefaSelecionada !== "undefined" && Array.isArray(comentariosTarefaSelecionada))
                ? comentariosTarefaSelecionada.filter(c => c && c.ativo !== false)
                : [];
            if (!tarefaId || lista.length === 0) return;

            const ultimo = lista[lista.length - 1];
            const cache = cacheComentarios();
            cache[String(tarefaId)] = {
                tarefaId,
                texto: ultimo.mensagem || ultimo.texto || ultimo.comentario || "Novo comentário na tarefa.",
                autor: ultimo.autorNome || ultimo.usuarioNome || ultimo.autor || "Usuário",
                data: ultimo.dataCriacao || ultimo.criadoEm || ultimo.createdAt || new Date().toISOString()
            };
            setJSON(STORAGE_COMMENT_CACHE, cache);
        } catch (error) {
            console.warn("V9: não foi possível atualizar cache de comentários", error);
        }
    }

    function criarNotificacao({ id, tipo = "info", origem = "sistema", icone = "🔔", titulo, texto, detalhe, tarefa, prioridade = 0, data = "" }) {
        const tarefaId = tarefa?.id;
        return {
            id: id || `${origem}-${tarefaId || Math.random().toString(36).slice(2)}`,
            tipo,
            origem,
            icone,
            titulo: titulo || "Notificação",
            texto: texto || tarefa?.titulo || "",
            detalhe: detalhe || "",
            tarefaId,
            tarefaTitulo: tarefa?.titulo || "Tarefa",
            projeto: tarefa?.projetoNome || "",
            responsavel: tarefa?.responsavel || "",
            prazo: tarefa?.prazo || "",
            prioridade,
            data
        };
    }

    function montarNotificacoesV9(tarefas = obterTarefas()) {
        const hoje = hojeBase();
        const ativas = (tarefas || []).filter(t => !["CONCLUIDA", "CONCLUIDO", "CANCELADA", "CANCELADO"].includes(normalizarStatus(t.status)));
        const itens = [];

        const cache = cacheComentarios();
        Object.values(cache).forEach(c => {
            const tarefa = tarefaPorId(c.tarefaId);
            if (!tarefa) return;
            itens.push(criarNotificacao({
                id: `chat-${c.tarefaId}-${String(c.data || "").slice(0, 19)}`,
                tipo: "chat",
                origem: "chat",
                icone: "💬",
                titulo: `Comentário de ${c.autor || "usuário"}`,
                texto: c.texto || "Novo comentário na tarefa.",
                detalhe: "Você pode responder direto por aqui.",
                tarefa,
                prioridade: 100,
                data: c.data
            }));
        });

        ativas.forEach(tarefa => {
            const p = prazoInfo(tarefa);
            const prioridade = normalizarStatus(tarefa.prioridade);

            if (tarefa.prazo && new Date(`${tarefa.prazo}T00:00:00`) < hoje) {
                itens.push(criarNotificacao({
                    id: `atrasada-${tarefa.id}`,
                    tipo: "danger",
                    origem: "prazo",
                    icone: "⚠️",
                    titulo: "Tarefa atrasada",
                    texto: tarefa.titulo || "Sem título",
                    detalhe: p.texto,
                    tarefa,
                    prioridade: 80
                }));
            }

            if (tarefa.prazo && new Date(`${tarefa.prazo}T00:00:00`).getTime() === hoje.getTime()) {
                itens.push(criarNotificacao({
                    id: `hoje-${tarefa.id}`,
                    tipo: "warning",
                    origem: "prazo",
                    icone: "⏱️",
                    titulo: "Vence hoje",
                    texto: tarefa.titulo || "Sem título",
                    detalhe: tarefa.responsavel || tarefa.projetoNome || "",
                    tarefa,
                    prioridade: 70
                }));
            }

            if (["ALTA", "URGENTE"].includes(prioridade)) {
                itens.push(criarNotificacao({
                    id: `alta-${tarefa.id}`,
                    tipo: "danger",
                    origem: "prioridade",
                    icone: "🔥",
                    titulo: "Alta prioridade",
                    texto: tarefa.titulo || "Sem título",
                    detalhe: tarefa.projetoNome || tarefa.responsavel || "",
                    tarefa,
                    prioridade: 60
                }));
            }

            const possivelMensagem = tarefa.ultimoComentario || tarefa.ultimoComentarioTexto || tarefa.comentarioRecente || tarefa.ultimaMensagem || "";
            if (possivelMensagem) {
                itens.push(criarNotificacao({
                    id: `comentario-campo-${tarefa.id}`,
                    tipo: "chat",
                    origem: "chat",
                    icone: "💬",
                    titulo: "Comentário recente",
                    texto: possivelMensagem,
                    detalhe: "Responder no chat da tarefa",
                    tarefa,
                    prioridade: 90,
                    data: tarefa.dataUltimoComentario || tarefa.atualizadoEm || ""
                }));
            }
        });

        const lidas = getJSON(STORAGE_READ, {});
        const respondidas = getJSON(STORAGE_REPLIED, {});

        const unicos = new Map();
        itens
            .sort((a, b) => (b.prioridade || 0) - (a.prioridade || 0))
            .forEach(item => {
                if (!unicos.has(item.id)) {
                    item.lida = !!lidas[item.id];
                    item.respondida = !!respondidas[item.id];
                    unicos.set(item.id, item);
                }
            });

        const lista = [...unicos.values()].slice(0, 24);
        return {
            itens: lista,
            resumo: {
                total: lista.filter(n => !n.lida).length,
                chat: lista.filter(n => n.origem === "chat").length,
                criticas: lista.filter(n => ["danger", "warning"].includes(n.tipo)).length
            }
        };
    }

    function itemVisivel(item) {
        if (filtroAtual === "CHAT") return item.origem === "chat";
        if (filtroAtual === "CRITICAS") return ["danger", "warning"].includes(item.tipo);
        if (filtroAtual === "NAO_LIDAS") return !item.lida;
        return true;
    }

    function renderizarNotificacoesV9(tarefas = obterTarefas()) {
        ultimoPacote = montarNotificacoesV9(tarefas);
        const painel = document.getElementById("painelNotificacoes");
        const lista = document.getElementById("listaNotificacoes");
        const badge = document.getElementById("badgeNotificacoes");

        painel?.classList.add("v9-chat-notifications");
        painel?.classList.add("v8-notifications");

        if (badge) {
            badge.innerText = ultimoPacote.resumo.total;
            badge.classList.toggle("hidden", ultimoPacote.resumo.total === 0);
        }

        if (!lista) return;

        const visiveis = ultimoPacote.itens.filter(itemVisivel);
        const toolbar = `
            <div class="v9-notif-toolbar">
                <div class="v9-notif-tabs" role="tablist" aria-label="Filtros de notificações">
                    ${botaoFiltro("TODAS", "Todas", ultimoPacote.itens.length)}
                    ${botaoFiltro("CHAT", "Chat", ultimoPacote.resumo.chat)}
                    ${botaoFiltro("CRITICAS", "Críticas", ultimoPacote.resumo.criticas)}
                    ${botaoFiltro("NAO_LIDAS", "Não lidas", ultimoPacote.resumo.total)}
                </div>
                <div class="v9-notif-actions">
                    <button class="v9-link-button" type="button" data-v9-mark-all>Marcar lidas</button>
                </div>
            </div>
        `;

        if (visiveis.length === 0) {
            lista.innerHTML = toolbar + `
                <div class="v9-empty-chat">
                    <strong>Nenhuma notificação para este filtro.</strong>
                    <span>Quando houver comentários carregados ou tarefas críticas, eles aparecerão aqui.</span>
                </div>
            `;
            return;
        }

        lista.innerHTML = toolbar + visiveis.map(renderizarItem).join("");
    }

    function botaoFiltro(valor, texto, quantidade) {
        return `<button class="v9-notif-tab ${filtroAtual === valor ? "active" : ""}" type="button" data-v9-filter="${safe(valor)}">${safe(texto)} <span>${quantidade}</span></button>`;
    }

    function renderizarItem(n) {
        const readClass = n.lida ? "v9-read" : "";
        const repliedClass = n.respondida ? "v9-replied" : "";
        const chips = [
            n.origem === "chat" ? `<span class="v9-chip chat">💬 Chat</span>` : "",
            n.tipo === "danger" ? `<span class="v9-chip danger">Crítica</span>` : "",
            n.tipo === "warning" ? `<span class="v9-chip warning">Atenção</span>` : "",
            n.projeto ? `<span class="v9-chip">${safe(n.projeto)}</span>` : "",
            n.responsavel ? `<span class="v9-chip">${safe(n.responsavel)}</span>` : ""
        ].filter(Boolean).join("");

        return `
            <article class="v9-notification-card ${safe(n.tipo)} ${readClass} ${repliedClass}" data-v9-notification="${safe(n.id)}" data-task-id="${safe(n.tarefaId || "")}">
                <span class="v9-notif-icon">${safe(n.icone)}</span>
                <div class="v9-notif-content">
                    <div class="v9-notif-head">
                        <strong>${safe(n.titulo)}</strong>
                        <span class="v9-notif-time">${safe(n.data ? formatarDataCurta(n.data) : "agora")}</span>
                    </div>
                    <span class="v9-notif-title">${safe(n.tarefaTitulo)}</span>
                    <p class="v9-notif-preview">${safe(n.texto)}</p>
                    ${chips ? `<div class="v9-notif-meta">${chips}</div>` : ""}
                    <div class="v9-notif-buttons">
                        <button class="v9-mini-btn primary" type="button" data-v9-reply>Responder comentário</button>
                        <button class="v9-mini-btn" type="button" data-v9-open-task>Abrir tarefa</button>
                        <button class="v9-mini-btn" type="button" data-v9-read>${n.lida ? "Lida" : "Marcar lida"}</button>
                        ${n.respondida ? `<span class="v9-sent-stamp">Respondida</span>` : ""}
                    </div>
                    <form class="v9-quick-reply" data-v9-reply-form>
                        <textarea maxlength="1000" placeholder="Digite sua resposta para o chat/comentários desta tarefa..."></textarea>
                        <div class="v9-quick-reply-footer">
                            <small>Será salvo nos comentários da tarefa.</small>
                            <button class="v9-mini-btn success" type="submit">Enviar resposta</button>
                        </div>
                    </form>
                </div>
            </article>
        `;
    }

    function marcarLida(notificationId) {
        const lidas = getJSON(STORAGE_READ, {});
        lidas[notificationId] = true;
        setJSON(STORAGE_READ, lidas);
    }

    function marcarRespondida(notificationId) {
        const respondidas = getJSON(STORAGE_REPLIED, {});
        respondidas[notificationId] = true;
        setJSON(STORAGE_REPLIED, respondidas);
        marcarLida(notificationId);
    }

    function marcarTodasComoLidas() {
        const lidas = getJSON(STORAGE_READ, {});
        ultimoPacote.itens.forEach(n => { lidas[n.id] = true; });
        setJSON(STORAGE_READ, lidas);
        renderizarNotificacoesV9();
    }

    async function enviarRespostaRapida(tarefaId, mensagem, notificationId, botao) {
        if (!tarefaId) {
            mostrarToastSeguro("Não foi possível identificar a tarefa da notificação.", "erro");
            return;
        }
        if (!mensagem.trim()) {
            mostrarToastSeguro("Digite uma resposta antes de enviar.", "erro");
            return;
        }

        const textoOriginal = botao?.innerText;
        if (botao) {
            botao.disabled = true;
            botao.innerText = "Enviando...";
        }

        try {
            const response = await fetch(`${API_URL}/api/tarefas/${tarefaId}/comentarios`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...authHeaders()
                },
                body: JSON.stringify({ mensagem: mensagem.trim() })
            });

            if (typeof tratarSessao === "function") tratarSessao(response);

            if (!response.ok) {
                const erro = await response.text();
                console.error("V9 erro ao responder notificação:", erro);
                throw new Error("Erro ao enviar resposta pela notificação.");
            }

            marcarRespondida(notificationId);
            mostrarToastSeguro("Resposta enviada nos comentários da tarefa.");

            if (typeof tarefaSelecionada !== "undefined" && tarefaSelecionada && String(tarefaSelecionada.id) === String(tarefaId)) {
                if (typeof carregarComentariosTarefa === "function") await carregarComentariosTarefa(tarefaId);
                if (typeof carregarHistoricoTarefa === "function") await carregarHistoricoTarefa(tarefaId);
            }

            renderizarNotificacoesV9();
        } catch (error) {
            mostrarToastSeguro(error.message || "Erro ao enviar comentário.", "erro");
        } finally {
            if (botao) {
                botao.disabled = false;
                botao.innerText = textoOriginal || "Enviar resposta";
            }
        }
    }

    function mostrarToastSeguro(msg, tipo) {
        if (typeof mostrarToast === "function") mostrarToast(msg, tipo);
        else console.log(msg);
    }

    function instalarEventos() {
        document.addEventListener("click", async (event) => {
            const filtro = event.target.closest?.("[data-v9-filter]");
            if (filtro) {
                filtroAtual = filtro.dataset.v9Filter || "TODAS";
                renderizarNotificacoesV9();
                return;
            }

            if (event.target.closest?.("[data-v9-mark-all]")) {
                marcarTodasComoLidas();
                return;
            }

            const card = event.target.closest?.("[data-v9-notification]");
            if (!card) return;

            const notificationId = card.dataset.v9Notification;
            const tarefaId = card.dataset.taskId;

            if (event.target.closest?.("[data-v9-reply]")) {
                const form = card.querySelector("[data-v9-reply-form]");
                document.querySelectorAll(".v9-quick-reply.open").forEach(el => {
                    if (el !== form) el.classList.remove("open");
                });
                form?.classList.toggle("open");
                form?.querySelector("textarea")?.focus();
                return;
            }

            if (event.target.closest?.("[data-v9-open-task]")) {
                marcarLida(notificationId);
                renderizarNotificacoesV9();
                if (typeof abrirModalTarefa === "function") await abrirModalTarefa(Number(tarefaId));
                return;
            }

            if (event.target.closest?.("[data-v9-read]")) {
                marcarLida(notificationId);
                renderizarNotificacoesV9();
            }
        });

        document.addEventListener("submit", (event) => {
            const form = event.target.closest?.("[data-v9-reply-form]");
            if (!form) return;
            event.preventDefault();
            const card = form.closest("[data-v9-notification]");
            const tarefaId = card?.dataset.taskId;
            const notificationId = card?.dataset.v9Notification;
            const textarea = form.querySelector("textarea");
            const botao = form.querySelector("button[type='submit']");
            enviarRespostaRapida(tarefaId, textarea?.value || "", notificationId, botao);
        });
    }

    function instalarOverrides() {
        if (typeof atualizarNotificacoesInternas === "function") {
            window.atualizarNotificacoesInternasOriginalV9 = atualizarNotificacoesInternas;
            atualizarNotificacoesInternas = function atualizarNotificacoesInternasV9(tarefas = []) {
                renderizarNotificacoesV9(tarefas);
            };
        }

        if (typeof alternarPainelNotificacoes === "function") {
            window.alternarPainelNotificacoesOriginalV9 = alternarPainelNotificacoes;
            alternarPainelNotificacoes = function alternarPainelNotificacoesV9() {
                renderizarNotificacoesV9();
                window.alternarPainelNotificacoesOriginalV9();
            };
        }

        if (typeof carregarComentariosTarefa === "function") {
            window.carregarComentariosTarefaOriginalV9 = carregarComentariosTarefa;
            carregarComentariosTarefa = async function carregarComentariosTarefaV9(tarefaId) {
                await window.carregarComentariosTarefaOriginalV9(tarefaId);
                salvarUltimoComentarioDaTarefa(tarefaId);
                renderizarNotificacoesV9();
            };
        }
    }

    function inicializar() {
        instalarEventos();
        instalarOverrides();
        renderizarNotificacoesV9();
        console.info("UX V9: notificações com resposta rápida ativadas.");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", inicializar);
    } else {
        inicializar();
    }
})();
