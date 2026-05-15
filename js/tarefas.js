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
