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
}

function mostrarPagina(pagina) {
    paginaAtual = pagina;

    const mostrarBoard = pagina === "BOARD" || pagina === "MINHAS";
    const mostrarResumo = pagina === "DASHBOARD" || mostrarBoard;

    document.querySelectorAll(".metrics").forEach(el => {
        el.classList.toggle("app-page-hidden", !mostrarResumo);
    });

    document.querySelectorAll(".workspace").forEach(el => {
        el.classList.toggle("app-page-hidden", !mostrarBoard);
    });

    setElementoVisivel("dashboardHomePanel", pagina === "DASHBOARD");
    setElementoVisivel("projetosPanel", pagina === "PROJETOS" && isAdmin());
    setElementoVisivel("projetoDetalhePanel", pagina === "PROJETO_DETALHE" && isAdmin());
    setElementoVisivel("adminPanel", pagina === "ADMIN" && isAdmin());
    setElementoVisivel("superAdminPanel", pagina === "SUPER_ADMIN" && isSuperAdmin());

    aplicarMenuAtivo(pagina === "PROJETO_DETALHE" ? "PROJETOS" : pagina);

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

function focarNovaTarefa() {
    mostrarPagina("BOARD");

    setTimeout(() => {
        document.getElementById("titulo")?.focus();
    }, 50);
}

async function recarregarTudo() {
    if (isAdmin()) {
        await carregarUsuariosAdmin();
        await carregarProjetosAdmin();
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
