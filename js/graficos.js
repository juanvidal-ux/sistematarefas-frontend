// ==========================
// GRÁFICOS VISUAIS DO PROJETO
// ==========================

function contarTarefasPorStatusProjeto() {
    const tarefas = tarefasProjetoDetalhe || [];

    return {
        PENDENTE: tarefas.filter(t => t.status === "PENDENTE").length,
        EM_ANDAMENTO: tarefas.filter(t => t.status === "EM_ANDAMENTO").length,
        CONCLUIDA: tarefas.filter(t => t.status === "CONCLUIDA").length,
        CANCELADA: tarefas.filter(t => t.status === "CANCELADA").length
    };
}

function calcularSaudeProjeto() {
    const tarefas = tarefasProjetoDetalhe || [];
    const projeto = projetoDetalheSelecionado || {};

    const total = tarefas.length;
    const concluidas = tarefas.filter(t => t.status === "CONCLUIDA").length;
    const vencidas = tarefas.filter(t => obterInfoPrazo(t.prazo, t.status).classe === "prazo-vencido").length;
    const andamento = tarefas.filter(t => t.status === "EM_ANDAMENTO").length;

    const percentualConclusao = total === 0 ? 0 : Math.round((concluidas / total) * 100);
    const diferencaCusto = Number(projeto.diferencaCustoTotal || 0);
    const custoEstimado = Number(projeto.custoEstimadoTotal || 0);

    let nivel = "No prazo";
    let classe = "health-good";
    let detalhe = `${percentualConclusao}% concluído`;

    if (vencidas > 0 || (custoEstimado > 0 && diferencaCusto > custoEstimado * 0.15)) {
        nivel = "Crítico";
        classe = "health-critical";
        detalhe = `${vencidas} tarefa(s) vencida(s)`;
    } else if (andamento > 0 || (custoEstimado > 0 && diferencaCusto > 0)) {
        nivel = "Atenção";
        classe = "health-warning";
        detalhe = `${andamento} tarefa(s) em andamento`;
    }

    return {
        nivel,
        classe,
        detalhe,
        percentualConclusao,
        vencidas
    };
}

function renderizarCardSaudeProjeto() {
    const container = document.getElementById("detalheProjetoSaude");

    if (!container) {
        return;
    }

    const saude = calcularSaudeProjeto();

    container.className = `project-health-card ${saude.classe}`;
    container.innerHTML = `
        <span>Saúde do projeto</span>
        <strong>${saude.nivel}</strong>
        <small>${saude.detalhe}</small>

        <div class="health-progress">
            <div style="width: ${saude.percentualConclusao}%"></div>
        </div>

        <em>${saude.percentualConclusao}% de conclusão geral</em>
    `;
}

function renderizarGraficoStatusProjeto() {
    const container = document.getElementById("graficoStatusProjeto");

    if (!container) {
        return;
    }

    const contagem = contarTarefasPorStatusProjeto();
    const total = Object.values(contagem).reduce((acc, valor) => acc + valor, 0);

    const itens = [
        { label: "Pendente", valor: contagem.PENDENTE, classe: "bar-pendente" },
        { label: "Em andamento", valor: contagem.EM_ANDAMENTO, classe: "bar-andamento" },
        { label: "Concluída", valor: contagem.CONCLUIDA, classe: "bar-concluida" },
        { label: "Cancelada", valor: contagem.CANCELADA, classe: "bar-cancelada" }
    ];

    container.innerHTML = `
        <h3>Tarefas por status</h3>
        <div class="bar-chart">
            ${itens.map(item => {
                const percentual = total === 0 ? 0 : Math.round((item.valor / total) * 100);

                return `
                    <div class="bar-row">
                        <div class="bar-label">
                            <span>${item.label}</span>
                            <strong>${item.valor}</strong>
                        </div>
                        <div class="bar-track">
                            <div class="bar-fill ${item.classe}" style="width: ${percentual}%"></div>
                        </div>
                    </div>
                `;
            }).join("")}
        </div>
    `;
}

function renderizarGraficoCustosProjeto() {
    const container = document.getElementById("graficoCustosProjeto");
    const projeto = projetoDetalheSelecionado || {};

    if (!container) {
        return;
    }

    const estimado = Number(projeto.custoEstimadoTotal || 0);
    const real = Number(projeto.custoRealTotal || 0);
    const maior = Math.max(estimado, real, 1);
    const diferenca = Number(projeto.diferencaCustoTotal ?? (real - estimado));

    container.innerHTML = `
        <h3>Estimado x real</h3>

        <div class="finance-bars">
            <div class="finance-row">
                <div class="bar-label">
                    <span>Estimado</span>
                    <strong>${formatarMoeda(estimado)}</strong>
                </div>
                <div class="bar-track">
                    <div class="bar-fill bar-estimado" style="width: ${Math.round((estimado / maior) * 100)}%"></div>
                </div>
            </div>

            <div class="finance-row">
                <div class="bar-label">
                    <span>Real</span>
                    <strong>${formatarMoeda(real)}</strong>
                </div>
                <div class="bar-track">
                    <div class="bar-fill bar-real" style="width: ${Math.round((real / maior) * 100)}%"></div>
                </div>
            </div>
        </div>

        <div class="finance-diff ${diferenca > 0 ? "negativo" : diferenca < 0 ? "positivo" : ""}">
            Diferença: ${formatarMoeda(diferenca)}
        </div>
    `;
}

function renderizarGraficoResponsaveisProjeto() {
    const container = document.getElementById("graficoResponsaveisProjeto");

    if (!container) {
        return;
    }

    const tarefas = tarefasProjetoDetalhe || [];
    const contagem = new Map();

    tarefas.forEach(tarefa => {
        const nome = tarefa.responsavel || "Sem responsável";
        contagem.set(nome, (contagem.get(nome) || 0) + 1);
    });

    const itens = Array.from(contagem.entries())
        .map(([nome, valor]) => ({ nome, valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 6);

    const maior = Math.max(...itens.map(item => item.valor), 1);

    container.innerHTML = `
        <h3>Tarefas por responsável</h3>

        ${
            itens.length === 0
                ? `<div class="admin-empty">Nenhuma tarefa carregada.</div>`
                : `
                    <div class="bar-chart">
                        ${itens.map(item => `
                            <div class="bar-row">
                                <div class="bar-label">
                                    <span>${escapeHtml(item.nome)}</span>
                                    <strong>${item.valor}</strong>
                                </div>
                                <div class="bar-track">
                                    <div class="bar-fill bar-responsavel" style="width: ${Math.round((item.valor / maior) * 100)}%"></div>
                                </div>
                            </div>
                        `).join("")}
                    </div>
                `
        }
    `;
}

function renderizarGraficosProjeto() {
    if (!projetoDetalheSelecionado) {
        return;
    }

    renderizarCardSaudeProjeto();
    renderizarGraficoStatusProjeto();
    renderizarGraficoCustosProjeto();
    renderizarGraficoResponsaveisProjeto();
}
