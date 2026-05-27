/* =========================================================
   UX V14 - Botão fechar notificações sempre visível
   - botão global fixo, fora do painel rolável
   - sem localStorage/sessionStorage
   ========================================================= */
(function () {
    "use strict";

    function $(sel) { return document.querySelector(sel); }

    function painelAberto() {
        const painel = $("#painelNotificacoes");
        return painel && !painel.classList.contains("hidden");
    }

    function fecharPainel() {
        if (typeof window.fecharPainelNotificacoes === "function") {
            window.fecharPainelNotificacoes();
        } else {
            $("#painelNotificacoes")?.classList.add("hidden");
        }
        atualizarBotao();
    }

    function criarBotaoGlobal() {
        let btn = $("#v14GlobalNotifClose");
        if (btn) return btn;

        btn = document.createElement("button");
        btn.id = "v14GlobalNotifClose";
        btn.type = "button";
        btn.setAttribute("aria-label", "Fechar notificações");
        btn.setAttribute("title", "Fechar notificações");
        btn.innerHTML = `<span class="v14-x" aria-hidden="true">×</span><span>Fechar</span>`;
        btn.addEventListener("click", fecharPainel);
        document.body.appendChild(btn);
        return btn;
    }

    function atualizarBotao() {
        const btn = criarBotaoGlobal();
        btn.classList.toggle("v14-visible", Boolean(painelAberto()));
    }

    function reforcarBotaoOriginal() {
        const btnOriginal = $("#painelNotificacoes .notifications-header .modal-close") || $("#painelNotificacoes button[onclick*='fecharPainelNotificacoes']");
        if (!btnOriginal) return;
        btnOriginal.setAttribute("title", "Fechar notificações");
        btnOriginal.setAttribute("aria-label", "Fechar notificações");
        if (!btnOriginal.dataset.v14Bound) {
            btnOriginal.dataset.v14Bound = "1";
            btnOriginal.addEventListener("click", function (event) {
                event.preventDefault();
                fecharPainel();
            });
        }
    }

    function observarPainel() {
        const painel = $("#painelNotificacoes");
        if (!painel || painel.dataset.v14Observer) return;
        painel.dataset.v14Observer = "1";

        const observer = new MutationObserver(atualizarBotao);
        observer.observe(painel, { attributes: true, attributeFilter: ["class", "style"] });
    }

    function iniciar() {
        criarBotaoGlobal();
        reforcarBotaoOriginal();
        observarPainel();
        atualizarBotao();
    }

    document.addEventListener("DOMContentLoaded", iniciar);
    window.addEventListener("load", iniciar);

    document.addEventListener("click", function () {
        setTimeout(atualizarBotao, 30);
        setTimeout(atualizarBotao, 250);
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && painelAberto()) {
            fecharPainel();
        }
    });

    window.atualizarFecharNotificacoesV14 = atualizarBotao;
})();
