// Rev16.28 - Menu lateral accordion por seções
// Não usa localStorage. A estrutura é montada no carregamento e respeita permissões visuais existentes.
(function () {
    const SECTION_CONFIG = [
        {
            key: "principal",
            title: "Principal",
            icon: "▦",
            pages: ["DASHBOARD", "BOARD", "PROJETOS", "MINHAS", "UX_MINHA_AREA", "UX_CALENDARIO"]
        },
        {
            key: "gestao",
            title: "Gestão",
            icon: "⚙",
            pages: ["MODELOS_CARDS", "ADMIN", "SUPER_ADMIN"]
        },
        {
            key: "apoio",
            title: "Apoio",
            icon: "✦",
            pages: ["UX_AJUDA", "TEMA"]
        },
        {
            key: "conta",
            title: "Conta",
            icon: "●",
            pages: ["ALTERAR_SENHA"]
        }
    ];

    const TEXT_ALIASES = {
        "tema": "TEMA",
        "alterar senha": "ALTERAR_SENHA"
    };

    function getPageKey(button) {
        if (!button) return "";
        if (button.dataset && button.dataset.page) return button.dataset.page;
        const text = (button.textContent || "").trim().toLowerCase().replace(/\s+/g, " ");
        return TEXT_ALIASES[text] || "";
    }

    function createSection(config) {
        const section = document.createElement("div");
        section.className = "menu-section";
        section.dataset.section = config.key;
        section.dataset.defaultOpen = config.key === "principal" ? "true" : "false";

        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "menu-section-toggle";
        toggle.setAttribute("aria-expanded", config.key === "principal" ? "true" : "false");
        toggle.innerHTML = `
            <span class="section-icon" aria-hidden="true">${config.icon}</span>
            <span class="section-title">${config.title}</span>
            <span class="section-arrow" aria-hidden="true">⌄</span>
        `;

        const items = document.createElement("div");
        items.className = "menu-section-items";

        toggle.addEventListener("click", () => {
            const collapsed = section.classList.toggle("is-collapsed");
            toggle.setAttribute("aria-expanded", String(!collapsed));
        });

        section.appendChild(toggle);
        section.appendChild(items);
        return section;
    }

    function normalizeOldButton(button) {
        if (!button || button.classList.contains("__accordion-normalized")) return;
        button.classList.add("__accordion-normalized");

        const firstSpan = button.querySelector("span:first-child");
        if (firstSpan && !firstSpan.classList.contains("menu-text") && !firstSpan.classList.contains("menu-icon")) {
            firstSpan.classList.add("menu-icon");
            firstSpan.setAttribute("aria-hidden", "true");
        }
    }

    function buildAccordion() {
        const menu = document.querySelector("#dashboardSection .sidebar .menu");
        if (!menu || menu.dataset.accordionApplied === "true") return;

        // Coleta botões já existentes, incluindo os inseridos por extensões visuais.
        const buttons = Array.from(menu.querySelectorAll(".menu-item"));
        if (!buttons.length) return;

        const sections = new Map();
        SECTION_CONFIG.forEach(config => {
            const section = createSection(config);
            sections.set(config.key, { config, section, items: section.querySelector(".menu-section-items") });
        });

        const fallback = sections.get("apoio");

        buttons.forEach(button => {
            normalizeOldButton(button);
            const key = getPageKey(button);
            const target = Array.from(sections.values()).find(group => group.config.pages.includes(key)) || fallback;
            target.items.appendChild(button);
        });

        menu.innerHTML = "";
        sections.forEach(group => menu.appendChild(group.section));
        menu.dataset.accordionApplied = "true";

        updateAccordionState();
    }

    function updateAccordionState() {
        const menu = document.querySelector("#dashboardSection .sidebar .menu");
        if (!menu) return;

        menu.querySelectorAll(".menu-section").forEach(section => {
            const visibleItems = Array.from(section.querySelectorAll(".menu-item")).filter(item => !item.classList.contains("hidden"));
            const hasActive = visibleItems.some(item => item.classList.contains("active"));
            const toggle = section.querySelector(".menu-section-toggle");

            section.classList.toggle("is-empty", visibleItems.length === 0);
            section.classList.toggle("has-active", hasActive);

            // Abre automaticamente a seção que contém a página ativa.
            if (hasActive) {
                section.classList.remove("is-collapsed");
                if (toggle) toggle.setAttribute("aria-expanded", "true");
            } else if (section.dataset.defaultOpen !== "true" && !section.dataset.userTouched) {
                section.classList.add("is-collapsed");
                if (toggle) toggle.setAttribute("aria-expanded", "false");
            }
        });
    }

    function markUserTouched() {
        document.querySelectorAll("#dashboardSection .menu-section-toggle").forEach(toggle => {
            if (toggle.dataset.boundTouched === "true") return;
            toggle.dataset.boundTouched = "true";
            toggle.addEventListener("click", () => {
                const section = toggle.closest(".menu-section");
                if (section) section.dataset.userTouched = "true";
            });
        });
    }

    function init() {
        buildAccordion();
        markUserTouched();
        updateAccordionState();
    }

    document.addEventListener("DOMContentLoaded", () => {
        setTimeout(init, 150);
        setTimeout(init, 900);
    });

    if (document.readyState !== "loading") {
        setTimeout(init, 80);
        setTimeout(init, 900);
    }

    // Atualiza quando permissões/active/hidden mudarem.
    const observer = new MutationObserver(() => {
        if (document.querySelector("#dashboardSection .sidebar .menu")?.dataset.accordionApplied === "true") {
            setTimeout(updateAccordionState, 0);
        }
    });

    function observeMenu() {
        const menu = document.querySelector("#dashboardSection .sidebar .menu");
        if (menu && !menu.dataset.accordionObserved) {
            menu.dataset.accordionObserved = "true";
            observer.observe(menu, { subtree: true, attributes: true, attributeFilter: ["class"] });
        }
    }

    document.addEventListener("DOMContentLoaded", observeMenu);
    if (document.readyState !== "loading") setTimeout(observeMenu, 100);

    window.atualizarMenuAccordion = updateAccordionState;
})();
