// ==========================
// ABAS, BUSCA E MODO APRESENTAÇÃO DO PROJETO
// ==========================

let abaDetalheProjetoAtual = "VISAO";

function alternarAbaDetalheProjeto(aba) {
    abaDetalheProjetoAtual = aba;

    document.querySelectorAll(".project-tab").forEach(botao => {
        botao.classList.remove("active");
    });

    const mapa = {
        VISAO: "tabProjetoVisao",
        TAREFAS: "tabProjetoTarefas",
        USUARIOS: "tabProjetoUsuarios",
        CUSTOS: "tabProjetoCustos",
        TIMELINE: "tabProjetoTimeline",
        EXPORTACOES: "tabProjetoExportacoes"
    };

    document.getElementById(mapa[aba])?.classList.add("active");

    aplicarAbaDetalheProjeto();
}

function aplicarAbaDetalheProjeto() {
    const insights = document.querySelector(".project-insights-card");
    const detalheGrid = document.querySelector("#projetoDetalhePanel .project-detail-grid");
    const exportacoes = document.getElementById("abaProjetoExportacoes");
    const timelineHorizontal = document.querySelector(".timeline-horizontal-card");

    if (insights) {
        insights.classList.toggle("app-page-hidden", !["VISAO", "CUSTOS"].includes(abaDetalheProjetoAtual));
    }

    if (detalheGrid) {
        detalheGrid.classList.toggle("app-page-hidden", !["VISAO", "TAREFAS", "USUARIOS", "CUSTOS"].includes(abaDetalheProjetoAtual));
    }

    if (timelineHorizontal) {
        timelineHorizontal.classList.toggle("app-page-hidden", abaDetalheProjetoAtual !== "TIMELINE");
    }

    if (exportacoes) {
        exportacoes.classList.toggle("app-page-hidden", abaDetalheProjetoAtual !== "EXPORTACOES");
    }
}

function filtrarDetalheProjetoLocal() {
    const termo = document.getElementById("buscaInternaProjeto")?.value?.trim().toLowerCase() || "";

    document.querySelectorAll("#projetoDetalhePanel .mini-task, #projetoDetalhePanel .usuario-row, #projetoDetalhePanel .timeline-item, #projetoDetalhePanel .timeline-horizontal-item").forEach(item => {
        if (!termo) {
            item.classList.remove("search-hidden");
            return;
        }

        item.classList.toggle("search-hidden", !item.innerText.toLowerCase().includes(termo));
    });
}

function abrirModoApresentacaoProjeto() {
    if (!projetoDetalheSelecionado) {
        mostrarToast("Abra um projeto para usar o modo apresentação.", "erro");
        return;
    }

    const modal = document.getElementById("modalApresentacaoProjeto");
    const titulo = document.getElementById("apresentacaoProjetoNome");
    const descricao = document.getElementById("apresentacaoProjetoDescricao");
    const conteudo = document.getElementById("apresentacaoProjetoConteudo");

    if (!modal || !titulo || !descricao || !conteudo) {
        mostrarToast("Modo apresentação não encontrado.", "erro");
        return;
    }

    const status = typeof contarTarefasPorStatusProjeto === "function"
        ? contarTarefasPorStatusProjeto()
        : { PENDENTE: 0, EM_ANDAMENTO: 0, CONCLUIDA: 0, CANCELADA: 0 };

    const saude = typeof calcularSaudeProjeto === "function"
        ? calcularSaudeProjeto()
        : { nivel: "Em acompanhamento", classe: "", detalhe: "", percentualConclusao: 0, vencidas: 0 };

    const projeto = projetoDetalheSelecionado;
    const estimado = Number(projeto.custoEstimadoTotal || 0);
    const real = Number(projeto.custoRealTotal || 0);
    const diferenca = Number(projeto.diferencaCustoTotal ?? (real - estimado));
    const total = tarefasProjetoDetalhe?.length || 0;

    titulo.innerText = projeto.nome || "Projeto";
    descricao.innerText = projeto.descricao || "Resumo executivo do projeto.";

    conteudo.innerHTML = `
        <div class="presentation-hero ${saude.classe}">
            <span>Saúde do projeto</span>
            <strong>${saude.nivel}</strong>
            <small>${saude.detalhe || "Resumo geral do projeto"}</small>
        </div>

        <div class="presentation-kpis">
            <div><span>Total de tarefas</span><strong>${total}</strong></div>
            <div><span>Conclusão</span><strong>${saude.percentualConclusao}%</strong></div>
            <div><span>Vencidas</span><strong>${saude.vencidas}</strong></div>
            <div><span>Estimado</span><strong>${formatarMoeda(estimado)}</strong></div>
            <div><span>Real</span><strong>${formatarMoeda(real)}</strong></div>
            <div><span>Diferença</span><strong>${formatarMoeda(diferenca)}</strong></div>
        </div>

        <div class="presentation-status">
            <div><span>Pendentes</span><strong>${status.PENDENTE}</strong></div>
            <div><span>Em andamento</span><strong>${status.EM_ANDAMENTO}</strong></div>
            <div><span>Concluídas</span><strong>${status.CONCLUIDA}</strong></div>
            <div><span>Canceladas</span><strong>${status.CANCELADA}</strong></div>
        </div>
    `;

    modal.classList.remove("hidden");
}

function fecharModoApresentacaoProjeto() {
    document.getElementById("modalApresentacaoProjeto")?.classList.add("hidden");
}
