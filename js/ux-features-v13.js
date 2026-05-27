/* =========================================================
   UX V13 - Ajustes finais do chat/notificações
   Sem localStorage/sessionStorage.
   ========================================================= */
(function () {
    "use strict";

    function $(selector, root = document) {
        return root.querySelector(selector);
    }

    function fecharNotificacoes() {
        if (typeof window.fecharPainelNotificacoes === "function") {
            window.fecharPainelNotificacoes();
            return;
        }
        const painel = $("#painelNotificacoes");
        if (painel) painel.classList.add("hidden");
    }

    function fecharChat() {
        const chat = $("#v12ChatPanel");
        if (chat) chat.classList.add("hidden");
    }

    function melhorarBotaoFecharNotificacoes() {
        const btn = $("#painelNotificacoes .notifications-header .modal-close");
        if (!btn) return;
        btn.setAttribute("title", "Fechar notificações");
        btn.setAttribute("aria-label", "Fechar notificações");
    }

    function melhorarBotaoFecharChat() {
        const btn = $("#v12ChatPanel [data-v12-close-chat]");
        if (!btn) return;
        btn.setAttribute("title", "Fechar chat");
        btn.setAttribute("aria-label", "Fechar chat");
    }

    function garantirAjudaChat() {
        const painel = $("#v12ChatPanel");
        if (!painel || $(".v13-chat-help", painel)) return;
        const busca = $(".v12-chat-search-row", painel);
        if (!busca) return;
        busca.insertAdjacentHTML("afterend", '<div class="v13-chat-help">Dica: <strong>Enter</strong> envia, <strong>Shift + Enter</strong> quebra linha e <strong>Esc</strong> fecha.</div>');
    }

    function garantirBotaoIrAoFinal() {
        const painel = $("#v12ChatPanel");
        if (!painel || $("#v13ChatBottom", painel)) return;
        const btn = document.createElement("button");
        btn.id = "v13ChatBottom";
        btn.type = "button";
        btn.className = "v13-chat-bottom";
        btn.textContent = "↓ Últimas";
        btn.addEventListener("click", function () {
            const thread = $("#v12ChatThread");
            if (thread) thread.scrollTop = thread.scrollHeight;
        });
        painel.appendChild(btn);
    }

    function envolverTextarea(textarea) {
        if (!textarea || textarea.dataset.v13CounterReady === "1") return;
        textarea.dataset.v13CounterReady = "1";

        const wrap = document.createElement("div");
        wrap.className = "v13-input-wrap";
        textarea.parentNode.insertBefore(wrap, textarea);
        wrap.appendChild(textarea);

        const counter = document.createElement("div");
        counter.className = "v13-counter";
        wrap.appendChild(counter);

        const max = Number(textarea.getAttribute("maxlength") || 1500);
        const atualizar = function () {
            const total = textarea.value.length;
            counter.textContent = `${total}/${max}`;
            counter.classList.toggle("warning", total > max * 0.8 && total <= max * 0.95);
            counter.classList.toggle("danger", total > max * 0.95);
        };

        textarea.addEventListener("input", atualizar);
        atualizar();
    }

    function garantirContadores() {
        document.querySelectorAll("#v12ChatInput, [data-v12-inline-form] textarea").forEach(envolverTextarea);
    }

    function aplicarMelhorias() {
        melhorarBotaoFecharNotificacoes();
        melhorarBotaoFecharChat();
        garantirAjudaChat();
        garantirBotaoIrAoFinal();
        garantirContadores();
    }

    document.addEventListener("keydown", function (event) {
        if (event.key !== "Escape") return;

        const chat = $("#v12ChatPanel:not(.hidden)");
        if (chat) {
            fecharChat();
            return;
        }

        const notificacoes = $("#painelNotificacoes:not(.hidden)");
        if (notificacoes) fecharNotificacoes();
    });

    document.addEventListener("click", function (event) {
        if (event.target.closest?.("#painelNotificacoes .notifications-header .modal-close")) {
            fecharNotificacoes();
        }
        setTimeout(aplicarMelhorias, 80);
    });

    document.addEventListener("input", function () {
        setTimeout(garantirContadores, 30);
    });

    const observer = new MutationObserver(function () {
        aplicarMelhorias();
    });

    document.addEventListener("DOMContentLoaded", function () {
        aplicarMelhorias();
        observer.observe(document.body, { childList: true, subtree: true });
    });

    window.addEventListener("load", aplicarMelhorias);
})();
