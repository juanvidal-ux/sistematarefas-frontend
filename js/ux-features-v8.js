/* =========================================================
   UX V8 - melhorias visuais e de usabilidade sem alterar API
   ========================================================= */
(function () {
    "use strict";

    const safe = (value) => {
        if (typeof escapeHtml === "function") return escapeHtml(value ?? "");
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    };

    const fmt = (value) => {
        if (typeof formatarTexto === "function") return formatarTexto(value);
        return String(value || "-").replaceAll("_", " ").toLowerCase();
    };

    const initials = (name) => {
        if (typeof obterIniciais === "function") return obterIniciais(name || "U");
        return String(name || "U").split(/\s+/).slice(0, 2).map(p => p[0]).join("").toUpperCase();
    };

    const prazoInfoSeguro = (tarefa) => {
        if (typeof obterInfoPrazo === "function") return obterInfoPrazo(tarefa?.prazo, tarefa?.status);
        return { classe: "", texto: tarefa?.prazo || "Sem prazo" };
    };

    function calcularProgressoVisual(tarefa) {
        const status = String(tarefa?.status || "").toUpperCase();
        if (status === "CONCLUIDA" || status === "CONCLUIDO") return 100;
        if (status === "EM_ANDAMENTO") return 55;
        if (status === "CANCELADA" || status === "CANCELADO") return 0;
        return 18;
    }

    function badgesDaTarefa(tarefa, prazoInfo) {
        const badges = [];
        const prioridade = String(tarefa?.prioridade || "").toUpperCase();
        const status = String(tarefa?.status || "").toUpperCase();

        if (prazoInfo?.classe === "prazo-vencido") badges.push(`<span class="v8-badge danger">⚠️ Vencida</span>`);
        if (prazoInfo?.classe === "prazo-hoje") badges.push(`<span class="v8-badge warning">⏱️ Hoje</span>`);
        if (["ALTA", "URGENTE"].includes(prioridade)) badges.push(`<span class="v8-badge danger">🔥 Prioridade alta</span>`);
        if (status === "CONCLUIDA" || status === "CONCLUIDO") badges.push(`<span class="v8-badge success">✓ Concluída</span>`);
        if (tarefa?.projetoNome) badges.push(`<span class="v8-badge neutral">📁 Projeto</span>`);
        if (tarefa?.observacoes) badges.push(`<span class="v8-badge neutral">📝 Observação</span>`);

        return badges.slice(0, 4).join("");
    }

    function instalarCardsV8() {
        if (typeof window.__v8CardsInstalado !== "undefined") return;
        window.__v8CardsInstalado = true;

        if (typeof criarCardTarefa !== "function") return;

        window.criarCardTarefaOriginalV8 = criarCardTarefa;

        criarCardTarefa = function criarCardTarefaV8(tarefa) {
            const prazoInfo = prazoInfoSeguro(tarefa);
            const compacto = typeof modoCartao !== "undefined" && modoCartao === "COMPACTO";
            const progresso = calcularProgressoVisual(tarefa);
            const prioridade = String(tarefa?.prioridade || "MEDIA").toUpperCase();
            const responsavel = tarefa?.responsavel || "Usuário";
            const projeto = tarefa?.projetoNome || "Sem projeto";
            const status = String(tarefa?.status || "").toUpperCase();

            const botoes = compacto ? "" : `
                <div class="task-actions" onclick="event.stopPropagation()">
                    ${typeof botaoMover === "function" ? botaoMover(tarefa, "PENDENTE", "Voltar") : ""}
                    ${typeof botaoMover === "function" ? botaoMover(tarefa, "EM_ANDAMENTO", "Iniciar") : ""}
                    ${typeof botaoMover === "function" ? botaoMover(tarefa, "CONCLUIDA", "Concluir") : ""}
                    ${typeof botaoMover === "function" ? botaoMover(tarefa, "CANCELADA", "Cancelar") : ""}
                    <button class="btn-delete admin-action" onclick="excluirTarefa(${tarefa.id})">Excluir</button>
                </div>`;

            return `
                <article class="task-card v8-card v8-prio-${safe(prioridade)} ${compacto ? "compact" : ""} ${prazoInfo.classe || ""}"
                    draggable="true"
                    ondragstart="arrastarTarefa(event, ${tarefa.id})"
                    onclick="abrirModalTarefa(${tarefa.id})">

                    <div class="v8-card-head">
                        <span class="v8-avatar">${safe(initials(responsavel))}</span>
                        <div class="v8-card-main">
                            <div class="task-title">${safe(tarefa?.titulo || "Sem título")}</div>
                            ${compacto ? "" : `<div class="task-desc">${safe(tarefa?.descricao || "Sem descrição informada.")}</div>`}
                        </div>
                    </div>

                    <div class="v8-badges">${badgesDaTarefa(tarefa, prazoInfo)}</div>

                    <div class="task-meta">
                        <span class="pill prio-${safe(prioridade)}">${safe(fmt(prioridade))}</span>
                        <span class="pill date-pill ${prazoInfo.classe || ""}">${safe(prazoInfo.texto || "Sem prazo")}</span>
                        <span class="pill owner-pill">${safe(responsavel)}</span>
                        ${tarefa?.projetoNome ? `<span class="pill project-pill">${safe(projeto)}</span>` : ""}
                    </div>

                    ${compacto ? "" : `
                        <div class="v8-card-footer">
                            <span>${safe(fmt(status || "PENDENTE"))}</span>
                            <div class="v8-mini-progress" title="Progresso visual aproximado">
                                <span style="--v8-progress:${progresso}%"></span>
                            </div>
                            <span>${progresso}%</span>
                        </div>
                        ${botoes}
                    `}
                </article>`;
        };
    }

    function instalarDragVisual() {
        document.addEventListener("dragstart", (event) => {
            const card = event.target.closest?.(".task-card");
            if (!card) return;
            card.classList.add("dragging");
            document.body.classList.add("v8-dragging");
        }, true);

        document.addEventListener("dragend", () => {
            document.body.classList.remove("v8-dragging");
            document.querySelectorAll(".task-card.dragging, .column.v8-drop-target, .kanban-column.v8-drop-target")
                .forEach(el => el.classList.remove("dragging", "v8-drop-target"));
        }, true);

        document.addEventListener("dragenter", (event) => {
            const body = event.target.closest?.(".column-body");
            if (!body) return;
            const coluna = body.closest(".column, .kanban-column");
            coluna?.classList.add("v8-drop-target");
        }, true);

        document.addEventListener("dragleave", (event) => {
            const coluna = event.target.closest?.(".column, .kanban-column");
            if (!coluna || coluna.contains(event.relatedTarget)) return;
            coluna.classList.remove("v8-drop-target");
        }, true);

        document.addEventListener("drop", () => {
            document.querySelectorAll(".v8-drop-target").forEach(el => el.classList.remove("v8-drop-target"));
        }, true);
    }

    function montarNotificacoesV8(tarefas) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const usuarioAtualNome = (typeof usuarioLogado !== "undefined" && usuarioLogado) ? (usuarioLogado.nome || usuarioLogado.email || "") : "";
        const nomeNormalizado = String(usuarioAtualNome).toLowerCase();

        const ativas = (tarefas || []).filter(t => !["CONCLUIDA", "CANCELADA", "CONCLUIDO", "CANCELADO"].includes(String(t.status || "").toUpperCase()));
        const atrasadas = ativas.filter(t => t.prazo && new Date(`${t.prazo}T00:00:00`) < hoje);
        const vencemHoje = ativas.filter(t => t.prazo && new Date(`${t.prazo}T00:00:00`).getTime() === hoje.getTime());
        const alta = ativas.filter(t => ["ALTA", "URGENTE"].includes(String(t.prioridade || "").toUpperCase()));
        const minhas = nomeNormalizado ? ativas.filter(t => String(t.responsavel || "").toLowerCase().includes(nomeNormalizado)) : [];

        const itens = [
            ...atrasadas.slice(0, 6).map(t => ({ tipo: "danger", icone: "⚠️", titulo: "Tarefa atrasada", texto: t.titulo || "Sem título", detalhe: t.prazo ? `Prazo: ${t.prazo}` : "" })),
            ...vencemHoje.slice(0, 6).map(t => ({ tipo: "warning", icone: "⏱️", titulo: "Vence hoje", texto: t.titulo || "Sem título", detalhe: t.responsavel || "" })),
            ...alta.slice(0, 5).map(t => ({ tipo: "danger", icone: "🔥", titulo: "Alta prioridade", texto: t.titulo || "Sem título", detalhe: t.projetoNome || "" })),
            ...minhas.slice(0, 4).map(t => ({ tipo: "info", icone: "👤", titulo: "Atribuída a você", texto: t.titulo || "Sem título", detalhe: fmt(t.status || "PENDENTE") }))
        ];

        return {
            itens: itens.slice(0, 16),
            resumo: {
                atrasadas: atrasadas.length,
                hoje: vencemHoje.length,
                alta: alta.length
            }
        };
    }

    function instalarNotificacoesV8() {
        if (typeof atualizarNotificacoesInternas !== "function") return;

        window.atualizarNotificacoesInternasOriginalV8 = atualizarNotificacoesInternas;

        atualizarNotificacoesInternas = function atualizarNotificacoesInternasV8(tarefas = []) {
            const pacote = montarNotificacoesV8(tarefas);
            const badge = document.getElementById("badgeNotificacoes");
            const lista = document.getElementById("listaNotificacoes");
            const painel = document.getElementById("painelNotificacoes");

            painel?.classList.add("v8-notifications");

            if (badge) {
                badge.innerText = pacote.itens.length;
                badge.classList.toggle("hidden", pacote.itens.length === 0);
            }

            if (!lista) return;

            if (pacote.itens.length === 0) {
                lista.innerHTML = `<div class="admin-empty">Nenhuma notificação crítica no momento.</div>`;
                return;
            }

            lista.innerHTML = `
                <div class="v8-notification-summary">
                    <div><strong>${pacote.resumo.atrasadas}</strong><small>Atrasadas</small></div>
                    <div><strong>${pacote.resumo.hoje}</strong><small>Hoje</small></div>
                    <div><strong>${pacote.resumo.alta}</strong><small>Alta prioridade</small></div>
                </div>
                ${pacote.itens.map(n => `
                    <div class="notification-item v8-rich ${safe(n.tipo)}">
                        <span class="v8-notification-icon">${safe(n.icone)}</span>
                        <div>
                            <strong>${safe(n.titulo)}</strong>
                            <small>${safe(n.texto)}</small>
                            ${n.detalhe ? `<small>${safe(n.detalhe)}</small>` : ""}
                        </div>
                    </div>
                `).join("")}`;
        };
    }

    function renderizarAnexosVisuais() {
        const areaDetalhes = document.querySelector('[data-modal-tab="DETALHES"]:last-of-type');
        const modalVisualizacao = document.getElementById("modalVisualizacao");
        if (!modalVisualizacao) return;

        document.getElementById("v8AnexosPanel")?.remove();
        document.getElementById("v8ResumoModal")?.remove();

        const tarefa = (typeof tarefaSelecionada !== "undefined") ? tarefaSelecionada : null;
        if (!tarefa) return;

        const prazo = prazoInfoSeguro(tarefa);
        const resumo = document.createElement("div");
        resumo.id = "v8ResumoModal";
        resumo.className = "v8-modal-summary";
        resumo.setAttribute("data-modal-tab", "DETALHES");
        resumo.innerHTML = `
            <div class="v8-modal-summary-card"><span>Situação</span><strong>${safe(fmt(tarefa.status || "PENDENTE"))}</strong></div>
            <div class="v8-modal-summary-card"><span>Prioridade</span><strong>${safe(fmt(tarefa.prioridade || "MEDIA"))}</strong></div>
            <div class="v8-modal-summary-card"><span>Prazo</span><strong>${safe(prazo.texto || "Sem prazo")}</strong></div>
        `;

        const firstSection = modalVisualizacao.querySelector('[data-modal-tab="DETALHES"]');
        if (firstSection) firstSection.insertAdjacentElement("afterend", resumo);

        // Rev16.7: removido o painel visual antigo de "Anexos".
        // O módulo oficial de documentos/anexos agora fica apenas na aba "Documentos",
        // evitando duplicidade e poluição visual nos detalhes da tarefa.
    }

    function iconeArquivo(nome) {
        const ext = String(nome || "").toLowerCase().split(".").pop();
        if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "🖼️";
        if (["pdf"].includes(ext)) return "📄";
        if (["xls", "xlsx", "csv"].includes(ext)) return "📊";
        if (["doc", "docx"].includes(ext)) return "📝";
        return "📎";
    }

    function instalarModalV8() {
        if (typeof abrirModalTarefa !== "function") return;
        window.abrirModalTarefaOriginalV8 = abrirModalTarefa;

        abrirModalTarefa = async function abrirModalTarefaV8(id) {
            await window.abrirModalTarefaOriginalV8(id);
            renderizarAnexosVisuais();
        };

        const originalAlternar = typeof alternarAbaModal === "function" ? alternarAbaModal : null;
        if (originalAlternar) {
            window.alternarAbaModalOriginalV8 = originalAlternar;
            alternarAbaModal = function alternarAbaModalV8(aba) {
                window.alternarAbaModalOriginalV8(aba);
                renderizarAnexosVisuais();
            };
        }
    }

    function instalarTimelineV8() {
        const reforcar = () => document.getElementById("historicoContainer")?.classList.add("v8-timeline-pro");

        if (typeof renderizarHistoricoTarefa === "function") {
            window.renderizarHistoricoTarefaOriginalV8 = renderizarHistoricoTarefa;
            renderizarHistoricoTarefa = function renderizarHistoricoTarefaV8() {
                window.renderizarHistoricoTarefaOriginalV8();
                reforcar();
            };
        }

        document.addEventListener("click", () => setTimeout(reforcar, 50));
    }

    function instalarAtalhosV8() {
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                document.getElementById("painelNotificacoes")?.classList.add("hidden");
            }
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "n") {
                event.preventDefault();
                document.querySelector('[onclick="alternarPainelNotificacoes()"]')?.click();
            }
        });
    }

    function inicializarV8() {
        instalarCardsV8();
        instalarDragVisual();
        instalarNotificacoesV8();
        instalarModalV8();
        instalarTimelineV8();
        instalarAtalhosV8();

        if (typeof renderizarBoard === "function" && Array.isArray(typeof todasTarefas !== "undefined" ? todasTarefas : null)) {
            try { renderizarBoard(); } catch (e) { console.warn("V8: board ainda não disponível.", e); }
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", inicializarV8);
    } else {
        inicializarV8();
    }
})();
