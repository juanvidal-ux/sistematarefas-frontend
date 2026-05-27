/* =========================================================
   UX V16 - Ajuste fino de notificações/mobile
   - Remove duplicidade visual do fechar
   - Deixa filtros por tipo mais limpos no mobile
   - Não usa localStorage/sessionStorage
   ========================================================= */
(function () {
    "use strict";

    function $(sel, root = document) { return root.querySelector(sel); }
    function $all(sel, root = document) { return [...root.querySelectorAll(sel)]; }

    function painel() { return $("#painelNotificacoes"); }

    function aplicarClasse() {
        const p = painel();
        if (!p) return;
        p.classList.add("v16-notifications-polished");

        // Garante que apenas o botão global V14 fique como fechar visível.
        $all(".notifications-header .modal-close, button[onclick*='fecharPainelNotificacoes']", p).forEach(btn => {
            if (btn.id !== "v14GlobalNotifClose") {
                btn.setAttribute("aria-hidden", "true");
                btn.tabIndex = -1;
            }
        });

        const close = $("#v14GlobalNotifClose");
        if (close) {
            close.innerHTML = `<span class="v14-x" aria-hidden="true">×</span><span>Fechar</span>`;
            close.setAttribute("aria-label", "Fechar notificações");
            close.setAttribute("title", "Fechar notificações");
        }

        const typeTitle = $(".v15-type-title", p);
        if (typeTitle) typeTitle.textContent = "Tipo";
    }

    function reorganizarFiltrosMobile() {
        const p = painel();
        if (!p) return;
        const typeFilter = $(".v15-type-filter", p);
        const toolbar = $(".v12-notif-toolbar", p);
        const lista = $("#listaNotificacoes", p) || $("#listaNotificacoes");

        // Se o filtro por tipo foi criado abaixo da toolbar, mantém logo após as ações.
        // Não recria nada; só deixa previsível e evita duplicidade visual estranha.
        if (typeFilter && toolbar && typeFilter.previousElementSibling !== toolbar) {
            toolbar.insertAdjacentElement("afterend", typeFilter);
        }

        if (lista) {
            const cards = $all(".v12-notif-card", lista);
            cards.forEach(card => card.classList.add("v16-card-ready"));
        }
    }

    function atualizar() {
        requestAnimationFrame(() => {
            aplicarClasse();
            reorganizarFiltrosMobile();
            if (typeof window.atualizarFecharNotificacoesV14 === "function") {
                window.atualizarFecharNotificacoesV14();
            }
        });
    }

    function iniciar() {
        atualizar();
        setTimeout(atualizar, 250);
        setTimeout(atualizar, 900);

        const obs = new MutationObserver(() => atualizar());
        obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });

        window.addEventListener("resize", atualizar);
        document.addEventListener("click", () => {
            setTimeout(atualizar, 60);
            setTimeout(atualizar, 350);
        });

        console.info("UX V16: notificações mobile refinadas sem localStorage/sessionStorage.");
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
    else iniciar();
})();
