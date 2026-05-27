
// Marca visual para confirmar que o novo design carregou
document.documentElement.classList.add("ux-v2-document");
if (document.body) {
    document.body.classList.add("ux-v2-loaded");
} else {
    document.addEventListener("DOMContentLoaded", function () {
        document.body.classList.add("ux-v2-loaded");
    });
}

// =========================================================
// UX POLISH - melhorias de experiência sem alterar regras
// =========================================================
(function () {
    "use strict";

    const BOARD_FILTER_IDS = [
        "filtroTexto",
        "filtroStatus",
        "filtroResponsavelBoard",
        "filtroPrioridade",
        "filtroPrazo",
        "ordenacaoBoard",
        "visaoTarefas"
    ];

    function byId(id) {
        return document.getElementById(id);
    }

    function ready(callback) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", callback);
        } else {
            callback();
        }
    }

    function parseCount(id) {
        return Number(byId(id)?.innerText || 0) || 0;
    }

    function hasValue(id) {
        const element = byId(id);
        if (!element) return false;

        const value = String(element.value || "").trim();

        if (id === "ordenacaoBoard") {
            return value && value !== "RECENTES";
        }

        if (id === "visaoTarefas") {
            return value && value !== "MINHAS";
        }

        return Boolean(value);
    }

    function getFilteredTotal() {
        return parseCount("countPendente") +
            parseCount("countAndamento") +
            parseCount("countConcluida") +
            parseCount("countCancelada");
    }

    function ensureBoardSummary() {
        const toolbar = document.querySelector(".board-toolbar");
        const boardArea = document.querySelector(".board-area");

        if (!toolbar || !boardArea || byId("uxBoardSummary")) {
            return;
        }

        const summary = document.createElement("div");
        summary.id = "uxBoardSummary";
        summary.className = "ux-board-summary";
        summary.innerHTML = `
            <div class="ux-board-summary-left">
                <span class="ux-chip strong" id="uxBoardTotal">0 tarefas visíveis</span>
                <span class="ux-chip" id="uxBoardFilters">Sem filtros ativos</span>
            </div>
            <div class="ux-board-summary-right">
                <span class="ux-chip"><span class="ux-kbd">Ctrl</span> + <span class="ux-kbd">K</span> buscar</span>
                <span class="ux-chip">Arraste cards entre colunas</span>
            </div>
        `;

        toolbar.insertAdjacentElement("afterend", summary);
    }

    function updateFilterVisualState() {
        const toolbar = document.querySelector(".board-toolbar");
        if (!toolbar) return;

        const activeFilters = BOARD_FILTER_IDS.filter(hasValue);
        toolbar.classList.toggle("ux-has-filters", activeFilters.length > 0);

        BOARD_FILTER_IDS.forEach(id => {
            const element = byId(id);
            if (element) {
                element.classList.toggle("ux-filter-active", hasValue(id));
            }
        });

        const total = getFilteredTotal();
        const totalEl = byId("uxBoardTotal");
        const filtersEl = byId("uxBoardFilters");

        if (totalEl) {
            totalEl.textContent = `${total} ${total === 1 ? "tarefa visível" : "tarefas visíveis"}`;
        }

        if (filtersEl) {
            if (activeFilters.length > 0) {
                filtersEl.textContent = `${activeFilters.length} ${activeFilters.length === 1 ? "filtro ativo" : "filtros ativos"}`;
                filtersEl.classList.add("strong");
            } else {
                filtersEl.textContent = "Sem filtros ativos";
                filtersEl.classList.remove("strong");
            }
        }
    }

    function improveEmptyColumns() {
        document.querySelectorAll(".empty-column").forEach(empty => {
            if (!empty.dataset.uxPolished) {
                empty.dataset.uxPolished = "true";
                empty.innerHTML = `<strong>Nenhuma tarefa</strong><small>Cards aparecerão aqui conforme o status.</small>`;
            }
        });
    }

    function addFormHint() {
        const panel = byId("novaTarefaPanel");
        const header = panel?.querySelector(".panel-header");

        if (!panel || !header || panel.querySelector(".ux-form-hint")) {
            return;
        }

        const hint = document.createElement("div");
        hint.className = "ux-form-hint";
        hint.textContent = "Dica: use título curto, prazo claro e prioridade realista para facilitar o acompanhamento no Kanban.";
        header.insertAdjacentElement("afterend", hint);
    }

    function addScrollTopButton() {
        if (byId("uxScrollTop")) return;

        const button = document.createElement("button");
        button.id = "uxScrollTop";
        button.className = "ux-scroll-top";
        button.type = "button";
        button.title = "Voltar ao topo";
        button.setAttribute("aria-label", "Voltar ao topo");
        button.textContent = "↑";
        button.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
        document.body.appendChild(button);

        window.addEventListener("scroll", () => {
            button.classList.toggle("visible", window.scrollY > 520);
        }, { passive: true });
    }

    function addKeyboardShortcuts() {
        document.addEventListener("keydown", event => {
            const isMac = navigator.platform.toUpperCase().includes("MAC");
            const controlPressed = isMac ? event.metaKey : event.ctrlKey;

            if (controlPressed && event.key.toLowerCase() === "k") {
                const input = byId("filtroTexto");
                if (input && !input.closest(".hidden")) {
                    event.preventDefault();
                    input.focus();
                    input.select();
                }
            }
        });
    }

    function addAriaLabels() {
        const ariaMap = {
            btnMobileMenu: "Abrir menu lateral",
            filtroTexto: "Buscar tarefas",
            filtroStatus: "Filtrar tarefas por status",
            filtroResponsavelBoard: "Filtrar tarefas por responsável",
            filtroPrioridade: "Filtrar tarefas por prioridade",
            filtroPrazo: "Filtrar tarefas por prazo",
            ordenacaoBoard: "Ordenar tarefas"
        };

        Object.entries(ariaMap).forEach(([id, label]) => {
            const element = byId(id);
            if (element && !element.getAttribute("aria-label")) {
                element.setAttribute("aria-label", label);
            }
        });
    }

    function watchToolbarChanges() {
        BOARD_FILTER_IDS.forEach(id => {
            const element = byId(id);
            if (!element) return;

            ["input", "change"].forEach(eventName => {
                element.addEventListener(eventName, () => {
                    window.setTimeout(updateFilterVisualState, 0);
                });
            });
        });
    }

    function setLoading(isLoading) {
        document.body.dataset.uxLoading = isLoading ? "true" : "false";
    }

    function wrapAsyncFunction(functionName) {
        const original = window[functionName];

        if (typeof original !== "function" || original.__uxWrapped) {
            return;
        }

        const wrapped = async function (...args) {
            setLoading(true);
            try {
                return await original.apply(this, args);
            } finally {
                setLoading(false);
                window.setTimeout(refreshUX, 0);
            }
        };

        wrapped.__uxWrapped = true;
        window[functionName] = wrapped;
    }

    function wrapRenderBoard() {
        const original = window.renderizarBoard;

        if (typeof original !== "function" || original.__uxWrapped) {
            return;
        }

        const wrapped = function (...args) {
            const result = original.apply(this, args);
            window.setTimeout(refreshBoardUX, 0);
            return result;
        };

        wrapped.__uxWrapped = true;
        window.renderizarBoard = wrapped;
    }

    function refreshBoardUX() {
        ensureBoardSummary();
        updateFilterVisualState();
        improveEmptyColumns();
    }

    function refreshUX() {
        addFormHint();
        addAriaLabels();
        refreshBoardUX();
    }

    ready(() => {
        document.body.classList.add("ux-polish-enabled");

        ensureBoardSummary();
        addFormHint();
        addScrollTopButton();
        addKeyboardShortcuts();
        addAriaLabels();
        watchToolbarChanges();

        wrapRenderBoard();
        wrapAsyncFunction("buscarTarefas");
        wrapAsyncFunction("criarTarefa");
        wrapAsyncFunction("alterarStatus");
        wrapAsyncFunction("excluirTarefa");
        wrapAsyncFunction("carregarProjetosAdmin");
        wrapAsyncFunction("carregarUsuariosAdmin");

        refreshUX();
        window.setTimeout(refreshUX, 300);
        window.setTimeout(refreshUX, 1000);
    });
})();
