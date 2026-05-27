/* =========================================================
   UX V15 - Refinamento de notificações e chat
   Escopo definido:
   1) Respostas rápidas melhores
   2) Notificações separadas por tipo: Mensagens, Prazos e Sistema
   3) Melhor responsividade mobile

   Observação: não usa localStorage/sessionStorage e não altera backend.
   Atua como camada visual/comportamental sobre a V12/V14.
   ========================================================= */
(function () {
    "use strict";

    const ESTADO = {
        tipoAtivo: "TODAS",
        aplicando: false
    };

    const RESPOSTAS_RAPIDAS = [
        { grupo: "Confirmação", texto: "Ok, vou verificar." },
        { grupo: "Confirmação", texto: "Recebido, obrigado." },
        { grupo: "Conclusão", texto: "Concluído. Pode validar, por favor?" },
        { grupo: "Conclusão", texto: "Atualização realizada conforme solicitado." },
        { grupo: "Ação", texto: "Vou providenciar e retorno em breve." },
        { grupo: "Ação", texto: "Pode revisar, por favor?" },
        { grupo: "Pendência", texto: "Pendente de aprovação." },
        { grupo: "Pendência", texto: "Preciso de mais informações para continuar." },
        { grupo: "Documento", texto: "Vou anexar o documento atualizado." },
        { grupo: "Prazo", texto: "Vou priorizar por conta do prazo." }
    ];

    function $(sel, root = document) { return root.querySelector(sel); }
    function $all(sel, root = document) { return [...root.querySelectorAll(sel)]; }

    function safe(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function textoCard(card) {
        return String(card?.innerText || "").toLowerCase();
    }

    function tipoCard(card) {
        const txt = textoCard(card);
        if (card.classList.contains("chat") || txt.includes("comentário de") || txt.includes("chat")) {
            return "MENSAGENS";
        }
        if (
            txt.includes("tarefa atrasada") ||
            txt.includes("vence hoje") ||
            txt.includes("atrasada há") ||
            txt.includes("prazo") ||
            txt.includes("vencida") ||
            txt.includes("vencimento")
        ) {
            return "PRAZOS";
        }
        return "SISTEMA";
    }

    function contarPorTipo(cards) {
        const contagem = { TODAS: cards.length, MENSAGENS: 0, PRAZOS: 0, SISTEMA: 0 };
        cards.forEach(card => { contagem[tipoCard(card)] += 1; });
        return contagem;
    }

    function botaoTipo(valor, label, count, icone) {
        return `<button type="button" class="${ESTADO.tipoAtivo === valor ? "active" : ""}" data-v15-type="${safe(valor)}"><span>${icone}</span>${safe(label)}<strong>${count}</strong></button>`;
    }

    function garantirFiltroTipo() {
        const lista = $("#listaNotificacoes");
        if (!lista) return;

        const toolbarV12 = $(".v12-notif-toolbar", lista);
        const cards = $all(".v12-notif-card", lista);
        if (!toolbarV12 || !cards.length) {
            const existenteVazio = $(".v15-type-filter", lista);
            if (existenteVazio && !cards.length) existenteVazio.remove();
            return;
        }

        let filtro = $(".v15-type-filter", lista);
        if (!filtro) {
            filtro = document.createElement("div");
            filtro.className = "v15-type-filter";
            toolbarV12.insertAdjacentElement("afterend", filtro);
        }

        const contagem = contarPorTipo(cards);
        filtro.innerHTML = `
            <div class="v15-type-title">Separar notificações por tipo</div>
            <div class="v15-type-buttons">
                ${botaoTipo("TODAS", "Todas", contagem.TODAS, "🔔")}
                ${botaoTipo("MENSAGENS", "Mensagens", contagem.MENSAGENS, "💬")}
                ${botaoTipo("PRAZOS", "Prazos", contagem.PRAZOS, "⏱️")}
                ${botaoTipo("SISTEMA", "Sistema", contagem.SISTEMA, "⚙️")}
            </div>
        `;

        cards.forEach(card => {
            const mostrar = ESTADO.tipoAtivo === "TODAS" || tipoCard(card) === ESTADO.tipoAtivo;
            card.classList.toggle("v15-hidden-by-type", !mostrar);
            card.dataset.v15Type = tipoCard(card).toLowerCase();
        });

        atualizarMensagemVazia(lista, cards);
    }

    function atualizarMensagemVazia(lista, cards) {
        let aviso = $(".v15-empty-type", lista);
        const visiveis = cards.filter(card => !card.classList.contains("v15-hidden-by-type"));
        if (visiveis.length || ESTADO.tipoAtivo === "TODAS") {
            aviso?.remove();
            return;
        }
        if (!aviso) {
            aviso = document.createElement("div");
            aviso.className = "v15-empty-type";
            lista.appendChild(aviso);
        }
        const nomes = { MENSAGENS: "mensagens", PRAZOS: "prazos", SISTEMA: "sistema" };
        aviso.innerHTML = `<strong>Nenhuma notificação de ${safe(nomes[ESTADO.tipoAtivo] || "tipo selecionado")}.</strong><span>Você pode voltar para “Todas” ou clicar em Atualizar.</span>`;
    }

    function htmlRespostasRapidas(contexto) {
        const grupos = new Map();
        RESPOSTAS_RAPIDAS.forEach(item => {
            if (!grupos.has(item.grupo)) grupos.set(item.grupo, []);
            grupos.get(item.grupo).push(item.texto);
        });
        return `
            <div class="v15-quick-replies" data-v15-context="${safe(contexto)}">
                <div class="v15-quick-title">Respostas rápidas</div>
                ${[...grupos.entries()].map(([grupo, textos]) => `
                    <div class="v15-quick-group">
                        <span>${safe(grupo)}</span>
                        <div>
                            ${textos.map(texto => `<button type="button" data-v15-quick="${safe(texto)}">${safe(texto)}</button>`).join("")}
                        </div>
                    </div>
                `).join("")}
            </div>
        `;
    }

    function melhorarRespostasRapidasChat() {
        const painel = $("#v12ChatPanel");
        if (!painel) return;
        const sugestoesAntigas = $(".v12-suggestions", painel);
        if (!sugestoesAntigas) return;
        let bloco = $(".v15-chat-quick-wrap", painel);
        if (!bloco) {
            bloco = document.createElement("div");
            bloco.className = "v15-chat-quick-wrap";
            sugestoesAntigas.insertAdjacentElement("afterend", bloco);
        }
        bloco.innerHTML = htmlRespostasRapidas("chat");
        sugestoesAntigas.classList.add("v15-hide-old-suggestions");
    }

    function melhorarRespostasInline() {
        $all("[data-v12-inline-form]").forEach(form => {
            if ($(".v15-inline-quick", form)) return;
            const textarea = $("textarea", form);
            if (!textarea) return;
            const wrap = document.createElement("div");
            wrap.className = "v15-inline-quick";
            wrap.innerHTML = htmlRespostasRapidas("inline");
            textarea.insertAdjacentElement("afterend", wrap);
        });
    }

    function aplicarRespostaRapida(botao) {
        const texto = botao?.dataset.v15Quick || "";
        if (!texto) return;
        const container = botao.closest(".v15-quick-replies");
        const formInline = botao.closest("[data-v12-inline-form]");
        const painelChat = botao.closest("#v12ChatPanel");
        const textarea = formInline?.querySelector("textarea") || painelChat?.querySelector("#v12ChatInput") || $("#v12ChatInput");
        if (!textarea) return;

        const atual = String(textarea.value || "").trim();
        textarea.value = atual ? `${atual}\n${texto}` : texto;
        textarea.focus();
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        container?.classList.add("v15-used");
        setTimeout(() => container?.classList.remove("v15-used"), 450);
    }

    function aplicarMelhoriasMobileClasses() {
        $("#painelNotificacoes")?.classList.add("v15-mobile-ready");
        $("#v12ChatPanel")?.classList.add("v15-mobile-ready");
    }

    function atualizarTudo() {
        if (ESTADO.aplicando) return;
        ESTADO.aplicando = true;
        requestAnimationFrame(() => {
            try {
                garantirFiltroTipo();
                melhorarRespostasRapidasChat();
                melhorarRespostasInline();
                aplicarMelhoriasMobileClasses();
            } finally {
                ESTADO.aplicando = false;
            }
        });
    }

    function instalarEventos() {
        document.addEventListener("click", function (event) {
            const tipo = event.target.closest?.("[data-v15-type]");
            if (tipo) {
                ESTADO.tipoAtivo = tipo.dataset.v15Type || "TODAS";
                garantirFiltroTipo();
                return;
            }

            const quick = event.target.closest?.("[data-v15-quick]");
            if (quick) {
                aplicarRespostaRapida(quick);
                return;
            }

            if (event.target.closest?.("[data-v12-quick-reply], [data-v12-open-chat], [data-v12-chat-refresh], [data-v12-refresh]")) {
                setTimeout(atualizarTudo, 80);
                setTimeout(atualizarTudo, 450);
            }
        });

        window.addEventListener("resize", aplicarMelhoriasMobileClasses);
    }

    function observarMudancas() {
        const observer = new MutationObserver(() => atualizarTudo());
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function inicializar() {
        instalarEventos();
        observarMudancas();
        atualizarTudo();
        setTimeout(atualizarTudo, 600);
        console.info("UX V15: respostas rápidas, tipos de notificações e mobile ativados sem localStorage.");
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inicializar);
    else inicializar();
})();
