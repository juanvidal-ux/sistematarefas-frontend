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
