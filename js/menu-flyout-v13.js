
(function () {
  "use strict";

  const LABELS = {
    DASHBOARD: ["Dashboard", "Resumo dos projetos"],
    BOARD: ["Kanban", "Quadro de tarefas"],
    PROJETOS: ["Projetos", "Projetos e vínculos"],
    MODELOS_CARDS: ["Modelos de cards", "Padrões de tarefas"],
    MINHAS: ["Minhas tarefas", "Atividades atribuídas"],
    ADMIN: ["Administração", "Usuários e permissões"],
    SUPER_ADMIN: ["Super Admin", "Controle avançado"],
    UX_MINHA_AREA: ["Minha área", "Visão pessoal"],
    UX_CALENDARIO: ["Calendário", "Prazos e agenda"],
    UX_AJUDA: ["Ajuda", "Orientações rápidas"],
    UX_TABELA: ["Lista de tarefas", "Visualização em tabela"],
    UX_APRESENTACAO: ["Apresentação", "Modo apresentação"]
  };

  const ONCLICK_LABELS = [
    ["alternarTemaSistema", ["Tema", "Claro ou escuro"]],
    ["alternarPainelNotificacoes", ["Notificações", "Alertas do sistema"]],
    ["abrirModalSenha", ["Alterar senha", "Segurança da conta"]]
  ];

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function isHidden(el) {
    return !el || el.classList.contains("hidden") || Boolean(el.closest(".hidden"));
  }

  function getLabel(button) {
    const page = button.getAttribute("data-page");
    if (page && LABELS[page]) return LABELS[page];

    const onclick = button.getAttribute("onclick") || "";
    for (const [key, value] of ONCLICK_LABELS) {
      if (onclick.includes(key)) return value;
    }

    const menuText = button.querySelector(".menu-text");
    const raw = menuText ? menuText.textContent.trim() : button.textContent.trim();
    const safe = raw || "Menu";
    return [safe, "Abrir seção"];
  }

  function getIcon(button) {
    const icon = button.querySelector(".menu-icon") || button.querySelector("span[aria-hidden='true']") || button.querySelector("span");
    return icon ? icon.textContent.trim() || "•" : "•";
  }

  function closeMenu(toggle, panel, backdrop) {
    if (!toggle || !panel || !backdrop) return;
    toggle.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    panel.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    window.setTimeout(() => {
      if (!panel.classList.contains("is-open")) {
        panel.classList.add("hidden");
      }
    }, 170);
  }

  function openMenu(toggle, panel, backdrop) {
    if (!toggle || !panel || !backdrop) return;
    renderItems(panel);
    panel.classList.remove("hidden");
    // força o browser a aplicar o estado inicial antes da animação
    panel.offsetHeight;
    toggle.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    panel.classList.add("is-open");
    backdrop.classList.add("is-open");
  }

  function renderItems(panel) {
    const list = panel.querySelector(".slim-menu-panel-list");
    if (!list) return;
    list.innerHTML = "";

    const originalButtons = Array.from(document.querySelectorAll("#dashboardSection .sidebar .menu-item"));

    originalButtons.forEach((original) => {
      if (isHidden(original)) return;
      if (original.closest(".menu-section") && original.closest(".menu-section").classList.contains("is-empty")) return;

      const [label, description] = getLabel(original);
      const item = document.createElement("button");
      item.type = "button";
      item.className = "slim-menu-panel-item";
      item.innerHTML = `
        <span class="slim-menu-panel-icon" aria-hidden="true">${getIcon(original)}</span>
        <span class="slim-menu-panel-label">
          <strong>${label}</strong>
          <small>${description}</small>
        </span>
        <span class="slim-menu-panel-arrow" aria-hidden="true">›</span>
      `;

      if (original.classList.contains("active")) {
        item.classList.add("is-active");
      }

      item.addEventListener("click", () => {
        original.click();
        const toggle = document.querySelector("#dashboardSection .slim-menu-toggle");
        const backdrop = document.querySelector(".slim-menu-backdrop");
        closeMenu(toggle, panel, backdrop);
      });

      list.appendChild(item);
    });

    const logoutButton = document.querySelector("#dashboardSection .sidebar .btn-logout");
    if (logoutButton && !isHidden(logoutButton)) {
      const separator = document.createElement("div");
      separator.className = "slim-menu-panel-separator";
      list.appendChild(separator);

      const logoutItem = document.createElement("button");
      logoutItem.type = "button";
      logoutItem.className = "slim-menu-panel-item is-danger";
      logoutItem.innerHTML = `
        <span class="slim-menu-panel-icon" aria-hidden="true">⏻</span>
        <span class="slim-menu-panel-label">
          <strong>Sair</strong>
          <small>Encerrar sessão</small>
        </span>
        <span class="slim-menu-panel-arrow" aria-hidden="true">›</span>
      `;
      logoutItem.addEventListener("click", () => {
        logoutButton.click();
        const toggle = document.querySelector("#dashboardSection .slim-menu-toggle");
        const backdrop = document.querySelector(".slim-menu-backdrop");
        closeMenu(toggle, panel, backdrop);
      });
      list.appendChild(logoutItem);
    }
  }

  function installMenu() {
    const sidebar = document.querySelector("#dashboardSection .sidebar");
    const logo = document.querySelector("#dashboardSection .sidebar-logo");
    if (!sidebar || !logo || sidebar.querySelector(".slim-menu-toggle")) return;

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "slim-menu-toggle";
    toggle.setAttribute("aria-label", "Abrir menu");
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = '<span aria-hidden="true">☰</span>';

    logo.insertAdjacentElement("afterend", toggle);

    const backdrop = document.createElement("div");
    backdrop.className = "slim-menu-backdrop";
    document.body.appendChild(backdrop);

    const panel = document.createElement("aside");
    panel.className = "slim-menu-panel hidden";
    panel.setAttribute("aria-label", "Menu de navegação");
    panel.innerHTML = `
      <div class="slim-menu-panel-header">
        <div class="slim-menu-panel-title">
          <strong>Menu</strong>
          <small>Escolha uma área do sistema</small>
        </div>
        <button type="button" class="slim-menu-close" aria-label="Fechar menu">×</button>
      </div>
      <div class="slim-menu-panel-list"></div>
    `;
    document.body.appendChild(panel);

    toggle.addEventListener("click", () => {
      if (panel.classList.contains("is-open")) {
        closeMenu(toggle, panel, backdrop);
      } else {
        openMenu(toggle, panel, backdrop);
      }
    });

    panel.querySelector(".slim-menu-close").addEventListener("click", () => closeMenu(toggle, panel, backdrop));
    backdrop.addEventListener("click", () => closeMenu(toggle, panel, backdrop));

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && panel.classList.contains("is-open")) {
        closeMenu(toggle, panel, backdrop);
      }
    });
  }

  ready(installMenu);
})();
