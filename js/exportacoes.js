// ==========================
// EXPORTAÇÕES DO PROJETO
// PDF, EXCEL E RESUMO EXECUTIVO
// ==========================

const pacoteProjetoCache = new Map();

function obterProjetoDetalheObrigatorio() {
    if (!projetoDetalheSelecionado || !projetoDetalheSelecionado.id) {
        mostrarToast("Abra um projeto antes de exportar.", "erro");
        return null;
    }

    return projetoDetalheSelecionado;
}

function chaveCacheProjeto(projetoId) {
    return String(projetoId);
}

function limparCacheProjetoRelatorio(projetoId) {
    if (!projetoId) {
        pacoteProjetoCache.clear();
        return;
    }

    pacoteProjetoCache.delete(chaveCacheProjeto(projetoId));
}

async function fetchJsonSeguro(url, valorPadrao = null) {
    const response = await fetch(url, {
        method: "GET",
        headers: authHeaders()
    });

    tratarSessao(response);

    if (!response.ok) {
        console.warn("Falha ao carregar recurso para exportação:", url, await response.text());
        return valorPadrao;
    }

    return response.json();
}

async function carregarPacoteProjetoRelatorio(forcarAtualizacao = false) {
    const projetoBase = obterProjetoDetalheObrigatorio();

    if (!projetoBase) {
        return null;
    }

    const projetoId = projetoBase.id;
    const cacheKey = chaveCacheProjeto(projetoId);

    if (!forcarAtualizacao && pacoteProjetoCache.has(cacheKey)) {
        return pacoteProjetoCache.get(cacheKey);
    }

    mostrarToast("Preparando dados do projeto...");

    const [projeto, usuarios, tarefasRaw] = await Promise.all([
        fetchJsonSeguro(`${API_URL}/api/admin/projetos/${projetoId}`, projetoBase),
        fetchJsonSeguro(`${API_URL}/api/admin/projetos/${projetoId}/usuarios`, usuariosProjetoDetalhe || []),
        fetchJsonSeguro(`${API_URL}/api/admin/tarefas/projeto/${projetoId}`, tarefasProjetoDetalhe || [])
    ]);

    const tarefas = Array.isArray(tarefasRaw)
        ? tarefasRaw
        : (tarefasRaw?.content || []);

    const detalhesTarefas = await Promise.all(
        tarefas.map(async (tarefa) => {
            const [subitens, comentarios, historico] = await Promise.all([
                fetchJsonSeguro(`${API_URL}/api/tarefas/${tarefa.id}/itens`, []),
                fetchJsonSeguro(`${API_URL}/api/tarefas/${tarefa.id}/comentarios`, []),
                fetchJsonSeguro(`${API_URL}/api/tarefas/${tarefa.id}/historico`, [])
            ]);

            return {
                tarefa,
                subitens: Array.isArray(subitens) ? subitens : [],
                comentarios: Array.isArray(comentarios) ? comentarios : [],
                historico: Array.isArray(historico) ? historico : []
            };
        })
    );

    const pacote = {
        projeto,
        usuarios: Array.isArray(usuarios) ? usuarios : [],
        tarefas,
        detalhesTarefas,
        geradoEm: new Date()
    };

    pacoteProjetoCache.set(cacheKey, pacote);

    return pacote;
}

function calcularResumoProjetoExportacao(pacote) {
    const tarefas = pacote.tarefas || [];
    const detalhes = pacote.detalhesTarefas || [];
    const subitens = detalhes.flatMap(item => item.subitens || []);

    const porStatus = {
        PENDENTE: tarefas.filter(t => t.status === "PENDENTE").length,
        EM_ANDAMENTO: tarefas.filter(t => t.status === "EM_ANDAMENTO").length,
        CONCLUIDA: tarefas.filter(t => t.status === "CONCLUIDA").length,
        CANCELADA: tarefas.filter(t => t.status === "CANCELADA").length
    };

    const totalTarefas = tarefas.length;
    const percentualConclusao = totalTarefas === 0
        ? 0
        : Math.round((porStatus.CONCLUIDA / totalTarefas) * 100);

    const custoEstimado = Number(pacote.projeto?.custoEstimadoTotal || 0);
    const custoReal = Number(pacote.projeto?.custoRealTotal || 0);
    const diferenca = Number(pacote.projeto?.diferencaCustoTotal ?? (custoReal - custoEstimado));

    const tarefasVencidas = tarefas.filter(t => obterInfoPrazo(t.prazo, t.status).classe === "prazo-vencido").length;
    const subitensConcluidos = subitens.filter(s => s.status === "CONCLUIDO").length;
    const percentualSubitens = subitens.length === 0 ? 0 : Math.round((subitensConcluidos / subitens.length) * 100);

    return {
        porStatus,
        totalTarefas,
        percentualConclusao,
        custoEstimado,
        custoReal,
        diferenca,
        tarefasVencidas,
        totalSubitens: subitens.length,
        subitensConcluidos,
        percentualSubitens
    };
}

function nomeArquivoSeguro(texto) {
    return String(texto || "Projeto")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 80);
}

function baixarBlob(conteudo, nomeArquivo, tipo) {
    const blob = new Blob([conteudo], { type: tipo });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
        URL.revokeObjectURL(url);
        link.remove();
    }, 100);
}

function xmlEscape(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

function excelCell(valor) {
    const numero = typeof valor === "number" && Number.isFinite(valor);

    if (numero) {
        return `<Cell><Data ss:Type="Number">${valor}</Data></Cell>`;
    }

    return `<Cell><Data ss:Type="String">${xmlEscape(valor)}</Data></Cell>`;
}

function excelRow(valores) {
    return `<Row>${valores.map(excelCell).join("")}</Row>`;
}

function excelSheet(nome, linhas) {
    const nomeSeguro = xmlEscape(String(nome).slice(0, 31));

    return `
        <Worksheet ss:Name="${nomeSeguro}">
            <Table>
                ${linhas.map(excelRow).join("\n")}
            </Table>
        </Worksheet>
    `;
}

function montarExcelXmlProjeto(pacote) {
    const projeto = pacote.projeto || {};
    const resumo = calcularResumoProjetoExportacao(pacote);

    const tarefas = pacote.tarefas || [];
    const usuarios = pacote.usuarios || [];
    const detalhes = pacote.detalhesTarefas || [];

    const linhasResumo = [
        ["Campo", "Valor"],
        ["Projeto", projeto.nome || ""],
        ["Status", formatarTexto(projeto.status || "")],
        ["Descrição", projeto.descricao || ""],
        ["Data início", projeto.dataInicio ? formatarData(projeto.dataInicio) : ""],
        ["Fim previsto", projeto.dataFimPrevista ? formatarData(projeto.dataFimPrevista) : ""],
        ["Total de usuários", usuarios.length],
        ["Total de tarefas", resumo.totalTarefas],
        ["Pendentes", resumo.porStatus.PENDENTE],
        ["Em andamento", resumo.porStatus.EM_ANDAMENTO],
        ["Concluídas", resumo.porStatus.CONCLUIDA],
        ["Canceladas", resumo.porStatus.CANCELADA],
        ["Conclusão (%)", resumo.percentualConclusao],
        ["Tarefas vencidas", resumo.tarefasVencidas],
        ["Total de subitens", resumo.totalSubitens],
        ["Subitens concluídos", resumo.subitensConcluidos],
        ["Subitens concluídos (%)", resumo.percentualSubitens],
        ["Custo estimado", resumo.custoEstimado],
        ["Custo real", resumo.custoReal],
        ["Diferença", resumo.diferenca],
        ["Gerado em", formatarDataHora(pacote.geradoEm)]
    ];

    const linhasTarefas = [
        ["ID", "Título", "Descrição", "Responsável", "Projeto", "Prioridade", "Status", "Prazo", "Data criação", "Data conclusão", "Observações"],
        ...tarefas.map(t => [
            t.id,
            t.titulo || "",
            t.descricao || "",
            t.responsavel || "",
            t.projetoNome || projeto.nome || "",
            formatarTexto(t.prioridade || ""),
            formatarTexto(t.status || ""),
            t.prazo ? formatarData(t.prazo) : "",
            t.dataCriacao ? formatarDataHora(t.dataCriacao) : "",
            t.dataConclusao ? formatarDataHora(t.dataConclusao) : "",
            t.observacoes || ""
        ])
    ];

    const linhasSubitens = [
        ["ID tarefa", "Tarefa", "ID subitem", "Subitem", "Descrição", "Responsável", "Status", "Dias úteis previstos", "Prazo", "Data conclusão", "Custo estimado", "Custo real", "Diferença"],
        ...detalhes.flatMap(({ tarefa, subitens }) =>
            (subitens || []).map(item => {
                const estimado = Number(item.custoEstimado || 0);
                const real = Number(item.custoReal || 0);

                return [
                    tarefa.id,
                    tarefa.titulo || "",
                    item.id,
                    item.titulo || "",
                    item.descricao || "",
                    item.responsavelNome || tarefa.responsavel || "",
                    formatarTexto(item.status || ""),
                    item.diasUteisPrevistos || "",
                    item.prazo ? formatarData(item.prazo) : "",
                    item.dataConclusao ? formatarDataHora(item.dataConclusao) : "",
                    estimado,
                    real,
                    real - estimado
                ];
            })
        )
    ];

    const linhasCustos = [
        ["Projeto", "Tarefa", "Subitem", "Responsável", "Status", "Custo estimado", "Custo real", "Diferença"],
        ...detalhes.flatMap(({ tarefa, subitens }) =>
            (subitens || []).map(item => {
                const estimado = Number(item.custoEstimado || 0);
                const real = Number(item.custoReal || 0);

                return [
                    projeto.nome || "",
                    tarefa.titulo || "",
                    item.titulo || "",
                    item.responsavelNome || tarefa.responsavel || "",
                    formatarTexto(item.status || ""),
                    estimado,
                    real,
                    real - estimado
                ];
            })
        )
    ];

    const linhasUsuarios = [
        ["Nome", "E-mail", "Papel", "Status"],
        ...usuarios.map(u => [
            u.usuarioNome || u.nome || "",
            u.usuarioEmail || u.email || "",
            formatarTexto(u.papel || "MEMBRO"),
            u.ativo === false ? "Inativo" : "Ativo"
        ])
    ];

    const linhasComentarios = [
        ["ID tarefa", "Tarefa", "Autor", "Comentário", "Data"],
        ...detalhes.flatMap(({ tarefa, comentarios }) =>
            (comentarios || []).map(comentario => [
                tarefa.id,
                tarefa.titulo || "",
                comentario.autorNome || comentario.usuarioNome || "",
                comentario.mensagem || "",
                comentario.dataCriacao ? formatarDataHora(comentario.dataCriacao) : ""
            ])
        )
    ];

    const linhasHistorico = [
        ["ID tarefa", "Tarefa", "Tipo", "Descrição", "Valor anterior", "Valor novo", "Usuário", "Data"],
        ...detalhes.flatMap(({ tarefa, historico }) =>
            (historico || []).map(evento => [
                tarefa.id,
                tarefa.titulo || "",
                formatarTexto(evento.tipo || ""),
                evento.descricao || evento.mensagem || "",
                evento.valorAnterior || "",
                evento.valorNovo || "",
                evento.usuarioNome || evento.autorNome || "",
                evento.dataCriacao ? formatarDataHora(evento.dataCriacao) : ""
            ])
        )
    ];

    return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook
    xmlns="urn:schemas-microsoft-com:office:spreadsheet"
    xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:x="urn:schemas-microsoft-com:office:excel"
    xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
    ${excelSheet("Resumo", linhasResumo)}
    ${excelSheet("Tarefas", linhasTarefas)}
    ${excelSheet("Subitens", linhasSubitens)}
    ${excelSheet("Custos", linhasCustos)}
    ${excelSheet("Usuarios", linhasUsuarios)}
    ${excelSheet("Comentarios", linhasComentarios)}
    ${excelSheet("Linha do tempo", linhasHistorico)}
</Workbook>`;
}

async function exportarExcelProjeto() {
    try {
        const pacote = await carregarPacoteProjetoRelatorio(true);

        if (!pacote) {
            return;
        }

        const xml = montarExcelXmlProjeto(pacote);
        const nome = `Relatorio_Projeto_${nomeArquivoSeguro(pacote.projeto?.nome)}_${formatarDataArquivo(new Date())}.xls`;

        baixarBlob(
            xml,
            nome,
            "application/vnd.ms-excel;charset=utf-8"
        );

        mostrarToast("Excel do projeto gerado.");

    } catch (error) {
        console.error(error);
        mostrarToast("Erro ao exportar Excel do projeto.", "erro");
    }
}

function montarHtmlRelatorioProjeto(pacote) {
    const projeto = pacote.projeto || {};
    const resumo = calcularResumoProjetoExportacao(pacote);
    const detalhes = pacote.detalhesTarefas || [];

    const linhasTarefas = detalhes.map(({ tarefa, subitens }) => `
        <tr>
            <td>${escapeHtml(tarefa.titulo || "")}</td>
            <td>${escapeHtml(tarefa.responsavel || "")}</td>
            <td>${formatarTexto(tarefa.prioridade || "")}</td>
            <td>${formatarTexto(tarefa.status || "")}</td>
            <td>${tarefa.prazo ? formatarData(tarefa.prazo) : "Sem prazo"}</td>
            <td>${(subitens || []).filter(i => i.status === "CONCLUIDO").length}/${(subitens || []).length}</td>
        </tr>
    `).join("");

    const linhasSubitens = detalhes.flatMap(({ tarefa, subitens }) =>
        (subitens || []).map(item => `
            <tr>
                <td>${escapeHtml(tarefa.titulo || "")}</td>
                <td>${escapeHtml(item.titulo || "")}</td>
                <td>${escapeHtml(item.responsavelNome || tarefa.responsavel || "")}</td>
                <td>${formatarTexto(item.status || "")}</td>
                <td>${item.diasUteisPrevistos || ""}</td>
                <td>${item.prazo ? formatarData(item.prazo) : ""}</td>
                <td>${formatarMoeda(item.custoEstimado || 0)}</td>
                <td>${formatarMoeda(item.custoReal || 0)}</td>
            </tr>
        `)
    ).join("");

    const eventos = montarEventosProjetoTimeline(pacote).slice(0, 40);
    const linhasEventos = eventos.map(evento => `
        <tr>
            <td>${evento.data ? formatarDataHora(evento.data) : ""}</td>
            <td>${escapeHtml(evento.tipo || "")}</td>
            <td>${escapeHtml(evento.titulo || "")}</td>
            <td>${escapeHtml(evento.descricao || "")}</td>
        </tr>
    `).join("");

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Relatório do Projeto - ${escapeHtml(projeto.nome || "")}</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; color: #1d1d1f; margin: 32px; }
        .header { border-bottom: 3px solid #007aff; padding-bottom: 18px; margin-bottom: 24px; }
        .eyebrow { color: #007aff; font-size: 12px; font-weight: 700; text-transform: uppercase; }
        h1 { margin: 6px 0 6px; font-size: 28px; }
        h2 { margin-top: 28px; font-size: 18px; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
        p { color: #555; line-height: 1.5; }
        .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 18px 0; }
        .card { border: 1px solid #ddd; border-radius: 12px; padding: 12px; background: #f8f9fb; }
        .card span { display: block; font-size: 11px; color: #666; text-transform: uppercase; font-weight: 700; }
        .card strong { display: block; font-size: 18px; margin-top: 6px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
        th { background: #f0f4ff; text-align: left; }
        th, td { border: 1px solid #ddd; padding: 7px; vertical-align: top; }
        .footer { margin-top: 28px; font-size: 11px; color: #777; border-top: 1px solid #ddd; padding-top: 12px; }
        @media print {
            body { margin: 18mm; }
            .no-print { display: none; }
            h2 { break-after: avoid; }
            table { break-inside: auto; }
            tr { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="eyebrow">Relatório executivo do projeto</div>
        <h1>${escapeHtml(projeto.nome || "")}</h1>
        <p>${escapeHtml(projeto.descricao || "Sem descrição informada.")}</p>
        <p><strong>Status:</strong> ${formatarTexto(projeto.status || "")} · <strong>Emitido em:</strong> ${formatarDataHora(pacote.geradoEm)}</p>
    </div>

    <h2>Resumo executivo</h2>
    <div class="cards">
        <div class="card"><span>Tarefas</span><strong>${resumo.totalTarefas}</strong></div>
        <div class="card"><span>Conclusão</span><strong>${resumo.percentualConclusao}%</strong></div>
        <div class="card"><span>Custo estimado</span><strong>${formatarMoeda(resumo.custoEstimado)}</strong></div>
        <div class="card"><span>Custo real</span><strong>${formatarMoeda(resumo.custoReal)}</strong></div>
        <div class="card"><span>Diferença</span><strong>${formatarMoeda(resumo.diferenca)}</strong></div>
        <div class="card"><span>Vencidas</span><strong>${resumo.tarefasVencidas}</strong></div>
        <div class="card"><span>Subitens</span><strong>${resumo.totalSubitens}</strong></div>
        <div class="card"><span>Subitens concluídos</span><strong>${resumo.percentualSubitens}%</strong></div>
    </div>

    <h2>Tarefas do projeto</h2>
    <table>
        <thead>
            <tr>
                <th>Tarefa</th><th>Responsável</th><th>Prioridade</th><th>Status</th><th>Prazo</th><th>Subitens</th>
            </tr>
        </thead>
        <tbody>${linhasTarefas || "<tr><td colspan='6'>Nenhuma tarefa encontrada.</td></tr>"}</tbody>
    </table>

    <h2>Subitens e custos</h2>
    <table>
        <thead>
            <tr>
                <th>Tarefa</th><th>Subitem</th><th>Responsável</th><th>Status</th><th>Dias úteis</th><th>Prazo</th><th>Estimado</th><th>Real</th>
            </tr>
        </thead>
        <tbody>${linhasSubitens || "<tr><td colspan='8'>Nenhum subitem encontrado.</td></tr>"}</tbody>
    </table>

    <h2>Linha do tempo consolidada</h2>
    <table>
        <thead>
            <tr>
                <th>Data</th><th>Tipo</th><th>Evento</th><th>Descrição</th>
            </tr>
        </thead>
        <tbody>${linhasEventos || "<tr><td colspan='4'>Nenhum evento encontrado.</td></tr>"}</tbody>
    </table>

    <div class="footer">
        Relatório gerado pelo TaskFlow / VidalSystem. Dados extraídos do projeto no momento da emissão.
    </div>

    <script>
        window.onload = function () {
            setTimeout(function () { window.print(); }, 400);
        };
    </script>
</body>
</html>`;
}

async function gerarPdfProjeto() {
    try {
        const pacote = await carregarPacoteProjetoRelatorio(true);

        if (!pacote) {
            return;
        }

        const htmlRelatorio = montarHtmlRelatorioProjeto(pacote);
        const janela = window.open("", "_blank");

        if (!janela) {
            mostrarToast("Permita pop-ups para gerar o PDF.", "erro");
            return;
        }

        janela.document.open();
        janela.document.write(htmlRelatorio);
        janela.document.close();

        mostrarToast("Relatório aberto. Use Salvar como PDF na impressão.");

    } catch (error) {
        console.error(error);
        mostrarToast("Erro ao gerar PDF do projeto.", "erro");
    }
}

async function copiarResumoExecutivoProjeto() {
    try {
        const pacote = await carregarPacoteProjetoRelatorio(false);

        if (!pacote) {
            return;
        }

        const projeto = pacote.projeto || {};
        const resumo = calcularResumoProjetoExportacao(pacote);

        const texto = [
            `Resumo do projeto: ${projeto.nome || "-"}`,
            `Status: ${formatarTexto(projeto.status || "-")}`,
            `Tarefas: ${resumo.totalTarefas} | Concluídas: ${resumo.porStatus.CONCLUIDA} | Em andamento: ${resumo.porStatus.EM_ANDAMENTO} | Pendentes: ${resumo.porStatus.PENDENTE}`,
            `Conclusão: ${resumo.percentualConclusao}%`,
            `Tarefas vencidas: ${resumo.tarefasVencidas}`,
            `Subitens: ${resumo.subitensConcluidos}/${resumo.totalSubitens} concluídos (${resumo.percentualSubitens}%)`,
            `Custo estimado: ${formatarMoeda(resumo.custoEstimado)}`,
            `Custo real: ${formatarMoeda(resumo.custoReal)}`,
            `Diferença: ${formatarMoeda(resumo.diferenca)}`
        ].join("\n");

        await navigator.clipboard.writeText(texto);

        mostrarToast("Resumo executivo copiado.");

    } catch (error) {
        console.error(error);
        mostrarToast("Erro ao copiar resumo do projeto.", "erro");
    }
}

function formatarDataArquivo(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    const hora = String(data.getHours()).padStart(2, "0");
    const min = String(data.getMinutes()).padStart(2, "0");

    return `${ano}${mes}${dia}_${hora}${min}`;
}


// ==========================
// MELHORIAS DE EXPORTAÇÃO - VERSÃO EXECUTIVA
// ==========================

function calcularVariacaoPercentual(estimado, real) {
    const est = Number(estimado || 0);
    const rl = Number(real || 0);

    if (est === 0) {
        return rl === 0 ? 0 : 100;
    }

    return Math.round(((rl - est) / est) * 10000) / 100;
}

function montarRankingCustosProjeto(pacote) {
    return (pacote.detalhesTarefas || [])
        .flatMap(({ tarefa, subitens }) =>
            (subitens || []).map(item => {
                const estimado = Number(item.custoEstimado || 0);
                const real = Number(item.custoReal || 0);

                return {
                    tarefa: tarefa.titulo || "",
                    subitem: item.titulo || "",
                    responsavel: item.responsavelNome || tarefa.responsavel || "",
                    status: item.status || "",
                    estimado,
                    real,
                    diferenca: real - estimado,
                    variacao: calcularVariacaoPercentual(estimado, real)
                };
            })
        )
        .sort((a, b) => Math.abs(b.real || b.estimado) - Math.abs(a.real || a.estimado));
}

function montarExcelXmlProjeto(pacote) {
    const projeto = pacote.projeto || {};
    const resumo = calcularResumoProjetoExportacao(pacote);
    const tarefas = pacote.tarefas || [];
    const usuarios = pacote.usuarios || [];
    const detalhes = pacote.detalhesTarefas || [];
    const rankingCustos = montarRankingCustosProjeto(pacote);

    const linhasResumo = [
        ["Campo", "Valor"],
        ["Projeto", projeto.nome || ""],
        ["Status", formatarTexto(projeto.status || "")],
        ["Descrição", projeto.descricao || ""],
        ["Data início", projeto.dataInicio ? formatarData(projeto.dataInicio) : ""],
        ["Fim previsto", projeto.dataFimPrevista ? formatarData(projeto.dataFimPrevista) : ""],
        ["Total de usuários", usuarios.length],
        ["Total de tarefas", resumo.totalTarefas],
        ["Pendentes", resumo.porStatus.PENDENTE],
        ["Em andamento", resumo.porStatus.EM_ANDAMENTO],
        ["Concluídas", resumo.porStatus.CONCLUIDA],
        ["Canceladas", resumo.porStatus.CANCELADA],
        ["Conclusão (%)", resumo.percentualConclusao],
        ["Tarefas vencidas", resumo.tarefasVencidas],
        ["Total de subitens", resumo.totalSubitens],
        ["Subitens concluídos", resumo.subitensConcluidos],
        ["Subitens concluídos (%)", resumo.percentualSubitens],
        ["Custo estimado", resumo.custoEstimado],
        ["Custo real", resumo.custoReal],
        ["Diferença", resumo.diferenca],
        ["Variação (%)", calcularVariacaoPercentual(resumo.custoEstimado, resumo.custoReal)],
        ["Gerado em", formatarDataHora(pacote.geradoEm)]
    ];

    const linhasTarefas = [
        ["ID", "Título", "Descrição", "Responsável", "Projeto", "Prioridade", "Status", "Prazo", "Situação do prazo", "Data criação", "Data conclusão", "Observações"],
        ...tarefas.map(t => {
            const prazoInfo = obterInfoPrazo(t.prazo, t.status);

            return [
                t.id,
                t.titulo || "",
                t.descricao || "",
                t.responsavel || "",
                t.projetoNome || projeto.nome || "",
                formatarTexto(t.prioridade || ""),
                formatarTexto(t.status || ""),
                t.prazo ? formatarData(t.prazo) : "",
                prazoInfo.texto || "",
                t.dataCriacao ? formatarDataHora(t.dataCriacao) : "",
                t.dataConclusao ? formatarDataHora(t.dataConclusao) : "",
                t.observacoes || ""
            ];
        })
    ];

    const linhasSubitens = [
        ["ID tarefa", "Tarefa", "ID subitem", "Subitem", "Descrição", "Responsável", "Status", "Dias úteis previstos", "Prazo", "Data conclusão", "Custo estimado", "Custo real", "Diferença", "% Variação"],
        ...detalhes.flatMap(({ tarefa, subitens }) =>
            (subitens || []).map(item => {
                const estimado = Number(item.custoEstimado || 0);
                const real = Number(item.custoReal || 0);

                return [
                    tarefa.id,
                    tarefa.titulo || "",
                    item.id,
                    item.titulo || "",
                    item.descricao || "",
                    item.responsavelNome || tarefa.responsavel || "",
                    formatarTexto(item.status || ""),
                    item.diasUteisPrevistos || "",
                    item.prazo ? formatarData(item.prazo) : "",
                    item.dataConclusao ? formatarDataHora(item.dataConclusao) : "",
                    estimado,
                    real,
                    real - estimado,
                    calcularVariacaoPercentual(estimado, real)
                ];
            })
        )
    ];

    const linhasCustos = [
        ["Projeto", "Tarefa", "Subitem", "Responsável", "Status", "Custo estimado", "Custo real", "Diferença", "% Variação"],
        ...rankingCustos.map(item => [
            projeto.nome || "",
            item.tarefa,
            item.subitem,
            item.responsavel,
            formatarTexto(item.status || ""),
            item.estimado,
            item.real,
            item.diferenca,
            item.variacao
        ])
    ];

    const linhasAnaliseFinanceira = [
        ["Indicador", "Valor"],
        ["Custo estimado total", resumo.custoEstimado],
        ["Custo real total", resumo.custoReal],
        ["Diferença total", resumo.diferenca],
        ["Variação total (%)", calcularVariacaoPercentual(resumo.custoEstimado, resumo.custoReal)],
        ["Maior custo real", rankingCustos[0]?.real || 0],
        ["Item de maior custo", rankingCustos[0]?.subitem || ""],
        ["Responsável do item de maior custo", rankingCustos[0]?.responsavel || ""],
        ["Quantidade de itens com custo", rankingCustos.filter(i => i.real > 0 || i.estimado > 0).length]
    ];

    const linhasUsuarios = [
        ["Nome", "E-mail", "Papel", "Status"],
        ...usuarios.map(u => [
            u.usuarioNome || u.nome || "",
            u.usuarioEmail || u.email || "",
            formatarTexto(u.papel || "MEMBRO"),
            u.ativo === false ? "Inativo" : "Ativo"
        ])
    ];

    const linhasComentarios = [
        ["ID tarefa", "Tarefa", "Autor", "Comentário", "Data"],
        ...detalhes.flatMap(({ tarefa, comentarios }) =>
            (comentarios || []).map(comentario => [
                tarefa.id,
                tarefa.titulo || "",
                comentario.autorNome || comentario.usuarioNome || "",
                comentario.mensagem || "",
                comentario.dataCriacao ? formatarDataHora(comentario.dataCriacao) : ""
            ])
        )
    ];

    const linhasHistorico = [
        ["ID tarefa", "Tarefa", "Tipo", "Descrição", "Valor anterior", "Valor novo", "Usuário", "Data"],
        ...detalhes.flatMap(({ tarefa, historico }) =>
            (historico || []).map(evento => [
                tarefa.id,
                tarefa.titulo || "",
                formatarTexto(evento.tipo || ""),
                evento.descricao || evento.mensagem || "",
                evento.valorAnterior || "",
                evento.valorNovo || "",
                evento.usuarioNome || evento.autorNome || "",
                evento.dataCriacao ? formatarDataHora(evento.dataCriacao) : ""
            ])
        )
    ];

    return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook
    xmlns="urn:schemas-microsoft-com:office:spreadsheet"
    xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:x="urn:schemas-microsoft-com:office:excel"
    xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
    ${excelSheet("Resumo", linhasResumo)}
    ${excelSheet("Tarefas", linhasTarefas)}
    ${excelSheet("Subitens", linhasSubitens)}
    ${excelSheet("Custos", linhasCustos)}
    ${excelSheet("Analise financeira", linhasAnaliseFinanceira)}
    ${excelSheet("Usuarios", linhasUsuarios)}
    ${excelSheet("Comentarios", linhasComentarios)}
    ${excelSheet("Linha do tempo", linhasHistorico)}
</Workbook>`;
}
