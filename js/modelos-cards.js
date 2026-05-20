// ==========================
// MODELOS DE CARDS
// ==========================

function normalizarListaChecklistModelo(modelo) {
    const lista = modelo?.checklist || modelo?.itensChecklist || modelo?.itens || modelo?.checklistPadrao || [];

    if (!Array.isArray(lista)) {
        return [];
    }

    return lista.map((item, index) => ({
        id: item.id || null,
        titulo: item.titulo || item.descricao || item.nome || "",
        ordem: item.ordem ?? index
    }));
}

function getValorModelo(modelo, campo, padrao = "") {
    return modelo?.[campo] ?? padrao;
}

function setBotaoCarregando(botao, carregando, textoCarregando = "Aguarde") {
    if (!botao) return;

    if (carregando) {
        botao.dataset.textoOriginal = botao.innerText;
        botao.innerText = textoCarregando;
        botao.classList.add("is-loading");
        botao.disabled = true;
    } else {
        botao.innerText = botao.dataset.textoOriginal || botao.innerText;
        botao.classList.remove("is-loading");
        botao.disabled = false;
    }
}

function obterFiltrosModelosCards() {
    return {
        texto: (document.getElementById("filtroModeloCard")?.value || "").trim().toLowerCase(),
        ativo: document.getElementById("filtroModeloCardAtivo")?.value || "TODOS",
        prioridade: document.getElementById("filtroModeloCardPrioridade")?.value || "TODAS"
    };
}

function limparFiltrosModelosCards() {
    const filtro = document.getElementById("filtroModeloCard");
    const filtroAtivo = document.getElementById("filtroModeloCardAtivo");
    const filtroPrioridade = document.getElementById("filtroModeloCardPrioridade");

    if (filtro) filtro.value = "";
    if (filtroAtivo) filtroAtivo.value = "TODOS";
    if (filtroPrioridade) filtroPrioridade.value = "TODAS";

    renderizarModelosCards();
}

function inicializarEventosModelosCards() {
    ["filtroModeloCard", "filtroModeloCardAtivo", "filtroModeloCardPrioridade"].forEach(id => {
        const elemento = document.getElementById(id);

        if (elemento && !elemento.dataset.listenerModelosCards) {
            elemento.addEventListener("input", renderizarModelosCards);
            elemento.addEventListener("change", renderizarModelosCards);
            elemento.dataset.listenerModelosCards = "true";
        }
    });
}

document.addEventListener("DOMContentLoaded", inicializarEventosModelosCards);

async function abrirModelosCards() {
    if (!isAdmin()) {
        mostrarToast("Acesso permitido apenas para administrador.", "erro");
        return;
    }

    mostrarPagina("MODELOS_CARDS");
    inicializarEventosModelosCards();

    if (!modelosCardsAdmin || modelosCardsAdmin.length === 0) {
        await carregarModelosCards();
    } else {
        renderizarModelosCards();
    }
}

async function carregarModelosCards() {
    if (!isAdmin()) {
        return;
    }

    const container = document.getElementById("modelosCardsContainer");

    if (container) {
        container.innerHTML = `<div class="empty-state"><strong>Carregando modelos...</strong><span>Buscando dados no servidor.</span></div>`;
    }

    try {
        const dados = await apiGet("/api/admin/modelos-cards", {
            errorMessage: "Erro ao carregar modelos de cards."
        });

        modelosCardsAdmin = Array.isArray(dados) ? dados : [];

        renderizarModelosCards();

    } catch (error) {
        console.error("Erro ao carregar modelos de cards:", error);
        mostrarToast(error.message, "erro");

        if (container) {
            container.innerHTML = `<div class="empty-state"><strong>Não foi possível carregar.</strong><span>${escapeHtml(error.message)}</span></div>`;
        }
    }
}

function filtrarModelosCards() {
    const filtros = obterFiltrosModelosCards();

    return (modelosCardsAdmin || []).filter(modelo => {
        const titulo = String(modelo.titulo || "").toLowerCase();
        const descricao = String(modelo.descricao || "").toLowerCase();
        const prioridade = String(modelo.prioridade || "MEDIA");
        const ativo = modelo.ativo !== false;

        const passaTexto = !filtros.texto || titulo.includes(filtros.texto) || descricao.includes(filtros.texto);
        const passaAtivo = filtros.ativo === "TODOS" || (filtros.ativo === "ATIVOS" && ativo) || (filtros.ativo === "INATIVOS" && !ativo);
        const passaPrioridade = filtros.prioridade === "TODAS" || prioridade === filtros.prioridade;

        return passaTexto && passaAtivo && passaPrioridade;
    });
}

function renderizarModelosCards() {
    const container = document.getElementById("modelosCardsContainer");

    if (!container) {
        return;
    }

    const modelosFiltrados = filtrarModelosCards();

    container.innerHTML = "";

    if (modelosFiltrados.length === 0) {
        container.innerHTML = `
            <div class="empty-state modelos-empty">
                <strong>Nenhum modelo encontrado.</strong>
                <span>Crie um novo modelo ou ajuste os filtros.</span>
            </div>
        `;
        return;
    }

    modelosFiltrados.forEach(modelo => {
        const checklist = normalizarListaChecklistModelo(modelo);
        const ativo = modelo.ativo !== false;

        container.innerHTML += `
            <div class="modelo-card ${ativo ? "" : "inativo"}">

                <div class="modelo-card-header">
                    <div>
                        <span class="modelo-card-status ${ativo ? "ativo" : "inativo"}">
                            ${ativo ? "Ativo" : "Inativo"}
                        </span>

                        <h3>${escapeHtml(modelo.titulo || "Sem título")}</h3>
                    </div>

                    <span class="priority-badge priority-${String(modelo.prioridade || "MEDIA").toLowerCase()}">
                        ${formatarTexto(modelo.prioridade || "MEDIA")}
                    </span>
                </div>

                <p class="modelo-card-descricao">
                    ${escapeHtml(modelo.descricao || "Sem descrição informada.")}
                </p>

                <div class="modelo-card-meta">
                    <span>Status inicial: <strong>${formatarTexto(modelo.statusInicial || "PENDENTE")}</strong></span>
                    <span>Checklist: <strong>${checklist.length}</strong> item(ns)</span>
                </div>

                ${checklist.length > 0 ? `
                    <details class="modelo-card-checklist-details" open>
                        <summary>Prévia do checklist</summary>
                        <ul class="modelo-card-checklist-preview">
                            ${checklist.slice(0, 4).map(item => `
                                <li>${escapeHtml(item.titulo)}</li>
                            `).join("")}
                            ${checklist.length > 4 ? `<li>+ ${checklist.length - 4} item(ns)</li>` : ""}
                        </ul>
                    </details>
                ` : ""}

                <div class="modelo-card-actions">
                    <button class="btn-primary" type="button" onclick="abrirModalAplicarModeloCard(${modelo.id})">
                        Usar modelo
                    </button>

                    <button class="btn-secondary" type="button" onclick="abrirModalModeloCard(${modelo.id})">
                        Editar
                    </button>

                    <button class="btn-secondary" type="button" onclick="duplicarModeloCard(${modelo.id})">
                        Duplicar
                    </button>

                    <button class="btn-danger" type="button" onclick="excluirModeloCard(${modelo.id})">
                        Excluir
                    </button>
                </div>

            </div>
        `;
    });
}

function abrirModalModeloCard(id = null) {
    modeloCardEdicaoId = id;
    modeloCardChecklistTemporario = [];

    const modal = document.getElementById("modalModeloCard");

    if (!modal) {
        mostrarToast("Modal de modelo não encontrado no HTML.", "erro");
        return;
    }

    document.getElementById("modeloCardId").value = id || "";
    document.getElementById("modeloCardTituloInput").value = "";
    document.getElementById("modeloCardDescricaoInput").value = "";
    document.getElementById("modeloCardPrioridadeInput").value = "MEDIA";
    document.getElementById("modeloCardStatusInput").value = "PENDENTE";
    document.getElementById("modeloCardObservacoesInput").value = "";

    document.getElementById("modalModeloCardStatus").innerText = id ? "Editar modelo" : "Novo modelo";
    document.getElementById("modalModeloCardTitulo").innerText = id ? "Editar Modelo de Card" : "Novo Modelo de Card";

    if (id) {
        const modelo = modelosCardsAdmin.find(item => Number(item.id) === Number(id));

        if (!modelo) {
            mostrarToast("Modelo não encontrado.", "erro");
            return;
        }

        document.getElementById("modeloCardTituloInput").value = modelo.titulo || "";
        document.getElementById("modeloCardDescricaoInput").value = modelo.descricao || "";
        document.getElementById("modeloCardPrioridadeInput").value = modelo.prioridade || "MEDIA";
        document.getElementById("modeloCardStatusInput").value = modelo.statusInicial || "PENDENTE";
        document.getElementById("modeloCardObservacoesInput").value = modelo.observacoes || "";

        modeloCardChecklistTemporario = normalizarListaChecklistModelo(modelo);
    }

    if (modeloCardChecklistTemporario.length === 0) {
        modeloCardChecklistTemporario.push({
            titulo: "",
            ordem: 0
        });
    }

    renderizarChecklistModeloCardEditor();

    modal.classList.remove("hidden");
    setTimeout(() => document.getElementById("modeloCardTituloInput")?.focus(), 50);
}

function fecharModalModeloCard() {
    const modal = document.getElementById("modalModeloCard");

    if (modal) {
        modal.classList.add("hidden");
    }
}

function adicionarItemChecklistModeloCard() {
    modeloCardChecklistTemporario.push({
        titulo: "",
        ordem: modeloCardChecklistTemporario.length
    });

    renderizarChecklistModeloCardEditor();
}

function removerItemChecklistModeloCard(index) {
    modeloCardChecklistTemporario.splice(index, 1);

    modeloCardChecklistTemporario = modeloCardChecklistTemporario.map((item, ordem) => ({
        ...item,
        ordem
    }));

    if (modeloCardChecklistTemporario.length === 0) {
        modeloCardChecklistTemporario.push({ titulo: "", ordem: 0 });
    }

    renderizarChecklistModeloCardEditor();
}

function atualizarItemChecklistModeloCard(index, valor) {
    if (!modeloCardChecklistTemporario[index]) {
        return;
    }

    modeloCardChecklistTemporario[index].titulo = valor;
}

function renderizarChecklistModeloCardEditor() {
    const container = document.getElementById("modeloCardChecklistContainer");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    modeloCardChecklistTemporario.forEach((item, index) => {
        container.innerHTML += `
            <div class="checklist-editor-item">
                <span>${index + 1}</span>

                <input
                    type="text"
                    value="${escapeHtml(item.titulo || "") }"
                    placeholder="Ex.: Conferir documentação"
                    oninput="atualizarItemChecklistModeloCard(${index}, this.value)"
                />

                <button class="btn-small danger" type="button" onclick="removerItemChecklistModeloCard(${index})" title="Remover item">
                    ×
                </button>
            </div>
        `;
    });
}

function montarPayloadModeloCard() {
    const titulo = document.getElementById("modeloCardTituloInput").value.trim();
    const descricao = document.getElementById("modeloCardDescricaoInput").value.trim();
    const prioridadeSelecionada = document.getElementById("modeloCardPrioridadeInput").value;
    const statusSelecionado = document.getElementById("modeloCardStatusInput").value;

    const mapaPrioridades = {
        BAIXA: "BAIXA",
        MEDIA: "MEDIA",
        ALTA: "ALTA",
        URGENTE: "CRITICA",
        CRITICA: "CRITICA"
    };

    const mapaStatus = {
        INICIO: "PENDENTE",
        PENDENTE: "PENDENTE",
        ANDAMENTO: "EM_ANDAMENTO",
        EM_ANDAMENTO: "EM_ANDAMENTO",
        CONCLUIDO: "CONCLUIDA",
        CONCLUIDA: "CONCLUIDA",
        ATRASADA: "ATRASADA",
        CANCELADA: "CANCELADA"
    };

    const prioridade = mapaPrioridades[prioridadeSelecionada] || "MEDIA";
    const statusInicial = mapaStatus[statusSelecionado] || "PENDENTE";
    const observacoes = document.getElementById("modeloCardObservacoesInput").value.trim();

    const checklist = modeloCardChecklistTemporario
        .map((item, index) => ({
            titulo: String(item.titulo || "").trim(),
            ordem: index
        }))
        .filter(item => item.titulo);

    return {
        titulo,
        descricao,
        prioridade,
        statusInicial,
        observacoes,
        ativo: true,
        checklist
    };
}

async function salvarModeloCard() {
    if (!isAdmin()) {
        mostrarToast("Acesso permitido apenas para administrador.", "erro");
        return;
    }

    const payload = montarPayloadModeloCard();

    if (!payload.titulo) {
        mostrarToast("Informe o título do modelo.", "erro");
        document.getElementById("modeloCardTituloInput")?.focus();
        return;
    }

    const id = document.getElementById("modeloCardId").value;
    const editando = Boolean(id);
    const botao = event?.target;

    try {
        setBotaoCarregando(botao, true, editando ? "Salvando" : "Criando");

        if (editando) {
            await apiPut(`/api/admin/modelos-cards/${id}`, payload, {
                errorMessage: "Erro ao salvar modelo de card."
            });
        } else {
            await apiPost("/api/admin/modelos-cards", payload, {
                errorMessage: "Erro ao criar modelo de card."
            });
        }

        fecharModalModeloCard();

        await carregarModelosCards();

        mostrarToast(editando ? "Modelo atualizado." : "Modelo criado com sucesso.");

    } catch (error) {
        console.error("Erro ao salvar modelo:", error);
        mostrarToast(error.message, "erro");
    } finally {
        setBotaoCarregando(botao, false);
    }
}

async function duplicarModeloCard(id) {
    const modelo = modelosCardsAdmin.find(item => Number(item.id) === Number(id));

    if (!modelo) {
        mostrarToast("Modelo não encontrado.", "erro");
        return;
    }

    const payload = {
        titulo: `${modelo.titulo || "Modelo"} - cópia`,
        descricao: modelo.descricao || "",
        prioridade: modelo.prioridade || "MEDIA",
        statusInicial: modelo.statusInicial || "PENDENTE",
        observacoes: modelo.observacoes || "",
        ativo: true,
        checklist: normalizarListaChecklistModelo(modelo).map((item, index) => ({
            titulo: item.titulo,
            ordem: index
        })).filter(item => item.titulo)
    };

    try {
        await apiPost("/api/admin/modelos-cards", payload, {
            errorMessage: "Erro ao duplicar modelo."
        });

        await carregarModelosCards();
        mostrarToast("Modelo duplicado com sucesso.");

    } catch (error) {
        console.error("Erro ao duplicar modelo:", error);
        mostrarToast(error.message, "erro");
    }
}

async function excluirModeloCard(id) {
    const confirmar = await confirmarAcao(
        "Excluir modelo",
        "Deseja realmente excluir este modelo de card?"
    );

    if (!confirmar) {
        return;
    }

    try {
        await apiDelete(`/api/admin/modelos-cards/${id}`, {
            errorMessage: "Erro ao excluir modelo."
        });

        await carregarModelosCards();

        mostrarToast("Modelo excluído.");

    } catch (error) {
        console.error("Erro ao excluir modelo:", error);
        mostrarToast(error.message, "erro");
    }
}

function popularSelectAplicarModeloCard() {
    const projetoSelect = document.getElementById("aplicarModeloProjetoId");
    const usuarioSelect = document.getElementById("aplicarModeloUsuarioId");

    if (projetoSelect) {
        const projetosAtivos = (projetosAdmin || []).filter(projeto => projeto.ativo !== false);

        projetoSelect.innerHTML = `
            <option value="">Selecione um projeto</option>
            ${projetosAtivos.map(projeto => `
                <option value="${projeto.id}">${escapeHtml(projeto.nome || "Projeto")}</option>
            `).join("")}
        `;
    }

    if (usuarioSelect) {
        usuarioSelect.innerHTML = `
            <option value="">Selecione um responsável</option>
            ${(usuariosAdmin || []).map(usuario => `
                <option value="${usuario.id}">${escapeHtml(usuario.nome || usuario.email || "Usuário")}</option>
            `).join("")}
        `;
    }
}

async function abrirModalAplicarModeloCard(id) {
    if (!isAdmin()) {
        mostrarToast("Acesso permitido apenas para administrador.", "erro");
        return;
    }

    const modelo = modelosCardsAdmin.find(item => Number(item.id) === Number(id));

    if (!modelo) {
        mostrarToast("Modelo não encontrado.", "erro");
        return;
    }

    if (!projetosAdmin || projetosAdmin.length === 0) {
        await carregarProjetosAdmin();
    }

    if (!usuariosAdmin || usuariosAdmin.length === 0) {
        await carregarUsuariosAdmin();
    }

    popularSelectAplicarModeloCard();

    document.getElementById("aplicarModeloCardId").value = id;
    document.getElementById("aplicarModeloPrazo").value = "";
    document.getElementById("modalAplicarModeloCardTitulo").innerText = `Usar: ${modelo.titulo || "Modelo"}`;

    document.getElementById("modalAplicarModeloCard").classList.remove("hidden");
}

function fecharModalAplicarModeloCard() {
    const modal = document.getElementById("modalAplicarModeloCard");

    if (modal) {
        modal.classList.add("hidden");
    }
}

async function aplicarModeloCard() {
    const id = document.getElementById("aplicarModeloCardId").value;
    const projetoId = document.getElementById("aplicarModeloProjetoId").value;
    const usuarioId = document.getElementById("aplicarModeloUsuarioId").value;
    const prazo = document.getElementById("aplicarModeloPrazo").value;
    const botao = event?.target;

    if (!id) {
        mostrarToast("Modelo não identificado.", "erro");
        return;
    }

    if (!projetoId) {
        mostrarToast("Selecione o projeto.", "erro");
        return;
    }

    if (!usuarioId) {
        mostrarToast("Selecione o responsável.", "erro");
        return;
    }

    const payload = {
        projetoId: Number(projetoId),
        usuarioId: Number(usuarioId),
        prazo: prazo || null
    };

    try {
        setBotaoCarregando(botao, true, "Criando");

        await apiPost(`/api/admin/modelos-cards/${id}/aplicar`, payload, {
            errorMessage: "Erro ao aplicar modelo no projeto."
        });

        fecharModalAplicarModeloCard();

        await buscarTarefas();

        if (paginaAtual === "PROJETO_DETALHE" && projetoDetalheSelecionado) {
            await recarregarDetalheProjeto();
        }

        mostrarToast("Tarefa criada a partir do modelo.");

    } catch (error) {
        console.error("Erro ao aplicar modelo:", error);
        mostrarToast(error.message, "erro");
    } finally {
        setBotaoCarregando(botao, false);
    }
}
