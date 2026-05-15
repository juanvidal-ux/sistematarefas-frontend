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

    if (typeof renderizarGraficosProjeto === "function") {
        renderizarGraficosProjeto();
    }

    if (typeof renderizarTimelineHorizontalProjeto === "function") {
        renderizarTimelineHorizontalProjeto();
    }
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
