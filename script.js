const API_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:8081"
        : "https://sistematarefas-backend.onrender.com";

const loginSection = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");
const toast = document.getElementById("toast");

let todasTarefas = [];
let tarefaSelecionada = null;

let usuarioLogado = null;
let usuariosAdmin = [];
let adminsSuper = [];
let projetosAdmin = [];

let usuarioEdicaoContexto = null;

let paginaAtual = "BOARD";
let abaProjetosAtual = "ATIVOS";
let projetoDetalheSelecionado = null;
let tarefasProjetoDetalhe = [];
let usuariosProjetoDetalhe = [];
let subitensTarefaSelecionada = [];
let subitemEdicaoId = null;
let comentariosTarefaSelecionada = [];
let historicoTarefaSelecionada = [];
let modoCartao = localStorage.getItem("taskflow_modo_cartao") || "DETALHADO";
let abaModalAtiva = "DETALHES";
let resolverConfirmacao = null;

// ==========================
// INICIALIZAÇÃO
// ==========================

window.onload = async () => {
    const token = localStorage.getItem("token");

    if (token) {
        usuarioLogado = obterUsuarioDoToken();

        mostrarDashboard();

        aplicarPermissoesInterface();

        await buscarTarefas();

        if (isAdmin()) {
            await carregarUsuariosAdmin();
            await carregarProjetosAdmin();
        }

        if (isSuperAdmin()) {
            await carregarAdminsSuper();
        }
    }
};

// ==========================
// LOGIN
// ==========================

async function login() {
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value.trim();
    const mensagem = document.getElementById("loginMensagem");

    mensagem.innerText = "";

    if (!email || !senha) {
        mensagem.innerText = "Informe e-mail e senha.";
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                senha
            })
        });

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro no login:", erro);
            throw new Error("E-mail ou senha inválidos.");
        }

        const data = await response.json();

        localStorage.setItem("token", data.token);

        usuarioLogado = obterUsuarioDoToken();

        mostrarDashboard();

        aplicarPermissoesInterface();

        await buscarTarefas();

        if (isAdmin()) {
            await carregarUsuariosAdmin();
            await carregarProjetosAdmin();
        }

        if (isSuperAdmin()) {
            await carregarAdminsSuper();
        }

        mostrarToast("Login realizado com sucesso.");

    } catch (error) {
        mensagem.innerText = error.message;
    }
}

// ==========================
// LOGOUT
// ==========================

function logout() {
    localStorage.removeItem("token");

    usuarioLogado = null;
    usuariosAdmin = [];
    adminsSuper = [];
    projetosAdmin = [];
    todasTarefas = [];

    loginSection.classList.remove("hidden");
    dashboardSection.classList.add("hidden");
}

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

// ==========================
// TOKEN / PERFIL
// ==========================

function getToken() {
    return localStorage.getItem("token");
}

function authHeaders() {
    return {
        "Authorization": `Bearer ${getToken()}`
    };
}

function tratarSessao(response) {
    if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error("Sessão expirada ou acesso não permitido. Faça login novamente.");
    }
}

function obterUsuarioDoToken() {
    const token = getToken();

    if (!token) {
        return null;
    }

    try {
        let payloadBase64 = token.split(".")[1];

        payloadBase64 = payloadBase64
            .replace(/-/g, "+")
            .replace(/_/g, "/");

        while (payloadBase64.length % 4) {
            payloadBase64 += "=";
        }

        const payloadJson = decodeURIComponent(
            atob(payloadBase64)
                .split("")
                .map(char => {
                    return "%" + ("00" + char.charCodeAt(0).toString(16)).slice(-2);
                })
                .join("")
        );

        return JSON.parse(payloadJson);

    } catch (error) {
        console.error("Erro ao decodificar token:", error);
        return null;
    }
}

function isAdmin() {
    return usuarioLogado && usuarioLogado.perfil === "ADMIN";
}

function isSuperAdmin() {
    return usuarioLogado && usuarioLogado.perfil === "SUPER_ADMIN";
}

function aplicarPermissoesInterface() {
    document.querySelectorAll(".admin-only").forEach(elemento => {
        if (isAdmin()) {
            elemento.classList.remove("hidden");
        } else {
            elemento.classList.add("hidden");
        }
    });

    document.querySelectorAll(".super-admin-only").forEach(elemento => {
        if (isSuperAdmin()) {
            elemento.classList.remove("hidden");
        } else {
            elemento.classList.add("hidden");
        }
    });

    mostrarPagina(paginaAtual || "BOARD");
}

// ==========================
// CRIAR TAREFA
// ==========================

async function criarTarefa() {
    const titulo = document.getElementById("titulo").value.trim();
    const descricao = document.getElementById("descricao").value.trim();
    const prioridade = document.getElementById("prioridade").value;
    const prazo = document.getElementById("prazo").value;
    const observacoes = document.getElementById("observacoes").value.trim();

    const responsavelUsuarioId = document.getElementById("responsavelUsuarioId")?.value || "";
    const projetoId = document.getElementById("projetoTarefaId")?.value || "";

    if (!titulo) {
        mostrarToast("Informe o título da tarefa.", "erro");
        return;
    }

    if (isAdmin() && projetoId && !responsavelUsuarioId) {
        mostrarToast("Para criar tarefa em projeto, selecione um responsável.", "erro");
        return;
    }

    const tarefaPayload = {
        titulo,
        descricao,
        prioridade,
        prazo: prazo || null,
        observacoes
    };

    let url = `${API_URL}/api/tarefas/minhas`;

    if (isAdmin() && responsavelUsuarioId && projetoId) {
        url = `${API_URL}/api/admin/tarefas/projeto/${projetoId}/usuario/${responsavelUsuarioId}`;
    } else if (isAdmin() && responsavelUsuarioId) {
        url = `${API_URL}/api/admin/tarefas/usuario/${responsavelUsuarioId}`;
    }

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders()
            },
            body: JSON.stringify(tarefaPayload)
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao criar tarefa:", erro);
            throw new Error("Erro ao criar tarefa.");
        }

        limparFormulario();

        await buscarTarefas();

        mostrarToast(
            projetoId
                ? "Tarefa criada dentro do projeto."
                : responsavelUsuarioId
                    ? "Tarefa criada para o usuário selecionado."
                    : "Tarefa criada com sucesso."
        );

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

// ==========================
// BUSCAR TAREFAS
// ==========================

async function buscarTarefas() {
    const visao = document.getElementById("visaoTarefas")?.value || "MINHAS";

    let url = `${API_URL}/api/tarefas/minhas/filtro?page=0&size=100`;

    if (isAdmin()) {
        if (visao === "USUARIOS") {
            url = `${API_URL}/api/admin/tarefas`;
        } else if (visao.startsWith("USUARIO_")) {
            const usuarioId = visao.replace("USUARIO_", "");
            url = `${API_URL}/api/admin/tarefas/usuario/${usuarioId}`;
        } else if (visao.startsWith("PROJETO_")) {
            const projetoId = visao.replace("PROJETO_", "");
            url = `${API_URL}/api/admin/tarefas/projeto/${projetoId}`;
        }
    }

    try {
        const response = await fetch(url, {
            headers: authHeaders()
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao buscar tarefas:", erro);
            throw new Error("Erro ao carregar tarefas.");
        }

        const data = await response.json();

        if (Array.isArray(data)) {
            todasTarefas = data;
        } else {
            todasTarefas = data.content || [];
        }

        renderizarBoard();

        atualizarMetricas();
        renderizarDashboardHome();

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

// ==========================
// BOARD
// ==========================

function renderizarBoard() {
    const texto = document.getElementById("filtroTexto")?.value.toLowerCase() || "";
    const statusFiltro = document.getElementById("filtroStatus")?.value || "";
    const prioridadeFiltro = document.getElementById("filtroPrioridade")?.value || "";
    const prazoFiltro = document.getElementById("filtroPrazo")?.value || "";
    const ordenacao = document.getElementById("ordenacaoBoard")?.value || "RECENTES";

    let tarefasFiltradas = todasTarefas.filter(tarefa => {
        const titulo = tarefa.titulo?.toLowerCase() || "";
        const descricao = tarefa.descricao?.toLowerCase() || "";
        const projeto = tarefa.projetoNome?.toLowerCase() || "";
        const responsavel = tarefa.responsavel?.toLowerCase() || "";

        const bateTexto =
            titulo.includes(texto) ||
            descricao.includes(texto) ||
            projeto.includes(texto) ||
            responsavel.includes(texto);

        const bateStatus =
            !statusFiltro ||
            tarefa.status === statusFiltro;

        const batePrioridade =
            !prioridadeFiltro ||
            tarefa.prioridade === prioridadeFiltro;

        const batePrazo = filtrarPorPrazo(tarefa, prazoFiltro);

        return bateTexto && bateStatus && batePrioridade && batePrazo;
    });

    tarefasFiltradas = ordenarTarefas(tarefasFiltradas, ordenacao);

    const pendentes = tarefasFiltradas.filter(t => t.status === "PENDENTE");
    const andamento = tarefasFiltradas.filter(t => t.status === "EM_ANDAMENTO");
    const concluidas = tarefasFiltradas.filter(t => t.status === "CONCLUIDA");
    const canceladas = tarefasFiltradas.filter(t => t.status === "CANCELADA");

    renderizarColuna("colPendente", pendentes);
    renderizarColuna("colAndamento", andamento);
    renderizarColuna("colConcluida", concluidas);
    renderizarColuna("colCancelada", canceladas);

    document.getElementById("countPendente").innerText = pendentes.length;
    document.getElementById("countAndamento").innerText = andamento.length;
    document.getElementById("countConcluida").innerText = concluidas.length;
    document.getElementById("countCancelada").innerText = canceladas.length;
}

function renderizarColuna(idColuna, tarefas) {
    const coluna = document.getElementById(idColuna);

    coluna.innerHTML = "";

    if (tarefas.length === 0) {
        coluna.innerHTML = `
            <div class="empty-column">
                Nenhuma tarefa
            </div>
        `;
        return;
    }

    tarefas.forEach(tarefa => {
        coluna.innerHTML += criarCardTarefa(tarefa);
    });
}

function criarCardTarefa(tarefa) {
    const prazoInfo = obterInfoPrazo(tarefa.prazo, tarefa.status);
    const compacto = modoCartao === "COMPACTO";

    return `
        <article class="task-card ${compacto ? "compact" : ""} ${prazoInfo.classe}" draggable="true" ondragstart="arrastarTarefa(event, ${tarefa.id})" onclick="abrirModalTarefa(${tarefa.id})">

            <div class="task-title">
                ${escapeHtml(tarefa.titulo)}
            </div>

            ${compacto ? "" : `
                <div class="task-desc">
                    ${escapeHtml(tarefa.descricao || "Sem descrição informada.")}
                </div>
            `}

            <div class="task-meta">

                <span class="pill prio-${tarefa.prioridade}">
                    ${formatarTexto(tarefa.prioridade)}
                </span>

                <span class="pill date-pill ${prazoInfo.classe}">
                    ${prazoInfo.texto}
                </span>

                <span class="pill owner-pill">
                    ${escapeHtml(tarefa.responsavel || "Usuário")}
                </span>

                ${tarefa.projetoNome ? `
                    <span class="pill project-pill">
                        ${escapeHtml(tarefa.projetoNome)}
                    </span>
                ` : ""}

            </div>

            ${compacto ? "" : `
                <div class="task-actions" onclick="event.stopPropagation()">

                    ${botaoMover(tarefa, "PENDENTE", "Voltar")}

                    ${botaoMover(tarefa, "EM_ANDAMENTO", "Iniciar")}

                    ${botaoMover(tarefa, "CONCLUIDA", "Concluir")}

                    ${botaoMover(tarefa, "CANCELADA", "Cancelar")}

                    <button class="btn-delete" onclick="excluirTarefa(${tarefa.id})">
                        Excluir
                    </button>

                </div>
            `}

        </article>
    `;
}

function botaoMover(tarefa, status, label) {
    if (tarefa.status === status) {
        return "";
    }

    let classe = "btn-start";

    if (status === "CONCLUIDA") {
        classe = "btn-done";
    }

    if (status === "CANCELADA") {
        classe = "btn-cancel";
    }

    return `
        <button class="${classe}" onclick="alterarStatus(${tarefa.id}, '${status}')">
            ${label}
        </button>
    `;
}

// ==========================
// ALTERAR STATUS
// ==========================

async function alterarStatus(id, novoStatus) {
    try {
        const response = await fetch(
            `${API_URL}/api/tarefas/${id}/status?status=${novoStatus}`,
            {
                method: "PUT",
                headers: authHeaders()
            }
        );

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao alterar status:", erro);
            throw new Error("Erro ao alterar status.");
        }

        await buscarTarefas();

        if (tarefaSelecionada && tarefaSelecionada.id === id) {
            await carregarHistoricoTarefa(id);
        }

        mostrarToast("Status atualizado.");

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

// ==========================
// EXCLUIR TAREFA
// ==========================

async function excluirTarefa(id) {
    const confirmar = await confirmarAcao(
        "Excluir tarefa",
        "Deseja realmente excluir esta tarefa? Essa ação não poderá ser desfeita."
    );

    if (!confirmar) {
        return false;
    }

    try {
        const response = await fetch(`${API_URL}/api/tarefas/${id}`, {
            method: "DELETE",
            headers: authHeaders()
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao excluir tarefa:", erro);
            throw new Error("Erro ao excluir tarefa.");
        }

        await buscarTarefas();

        mostrarToast("Tarefa excluída.");

        return true;

    } catch (error) {
        mostrarToast(error.message, "erro");
        return false;
    }
}

// ==========================
// MODAL TAREFA
// ==========================

async function abrirModalTarefa(id) {
    const tarefa = todasTarefas.find(t => t.id === id)
        || tarefasProjetoDetalhe.find(t => t.id === id);

    if (!tarefa) {
        mostrarToast("Tarefa não encontrada.", "erro");
        return;
    }

    tarefaSelecionada = tarefa;

    sairModoEdicao();

    document.getElementById("modalTitulo").innerText =
        tarefa.titulo || "-";

    document.getElementById("modalDescricao").innerText =
        tarefa.descricao || "Sem descrição informada.";

    document.getElementById("modalProjeto").innerText =
        tarefa.projetoNome || "Sem projeto";

    document.getElementById("modalPrioridade").innerText =
        formatarTexto(tarefa.prioridade);

    document.getElementById("modalPrazo").innerText =
        tarefa.prazo ? formatarData(tarefa.prazo) : "Sem prazo";

    document.getElementById("modalResponsavel").innerText =
        tarefa.responsavel || "-";

    document.getElementById("modalObservacoes").innerText =
        tarefa.observacoes || "Sem observações registradas.";

    document.getElementById("modalStatus").innerText =
        formatarTexto(tarefa.status);

    document.getElementById("modalDataCriacao").innerText =
        tarefa.dataCriacao ? formatarDataHora(tarefa.dataCriacao) : "-";

    document.getElementById("modalDataConclusao").innerText =
        tarefa.dataConclusao ? formatarDataHora(tarefa.dataConclusao) : "-";

    const conclusaoBox = document.getElementById("modalConclusaoBox");

    if (tarefa.dataConclusao) {
        conclusaoBox.classList.remove("hidden");
    } else {
        conclusaoBox.classList.add("hidden");
    }

    preencherFormularioEdicao(tarefa);

    prepararFormularioSubitem();

    document.getElementById("modalTarefa").classList.remove("hidden");
    alternarAbaModal("DETALHES");

    await carregarSubitensTarefa(tarefa.id);
    await carregarComentariosTarefa(tarefa.id);
    await carregarHistoricoTarefa(tarefa.id);
}

function fecharModalTarefa() {
    document.getElementById("modalTarefa").classList.add("hidden");
    tarefaSelecionada = null;
    subitensTarefaSelecionada = [];
    subitemEdicaoId = null;
    comentariosTarefaSelecionada = [];
    historicoTarefaSelecionada = [];
    limparFormularioSubitem();
    limparFormularioComentario();
}

function preencherFormularioEdicao(tarefa) {
    document.getElementById("editTitulo").value =
        tarefa.titulo || "";

    document.getElementById("editDescricao").value =
        tarefa.descricao || "";

    document.getElementById("editPrioridade").value =
        tarefa.prioridade || "MEDIA";

    document.getElementById("editPrazo").value =
        tarefa.prazo || "";

    document.getElementById("editObservacoes").value =
        tarefa.observacoes || "";
}

function entrarModoEdicao() {
    if (!tarefaSelecionada) {
        return;
    }

    document.getElementById("modalVisualizacao").classList.add("hidden");
    document.getElementById("modalEdicao").classList.remove("hidden");

    document.getElementById("btnEditarModal").classList.add("hidden");
    document.getElementById("btnSalvarEdicao").classList.remove("hidden");
    document.getElementById("btnCancelarEdicao").classList.remove("hidden");

    document.querySelector(".modal-content").classList.add("editando");

    document.getElementById("editTitulo").focus();
}

function sairModoEdicao() {
    const visualizacao = document.getElementById("modalVisualizacao");
    const edicao = document.getElementById("modalEdicao");

    if (!visualizacao || !edicao) {
        return;
    }

    visualizacao.classList.remove("hidden");
    edicao.classList.add("hidden");

    document.getElementById("btnEditarModal").classList.remove("hidden");
    document.getElementById("btnSalvarEdicao").classList.add("hidden");
    document.getElementById("btnCancelarEdicao").classList.add("hidden");

    const modalContent = document.querySelector(".modal-content");

    if (modalContent) {
        modalContent.classList.remove("editando");
    }
}

async function salvarEdicaoTarefa() {
    if (!tarefaSelecionada) {
        mostrarToast("Nenhuma tarefa selecionada.", "erro");
        return;
    }

    const titulo = document.getElementById("editTitulo").value.trim();
    const descricao = document.getElementById("editDescricao").value.trim();
    const prioridade = document.getElementById("editPrioridade").value;
    const prazo = document.getElementById("editPrazo").value;
    const observacoes = document.getElementById("editObservacoes").value.trim();

    if (!titulo) {
        mostrarToast("O título da tarefa é obrigatório.", "erro");
        return;
    }

    const payload = {
        titulo,
        descricao,
        prioridade,
        prazo: prazo || null,
        observacoes
    };

    try {
        const response = await fetch(`${API_URL}/api/tarefas/${tarefaSelecionada.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders()
            },
            body: JSON.stringify(payload)
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao editar tarefa:", erro);
            throw new Error("Erro ao editar tarefa.");
        }

        const idAtualizado = tarefaSelecionada.id;

        await buscarTarefas();

        await abrirModalTarefa(idAtualizado);

        sairModoEdicao();

        if (tarefaSelecionada) {
            await carregarHistoricoTarefa(tarefaSelecionada.id);
        }

        mostrarToast("Tarefa atualizada com sucesso.");

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

async function alterarStatusModal(novoStatus) {
    if (!tarefaSelecionada) {
        return;
    }

    await alterarStatus(tarefaSelecionada.id, novoStatus);

    fecharModalTarefa();
}

async function excluirTarefaModal() {
    if (!tarefaSelecionada) {
        return;
    }

    const excluiu = await excluirTarefa(tarefaSelecionada.id);

    if (excluiu) {
        fecharModalTarefa();
    }
}

// ==========================
// ADMIN - USUÁRIOS
// ==========================

async function carregarUsuariosAdmin() {
    if (!isAdmin()) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/admin/usuarios`, {
            method: "GET",
            headers: authHeaders()
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao carregar usuários:", erro);
            throw new Error("Erro ao carregar usuários do administrador.");
        }

        usuariosAdmin = await response.json();

        renderizarUsuariosAdmin();

        popularSelectResponsaveis();

        popularVisaoTarefasAdmin();

        popularSelectUsuariosVinculo();

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

async function cadastrarUsuarioAdmin() {
    if (!isAdmin()) {
        mostrarToast("Acesso permitido apenas para administrador.", "erro");
        return;
    }

    const nome = document.getElementById("adminNomeUsuario").value.trim();
    const email = document.getElementById("adminEmailUsuario").value.trim();
    const senha = document.getElementById("adminSenhaUsuario").value.trim();

    if (!nome || !email || !senha) {
        mostrarToast("Preencha nome, e-mail e senha.", "erro");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/admin/usuarios`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders()
            },
            body: JSON.stringify({
                nome,
                email,
                senha
            })
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao cadastrar usuário:", erro);
            throw new Error("Erro ao cadastrar usuário.");
        }

        document.getElementById("adminNomeUsuario").value = "";
        document.getElementById("adminEmailUsuario").value = "";
        document.getElementById("adminSenhaUsuario").value = "";

        await carregarUsuariosAdmin();

        mostrarToast("Usuário cadastrado com sucesso.");

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

function renderizarUsuariosAdmin() {
    const container = document.getElementById("adminUsuariosContainer");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (!usuariosAdmin || usuariosAdmin.length === 0) {
        container.innerHTML = `
            <div class="admin-empty">
                Nenhum usuário cadastrado por este administrador.
            </div>
        `;
        return;
    }

    usuariosAdmin.forEach(usuario => {
        const ativo = usuario.ativo === true;

        container.innerHTML += `
            <div class="usuario-row ${ativo ? "" : "inativo"}">

                <div class="usuario-info">

                    <div class="usuario-avatar">
                        ${obterIniciais(usuario.nome)}
                    </div>

                    <div>
                        <strong>${escapeHtml(usuario.nome)}</strong>
                        <small>${escapeHtml(usuario.email)}</small>
                    </div>

                </div>

                <div class="usuario-actions">

                    <span class="status-usuario ${ativo ? "ativo" : "inativo"}">
                        ${ativo ? "Ativo" : "Inativo"}
                    </span>

                    <button
                        class="btn-small"
                        onclick="selecionarResponsavelAdmin(${usuario.id})"
                        ${ativo ? "" : "disabled"}
                    >
                        Criar tarefa
                    </button>

                    <button
                        class="btn-small neutral"
                        onclick="selecionarVisaoUsuario(${usuario.id})"
                    >
                        Ver tarefas
                    </button>

                    <button
                        class="btn-small warning"
                        onclick="abrirModalEditarUsuarioPainel('ADMIN_USUARIO', ${usuario.id})"
                    >
                        Editar
                    </button>

                    ${
                        ativo
                            ? `
                                <button
                                    class="btn-small danger"
                                    onclick="inativarUsuarioPainel('ADMIN_USUARIO', ${usuario.id})"
                                >
                                    Inativar
                                </button>
                              `
                            : `
                                <button
                                    class="btn-small success"
                                    onclick="reativarUsuarioPainel('ADMIN_USUARIO', ${usuario.id})"
                                >
                                    Reativar
                                </button>
                              `
                    }

                </div>

            </div>
        `;
    });
}

function popularSelectResponsaveis() {
    const select = document.getElementById("responsavelUsuarioId");

    if (!select) {
        return;
    }

    select.innerHTML = `
        <option value="">
            Minha tarefa
        </option>
    `;

    usuariosAdmin
        .filter(usuario => usuario.ativo === true)
        .forEach(usuario => {
            select.innerHTML += `
                <option value="${usuario.id}">
                    ${escapeHtml(usuario.nome)} - ${escapeHtml(usuario.email)}
                </option>
            `;
        });
}

function popularVisaoTarefasAdmin() {
    const select = document.getElementById("visaoTarefas");

    if (!select) {
        return;
    }

    const valorAtual = select.value || "MINHAS";

    select.innerHTML = `
        <option value="MINHAS">
            Minhas tarefas
        </option>

        <option value="USUARIOS">
            Tarefas dos meus usuários
        </option>
    `;

    usuariosAdmin.forEach(usuario => {
        select.innerHTML += `
            <option value="USUARIO_${usuario.id}">
                Usuário: ${escapeHtml(usuario.nome)}
            </option>
        `;
    });

    projetosAdmin
        .filter(projeto => projeto.ativo === true)
        .forEach(projeto => {
            select.innerHTML += `
                <option value="PROJETO_${projeto.id}">
                    Projeto: ${escapeHtml(projeto.nome)}
                </option>
            `;
        });

    const existeValorAtual = Array.from(select.options)
        .some(option => option.value === valorAtual);

    select.value = existeValorAtual ? valorAtual : "MINHAS";
}

function selecionarResponsavelAdmin(usuarioId) {
    const usuario = usuariosAdmin.find(u => u.id === usuarioId);

    if (!usuario) {
        mostrarToast("Usuário não encontrado.", "erro");
        return;
    }

    if (!usuario.ativo) {
        mostrarToast("Usuário inativo não pode receber nova tarefa.", "erro");
        return;
    }

    const select = document.getElementById("responsavelUsuarioId");

    if (select) {
        select.value = usuarioId;
    }

    focarNovaTarefa();

    mostrarToast("Responsável selecionado para nova tarefa.");
}

async function selecionarVisaoUsuario(usuarioId) {
    const select = document.getElementById("visaoTarefas");

    if (select) {
        select.value = `USUARIO_${usuarioId}`;
    }

    await buscarTarefas();

    mostrarToast("Visualização alterada para o usuário selecionado.");
}

// ==========================
// PROJETOS
// ==========================

async function carregarProjetosAdmin() {
    if (!isAdmin()) {
        return;
    }

    try {
        const [ativosResponse, inativosResponse] = await Promise.all([
            fetch(`${API_URL}/api/admin/projetos?ativo=true`, {
                method: "GET",
                headers: authHeaders()
            }),
            fetch(`${API_URL}/api/admin/projetos?ativo=false`, {
                method: "GET",
                headers: authHeaders()
            })
        ]);

        tratarSessao(ativosResponse);
        tratarSessao(inativosResponse);

        if (!ativosResponse.ok) {
            const erro = await ativosResponse.text();
            console.error("Erro backend ao carregar projetos ativos:", erro);
            throw new Error("Erro ao carregar projetos ativos.");
        }

        if (!inativosResponse.ok) {
            const erro = await inativosResponse.text();
            console.error("Erro backend ao carregar projetos inativos:", erro);
            throw new Error("Erro ao carregar projetos inativos.");
        }

        const projetosAtivos = await ativosResponse.json();
        const projetosInativos = await inativosResponse.json();

        projetosAdmin = [
            ...(Array.isArray(projetosAtivos) ? projetosAtivos : []),
            ...(Array.isArray(projetosInativos) ? projetosInativos : [])
        ];

        renderizarProjetosAdmin();

        popularSelectProjetos();

        popularVisaoTarefasAdmin();

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

async function cadastrarProjetoAdmin() {
    if (!isAdmin()) {
        mostrarToast("Acesso permitido apenas para administrador.", "erro");
        return;
    }

    const nome = document.getElementById("projetoNome").value.trim();
    const descricao = document.getElementById("projetoDescricao").value.trim();
    const status = document.getElementById("projetoStatus").value;
    const dataInicio = document.getElementById("projetoDataInicio").value;
    const dataFimPrevista = document.getElementById("projetoDataFimPrevista").value;

    if (!nome) {
        mostrarToast("Informe o nome do projeto.", "erro");
        return;
    }

    const payload = {
        nome,
        descricao,
        status,
        dataInicio: dataInicio || null,
        dataFimPrevista: dataFimPrevista || null
    };

    try {
        const response = await fetch(`${API_URL}/api/admin/projetos`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders()
            },
            body: JSON.stringify(payload)
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao criar projeto:", erro);
            throw new Error("Erro ao criar projeto.");
        }

        document.getElementById("projetoNome").value = "";
        document.getElementById("projetoDescricao").value = "";
        document.getElementById("projetoStatus").value = "PLANEJADO";
        document.getElementById("projetoDataInicio").value = "";
        document.getElementById("projetoDataFimPrevista").value = "";

        abaProjetosAtual = "ATIVOS";

        await carregarProjetosAdmin();

        mostrarPagina("PROJETOS");

        mostrarToast("Projeto criado com sucesso.");

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

function alternarAbaProjetos(tipo) {
    abaProjetosAtual = tipo;
    renderizarProjetosAdmin();
}

function atualizarContadoresProjetos() {
    const ativos = projetosAdmin.filter(projeto => projeto.ativo === true).length;
    const inativos = projetosAdmin.filter(projeto => projeto.ativo !== true).length;

    const countAtivos = document.getElementById("countProjetosAtivos");
    const countInativos = document.getElementById("countProjetosInativos");

    if (countAtivos) {
        countAtivos.innerText = ativos;
    }

    if (countInativos) {
        countInativos.innerText = inativos;
    }
}

function renderizarProjetosAdmin() {
    const container = document.getElementById("projetosContainer");

    if (!container) {
        return;
    }

    atualizarContadoresProjetos();

    const tabAtivos = document.getElementById("tabProjetosAtivos");
    const tabInativos = document.getElementById("tabProjetosInativos");
    const titulo = document.getElementById("tituloListaProjetos");
    const descricao = document.getElementById("descricaoListaProjetos");

    tabAtivos?.classList.toggle("active", abaProjetosAtual === "ATIVOS");
    tabInativos?.classList.toggle("active", abaProjetosAtual === "INATIVOS");

    if (titulo) {
        titulo.innerText = abaProjetosAtual === "ATIVOS"
            ? "Projetos ativos"
            : "Projetos inativos / arquivados";
    }

    if (descricao) {
        descricao.innerText = abaProjetosAtual === "ATIVOS"
            ? "Projetos ativos aparecem na rotina principal de trabalho."
            : "Projetos inativos ficam preservados como histórico, sem poluir a rotina principal.";
    }

    const projetosFiltrados = projetosAdmin.filter(projeto => {
        const ativo = projeto.ativo === true;
        return abaProjetosAtual === "ATIVOS" ? ativo : !ativo;
    });

    container.innerHTML = "";

    if (!projetosFiltrados || projetosFiltrados.length === 0) {
        container.innerHTML = `
            <div class="admin-empty">
                ${abaProjetosAtual === "ATIVOS"
                    ? "Nenhum projeto ativo carregado."
                    : "Nenhum projeto inativo/arquivado carregado."}
            </div>
        `;
        return;
    }

    projetosFiltrados.forEach(projeto => {
        const ativo = projeto.ativo === true;

        container.innerHTML += `
            <div class="projeto-card ${ativo ? "" : "inativo"}">

                <div class="projeto-card-header">

                    <div>
                        <h3>${escapeHtml(projeto.nome)}</h3>
                        <p>${escapeHtml(projeto.descricao || "Sem descrição informada.")}</p>
                    </div>

                    <span class="status-projeto ${projeto.status}">
                        ${formatarTexto(projeto.status)}
                    </span>

                </div>

                <div class="projeto-meta">

                    <span class="pill owner-pill">
                        Usuários: ${projeto.totalUsuarios || 0}
                    </span>

                    <span class="pill date-pill">
                        Tarefas: ${projeto.totalTarefas || 0}
                    </span>

                    <span class="pill cost-pill">
                        Estimado: ${formatarMoeda(projeto.custoEstimadoTotal || 0)}
                    </span>

                    <span class="pill cost-pill real">
                        Real: ${formatarMoeda(projeto.custoRealTotal || 0)}
                    </span>

                    <span class="status-usuario ${ativo ? "ativo" : "inativo"}">
                        ${ativo ? "Ativo" : "Arquivado"}
                    </span>

                </div>

                ${renderizarResumoProjetoCard(projeto)}

                <div class="usuario-actions">

                    <button
                        class="btn-small"
                        onclick="abrirDetalheProjeto(${projeto.id})"
                    >
                        ${ativo ? "Abrir projeto" : "Ver detalhes"}
                    </button>

                    <button
                        class="btn-small neutral"
                        onclick="selecionarProjetoNoBoard(${projeto.id})"
                    >
                        Abrir Kanban
                    </button>

                    <button
                        class="btn-small neutral"
                        onclick="selecionarProjetoParaTarefa(${projeto.id})"
                        ${ativo ? "" : "disabled"}
                    >
                        Usar na tarefa
                    </button>

                    ${
                        ativo
                            ? `
                                <button
                                    class="btn-small danger"
                                    onclick="inativarProjetoAdmin(${projeto.id})"
                                >
                                    Arquivar
                                </button>
                              `
                            : `
                                <button
                                    class="btn-small success"
                                    onclick="reativarProjetoAdmin(${projeto.id})"
                                >
                                    Reativar
                                </button>
                              `
                    }

                </div>

            </div>
        `;
    });
}

function popularSelectProjetos() {
    const projetoTarefaSelect = document.getElementById("projetoTarefaId");
    const projetoVinculoSelect = document.getElementById("projetoVinculoId");

    const projetosAtivos = projetosAdmin.filter(projeto => projeto.ativo === true);

    if (projetoTarefaSelect) {
        projetoTarefaSelect.innerHTML = `
            <option value="">
                Sem projeto
            </option>
        `;

        projetosAtivos.forEach(projeto => {
            projetoTarefaSelect.innerHTML += `
                <option value="${projeto.id}">
                    ${escapeHtml(projeto.nome)}
                </option>
            `;
        });
    }

    if (projetoVinculoSelect) {
        projetoVinculoSelect.innerHTML = `
            <option value="">
                Selecione um projeto
            </option>
        `;

        projetosAtivos.forEach(projeto => {
            projetoVinculoSelect.innerHTML += `
                <option value="${projeto.id}">
                    ${escapeHtml(projeto.nome)}
                </option>
            `;
        });
    }

    popularSelectUsuariosVinculo();
}

function popularSelectUsuariosVinculo() {
    const usuarioVinculoSelect = document.getElementById("usuarioVinculoId");

    if (!usuarioVinculoSelect) {
        return;
    }

    usuarioVinculoSelect.innerHTML = `
        <option value="">
            Selecione um usuário
        </option>
    `;

    usuariosAdmin
        .filter(usuario => usuario.ativo === true)
        .forEach(usuario => {
            usuarioVinculoSelect.innerHTML += `
                <option value="${usuario.id}">
                    ${escapeHtml(usuario.nome)} - ${escapeHtml(usuario.email)}
                </option>
            `;
        });
}

async function vincularUsuarioProjeto() {
    const projetoId = document.getElementById("projetoVinculoId").value;
    const usuarioId = document.getElementById("usuarioVinculoId").value;
    const papel = document.getElementById("papelVinculo").value;

    if (!projetoId || !usuarioId) {
        mostrarToast("Selecione projeto e usuário.", "erro");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/admin/projetos/${projetoId}/usuarios`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders()
            },
            body: JSON.stringify({
                usuarioId: Number(usuarioId),
                papel
            })
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao vincular usuário ao projeto:", erro);
            throw new Error("Erro ao vincular usuário ao projeto.");
        }

        await carregarProjetosAdmin();

        mostrarToast("Usuário vinculado ao projeto.");

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

async function selecionarProjetoNoBoard(projetoId) {
    const select = document.getElementById("visaoTarefas");

    if (select) {
        select.value = `PROJETO_${projetoId}`;
    }

    mostrarPagina("BOARD");

    await buscarTarefas();

    mostrarToast("Kanban filtrado pelo projeto.");
}

function selecionarProjetoParaTarefa(projetoId) {
    const projeto = projetosAdmin.find(p => p.id === projetoId);

    if (projeto && projeto.ativo !== true) {
        mostrarToast("Projeto arquivado não pode receber nova tarefa.", "erro");
        return;
    }

    const select = document.getElementById("projetoTarefaId");

    if (select) {
        select.value = projetoId;
    }

    focarNovaTarefa();

    mostrarToast("Projeto selecionado para nova tarefa.");
}

async function inativarProjetoAdmin(projetoId) {
    const confirmar = confirm("Deseja arquivar este projeto? Ele não será excluído e ficará disponível em Projetos inativos.");

    if (!confirmar) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/admin/projetos/${projetoId}/inativar`, {
            method: "PATCH",
            headers: authHeaders()
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao arquivar projeto:", erro);
            throw new Error("Erro ao arquivar projeto.");
        }

        await carregarProjetosAdmin();

        mostrarToast("Projeto arquivado.");

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

async function reativarProjetoAdmin(projetoId) {
    try {
        const response = await fetch(`${API_URL}/api/admin/projetos/${projetoId}/reativar`, {
            method: "PATCH",
            headers: authHeaders()
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao reativar projeto:", erro);
            throw new Error("Erro ao reativar projeto.");
        }

        abaProjetosAtual = "ATIVOS";

        await carregarProjetosAdmin();

        mostrarToast("Projeto reativado.");

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

async function abrirDetalheProjeto(projetoId) {
    if (!isAdmin()) {
        mostrarToast("Acesso permitido apenas para administrador.", "erro");
        return;
    }

    try {
        let projeto = projetosAdmin.find(p => p.id === projetoId);

        if (!projeto) {
            const response = await fetch(`${API_URL}/api/admin/projetos/${projetoId}`, {
                method: "GET",
                headers: authHeaders()
            });

            tratarSessao(response);

            if (!response.ok) {
                throw new Error("Erro ao abrir projeto.");
            }

            projeto = await response.json();
        }

        projetoDetalheSelecionado = projeto;

        await recarregarDetalheProjeto();

        mostrarPagina("PROJETO_DETALHE");

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

async function recarregarDetalheProjeto() {
    if (!projetoDetalheSelecionado) {
        return;
    }

    const projetoId = projetoDetalheSelecionado.id;

    try {
        const [projetoResponse, usuariosResponse, tarefasResponse] = await Promise.all([
            fetch(`${API_URL}/api/admin/projetos/${projetoId}`, {
                method: "GET",
                headers: authHeaders()
            }),
            fetch(`${API_URL}/api/admin/projetos/${projetoId}/usuarios`, {
                method: "GET",
                headers: authHeaders()
            }),
            fetch(`${API_URL}/api/admin/tarefas/projeto/${projetoId}`, {
                method: "GET",
                headers: authHeaders()
            })
        ]);

        tratarSessao(projetoResponse);
        tratarSessao(usuariosResponse);
        tratarSessao(tarefasResponse);

        if (projetoResponse.ok) {
            projetoDetalheSelecionado = await projetoResponse.json();
        }

        usuariosProjetoDetalhe = usuariosResponse.ok ? await usuariosResponse.json() : [];

        if (tarefasResponse.ok) {
            const data = await tarefasResponse.json();
            tarefasProjetoDetalhe = Array.isArray(data) ? data : (data.content || []);
        } else {
            tarefasProjetoDetalhe = [];
        }

        renderizarDetalheProjeto();

    } catch (error) {
        mostrarToast("Erro ao carregar detalhes do projeto.", "erro");
    }
}

function renderizarDetalheProjeto() {
    const projeto = projetoDetalheSelecionado;

    if (!projeto) {
        return;
    }

    const nome = document.getElementById("detalheProjetoNome");
    const descricao = document.getElementById("detalheProjetoDescricao");
    const status = document.getElementById("detalheProjetoStatus");
    const totalUsuarios = document.getElementById("detalheProjetoUsuariosTotal");
    const totalTarefas = document.getElementById("detalheProjetoTarefasTotal");
    const dataInicio = document.getElementById("detalheProjetoDataInicio");
    const dataFim = document.getElementById("detalheProjetoDataFim");
    const custoEstimado = document.getElementById("detalheProjetoCustoEstimado");
    const custoReal = document.getElementById("detalheProjetoCustoReal");
    const diferencaCusto = document.getElementById("detalheProjetoDiferencaCusto");

    if (nome) nome.innerText = projeto.nome || "-";
    if (descricao) descricao.innerText = projeto.descricao || "Sem descrição informada.";

    if (status) {
        status.className = `status-projeto ${projeto.status || ""}`;
        status.innerText = formatarTexto(projeto.status || "-");
    }

    if (totalUsuarios) totalUsuarios.innerText = usuariosProjetoDetalhe.length || projeto.totalUsuarios || 0;
    if (totalTarefas) totalTarefas.innerText = tarefasProjetoDetalhe.length || projeto.totalTarefas || 0;
    if (custoEstimado) custoEstimado.innerText = formatarMoeda(projeto.custoEstimadoTotal || 0);
    if (custoReal) custoReal.innerText = formatarMoeda(projeto.custoRealTotal || 0);
    if (diferencaCusto) diferencaCusto.innerText = formatarMoeda(projeto.diferencaCustoTotal || 0);
    if (dataInicio) dataInicio.innerText = projeto.dataInicio ? formatarData(projeto.dataInicio) : "-";
    if (dataFim) dataFim.innerText = projeto.dataFimPrevista ? formatarData(projeto.dataFimPrevista) : "-";

    renderizarKanbanDetalheProjeto();
    renderizarUsuariosDetalheProjeto();
    renderizarTimelineDetalheProjeto();
}

function renderizarKanbanDetalheProjeto() {
    const container = document.getElementById("detalheProjetoKanban");

    if (!container) {
        return;
    }

    const grupos = [
        { status: "PENDENTE", titulo: "Pendente" },
        { status: "EM_ANDAMENTO", titulo: "Em andamento" },
        { status: "CONCLUIDA", titulo: "Concluída" },
        { status: "CANCELADA", titulo: "Cancelada" }
    ];

    container.innerHTML = grupos.map(grupo => {
        const tarefas = tarefasProjetoDetalhe.filter(tarefa => tarefa.status === grupo.status);

        const cards = tarefas.length === 0
            ? `<div class="empty-column">Nenhuma tarefa</div>`
            : tarefas.map(tarefa => `
                <div class="mini-task" onclick="abrirModalTarefa(${tarefa.id})">
                    <strong>${escapeHtml(tarefa.titulo || "Sem título")}</strong>
                    <small>${escapeHtml(tarefa.responsavel || "Sem responsável")} • ${formatarTexto(tarefa.prioridade || "MEDIA")}</small>
                </div>
            `).join("");

        return `
            <div class="mini-kanban-col">
                <h3>${grupo.titulo} (${tarefas.length})</h3>
                ${cards}
            </div>
        `;
    }).join("");
}

function renderizarUsuariosDetalheProjeto() {
    const container = document.getElementById("detalheProjetoUsuarios");

    if (!container) {
        return;
    }

    if (!usuariosProjetoDetalhe || usuariosProjetoDetalhe.length === 0) {
        container.innerHTML = `
            <div class="admin-empty">
                Nenhum usuário vinculado a este projeto.
            </div>
        `;
        return;
    }

    container.innerHTML = usuariosProjetoDetalhe.map(vinculo => `
        <div class="usuario-card">
            <div>
                <h3>${escapeHtml(vinculo.usuarioNome || vinculo.nome || "Usuário")}</h3>
                <p>${escapeHtml(vinculo.usuarioEmail || vinculo.email || "")}</p>
            </div>

            <span class="status-usuario ativo">
                ${formatarTexto(vinculo.papel || "MEMBRO")}
            </span>
        </div>
    `).join("");
}

function renderizarTimelineDetalheProjeto() {
    const container = document.getElementById("detalheProjetoTimeline");
    const projeto = projetoDetalheSelecionado;

    if (!container || !projeto) {
        return;
    }

    container.innerHTML = `
        <div class="timeline-item">
            Projeto criado em ${projeto.dataCriacao ? formatarDataHora(projeto.dataCriacao) : "data não informada"}.
        </div>

        <div class="timeline-item">
            Status atual: ${formatarTexto(projeto.status || "-")}.
        </div>

        <div class="timeline-item">
            Total atual: ${tarefasProjetoDetalhe.length || 0} tarefa(s) e ${usuariosProjetoDetalhe.length || 0} usuário(s) vinculado(s).
        </div>

        <div class="timeline-item">
            Custo estimado: ${formatarMoeda(projeto.custoEstimadoTotal || 0)} | Custo real: ${formatarMoeda(projeto.custoRealTotal || 0)} | Diferença: ${formatarMoeda(projeto.diferencaCustoTotal || 0)}.
        </div>
    `;
}

function voltarParaProjetos() {
    projetoDetalheSelecionado = null;
    tarefasProjetoDetalhe = [];
    usuariosProjetoDetalhe = [];

    mostrarPagina("PROJETOS");
}

function criarTarefaNoProjetoDetalhe() {
    if (!projetoDetalheSelecionado) {
        return;
    }

    selecionarProjetoParaTarefa(projetoDetalheSelecionado.id);
}

// ==========================
// SUPER ADMIN
// ==========================

async function carregarAdminsSuper() {
    if (!isSuperAdmin()) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/super-admin/admins`, {
            method: "GET",
            headers: authHeaders()
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao carregar administradores:", erro);
            throw new Error("Erro ao carregar administradores.");
        }

        adminsSuper = await response.json();

        renderizarAdminsSuper();

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

async function cadastrarAdminSuper() {
    if (!isSuperAdmin()) {
        mostrarToast("Acesso permitido apenas para SUPER_ADMIN.", "erro");
        return;
    }

    const nome = document.getElementById("superNomeAdmin").value.trim();
    const email = document.getElementById("superEmailAdmin").value.trim();
    const senha = document.getElementById("superSenhaAdmin").value.trim();

    if (!nome || !email || !senha) {
        mostrarToast("Preencha nome, e-mail e senha.", "erro");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/super-admin/admins`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders()
            },
            body: JSON.stringify({
                nome,
                email,
                senha
            })
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao cadastrar ADMIN:", erro);
            throw new Error("Erro ao cadastrar administrador.");
        }

        document.getElementById("superNomeAdmin").value = "";
        document.getElementById("superEmailAdmin").value = "";
        document.getElementById("superSenhaAdmin").value = "";

        await carregarAdminsSuper();

        mostrarToast("Administrador cadastrado com sucesso.");

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

function renderizarAdminsSuper() {
    const container = document.getElementById("superAdminsContainer");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (!adminsSuper || adminsSuper.length === 0) {
        container.innerHTML = `
            <div class="admin-empty">
                Nenhum administrador cadastrado por este SUPER_ADMIN.
            </div>
        `;
        return;
    }

    adminsSuper.forEach(admin => {
        const ativo = admin.ativo === true;

        container.innerHTML += `
            <div class="usuario-row ${ativo ? "" : "inativo"}">

                <div class="usuario-info">

                    <div class="usuario-avatar">
                        ${obterIniciais(admin.nome)}
                    </div>

                    <div>
                        <strong>${escapeHtml(admin.nome)}</strong>
                        <small>${escapeHtml(admin.email)}</small>
                    </div>

                </div>

                <div class="usuario-actions">

                    <span class="pill owner-pill">
                        ADMIN
                    </span>

                    <span class="status-usuario ${ativo ? "ativo" : "inativo"}">
                        ${ativo ? "Ativo" : "Inativo"}
                    </span>

                    <button
                        class="btn-small warning"
                        onclick="abrirModalEditarUsuarioPainel('SUPER_ADMIN_ADMIN', ${admin.id})"
                    >
                        Editar
                    </button>

                    ${
                        ativo
                            ? `
                                <button
                                    class="btn-small danger"
                                    onclick="inativarUsuarioPainel('SUPER_ADMIN_ADMIN', ${admin.id})"
                                >
                                    Inativar
                                </button>
                              `
                            : `
                                <button
                                    class="btn-small success"
                                    onclick="reativarUsuarioPainel('SUPER_ADMIN_ADMIN', ${admin.id})"
                                >
                                    Reativar
                                </button>
                              `
                    }

                </div>

            </div>
        `;
    });
}

// ==========================
// EDITAR / INATIVAR / REATIVAR USUÁRIO OU ADMIN
// ==========================

function abrirModalEditarUsuarioPainel(tipo, id) {
    let registro = null;

    if (tipo === "ADMIN_USUARIO") {
        registro = usuariosAdmin.find(usuario => usuario.id === id);
    }

    if (tipo === "SUPER_ADMIN_ADMIN") {
        registro = adminsSuper.find(admin => admin.id === id);
    }

    if (!registro) {
        mostrarToast("Registro não encontrado.", "erro");
        return;
    }

    usuarioEdicaoContexto = {
        tipo,
        id
    };

    document.getElementById("editUsuarioNome").value = registro.nome || "";
    document.getElementById("editUsuarioEmail").value = registro.email || "";
    document.getElementById("editUsuarioSenha").value = "";

    if (tipo === "ADMIN_USUARIO") {
        document.getElementById("modalUsuarioTipo").innerText = "Usuário";
        document.getElementById("modalUsuarioTitulo").innerText = "Editar usuário";
    }

    if (tipo === "SUPER_ADMIN_ADMIN") {
        document.getElementById("modalUsuarioTipo").innerText = "Administrador";
        document.getElementById("modalUsuarioTitulo").innerText = "Editar administrador";
    }

    document.getElementById("modalUsuario").classList.remove("hidden");

    setTimeout(() => {
        document.getElementById("editUsuarioNome").focus();
    }, 100);
}

function fecharModalUsuario() {
    document.getElementById("modalUsuario").classList.add("hidden");
    usuarioEdicaoContexto = null;
}

async function salvarEdicaoUsuarioPainel() {
    if (!usuarioEdicaoContexto) {
        mostrarToast("Nenhum registro selecionado.", "erro");
        return;
    }

    const contextoAtual = { ...usuarioEdicaoContexto };

    const nome = document.getElementById("editUsuarioNome").value.trim();
    const email = document.getElementById("editUsuarioEmail").value.trim();
    const senha = document.getElementById("editUsuarioSenha").value.trim();

    if (!nome || !email) {
        mostrarToast("Nome e e-mail são obrigatórios.", "erro");
        return;
    }

    if (senha && senha.length < 8) {
        mostrarToast("A senha deve ter pelo menos 8 caracteres.", "erro");
        return;
    }

    const payload = {
        nome,
        email
    };

    if (senha) {
        payload.senha = senha;
    }

    let url = "";

    if (contextoAtual.tipo === "ADMIN_USUARIO") {
        url = `${API_URL}/api/admin/usuarios/${contextoAtual.id}`;
    }

    if (contextoAtual.tipo === "SUPER_ADMIN_ADMIN") {
        url = `${API_URL}/api/super-admin/admins/${contextoAtual.id}`;
    }

    try {
        const response = await fetch(url, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders()
            },
            body: JSON.stringify(payload)
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao editar registro:", erro);
            throw new Error("Erro ao salvar alterações.");
        }

        fecharModalUsuario();

        if (contextoAtual.tipo === "ADMIN_USUARIO") {
            await carregarUsuariosAdmin();
        }

        if (contextoAtual.tipo === "SUPER_ADMIN_ADMIN") {
            await carregarAdminsSuper();
        }

        mostrarToast("Alterações salvas com sucesso.");

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

async function inativarUsuarioPainel(tipo, id) {
    const confirmar = await confirmarAcao(
        "Inativar registro",
        "Deseja realmente inativar este registro? Ele poderá ser reativado depois."
    );

    if (!confirmar) {
        return;
    }

    let url = "";

    if (tipo === "ADMIN_USUARIO") {
        url = `${API_URL}/api/admin/usuarios/${id}`;
    }

    if (tipo === "SUPER_ADMIN_ADMIN") {
        url = `${API_URL}/api/super-admin/admins/${id}`;
    }

    try {
        const response = await fetch(url, {
            method: "DELETE",
            headers: authHeaders()
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao inativar:", erro);
            throw new Error("Erro ao inativar registro.");
        }

        if (tipo === "ADMIN_USUARIO") {
            await carregarUsuariosAdmin();
        }

        if (tipo === "SUPER_ADMIN_ADMIN") {
            await carregarAdminsSuper();
        }

        mostrarToast("Registro inativado com sucesso.");

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

async function reativarUsuarioPainel(tipo, id) {
    let url = "";

    if (tipo === "ADMIN_USUARIO") {
        url = `${API_URL}/api/admin/usuarios/${id}/reativar`;
    }

    if (tipo === "SUPER_ADMIN_ADMIN") {
        url = `${API_URL}/api/super-admin/admins/${id}/reativar`;
    }

    try {
        const response = await fetch(url, {
            method: "PATCH",
            headers: authHeaders()
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao reativar:", erro);
            throw new Error("Erro ao reativar registro.");
        }

        if (tipo === "ADMIN_USUARIO") {
            await carregarUsuariosAdmin();
        }

        if (tipo === "SUPER_ADMIN_ADMIN") {
            await carregarAdminsSuper();
        }

        mostrarToast("Registro reativado com sucesso.");

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}


// ==========================
// SUBITENS DA TAREFA
// ==========================

function prepararFormularioSubitem() {
    limparFormularioSubitem();
    popularSelectResponsaveisSubitem();
    renderizarSubitens();
}

function popularSelectResponsaveisSubitem() {
    const select = document.getElementById("subitemResponsavelId");

    if (!select) {
        return;
    }

    select.innerHTML = `
        <option value="">
            Responsável principal da tarefa
        </option>
    `;

    if (isAdmin()) {
        usuariosAdmin
            .filter(usuario => usuario.ativo === true)
            .forEach(usuario => {
                select.innerHTML += `
                    <option value="${usuario.id}">
                        ${escapeHtml(usuario.nome)} - ${escapeHtml(usuario.email)}
                    </option>
                `;
            });
    }
}

async function carregarSubitensTarefa(tarefaId) {
    const container = document.getElementById("subitensContainer");

    if (container) {
        container.innerHTML = `
            <div class="admin-empty">
                Carregando subitens...
            </div>
        `;
    }

    try {
        const response = await fetch(`${API_URL}/api/tarefas/${tarefaId}/itens`, {
            method: "GET",
            headers: authHeaders()
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao carregar subitens:", erro);
            throw new Error("Erro ao carregar subitens da tarefa.");
        }

        subitensTarefaSelecionada = await response.json();

        renderizarSubitens();

    } catch (error) {
        subitensTarefaSelecionada = [];
        renderizarSubitens();
        mostrarToast(error.message, "erro");
    }
}

function renderizarSubitens() {
    const container = document.getElementById("subitensContainer");
    const progressText = document.getElementById("subitemProgressText");
    const progressBar = document.getElementById("subitemProgressBar");
    const tabCount = document.getElementById("tabSubitensCount");

    if (!container) {
        return;
    }

    const total = subitensTarefaSelecionada.length;
    const concluidos = subitensTarefaSelecionada.filter(item => item.status === "CONCLUIDO").length;
    const percentual = total === 0 ? 0 : Math.round((concluidos / total) * 100);

    if (progressText) {
        progressText.innerText = `${concluidos} de ${total} concluídos — ${percentual}%`;
    }

    if (progressBar) {
        progressBar.style.width = `${percentual}%`;
    }

    if (tabCount) {
        tabCount.innerText = total;
    }

    container.innerHTML = "";

    if (total === 0) {
        container.innerHTML = `
            <div class="empty-state-card">
                <strong>Nenhum subitem cadastrado</strong>
                <span>Use o formulário acima para dividir esta tarefa em entregas menores.</span>
            </div>
        `;
        return;
    }

    const grupos = [
        { status: "PENDENTE", titulo: "Pendentes" },
        { status: "EM_ANDAMENTO", titulo: "Em andamento" },
        { status: "CONCLUIDO", titulo: "Concluídos" },
        { status: "CANCELADO", titulo: "Cancelados" }
    ];

    grupos.forEach(grupo => {
        const itens = subitensTarefaSelecionada.filter(item => item.status === grupo.status);

        if (itens.length === 0) {
            return;
        }

        container.innerHTML += `
            <div class="subitem-group">
                <div class="subitem-group-title">
                    <span>${grupo.titulo}</span>
                    <strong>${itens.length}</strong>
                </div>
            </div>
        `;

        itens.forEach(item => {
            const classeStatus = item.status === "CONCLUIDO"
                ? "concluido"
                : item.status === "CANCELADO"
                    ? "cancelado"
                    : "";

            const prazoInfo = obterInfoPrazo(item.prazo, item.status);
            const custoEstimado = Number(item.custoEstimado || 0);
            const custoReal = Number(item.custoReal || 0);
            const diferenca = custoReal - custoEstimado;

            container.innerHTML += `
                <div class="subitem-card premium ${classeStatus} ${prazoInfo.classe}">

                    <div class="subitem-top">

                        <div class="subitem-title-wrap">
                            <div class="subitem-title-line">
                                <span class="subitem-check">${item.status === "CONCLUIDO" ? "✓" : "•"}</span>
                                <div class="subitem-title">
                                    ${escapeHtml(item.titulo)}
                                </div>
                            </div>

                            <div class="subitem-description">
                                ${escapeHtml(item.descricao || "Sem descrição informada.")}
                            </div>
                        </div>

                        <span class="pill subitem-status ${item.status}">
                            ${formatarTexto(item.status)}
                        </span>

                    </div>

                    <div class="subitem-meta subitem-meta-grid">

                        <span class="pill owner-pill">
                            Responsável: ${escapeHtml(item.responsavelNome || "Responsável principal")}
                        </span>

                        <span class="pill date-pill ${prazoInfo.classe}">
                            ${prazoInfo.texto}
                        </span>

                        ${item.diasUteisPrevistos ? `
                            <span class="pill business-days-pill">
                                Dias úteis: ${item.diasUteisPrevistos}
                            </span>
                        ` : ""}

                        <span class="pill cost-pill">
                            Estimado: ${formatarMoeda(custoEstimado)}
                        </span>

                        <span class="pill cost-pill real">
                            Real: ${formatarMoeda(custoReal)}
                        </span>

                        <span class="pill ${diferenca > 0 ? "cost-bad" : diferenca < 0 ? "cost-good" : "owner-pill"}">
                            Dif.: ${formatarMoeda(diferenca)}
                        </span>

                        ${item.dataConclusao ? `
                            <span class="pill prio-BAIXA">
                                Concluído em: ${formatarDataHora(item.dataConclusao)}
                            </span>
                        ` : ""}

                    </div>

                    <div class="subitem-actions">

                        ${botaoStatusSubitem(item, "PENDENTE", "Voltar")}

                        ${botaoStatusSubitem(item, "EM_ANDAMENTO", "Iniciar")}

                        ${botaoStatusSubitem(item, "CONCLUIDO", "Concluir")}

                        ${botaoStatusSubitem(item, "CANCELADO", "Cancelar")}

                        <button class="btn-edit" onclick="editarSubitem(${item.id})">
                            Editar
                        </button>

                        <button class="btn-delete" onclick="excluirSubitem(${item.id})">
                            Excluir
                        </button>

                    </div>

                </div>
            `;
        });
    });
}

function botaoStatusSubitem(item, status, label) {
    if (item.status === status) {
        return "";
    }

    let classe = "btn-start";

    if (status === "CONCLUIDO") {
        classe = "btn-done";
    }

    if (status === "CANCELADO") {
        classe = "btn-cancel";
    }

    return `
        <button class="${classe}" onclick="alterarStatusSubitem(${item.id}, '${status}')">
            ${label}
        </button>
    `;
}

async function salvarSubitem() {
    if (!tarefaSelecionada) {
        mostrarToast("Nenhuma tarefa selecionada.", "erro");
        return;
    }

    const titulo = document.getElementById("subitemTitulo").value.trim();
    const descricao = document.getElementById("subitemDescricao").value.trim();
    const responsavelId = document.getElementById("subitemResponsavelId").value;
    const status = document.getElementById("subitemStatus").value;
    const prazo = document.getElementById("subitemPrazo").value;
    const diasUteisPrevistos = document.getElementById("subitemDiasUteisPrevistos")?.value;
    const custoEstimado = parseMoeda(document.getElementById("subitemCustoEstimado")?.value);
    const custoReal = parseMoeda(document.getElementById("subitemCustoReal")?.value);

    if (!titulo) {
        mostrarToast("Informe o título do subitem.", "erro");
        return;
    }

    const payload = {
        titulo,
        descricao,
        responsavelId: responsavelId ? Number(responsavelId) : null,
        status,
        prazo: prazo || null,
        diasUteisPrevistos: diasUteisPrevistos ? Number(diasUteisPrevistos) : null,
        custoEstimado: custoEstimado !== null ? custoEstimado : null,
        custoReal: custoReal !== null ? custoReal : null,
        ordem: subitemEdicaoId ? obterOrdemSubitemEmEdicao() : subitensTarefaSelecionada.length + 1
    };

    const editando = subitemEdicaoId !== null;
    const url = editando
        ? `${API_URL}/api/tarefas/itens/${subitemEdicaoId}`
        : `${API_URL}/api/tarefas/${tarefaSelecionada.id}/itens`;

    try {
        const response = await fetch(url, {
            method: editando ? "PUT" : "POST",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders()
            },
            body: JSON.stringify(payload)
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao salvar subitem:", erro);
            throw new Error("Erro ao salvar subitem.");
        }

        limparFormularioSubitem();

        await carregarSubitensTarefa(tarefaSelecionada.id);
        await carregarHistoricoTarefa(tarefaSelecionada.id);

        if (isAdmin()) {
            await carregarProjetosAdmin();
        }

        if (projetoDetalheSelecionado && tarefaSelecionada.projetoId === projetoDetalheSelecionado.id) {
            await recarregarDetalheProjeto();
        }

        mostrarToast(editando ? "Subitem atualizado." : "Subitem criado.");

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

function obterOrdemSubitemEmEdicao() {
    const item = subitensTarefaSelecionada.find(subitem => subitem.id === subitemEdicaoId);
    return item?.ordem || 1;
}

function editarSubitem(itemId) {
    const item = subitensTarefaSelecionada.find(subitem => subitem.id === itemId);

    if (!item) {
        mostrarToast("Subitem não encontrado.", "erro");
        return;
    }

    subitemEdicaoId = item.id;

    document.getElementById("subitemTitulo").value = item.titulo || "";
    document.getElementById("subitemDescricao").value = item.descricao || "";
    document.getElementById("subitemStatus").value = item.status || "PENDENTE";
    document.getElementById("subitemPrazo").value = item.prazo || "";

    const diasUteis = document.getElementById("subitemDiasUteisPrevistos");
    const custoEstimado = document.getElementById("subitemCustoEstimado");
    const custoReal = document.getElementById("subitemCustoReal");

    if (diasUteis) diasUteis.value = item.diasUteisPrevistos || "";
    if (custoEstimado) custoEstimado.value = item.custoEstimado != null ? formatarMoeda(item.custoEstimado) : "";
    if (custoReal) custoReal.value = item.custoReal != null ? formatarMoeda(item.custoReal) : "";

    popularSelectResponsaveisSubitem();

    const selectResponsavel = document.getElementById("subitemResponsavelId");

    if (selectResponsavel && item.responsavelId) {
        selectResponsavel.value = String(item.responsavelId);
    }

    document.getElementById("btnSalvarSubitem").innerText = "Salvar subitem";
    document.getElementById("btnCancelarSubitem").classList.remove("hidden");

    document.getElementById("subitemTitulo").focus();
}

function cancelarEdicaoSubitem() {
    limparFormularioSubitem();
}

function limparFormularioSubitem() {
    const titulo = document.getElementById("subitemTitulo");
    const descricao = document.getElementById("subitemDescricao");
    const responsavel = document.getElementById("subitemResponsavelId");
    const status = document.getElementById("subitemStatus");
    const prazo = document.getElementById("subitemPrazo");
    const diasUteis = document.getElementById("subitemDiasUteisPrevistos");
    const custoEstimado = document.getElementById("subitemCustoEstimado");
    const custoReal = document.getElementById("subitemCustoReal");
    const btnSalvar = document.getElementById("btnSalvarSubitem");
    const btnCancelar = document.getElementById("btnCancelarSubitem");

    subitemEdicaoId = null;

    if (titulo) titulo.value = "";
    if (descricao) descricao.value = "";
    if (responsavel) responsavel.value = "";
    if (status) status.value = "PENDENTE";
    if (prazo) prazo.value = "";
    if (diasUteis) diasUteis.value = "";
    if (custoEstimado) custoEstimado.value = "";
    if (custoReal) custoReal.value = "";

    if (btnSalvar) btnSalvar.innerText = "Adicionar subitem";
    if (btnCancelar) btnCancelar.classList.add("hidden");
}

async function alterarStatusSubitem(itemId, status) {
    if (!tarefaSelecionada) {
        mostrarToast("Nenhuma tarefa selecionada.", "erro");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/tarefas/itens/${itemId}/status?status=${status}`, {
            method: "PATCH",
            headers: authHeaders()
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao alterar status do subitem:", erro);
            throw new Error("Erro ao alterar status do subitem.");
        }

        await carregarSubitensTarefa(tarefaSelecionada.id);
        await carregarHistoricoTarefa(tarefaSelecionada.id);

        if (isAdmin()) {
            await carregarProjetosAdmin();
        }

        if (projetoDetalheSelecionado && tarefaSelecionada.projetoId === projetoDetalheSelecionado.id) {
            await recarregarDetalheProjeto();
        }

        mostrarToast("Status do subitem atualizado.");

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

async function excluirSubitem(itemId) {
    if (!tarefaSelecionada) {
        mostrarToast("Nenhuma tarefa selecionada.", "erro");
        return;
    }

    const confirmar = await confirmarAcao(
        "Excluir subitem",
        "Deseja realmente excluir este subitem? O histórico será preservado, mas o item será removido da lista ativa."
    );

    if (!confirmar) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/tarefas/itens/${itemId}`, {
            method: "DELETE",
            headers: authHeaders()
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao excluir subitem:", erro);
            throw new Error("Erro ao excluir subitem.");
        }

        await carregarSubitensTarefa(tarefaSelecionada.id);
        await carregarHistoricoTarefa(tarefaSelecionada.id);

        if (isAdmin()) {
            await carregarProjetosAdmin();
        }

        if (projetoDetalheSelecionado && tarefaSelecionada.projetoId === projetoDetalheSelecionado.id) {
            await recarregarDetalheProjeto();
        }

        mostrarToast("Subitem excluído.");

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}


// ==========================
// COMENTÁRIOS DA TAREFA
// ==========================

async function carregarComentariosTarefa(tarefaId) {
    const container = document.getElementById("comentariosContainer");

    if (container) {
        container.innerHTML = `
            <div class="admin-empty">
                Carregando comentários...
            </div>
        `;
    }

    try {
        const response = await fetch(`${API_URL}/api/tarefas/${tarefaId}/comentarios`, {
            method: "GET",
            headers: authHeaders()
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao carregar comentários:", erro);
            throw new Error("Erro ao carregar comentários da tarefa.");
        }

        comentariosTarefaSelecionada = await response.json();
        renderizarComentariosTarefa();

    } catch (error) {
        comentariosTarefaSelecionada = [];
        renderizarComentariosTarefa();
        mostrarToast(error.message, "erro");
    }
}

function renderizarComentariosTarefa() {
    const container = document.getElementById("comentariosContainer");
    const contador = document.getElementById("comentariosCount");

    if (!container) {
        return;
    }

    const comentariosAtivos = comentariosTarefaSelecionada.filter(comentario => comentario.ativo !== false);

    if (contador) {
        contador.innerText = `${comentariosAtivos.length} ${comentariosAtivos.length === 1 ? "comentário" : "comentários"}`;
    }

    const tabCount = document.getElementById("tabComentariosCount");
    if (tabCount) {
        tabCount.innerText = comentariosAtivos.length;
    }

    container.innerHTML = "";

    if (comentariosAtivos.length === 0) {
        container.innerHTML = `
            <div class="admin-empty">
                Nenhum comentário registrado para esta tarefa.
            </div>
        `;
        return;
    }

    comentariosAtivos.forEach(comentario => {
        const autor = comentario.autorNome || "Usuário";

        container.innerHTML += `
            <div class="comment-card">

                <div class="comment-card-header">

                    <div class="comment-author">
                        <span class="comment-avatar">
                            ${obterIniciais(autor)}
                        </span>

                        <div>
                            <strong>${escapeHtml(autor)}</strong>
                            <small>${escapeHtml(comentario.autorEmail || "")}</small>
                        </div>
                    </div>

                    <div>
                        <span class="comment-date">
                            ${comentario.dataCriacao ? formatarDataHora(comentario.dataCriacao) : "-"}
                        </span>

                        <button class="btn-small danger" onclick="removerComentarioTarefa(${comentario.id})">
                            Remover
                        </button>
                    </div>

                </div>

                <div class="comment-message">
                    ${escapeHtml(comentario.mensagem || "")}
                </div>

            </div>
        `;
    });
}

async function adicionarComentarioTarefa() {
    if (!tarefaSelecionada) {
        mostrarToast("Nenhuma tarefa selecionada.", "erro");
        return;
    }

    const campoMensagem = document.getElementById("comentarioMensagem");
    const mensagem = campoMensagem?.value.trim() || "";

    if (!mensagem) {
        mostrarToast("Escreva um comentário antes de enviar.", "erro");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/tarefas/${tarefaSelecionada.id}/comentarios`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders()
            },
            body: JSON.stringify({ mensagem })
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao adicionar comentário:", erro);
            throw new Error("Erro ao adicionar comentário.");
        }

        limparFormularioComentario();
        await carregarComentariosTarefa(tarefaSelecionada.id);
        await carregarHistoricoTarefa(tarefaSelecionada.id);

        mostrarToast("Comentário adicionado.");

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

async function removerComentarioTarefa(comentarioId) {
    if (!tarefaSelecionada) {
        mostrarToast("Nenhuma tarefa selecionada.", "erro");
        return;
    }

    const confirmar = await confirmarAcao(
        "Remover comentário",
        "Deseja realmente remover este comentário da tarefa?"
    );

    if (!confirmar) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/tarefas/comentarios/${comentarioId}`, {
            method: "DELETE",
            headers: authHeaders()
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao remover comentário:", erro);
            throw new Error("Erro ao remover comentário.");
        }

        await carregarComentariosTarefa(tarefaSelecionada.id);
        await carregarHistoricoTarefa(tarefaSelecionada.id);

        mostrarToast("Comentário removido.");

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

function limparFormularioComentario() {
    const campoMensagem = document.getElementById("comentarioMensagem");

    if (campoMensagem) {
        campoMensagem.value = "";
    }
}

// ==========================
// LINHA DO TEMPO DA TAREFA
// ==========================

async function carregarHistoricoTarefaSelecionada() {
    if (!tarefaSelecionada) {
        mostrarToast("Nenhuma tarefa selecionada.", "erro");
        return;
    }

    await carregarHistoricoTarefa(tarefaSelecionada.id);
}

async function carregarHistoricoTarefa(tarefaId) {
    const container = document.getElementById("historicoContainer");

    if (container) {
        container.innerHTML = `
            <div class="admin-empty">
                Carregando linha do tempo...
            </div>
        `;
    }

    try {
        const response = await fetch(`${API_URL}/api/tarefas/${tarefaId}/historico`, {
            method: "GET",
            headers: authHeaders()
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao carregar histórico:", erro);
            throw new Error("Erro ao carregar linha do tempo da tarefa.");
        }

        historicoTarefaSelecionada = await response.json();
        renderizarHistoricoTarefa();

    } catch (error) {
        historicoTarefaSelecionada = [];
        renderizarHistoricoTarefa();
        mostrarToast(error.message, "erro");
    }
}

function renderizarHistoricoTarefa() {
    const container = document.getElementById("historicoContainer");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (!historicoTarefaSelecionada || historicoTarefaSelecionada.length === 0) {
        container.innerHTML = `
            <div class="admin-empty">
                Nenhum evento registrado ainda.
            </div>
        `;
        return;
    }

    historicoTarefaSelecionada.forEach(evento => {
        const usuario = evento.usuarioNome || "Sistema";
        const titulo = evento.descricao || formatarTexto(evento.tipo || "Evento");
        const itemTitulo = evento.itemTitulo ? `Item: ${evento.itemTitulo}` : "";

        container.innerHTML += `
            <div class="timeline-entry">

                <div class="timeline-marker">
                    <span class="timeline-avatar">
                        ${obterIniciais(usuario)}
                    </span>
                </div>

                <div class="timeline-card">

                    <div class="timeline-card-top">
                        <div>
                            <div class="timeline-title">
                                ${escapeHtml(titulo)}
                            </div>
                            <span class="timeline-date">
                                ${evento.dataCriacao ? formatarDataHora(evento.dataCriacao) : "-"} • ${escapeHtml(usuario)}
                            </span>
                        </div>

                        <span class="pill timeline-type">
                            ${formatarTexto(evento.tipo || "Evento")}
                        </span>
                    </div>

                    ${itemTitulo ? `
                        <div class="timeline-description">
                            ${escapeHtml(itemTitulo)}
                        </div>
                    ` : ""}

                    ${(evento.valorAnterior || evento.valorNovo) ? `
                        <div class="timeline-extra">
                            ${evento.valorAnterior ? `
                                <span class="pill timeline-value">
                                    Antes: ${escapeHtml(evento.valorAnterior)}
                                </span>
                            ` : ""}

                            ${evento.valorNovo ? `
                                <span class="pill timeline-value">
                                    Depois: ${escapeHtml(evento.valorNovo)}
                                </span>
                            ` : ""}
                        </div>
                    ` : ""}

                </div>

            </div>
        `;
    });
}


// ==========================
// DASHBOARD, FILTROS E UI AVANÇADA
// ==========================

function renderizarDashboardHome() {
    const totalProjetosAtivos = projetosAdmin.filter(projeto => projeto.ativo === true).length;
    const vencidas = todasTarefas.filter(tarefa => obterInfoPrazo(tarefa.prazo, tarefa.status).classe === "prazo-vencido").length;
    const proximas = todasTarefas.filter(tarefa => obterInfoPrazo(tarefa.prazo, tarefa.status).classe === "prazo-proximo").length;
    const custoReal = projetosAdmin.reduce((total, projeto) => total + Number(projeto.custoRealTotal || 0), 0);

    setTexto("dashProjetosAtivos", totalProjetosAtivos);
    setTexto("dashTarefasVencidas", vencidas);
    setTexto("dashTarefasProximas", proximas);
    setTexto("dashCustoReal", formatarMoeda(custoReal));

    const container = document.getElementById("dashboardAlertas");
    if (!container) {
        return;
    }

    const alertas = ordenarTarefas(
        todasTarefas.filter(tarefa => {
            const classe = obterInfoPrazo(tarefa.prazo, tarefa.status).classe;
            return classe === "prazo-vencido" || classe === "prazo-hoje" || classe === "prazo-proximo" || tarefa.prioridade === "CRITICA";
        }),
        "VENCIDAS"
    ).slice(0, 8);

    container.innerHTML = "";

    if (alertas.length === 0) {
        container.innerHTML = `
            <div class="empty-state-card">
                <strong>Nenhum alerta crítico no momento</strong>
                <span>As tarefas carregadas não possuem vencimentos críticos ou prioridade crítica.</span>
            </div>
        `;
        return;
    }

    alertas.forEach(tarefa => {
        const prazoInfo = obterInfoPrazo(tarefa.prazo, tarefa.status);
        container.innerHTML += `
            <div class="dashboard-alert-item ${prazoInfo.classe}" onclick="abrirModalTarefa(${tarefa.id})">
                <div>
                    <strong>${escapeHtml(tarefa.titulo)}</strong>
                    <span>${escapeHtml(tarefa.projetoNome || "Sem projeto")} • ${escapeHtml(tarefa.responsavel || "Sem responsável")}</span>
                </div>
                <span class="pill date-pill ${prazoInfo.classe}">${prazoInfo.texto}</span>
            </div>
        `;
    });
}

function setTexto(id, valor) {
    const elemento = document.getElementById(id);
    if (elemento) {
        elemento.innerText = valor;
    }
}

function filtrarPorPrazo(tarefa, filtro) {
    if (!filtro) {
        return true;
    }

    const info = obterInfoPrazo(tarefa.prazo, tarefa.status);

    if (filtro === "VENCIDAS") return info.classe === "prazo-vencido";
    if (filtro === "HOJE") return info.classe === "prazo-hoje";
    if (filtro === "PROXIMOS_3") return info.classe === "prazo-proximo";
    if (filtro === "SEM_PRAZO") return !tarefa.prazo;

    return true;
}

function ordenarTarefas(tarefas, ordenacao) {
    const prioridadePeso = {
        CRITICA: 4,
        ALTA: 3,
        MEDIA: 2,
        BAIXA: 1
    };

    return [...tarefas].sort((a, b) => {
        if (ordenacao === "ANTIGAS") {
            return new Date(a.dataCriacao || 0) - new Date(b.dataCriacao || 0);
        }

        if (ordenacao === "PRIORIDADE") {
            return (prioridadePeso[b.prioridade] || 0) - (prioridadePeso[a.prioridade] || 0);
        }

        if (ordenacao === "PRAZO") {
            return dataOrdenacao(a.prazo) - dataOrdenacao(b.prazo);
        }

        if (ordenacao === "VENCIDAS") {
            const aInfo = obterInfoPrazo(a.prazo, a.status).peso;
            const bInfo = obterInfoPrazo(b.prazo, b.status).peso;
            return bInfo - aInfo || dataOrdenacao(a.prazo) - dataOrdenacao(b.prazo);
        }

        return new Date(b.dataCriacao || 0) - new Date(a.dataCriacao || 0);
    });
}

function dataOrdenacao(data) {
    return data ? new Date(`${data}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
}

function limparFiltrosBoard() {
    const campos = ["filtroTexto", "filtroStatus", "filtroPrioridade", "filtroPrazo"];

    campos.forEach(id => {
        const campo = document.getElementById(id);
        if (campo) campo.value = "";
    });

    const ordenacao = document.getElementById("ordenacaoBoard");
    if (ordenacao) ordenacao.value = "RECENTES";

    renderizarBoard();
}

function alternarModoCartao() {
    modoCartao = modoCartao === "DETALHADO" ? "COMPACTO" : "DETALHADO";
    localStorage.setItem("taskflow_modo_cartao", modoCartao);
    atualizarBotaoModoCartao();
    renderizarBoard();
}

function atualizarBotaoModoCartao() {
    const botao = document.getElementById("btnModoCartao");
    if (!botao) return;

    botao.innerText = modoCartao === "DETALHADO"
        ? "Modo compacto"
        : "Modo detalhado";
}

function obterInfoPrazo(prazo, status) {
    if (status === "CONCLUIDA" || status === "CONCLUIDO") {
        return { classe: "prazo-ok", texto: prazo ? `Concluído • ${formatarData(prazo)}` : "Concluído", peso: 0 };
    }

    if (!prazo) {
        return { classe: "prazo-sem", texto: "Sem prazo", peso: 1 };
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const dataPrazo = new Date(`${prazo}T00:00:00`);
    const diffDias = Math.ceil((dataPrazo - hoje) / (1000 * 60 * 60 * 24));

    if (diffDias < 0) {
        return { classe: "prazo-vencido", texto: `Vencido • ${formatarData(prazo)}`, peso: 5 };
    }

    if (diffDias === 0) {
        return { classe: "prazo-hoje", texto: `Vence hoje • ${formatarData(prazo)}`, peso: 4 };
    }

    if (diffDias <= 3) {
        return { classe: "prazo-proximo", texto: `Vence em ${diffDias} dia${diffDias > 1 ? "s" : ""} • ${formatarData(prazo)}`, peso: 3 };
    }

    return { classe: "prazo-normal", texto: `Prazo: ${formatarData(prazo)}`, peso: 2 };
}

function arrastarTarefa(event, tarefaId) {
    event.dataTransfer.setData("text/plain", String(tarefaId));
    event.dataTransfer.effectAllowed = "move";
}

function permitirDrop(event) {
    event.preventDefault();
}

async function soltarTarefaNoStatus(event, status) {
    event.preventDefault();

    const tarefaId = Number(event.dataTransfer.getData("text/plain"));
    const tarefa = todasTarefas.find(item => item.id === tarefaId) || tarefasProjetoDetalhe.find(item => item.id === tarefaId);

    if (!tarefa || tarefa.status === status) {
        return;
    }

    await alterarStatus(tarefaId, status);
}

function alternarAbaModal(aba) {
    abaModalAtiva = aba;

    document.querySelectorAll("[data-modal-tab]").forEach(elemento => {
        elemento.classList.toggle("hidden", elemento.dataset.modalTab !== aba);
    });

    document.querySelectorAll(".modal-tab").forEach(botao => {
        botao.classList.remove("active");
    });

    const botaoAtivo = document.getElementById(`tabModal${formatarChaveAba(aba)}`);
    if (botaoAtivo) {
        botaoAtivo.classList.add("active");
    }
}

function formatarChaveAba(aba) {
    const mapa = {
        DETALHES: "Detalhes",
        SUBITENS: "Subitens",
        COMENTARIOS: "Comentarios",
        HISTORICO: "Historico"
    };

    return mapa[aba] || "Detalhes";
}

function renderizarResumoProjetoCard(projeto) {
    const tarefasProjeto = todasTarefas.filter(tarefa => tarefa.projetoId === projeto.id);
    const total = tarefasProjeto.length || Number(projeto.totalTarefas || 0);
    const concluidas = tarefasProjeto.filter(tarefa => tarefa.status === "CONCLUIDA").length;
    const progresso = total === 0 ? 0 : Math.round((concluidas / total) * 100);
    const estimado = Number(projeto.custoEstimadoTotal || 0);
    const real = Number(projeto.custoRealTotal || 0);
    const diferenca = Number(projeto.diferencaCustoTotal ?? (real - estimado));

    return `
        <div class="project-progress-box">
            <div class="project-progress-top">
                <span>Progresso local</span>
                <strong>${progresso}%</strong>
            </div>
            <div class="subitem-progress-bar project-progress">
                <span style="width: ${progresso}%"></span>
            </div>
            <div class="project-finance-row">
                <span>Estimado: <strong>${formatarMoeda(estimado)}</strong></span>
                <span>Real: <strong>${formatarMoeda(real)}</strong></span>
                <span class="${diferenca > 0 ? "finance-negative" : diferenca < 0 ? "finance-positive" : ""}">Dif.: <strong>${formatarMoeda(diferenca)}</strong></span>
            </div>
        </div>
    `;
}

function parseMoeda(valor) {
    if (valor === null || valor === undefined || String(valor).trim() === "") {
        return null;
    }

    const normalizado = String(valor)
        .replace(/R\$/g, "")
        .replace(/\s/g, "")
        .replace(/\./g, "")
        .replace(",", ".");

    const numero = Number(normalizado);
    return Number.isNaN(numero) ? null : numero;
}

function formatarCampoMoeda(campo) {
    const somenteNumeros = campo.value.replace(/\D/g, "");

    if (!somenteNumeros) {
        campo.value = "";
        return;
    }

    const valor = Number(somenteNumeros) / 100;
    campo.value = formatarMoeda(valor);
}

async function confirmarAcao(titulo, mensagem) {
    const modal = document.getElementById("modalConfirmacao");
    const tituloEl = document.getElementById("confirmacaoTitulo");
    const mensagemEl = document.getElementById("confirmacaoMensagem");

    if (!modal) {
        return window.confirm(mensagem);
    }

    if (tituloEl) tituloEl.innerText = titulo || "Confirmar ação";
    if (mensagemEl) mensagemEl.innerText = mensagem || "Deseja continuar?";

    modal.classList.remove("hidden");

    return new Promise(resolve => {
        resolverConfirmacao = resolve;
    });
}

function responderConfirmacao(confirmado) {
    const modal = document.getElementById("modalConfirmacao");

    if (modal) {
        modal.classList.add("hidden");
    }

    if (resolverConfirmacao) {
        resolverConfirmacao(confirmado);
        resolverConfirmacao = null;
    }
}

// ==========================
// ALTERAR SENHA
// ==========================

function abrirModalSenha() {
    document.getElementById("senhaAtual").value = "";
    document.getElementById("novaSenha").value = "";
    document.getElementById("confirmarNovaSenha").value = "";

    document.getElementById("modalSenha").classList.remove("hidden");

    setTimeout(() => {
        document.getElementById("senhaAtual").focus();
    }, 100);
}

function fecharModalSenha() {
    document.getElementById("modalSenha").classList.add("hidden");
}

async function alterarSenha() {
    const senhaAtual = document.getElementById("senhaAtual").value.trim();
    const novaSenha = document.getElementById("novaSenha").value.trim();
    const confirmarNovaSenha = document.getElementById("confirmarNovaSenha").value.trim();

    if (!senhaAtual || !novaSenha || !confirmarNovaSenha) {
        mostrarToast("Preencha todos os campos.", "erro");
        return;
    }

    if (novaSenha.length < 8) {
        mostrarToast("A nova senha deve ter pelo menos 8 caracteres.", "erro");
        return;
    }

    if (novaSenha !== confirmarNovaSenha) {
        mostrarToast("A confirmação da nova senha não confere.", "erro");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/conta/senha`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders()
            },
            body: JSON.stringify({
                senhaAtual,
                novaSenha
            })
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao alterar senha:", erro);
            throw new Error("Erro ao alterar senha. Verifique a senha atual.");
        }

        fecharModalSenha();

        mostrarToast("Senha alterada com sucesso. Faça login novamente.");

        setTimeout(() => {
            logout();
        }, 1500);

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

// ==========================
// MÉTRICAS
// ==========================

function atualizarMetricas() {
    const total = todasTarefas.length;

    const andamento = todasTarefas.filter(
        tarefa => tarefa.status === "EM_ANDAMENTO"
    ).length;

    const concluidas = todasTarefas.filter(
        tarefa => tarefa.status === "CONCLUIDA"
    ).length;

    const criticas = todasTarefas.filter(
        tarefa => tarefa.prioridade === "CRITICA"
    ).length;

    document.getElementById("metricTotal").innerText = total;
    document.getElementById("metricAndamento").innerText = andamento;
    document.getElementById("metricConcluidas").innerText = concluidas;
    document.getElementById("metricCriticas").innerText = criticas;
}

// ==========================
// UTILITÁRIOS
// ==========================

function limparFormulario() {
    document.getElementById("titulo").value = "";
    document.getElementById("descricao").value = "";
    document.getElementById("prioridade").value = "MEDIA";
    document.getElementById("prazo").value = "";
    document.getElementById("observacoes").value = "";

    const responsavelSelect = document.getElementById("responsavelUsuarioId");

    if (responsavelSelect) {
        responsavelSelect.value = "";
    }

    const projetoSelect = document.getElementById("projetoTarefaId");

    if (projetoSelect) {
        projetoSelect.value = "";
    }
}

function formatarTexto(texto) {
    if (!texto) {
        return "-";
    }

    return texto
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, letra => letra.toUpperCase());
}

function formatarData(data) {
    if (!data) {
        return "-";
    }

    const dataLimpa = data.includes("T") ? data.split("T")[0] : data;

    const [ano, mes, dia] = dataLimpa.split("-");

    if (!ano || !mes || !dia) {
        return data;
    }

    return `${dia}/${mes}/${ano}`;
}

function formatarDataHora(dataHora) {
    if (!dataHora) {
        return "-";
    }

    const data = new Date(dataHora);

    if (Number.isNaN(data.getTime())) {
        return dataHora;
    }

    return data.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function escapeHtml(texto) {
    return String(texto)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatarMoeda(valor) {
    const numero = Number(valor || 0);

    return numero.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function mostrarToast(mensagem, tipo = "sucesso") {
    toast.innerText = mensagem;
    toast.classList.remove("hidden");

    if (tipo === "erro") {
        toast.style.background = "#de350b";
    } else {
        toast.style.background = "#172b4d";
    }

    setTimeout(() => {
        toast.classList.add("hidden");
    }, 3000);
}

function obterIniciais(nome) {
    if (!nome) {
        return "?";
    }

    return nome
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map(parte => parte[0].toUpperCase())
        .join("");
}

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        fecharModalTarefa();
        fecharModalSenha();
        fecharModalUsuario();
        cancelarEdicaoSubitem();
    }
});