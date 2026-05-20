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
    const responsavelFiltro = document.getElementById("filtroResponsavelBoard")?.value || "";
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

        const bateResponsavel =
            !responsavelFiltro ||
            (tarefa.responsavel || "Usuário") === responsavelFiltro;

        const batePrazo = filtrarPorPrazo(tarefa, prazoFiltro);

        return bateTexto && bateStatus && batePrioridade && bateResponsavel && batePrazo;
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

    atualizarFiltroResponsaveisBoard(tarefasFiltradas);

    if (typeof atualizarNotificacoesInternas === "function") {
        atualizarNotificacoesInternas(todasTarefas);
    }
}

function atualizarFiltroResponsaveisBoard(tarefas) {
    const select = document.getElementById("filtroResponsavelBoard");

    if (!select) {
        return;
    }

    const valorAtual = select.value;
    const responsaveis = [...new Set((todasTarefas || []).map(t => t.responsavel || "Usuário"))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

    select.innerHTML = `<option value="">Todos os responsáveis</option>` +
        responsaveis.map(nome => `<option value="${escapeHtml(nome)}">${escapeHtml(nome)}</option>`).join("");

    if (responsaveis.includes(valorAtual)) {
        select.value = valorAtual;
    }
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

                    <button class="btn-delete admin-action" onclick="excluirTarefa(${tarefa.id})">
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
