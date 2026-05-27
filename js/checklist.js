// ==========================
// CHECKLIST ESTRUTURADA DOS SUBITENS
// ==========================

let checklistSubitemAbertoId = null;
let checklistEdicaoId = null;

function obterChecklistDoSubitem(subitem) {
    if (!subitem) {
        return [];
    }

    if (Array.isArray(subitem.checklist)) {
        return subitem.checklist;
    }

    if (Array.isArray(subitem.itensChecklist)) {
        return subitem.itensChecklist;
    }

    return [];
}

function calcularResumoChecklist(subitem) {
    const checklist = obterChecklistDoSubitem(subitem);
    const total = subitem?.totalChecklist ?? checklist.length;
    const concluidos = subitem?.totalChecklistConcluido ?? checklist.filter(item => item.concluido === true).length;
    const percentual = subitem?.percentualChecklistConcluido ?? (total === 0 ? 0 : Math.round((concluidos / total) * 100));

    return {
        checklist,
        total,
        concluidos,
        percentual
    };
}

function montarResumoChecklistHtml(subitem) {
    const resumo = calcularResumoChecklist(subitem);

    if (resumo.total === 0) {
        return `
            <div class="checklist-mini empty">
                <span>Checklist</span>
                <strong>0 itens</strong>
            </div>
        `;
    }

    return `
        <div class="checklist-mini">
            <div class="checklist-mini-top">
                <span>Checklist</span>
                <strong>${resumo.concluidos}/${resumo.total}</strong>
            </div>
            <div class="checklist-mini-bar">
                <i style="width: ${resumo.percentual}%"></i>
            </div>
            <small>${resumo.percentual}% concluído</small>
        </div>
    `;
}

function montarChecklistSubitemHtml(subitem) {
    const resumo = calcularResumoChecklist(subitem);
    const aberto = checklistSubitemAbertoId === subitem.id;

    return `
        <div class="checklist-box ${aberto ? "open" : ""}">
            <button class="checklist-toggle" onclick="alternarChecklistSubitem(${subitem.id})">
                <span>☑ Checklist do subitem</span>
                <strong>${resumo.concluidos}/${resumo.total}</strong>
            </button>

            <div class="checklist-progress">
                <i style="width: ${resumo.percentual}%"></i>
            </div>

            ${aberto ? `
                <div class="checklist-content">
                    <div class="checklist-add-row">
                        <input
                            type="text"
                            id="novoChecklistDescricao_${subitem.id}"
                            placeholder="Adicionar item à checklist..."
                            onkeydown="enviarChecklistComEnter(event, ${subitem.id})"
                        />
                        <button class="btn-small success" onclick="adicionarChecklistItem(${subitem.id})">
                            Adicionar
                        </button>
                    </div>

                    <div id="checklistLista_${subitem.id}" class="checklist-items">
                        ${renderizarItensChecklist(subitem)}
                    </div>

                    ${
                        resumo.total > 0 && resumo.percentual === 100 && subitem.status !== "CONCLUIDO"
                            ? `
                                <div class="checklist-complete-suggestion">
                                    <span>Todos os itens da checklist foram concluídos.</span>
                                    <button class="btn-small success" onclick="sugerirConclusaoSubitem(${subitem.id})">
                                        Concluir subitem
                                    </button>
                                </div>
                              `
                            : ""
                    }
                </div>
            ` : ""}
        </div>
    `;
}

function renderizarItensChecklist(subitem) {
    const checklist = obterChecklistDoSubitem(subitem);

    if (checklist.length === 0) {
        return `
            <div class="checklist-empty">
                Nenhum item cadastrado na checklist.
            </div>
        `;
    }

    return checklist.map(item => montarChecklistItemHtml(subitem.id, item)).join("");
}

function montarChecklistItemHtml(subitemId, item) {
    const concluido = item.concluido === true;

    if (checklistEdicaoId === item.id) {
        return `
            <div class="checklist-item editing">
                <input
                    type="text"
                    id="editChecklistDescricao_${item.id}"
                    value="${escapeHtml(item.descricao || "")}"
                    onkeydown="salvarChecklistComEnter(event, ${item.id})"
                />
                <button class="btn-small success" onclick="salvarEdicaoChecklistItem(${item.id})">
                    Salvar
                </button>
                <button class="btn-small neutral" onclick="cancelarEdicaoChecklist()">
                    Cancelar
                </button>
            </div>
        `;
    }

    return `
        <div class="checklist-item ${concluido ? "done" : ""}">
            <button
                class="checklist-check"
                title="${concluido ? "Desmarcar" : "Concluir"}"
                onclick="alterarConclusaoChecklist(${item.id}, ${!concluido})"
            >
                ${concluido ? "✓" : ""}
            </button>

            <span>${escapeHtml(item.descricao || "")}</span>

            <div class="checklist-actions">
                <button class="btn-icon-small" title="Editar" onclick="editarChecklistItem(${item.id})">✎</button>
                <button class="btn-icon-small danger" title="Excluir" onclick="excluirChecklistItem(${item.id})">×</button>
            </div>
        </div>
    `;
}

function alternarChecklistSubitem(subitemId) {
    checklistSubitemAbertoId = checklistSubitemAbertoId === subitemId ? null : subitemId;

    if (typeof renderizarSubitens === "function") {
        renderizarSubitens();
    }
}

function enviarChecklistComEnter(event, subitemId) {
    if (event.key === "Enter") {
        event.preventDefault();
        adicionarChecklistItem(subitemId);
    }
}

function salvarChecklistComEnter(event, checklistId) {
    if (event.key === "Enter") {
        event.preventDefault();
        salvarEdicaoChecklistItem(checklistId);
    }

    if (event.key === "Escape") {
        cancelarEdicaoChecklist();
    }
}

async function adicionarChecklistItem(subitemId) {
    const input = document.getElementById(`novoChecklistDescricao_${subitemId}`);
    const descricao = input?.value?.trim();

    if (!descricao) {
        mostrarToast("Informe a descrição do item da checklist.", "erro");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/tarefas/itens/${subitemId}/checklist`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders()
            },
            body: JSON.stringify({
                descricao
            })
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao adicionar checklist:", erro);
            throw new Error("Erro ao adicionar item da checklist.");
        }

        if (input) {
            input.value = "";
        }

        await recarregarSubitensAposChecklist();

        mostrarToast("Item adicionado à checklist.");

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

function editarChecklistItem(checklistId) {
    checklistEdicaoId = checklistId;

    if (typeof renderizarSubitens === "function") {
        renderizarSubitens();
    }

    setTimeout(() => {
        document.getElementById(`editChecklistDescricao_${checklistId}`)?.focus();
    }, 60);
}

function cancelarEdicaoChecklist() {
    checklistEdicaoId = null;

    if (typeof renderizarSubitens === "function") {
        renderizarSubitens();
    }
}

async function salvarEdicaoChecklistItem(checklistId) {
    const input = document.getElementById(`editChecklistDescricao_${checklistId}`);
    const descricao = input?.value?.trim();

    if (!descricao) {
        mostrarToast("Informe a descrição do item.", "erro");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/tarefas/checklist/${checklistId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders()
            },
            body: JSON.stringify({
                descricao
            })
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao editar checklist:", erro);
            throw new Error("Erro ao editar item da checklist.");
        }

        checklistEdicaoId = null;

        await recarregarSubitensAposChecklist();

        mostrarToast("Item da checklist atualizado.");

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

async function alterarConclusaoChecklist(checklistId, concluido) {
    try {
        const response = await fetch(`${API_URL}/api/tarefas/checklist/${checklistId}/conclusao?concluido=${concluido}`, {
            method: "PATCH",
            headers: authHeaders()
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao concluir checklist:", erro);
            throw new Error("Erro ao atualizar checklist.");
        }

        await recarregarSubitensAposChecklist();

        mostrarToast(concluido ? "Item concluído." : "Item reaberto.");

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

async function excluirChecklistItem(checklistId) {
    const confirmar = await confirmarAcao(
        "Excluir item da checklist",
        "Deseja realmente excluir este item da checklist?"
    );

    if (!confirmar) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/tarefas/checklist/${checklistId}`, {
            method: "DELETE",
            headers: authHeaders()
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao excluir checklist:", erro);
            throw new Error("Erro ao excluir item da checklist.");
        }

        await recarregarSubitensAposChecklist();

        mostrarToast("Item da checklist excluído.");

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

async function sugerirConclusaoSubitem(subitemId) {
    const confirmar = await confirmarAcao(
        "Concluir subitem",
        "Todos os itens da checklist foram concluídos. Deseja marcar o subitem como concluído?"
    );

    if (!confirmar) {
        return;
    }

    if (typeof alterarStatusSubitem === "function") {
        await alterarStatusSubitem(subitemId, "CONCLUIDO");
        return;
    }

    mostrarToast("Função de conclusão do subitem não encontrada.", "erro");
}

async function recarregarSubitensAposChecklist() {
    if (!tarefaSelecionada) {
        return;
    }

    if (typeof carregarSubitensTarefa === "function") {
        await carregarSubitensTarefa(tarefaSelecionada.id);
    }

    if (typeof carregarHistoricoTarefa === "function") {
        await carregarHistoricoTarefa(tarefaSelecionada.id);
    }

    if (typeof buscarTarefas === "function") {
        await buscarTarefas();
    }
}

// Exposição segura para uso pelos arquivos existentes.
window.montarChecklistSubitemHtml = montarChecklistSubitemHtml;
window.montarResumoChecklistHtml = montarResumoChecklistHtml;
window.obterChecklistDoSubitem = obterChecklistDoSubitem;
window.calcularResumoChecklist = calcularResumoChecklist;
