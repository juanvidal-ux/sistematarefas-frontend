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
