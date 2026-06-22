// ==========================
// DOCUMENTOS E VERSÕES POR PROJETO
// ==========================

const DOCUMENTOS_PROJETO_STORAGE_KEY = "taskflow_documentos_projeto_v1";

function obterTodosDocumentosProjeto() {
    try {
        const data = JSON.parse(localStorage.getItem(DOCUMENTOS_PROJETO_STORAGE_KEY) || "[]");
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("Erro ao ler documentos do projeto:", error);
        return [];
    }
}

function salvarTodosDocumentosProjeto(documentos) {
    localStorage.setItem(DOCUMENTOS_PROJETO_STORAGE_KEY, JSON.stringify(documentos));
}

function carregarDocumentosProjeto() {
    if (!projetoDetalheSelecionado) return;

    const todos = obterTodosDocumentosProjeto();
    documentosProjetoAdmin = todos.filter(doc => Number(doc.projetoId) === Number(projetoDetalheSelecionado.id));

    popularSelectDocumentoExistente();
    renderizarResumoDocumentosProjeto();
    renderizarDocumentosProjeto();
}

function abrirFormularioNovoDocumentoProjeto() {
    if (!projetoDetalheSelecionado) {
        mostrarToast("Abra um projeto antes de anexar documentos.", "erro");
        return;
    }

    document.getElementById("formDocumentoProjeto")?.classList.remove("hidden");
    popularSelectDocumentoExistente();
    limparFormularioDocumentoProjeto();
}

function fecharFormularioDocumentoProjeto() {
    document.getElementById("formDocumentoProjeto")?.classList.add("hidden");
    limparFormularioDocumentoProjeto();
}

function limparFormularioDocumentoProjeto() {
    const ids = [
        "documentoProjetoNome",
        "documentoProjetoCodigo",
        "documentoProjetoObservacao",
        "documentoProjetoArquivo"
    ];

    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

    const existente = document.getElementById("documentoProjetoExistente");
    if (existente) existente.value = "NOVO";

    const tipo = document.getElementById("documentoProjetoTipo");
    if (tipo) tipo.value = "DESENHO_TECNICO";

    const status = document.getElementById("documentoProjetoStatusVersao");
    if (status) status.value = "EM_ANALISE";
}

function popularSelectDocumentoExistente() {
    const select = document.getElementById("documentoProjetoExistente");
    if (!select) return;

    select.innerHTML = `<option value="NOVO">Novo documento</option>`;

    documentosProjetoAdmin.forEach(doc => {
        select.innerHTML += `<option value="${doc.id}">${escapeHtml(doc.nome)} ${doc.codigo ? `(${escapeHtml(doc.codigo)})` : ""}</option>`;
    });
}

function prepararFormularioDocumentoPorModo() {
    const id = document.getElementById("documentoProjetoExistente")?.value;
    const nome = document.getElementById("documentoProjetoNome");
    const codigo = document.getElementById("documentoProjetoCodigo");
    const tipo = document.getElementById("documentoProjetoTipo");

    if (!id || id === "NOVO") {
        if (nome) nome.disabled = false;
        if (codigo) codigo.disabled = false;
        if (tipo) tipo.disabled = false;
        return;
    }

    const doc = documentosProjetoAdmin.find(item => String(item.id) === String(id));
    if (!doc) return;

    if (nome) {
        nome.value = doc.nome || "";
        nome.disabled = true;
    }
    if (codigo) {
        codigo.value = doc.codigo || "";
        codigo.disabled = true;
    }
    if (tipo) {
        tipo.value = doc.tipo || "OUTRO";
        tipo.disabled = true;
    }
}

function salvarDocumentoProjeto() {
    if (!isAdmin()) {
        mostrarToast("Apenas administradores podem cadastrar documentos nesta versão.", "erro");
        return;
    }

    if (!projetoDetalheSelecionado) {
        mostrarToast("Abra um projeto antes de salvar documentos.", "erro");
        return;
    }

    const existenteId = document.getElementById("documentoProjetoExistente")?.value || "NOVO";
    const nome = document.getElementById("documentoProjetoNome")?.value?.trim();
    const codigo = document.getElementById("documentoProjetoCodigo")?.value?.trim();
    const tipo = document.getElementById("documentoProjetoTipo")?.value || "OUTRO";
    const status = document.getElementById("documentoProjetoStatusVersao")?.value || "EM_ANALISE";
    const observacao = document.getElementById("documentoProjetoObservacao")?.value?.trim();
    const arquivoInput = document.getElementById("documentoProjetoArquivo");
    const arquivo = arquivoInput?.files?.[0];

    if (!nome && existenteId === "NOVO") {
        mostrarToast("Informe o nome do documento.", "erro");
        return;
    }

    if (!arquivo) {
        mostrarToast("Selecione um arquivo para anexar.", "erro");
        return;
    }

    const todos = obterTodosDocumentosProjeto();
    const usuario = usuarioLogado?.nome || usuarioLogado?.email || "Administrador";
    const agora = new Date().toISOString();

    let documento;

    if (existenteId === "NOVO") {
        documento = {
            id: Date.now(),
            projetoId: projetoDetalheSelecionado.id,
            nome,
            codigo,
            tipo,
            criadoPor: usuario,
            criadoEm: agora,
            versoes: []
        };
        todos.push(documento);
    } else {
        documento = todos.find(doc => String(doc.id) === String(existenteId));
        if (!documento) {
            mostrarToast("Documento não encontrado.", "erro");
            return;
        }
    }

    documento.versoes = Array.isArray(documento.versoes) ? documento.versoes : [];
    documento.versoes.forEach(versao => versao.atual = false);

    const numeroVersao = documento.versoes.length + 1;
    const novaVersao = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        numero: numeroVersao,
        nomeArquivo: arquivo.name,
        tamanho: arquivo.size,
        tipoArquivo: arquivo.type || "Arquivo",
        status,
        observacao,
        atual: true,
        enviadoPor: usuario,
        enviadoEm: agora,
        excluido: false,
        excluidoPor: null,
        excluidoEm: null,
        motivoExclusao: null
    };

    documento.versoes.push(novaVersao);
    salvarTodosDocumentosProjeto(todos);
    carregarDocumentosProjeto();
    fecharFormularioDocumentoProjeto();
    mostrarToast(`Versão V${numeroVersao} salva como versão atual.`);
}

function obterVersaoAtualDocumento(doc) {
    const versoesValidas = (doc.versoes || []).filter(v => !v.excluido);
    return versoesValidas.find(v => v.atual) || versoesValidas[versoesValidas.length - 1] || null;
}

function renderizarResumoDocumentosProjeto() {
    const container = document.getElementById("documentosProjetoResumo");
    if (!container) return;

    const totalDocs = documentosProjetoAdmin.length;
    const totalVersoes = documentosProjetoAdmin.reduce((acc, doc) => acc + (doc.versoes || []).filter(v => !v.excluido).length, 0);
    const aprovados = documentosProjetoAdmin.filter(doc => obterVersaoAtualDocumento(doc)?.status === "APROVADO").length;
    const emAnalise = documentosProjetoAdmin.filter(doc => obterVersaoAtualDocumento(doc)?.status === "EM_ANALISE").length;

    container.innerHTML = `
        <div class="document-summary-card"><span>Documentos</span><strong>${totalDocs}</strong><small>Cadastrados no projeto</small></div>
        <div class="document-summary-card"><span>Versões</span><strong>${totalVersoes}</strong><small>Histórico preservado</small></div>
        <div class="document-summary-card"><span>Aprovados</span><strong>${aprovados}</strong><small>Última versão aprovada</small></div>
        <div class="document-summary-card"><span>Em análise</span><strong>${emAnalise}</strong><small>Aguardando validação</small></div>
    `;
}

function renderizarDocumentosProjeto() {
    const container = document.getElementById("documentosProjetoContainer");
    if (!container) return;

    const termo = document.getElementById("buscaDocumentosProjeto")?.value?.trim()?.toLowerCase() || "";

    const docs = documentosProjetoAdmin.filter(doc => {
        if (!termo) return true;
        const texto = [
            doc.nome,
            doc.codigo,
            doc.tipo,
            ...(doc.versoes || []).map(v => `V${v.numero} ${v.nomeArquivo} ${v.observacao || ""}`)
        ].join(" ").toLowerCase();
        return texto.includes(termo);
    });

    if (!docs.length) {
        container.innerHTML = `<div class="admin-empty">Nenhum documento encontrado para este projeto.</div>`;
        return;
    }

    container.innerHTML = docs.map(doc => renderizarDocumentoProjetoCard(doc)).join("");
}

function renderizarDocumentoProjetoCard(doc) {
    const atual = obterVersaoAtualDocumento(doc);
    const versoes = (doc.versoes || []).filter(v => !v.excluido).sort((a, b) => b.numero - a.numero);

    return `
        <article class="document-card">
            <div class="document-card-header">
                <div>
                    <span class="eyebrow">${escapeHtml(formatarTexto(doc.tipo || "OUTRO"))}</span>
                    <h3>${escapeHtml(doc.nome || "Documento")}</h3>
                    <p>${doc.codigo ? `Código: ${escapeHtml(doc.codigo)}` : "Sem código informado"}</p>
                </div>
                <div class="document-current-badge">
                    <span>Versão atual</span>
                    <strong>${atual ? `V${atual.numero}` : "-"}</strong>
                </div>
            </div>

            ${atual ? `
                <div class="document-current-version">
                    <div>
                        <strong>${escapeHtml(atual.nomeArquivo)}</strong>
                        <span>${formatarTamanhoArquivo(atual.tamanho)} • ${formatarDataHoraDocumento(atual.enviadoEm)}</span>
                    </div>
                    <span class="document-status ${atual.status}">${escapeHtml(formatarTexto(atual.status))}</span>
                </div>
            ` : `<div class="admin-empty compact">Nenhuma versão ativa.</div>`}

            <div class="document-versions">
                ${versoes.map(v => renderizarLinhaVersaoDocumento(doc, v)).join("")}
            </div>
        </article>
    `;
}

function renderizarLinhaVersaoDocumento(doc, versao) {
    return `
        <div class="document-version-row ${versao.atual ? "current" : ""}">
            <div>
                <strong>V${versao.numero} ${versao.atual ? "• Atual" : ""}</strong>
                <span>${escapeHtml(versao.nomeArquivo)} — ${formatarDataHoraDocumento(versao.enviadoEm)}</span>
                <small>${escapeHtml(versao.observacao || "Sem observação informada.")}</small>
            </div>
            <div class="document-version-actions">
                <span class="document-status ${versao.status}">${escapeHtml(formatarTexto(versao.status))}</span>
                <button class="btn-small neutral" onclick="marcarVersaoDocumentoComoAtual(${doc.id}, ${versao.id})" ${versao.atual ? "disabled" : ""}>Tornar atual</button>
                <button class="btn-small danger" onclick="excluirVersaoDocumento(${doc.id}, ${versao.id})">Excluir</button>
            </div>
        </div>
    `;
}

function marcarVersaoDocumentoComoAtual(documentoId, versaoId) {
    if (!isAdmin()) {
        mostrarToast("Apenas administradores podem alterar a versão atual.", "erro");
        return;
    }

    const todos = obterTodosDocumentosProjeto();
    const doc = todos.find(item => Number(item.id) === Number(documentoId));
    if (!doc) return;

    doc.versoes.forEach(v => v.atual = Number(v.id) === Number(versaoId));
    salvarTodosDocumentosProjeto(todos);
    carregarDocumentosProjeto();
    mostrarToast("Versão marcada como atual.");
}

function excluirVersaoDocumento(documentoId, versaoId) {
    if (!isAdmin()) {
        mostrarToast("Somente administrador pode excluir versões.", "erro");
        return;
    }

    const motivo = prompt("Informe o motivo da exclusão da versão:");
    if (!motivo) return;

    const todos = obterTodosDocumentosProjeto();
    const doc = todos.find(item => Number(item.id) === Number(documentoId));
    if (!doc) return;

    const versao = doc.versoes.find(v => Number(v.id) === Number(versaoId));
    if (!versao) return;

    versao.excluido = true;
    versao.excluidoPor = usuarioLogado?.nome || usuarioLogado?.email || "Administrador";
    versao.excluidoEm = new Date().toISOString();
    versao.motivoExclusao = motivo;

    if (versao.atual) {
        versao.atual = false;
        const ultimaDisponivel = [...doc.versoes].filter(v => !v.excluido).sort((a, b) => b.numero - a.numero)[0];
        if (ultimaDisponivel) ultimaDisponivel.atual = true;
    }

    salvarTodosDocumentosProjeto(todos);
    carregarDocumentosProjeto();
    mostrarToast("Versão excluída logicamente e registrada no histórico.");
}

function formatarTamanhoArquivo(bytes) {
    const valor = Number(bytes || 0);
    if (valor < 1024) return `${valor} B`;
    if (valor < 1024 * 1024) return `${(valor / 1024).toFixed(1)} KB`;
    return `${(valor / (1024 * 1024)).toFixed(1)} MB`;
}

function formatarDataHoraDocumento(valor) {
    if (!valor) return "-";
    try {
        return new Date(valor).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    } catch (error) {
        return valor;
    }
}
