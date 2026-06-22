// ==========================
// DASHBOARD / NAVEGAÇÃO
// ==========================

function mostrarDashboard() {
    loginSection.classList.add("hidden");
    dashboardSection.classList.remove("hidden");

    mostrarPagina("DASHBOARD");
    atualizarBotaoModoCartao();
}

function setElementoVisivel(id, visivel) {
    const elemento = document.getElementById(id);

    if (!elemento) {
        return;
    }

    elemento.classList.toggle("app-page-hidden", !visivel);
}

function aplicarMenuAtivo(pagina) {
    document.querySelectorAll(".menu-item[data-page]").forEach(item => {
        item.classList.toggle("active", item.dataset.page === pagina);
    });

    if (typeof atualizarMenuAccordion === "function") {
        setTimeout(atualizarMenuAccordion, 0);
    }
}

function atualizarTopbarContexto(pagina) {
    const titulo = document.getElementById("topbarTitulo");
    const descricao = document.getElementById("topbarDescricao");
    const btnModo = document.getElementById("btnModoCartao");
    const btnNova = document.getElementById("btnTopNovaTarefa");

    const textos = {
        DASHBOARD: ["Dashboard", "Resumo dos projetos, tarefas, prazos e prioridades."],
        BOARD: ["Kanban", "Controle operacional por projeto, usuário e prioridade."],
        MINHAS: ["Minhas tarefas", "Acompanhe as atividades atribuídas a você."],
        PROJETOS: ["Projetos", "Gerencie projetos, responsáveis e acompanhamento."],
        MODELOS_CARDS: ["Modelos de Cards", "Padronize tipos de tarefas e fluxos operacionais."],
        ADMIN: ["Administração", "Gerencie usuários, permissões e dados administrativos."],
        SUPER_ADMIN: ["Super Admin", "Administração avançada da plataforma."],
        UX_MINHA_AREA: ["Minha área", "Prioridades, vencimentos e atalhos do usuário."],
        UX_CALENDARIO: ["Calendário de tarefas", "Prazos em visão mensal para acompanhar vencidas, do dia e próximas."],
        UX_AJUDA: ["Ajuda", "Guia rápido de uso do sistema."],
        PROJETO_DETALHE: ["Detalhes do projeto", "Kanban, tarefas, documentos e acompanhamento do projeto."]
    };

    const [novoTitulo, novaDescricao] = textos[pagina] || textos.DASHBOARD;
    if (titulo) titulo.textContent = novoTitulo;
    if (descricao) descricao.textContent = novaDescricao;

    const contextoBoard = pagina === "BOARD" || pagina === "MINHAS";
    if (btnModo) btnModo.classList.toggle("hidden", !contextoBoard);
    if (btnNova) btnNova.classList.toggle("hidden", !contextoBoard);
}

function obterIconeMenuCompacto(item) {
    return "";
}

function aplicarSidebarCompacta(ativar) {
    const dashboard = document.getElementById("dashboardSection");
    if (dashboard) dashboard.classList.remove("sidebar-compacta");
}

function alternarSidebarCompacta() {
    const dashboard = document.getElementById("dashboardSection");
    if (dashboard) dashboard.classList.remove("sidebar-compacta");
}


function mostrarPagina(pagina) {
    paginaAtual = pagina;
    document.body.dataset.currentPage = pagina;

    const mostrarBoard = pagina === "BOARD" || pagina === "MINHAS";
    const mostrarResumo = pagina === "DASHBOARD";

    document.querySelectorAll(".metrics").forEach(el => {
        el.classList.toggle("app-page-hidden", !mostrarResumo);
    });

    document.querySelectorAll(".workspace").forEach(el => {
        el.classList.toggle("app-page-hidden", !mostrarBoard);
    });

    setElementoVisivel("dashboardHomePanel", pagina === "DASHBOARD");
    setElementoVisivel("projetosPanel", pagina === "PROJETOS" && isAdmin());
    setElementoVisivel("modelosCardsPanel", pagina === "MODELOS_CARDS" && isAdmin());
    setElementoVisivel("projetoDetalhePanel", pagina === "PROJETO_DETALHE" && isAdmin());
    setElementoVisivel("adminPanel", pagina === "ADMIN" && isAdmin());
    setElementoVisivel("superAdminPanel", pagina === "SUPER_ADMIN" && isSuperAdmin());

    aplicarMenuAtivo(pagina === "PROJETO_DETALHE" ? "PROJETOS" : pagina);
    atualizarTopbarContexto(pagina);

    if (pagina === "PROJETOS" && isAdmin()) {
        renderizarProjetosAdmin();
    }

    if (pagina === "DASHBOARD") {
        renderizarDashboardHome();
    }
}

async function abrirMinhasTarefas() {
    const select = document.getElementById("visaoTarefas");

    if (select) {
        select.value = "MINHAS";
    }

    mostrarPagina("MINHAS");

    await buscarTarefas();
}

function atualizarBotaoNovaTarefa() {
    const panel = document.getElementById("novaTarefaPanel");
    const btn = document.querySelector(".btn-toggle-nova-tarefa");

    if (!panel || !btn) return;

    const recolhido = panel.classList.contains("create-panel-collapsed");
    btn.textContent = recolhido ? "Abrir formulário" : "Recolher";
    btn.setAttribute("aria-expanded", String(!recolhido));
}

function abrirNovaTarefaPanel() {
    const panel = document.getElementById("novaTarefaPanel");

    if (panel) {
        panel.classList.remove("create-panel-collapsed");
        atualizarBotaoNovaTarefa();
    }
}

function recolherNovaTarefaPanel() {
    const panel = document.getElementById("novaTarefaPanel");

    if (panel) {
        panel.classList.add("create-panel-collapsed");
        atualizarBotaoNovaTarefa();
    }
}

function toggleNovaTarefaPanel() {
    const panel = document.getElementById("novaTarefaPanel");

    if (!panel) return;

    panel.classList.toggle("create-panel-collapsed");
    atualizarBotaoNovaTarefa();

    if (!panel.classList.contains("create-panel-collapsed")) {
        setTimeout(() => document.getElementById("titulo")?.focus(), 80);
    }
}

function focarNovaTarefa() {
    mostrarPagina("BOARD");

    setTimeout(() => {
        abrirNovaTarefaPanel();
        document.getElementById("titulo")?.focus();
    }, 80);
}

async function recarregarTudo() {
    if (isAdmin()) {
        await carregarUsuariosAdmin();
        await carregarProjetosAdmin();
        await carregarModelosCards();
    }

    if (isSuperAdmin()) {
        await carregarAdminsSuper();
    }

    await buscarTarefas();

    if (paginaAtual === "PROJETO_DETALHE" && projetoDetalheSelecionado) {
        await recarregarDetalheProjeto();
    }

    mostrarToast("Quadro atualizado.");
}


document.addEventListener("DOMContentLoaded", () => {
    atualizarBotaoNovaTarefa();
    atualizarTopbarContexto(paginaAtual || "DASHBOARD");
});
