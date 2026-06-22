// ==========================
// DOCUMENTOS / ANEXOS DA TAREFA COM VERSÕES - API REAL
// Backend: Spring Boot + Supabase Storage
// ==========================

let documentoTarefaAbertoId = null;
let documentosTarefaCache = {};
let resumosDocumentosTarefaCache = {};
let carregandoResumoDocumentos = new Set();

function usuarioPodeVerHistoricoDocumentos() {
    return typeof isAdmin === "function" && (isAdmin() || isSuperAdmin());
}

function obterDocumentosDaTarefaCache(tarefaId) {
    return documentosTarefaCache[String(tarefaId)] || [];
}

function normalizarVersaoDocumentoTarefa(versao) {
    if (!versao) return null;

    return {
        id: versao.id,
        numero: versao.numeroVersao ? `V${versao.numeroVersao}` : "V-",
        numeroVersao: versao.numeroVersao,
        arquivoNome: versao.nomeArquivoOriginal || "Arquivo",
        extensao: versao.extensao,
        contentType: versao.contentType,
        tamanhoArquivo: versao.tamanhoArquivo,
        observacao: versao.observacao,
        atual: Boolean(versao.versaoAtual),
        enviadoPor: versao.enviadoPorNome || "Usuário",
        enviadoEm: versao.enviadoEm,
        excluido: Boolean(versao.excluido),
        motivoExclusao: versao.motivoExclusao
    };
}

function normalizarDocumentoTarefa(documento) {
    const versaoAtual = normalizarVersaoDocumentoTarefa(documento.versaoAtual);

    return {
        id: documento.id,
        tarefaId: documento.tarefaId,
        nome: documento.nomeDocumento,
        codigo: documento.codigoDocumento,
        tipo: documento.tipoDocumento || "Documento",
        status: documento.status || "EM_ANALISE",
        criadoPor: documento.criadoPorNome,
        criadoEm: documento.criadoEm,
        totalVersoes: documento.totalVersoes || 0,
        podeVerHistorico: Boolean(documento.podeVerHistorico),
        versaoAtual,
        historico: documento.historico || []
    };
}

function calcularResumoDocumentosTarefa(tarefaId) {
    const resumoCache = resumosDocumentosTarefaCache[String(tarefaId)];
    if (resumoCache) return resumoCache;

    const documentos = obterDocumentosDaTarefaCache(tarefaId);
    const totalVersoes = documentos.reduce((total, doc) => total + Number(doc.totalVersoes || 0), 0);
    const ultima = documentos
        .map(doc => doc.versaoAtual)
        .filter(Boolean)
        .sort((a, b) => new Date(b.enviadoEm || 0) - new Date(a.enviadoEm || 0))[0];

    return {
        totalDocumentos: documentos.length,
        totalVersoes,
        ultimaVersao: ultima?.numero || null
    };
}

function montarResumoDocumentosTarefaCard(tarefaId) {
    const idContainer = `taskDocsSummary_${tarefaId}`;

    setTimeout(() => carregarResumoDocumentosTarefa(tarefaId), 0);

    return `
        <div id="${idContainer}">
            ${montarResumoDocumentosTarefaCardHtml(tarefaId)}
        </div>
    `;
}

function montarResumoDocumentosTarefaCardHtml(tarefaId) {
    const resumo = calcularResumoDocumentosTarefa(tarefaId);

    if (!resumo || resumo.totalDocumentos === 0) {
        // Não mostra bloco vazio no card da tarefa para manter o visual limpo.
        return "";
    }

    return `
        <div class="task-documents-summary">
            <div>
                <span>📎 Documentos</span>
                <strong>${resumo.totalDocumentos} doc. • ${resumo.totalVersoes} versões</strong>
            </div>
            <small>Atual: ${escapeHtml(resumo.ultimaVersao || "V-")}</small>
        </div>
    `;
}

async function carregarResumoDocumentosTarefa(tarefaId) {
    const chave = String(tarefaId);
    if (carregandoResumoDocumentos.has(chave)) return;

    carregandoResumoDocumentos.add(chave);
    try {
        const resumo = await apiGet(`/api/tarefas/${tarefaId}/documentos/resumo`, {
            errorMessage: "Não foi possível carregar o resumo dos documentos."
        });

        resumosDocumentosTarefaCache[chave] = {
            totalDocumentos: resumo.totalDocumentos || 0,
            totalVersoes: resumo.totalVersoes || 0,
            ultimaVersao: resumo.ultimaVersao ? `V${resumo.ultimaVersao}` : null
        };

        const container = document.getElementById(`taskDocsSummary_${tarefaId}`);
        if (container) {
            container.innerHTML = montarResumoDocumentosTarefaCardHtml(tarefaId);
        }
    } catch (error) {
        console.warn("Resumo de documentos não carregado:", error.message);
    } finally {
        carregandoResumoDocumentos.delete(chave);
    }
}

function atualizarContadorDocumentosTarefa(tarefaId) {
    const badge = document.getElementById("tabDocumentosTarefaCount");
    if (!badge) return;

    const resumo = calcularResumoDocumentosTarefa(tarefaId);
    badge.innerText = resumo.totalDocumentos || 0;
}

async function carregarDocumentosTarefaSelecionada() {
    if (!tarefaSelecionada) return;

    documentoTarefaAbertoId = null;
    renderizarDocumentosTarefaCarregando();

    try {
        const dados = await apiGet(`/api/tarefas/${tarefaSelecionada.id}/documentos`, {
            errorMessage: "Não foi possível carregar os documentos da tarefa."
        });

        const documentos = Array.isArray(dados) ? dados.map(normalizarDocumentoTarefa) : [];
        documentosTarefaCache[String(tarefaSelecionada.id)] = documentos;

        resumosDocumentosTarefaCache[String(tarefaSelecionada.id)] = {
            totalDocumentos: documentos.length,
            totalVersoes: documentos.reduce((total, doc) => total + Number(doc.totalVersoes || 0), 0),
            ultimaVersao: documentos
                .map(doc => doc.versaoAtual)
                .filter(Boolean)
                .sort((a, b) => new Date(b.enviadoEm || 0) - new Date(a.enviadoEm || 0))[0]?.numero || null
        };

        atualizarContadorDocumentosTarefa(tarefaSelecionada.id);
        renderizarDocumentosTarefa();
        atualizarResumoCardTarefaAberta();
    } catch (error) {
        renderizarDocumentosTarefaErro(error.message);
    }
}

function atualizarResumoCardTarefaAberta() {
    if (!tarefaSelecionada) return;
    const container = document.getElementById(`taskDocsSummary_${tarefaSelecionada.id}`);
    if (container) container.innerHTML = montarResumoDocumentosTarefaCardHtml(tarefaSelecionada.id);
}


function formatarTamanhoArquivoDocumento(bytes) {
    const valor = Number(bytes || 0);
    if (!valor) return "Tamanho não informado";
    if (valor < 1024) return `${valor} B`;
    if (valor < 1024 * 1024) return `${(valor / 1024).toFixed(1)} KB`;
    return `${(valor / (1024 * 1024)).toFixed(1)} MB`;
}

function obterIconeDocumentoPorExtensao(extensao) {
    const ext = String(extensao || "").toLowerCase();
    if (["pdf"].includes(ext)) return "📕";
    if (["doc", "docx"].includes(ext)) return "📘";
    if (["xls", "xlsx", "csv"].includes(ext)) return "📗";
    if (["png", "jpg", "jpeg", "webp"].includes(ext)) return "🖼️";
    if (["zip", "rar", "7z"].includes(ext)) return "🗜️";
    if (["dwg", "dxf", "step", "stp", "ipt", "iam"].includes(ext)) return "📐";
    return "📎";
}

function montarResumoAbaDocumentosTarefa(documentos) {
    const totalDocumentos = documentos.length;
    const totalVersoes = documentos.reduce((total, doc) => total + Number(doc.totalVersoes || 0), 0);
    const ultima = documentos
        .map(doc => doc.versaoAtual)
        .filter(Boolean)
        .sort((a, b) => new Date(b.enviadoEm || 0) - new Date(a.enviadoEm || 0))[0];

    const aprovados = documentos.filter(doc => String(doc.status || "").toUpperCase() === "APROVADO").length;
    const analise = documentos.filter(doc => String(doc.status || "").toUpperCase() === "EM_ANALISE").length;

    return `
        <div class="task-documents-dashboard">
            <div class="task-documents-dashboard-card highlight">
                <span>📎 Documentos</span>
                <strong>${totalDocumentos}</strong>
                <small>Anexados nesta tarefa</small>
            </div>
            <div class="task-documents-dashboard-card">
                <span>🔁 Versões</span>
                <strong>${totalVersoes}</strong>
                <small>Histórico preservado</small>
            </div>
            <div class="task-documents-dashboard-card">
                <span>✅ Aprovados</span>
                <strong>${aprovados}</strong>
                <small>${analise} em análise</small>
            </div>
            <div class="task-documents-dashboard-card">
                <span>⭐ Última atual</span>
                <strong>${escapeHtml(ultima?.numero || "-")}</strong>
                <small>${ultima?.enviadoEm ? formatarDataHora(ultima.enviadoEm) : "Sem envio"}</small>
            </div>
        </div>
    `;
}

function renderizarDocumentosTarefaCarregando() {
    const container = document.getElementById("documentosTarefaContainer");
    if (!container) return;
    container.innerHTML = `<div class="admin-empty">Carregando documentos...</div>`;
}

function renderizarDocumentosTarefaErro(mensagem) {
    const container = document.getElementById("documentosTarefaContainer");
    if (!container) return;
    container.innerHTML = `<div class="admin-empty">${escapeHtml(mensagem || "Erro ao carregar documentos.")}</div>`;
}

function renderizarDocumentosTarefa() {
    const container = document.getElementById("documentosTarefaContainer");
    if (!container || !tarefaSelecionada) return;

    const documentos = obterDocumentosDaTarefaCache(tarefaSelecionada.id);

    if (documentos.length === 0) {
        container.innerHTML = `
            <div class="task-documents-empty-state">
                <div class="empty-doc-icon">📎</div>
                <h4>Nenhum documento anexado</h4>
                <p>Adicione desenhos técnicos, laudos, evidências ou arquivos da tarefa. A primeira versão será salva como V1 atual.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        ${montarResumoAbaDocumentosTarefa(documentos)}
        <div class="task-documents-stack">
            ${documentos.map(doc => montarDocumentoTarefaHtml(doc)).join("")}
        </div>
    `;
}

function montarDocumentoTarefaHtml(documento) {
    const versaoAtual = documento.versaoAtual;
    const totalVersoes = Number(documento.totalVersoes || 0);
    const aberto = String(documentoTarefaAbertoId) === String(documento.id);
    const admin = usuarioPodeVerHistoricoDocumentos() && documento.podeVerHistorico;
    const extensao = versaoAtual?.extensao || (versaoAtual?.arquivoNome || "").split(".").pop();
    const icone = obterIconeDocumentoPorExtensao(extensao);

    return `
        <article class="task-document-card premium ${aberto ? "open" : ""}">
            <div class="task-document-main premium-main">
                <div class="task-document-left">
                    <div class="task-document-file-icon" aria-hidden="true">${icone}</div>
                    <div class="task-document-info">
                        <div class="task-document-kicker">
                            <span class="task-document-type">${escapeHtml(documento.tipo || "Documento")}${documento.codigo ? ` • ${escapeHtml(documento.codigo)}` : ""}</span>
                            <span class="doc-status ${String(documento.status || "EM_ANALISE").toLowerCase()}">${formatarTexto(documento.status || "EM_ANALISE")}</span>
                        </div>
                        <h4>${escapeHtml(documento.nome)}</h4>
                        <div class="task-document-current-line">
                            <strong>${escapeHtml(versaoAtual?.numero || "V-")} atual</strong>
                            ${versaoAtual?.arquivoNome ? `<span>${escapeHtml(versaoAtual.arquivoNome)}</span>` : ""}
                        </div>
                        <div class="task-document-meta-grid">
                            <span>🕒 ${versaoAtual?.enviadoEm ? formatarDataHora(versaoAtual.enviadoEm) : "Sem data"}</span>
                            <span>👤 ${escapeHtml(versaoAtual?.enviadoPor || "Usuário")}</span>
                            <span>💾 ${formatarTamanhoArquivoDocumento(versaoAtual?.tamanhoArquivo)}</span>
                            <span>🔁 ${totalVersoes} versão${totalVersoes === 1 ? "" : "es"}</span>
                        </div>
                        ${versaoAtual?.observacao ? `<p class="task-document-note">${escapeHtml(versaoAtual.observacao)}</p>` : ""}
                    </div>
                </div>

                <div class="task-document-actions premium-actions">
                    <button class="btn-small neutral" onclick="event.stopPropagation(); baixarDocumentoAtualTarefa('${documento.id}')">Baixar atual</button>
                    <button class="btn-small success" onclick="event.stopPropagation(); prepararNovaVersaoDocumentoTarefa('${documento.id}')">Nova versão</button>
                </div>
            </div>

            ${admin ? `
                <div class="task-document-history-toggle premium-toggle">
                    <div>
                        <strong>Histórico de versões</strong>
                        <small>Somente admin/super admin • ${totalVersoes} versão${totalVersoes === 1 ? "" : "es"} registrada${totalVersoes === 1 ? "" : "s"}</small>
                    </div>
                    <button class="btn-small neutral" onclick="event.stopPropagation(); alternarHistoricoDocumentoTarefa('${documento.id}')">
                        ${aberto ? "Ocultar histórico" : "Ver histórico"}
                    </button>
                </div>
            ` : ""}

            ${admin && aberto ? montarHistoricoVersoesDocumentoTarefa(documento) : ""}
        </article>
    `;
}

async function montarHistoricoVersoesDocumentoTarefa(documento) {
    return "";
}

async function alternarHistoricoDocumentoTarefa(documentoId) {
    if (!usuarioPodeVerHistoricoDocumentos()) return;

    const abrindo = String(documentoTarefaAbertoId) !== String(documentoId);
    documentoTarefaAbertoId = abrindo ? documentoId : null;

    if (abrindo) {
        await carregarHistoricoDocumentoTarefa(documentoId);
    }

    renderizarDocumentosTarefa();
}

async function carregarHistoricoDocumentoTarefa(documentoId) {
    const documento = obterDocumentoTarefaPorId(documentoId);
    if (!documento) return;

    if (Array.isArray(documento.historico) && documento.historico.length > 0) return;

    try {
        const historico = await apiGet(`/api/admin/documentos/${documentoId}/versoes`, {
            errorMessage: "Não foi possível carregar o histórico de versões."
        });
        documento.historico = Array.isArray(historico) ? historico.map(normalizarVersaoDocumentoTarefa) : [];
    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

// Mantém esta função síncrona porque o HTML é chamado durante a renderização do card.
function montarHistoricoVersoesDocumentoTarefaSync(documento) {
    const versoes = (documento.historico || [])
        .filter(versao => !versao.excluido)
        .slice()
        .sort((a, b) => Number(b.numeroVersao || 0) - Number(a.numeroVersao || 0));

    if (!versoes.length) {
        return `<div class="task-document-history"><div class="admin-empty">Carregando histórico...</div></div>`;
    }

    return `
        <div class="task-document-history">
            <div class="task-document-history-title">Versões anteriores e versão atual</div>
            ${versoes.map(versao => `
                <div class="task-document-version ${versao.atual ? "current" : ""}">
                    <div>
                        <strong>${escapeHtml(versao.numero)} ${versao.atual ? "• Atual" : ""}</strong>
                        <span>${escapeHtml(versao.arquivoNome || "Arquivo")}</span>
                        <small>${formatarDataHora(versao.enviadoEm)} • ${escapeHtml(versao.enviadoPor || "Usuário")}</small>
                        <p>${escapeHtml(versao.observacao || "Sem observação.")}</p>
                    </div>
                    <div class="task-document-version-actions">
                        <button class="btn-small neutral" onclick="event.stopPropagation(); baixarVersaoDocumentoTarefa('${documento.id}', '${versao.id}')">Baixar</button>
                        ${!versao.atual ? `<button class="btn-small neutral" onclick="event.stopPropagation(); restaurarVersaoDocumentoTarefa('${documento.id}', '${versao.id}')">Restaurar</button>` : ""}
                        <button class="btn-small danger" onclick="event.stopPropagation(); excluirVersaoDocumentoTarefa('${documento.id}', '${versao.id}')">Excluir</button>
                    </div>
                </div>
            `).join("")}
        </div>
    `;
}

// Corrige a chamada usada em montarDocumentoTarefaHtml.
montarHistoricoVersoesDocumentoTarefa = montarHistoricoVersoesDocumentoTarefaSync;

function obterDocumentoTarefaPorId(documentoId) {
    if (!tarefaSelecionada) return null;
    return obterDocumentosDaTarefaCache(tarefaSelecionada.id)
        .find(doc => String(doc.id) === String(documentoId));
}

function limparFormularioDocumentoTarefa() {
    const campos = ["docTarefaNome", "docTarefaCodigo", "docTarefaTipo", "docTarefaStatus", "docTarefaObservacao", "docTarefaArquivo"];
    campos.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.tagName === "SELECT") el.selectedIndex = 0;
        else el.value = "";
    });

    const docId = document.getElementById("docTarefaDocumentoId");
    if (docId) docId.value = "";

    const titulo = document.getElementById("documentosTarefaFormTitulo");
    if (titulo) titulo.innerText = "Adicionar documento/desenho";

    const btn = document.getElementById("btnSalvarDocumentoTarefa");
    if (btn) btn.innerText = "Salvar documento";
}

function prepararNovaVersaoDocumentoTarefa(documentoId) {
    const documento = obterDocumentoTarefaPorId(documentoId);
    if (!documento) return;

    document.getElementById("docTarefaDocumentoId").value = documento.id;
    document.getElementById("docTarefaNome").value = documento.nome || "";
    document.getElementById("docTarefaCodigo").value = documento.codigo || "";
    document.getElementById("docTarefaTipo").value = documento.tipo || "Desenho técnico";
    document.getElementById("docTarefaStatus").value = documento.status || "EM_ANALISE";
    document.getElementById("docTarefaObservacao").focus();

    document.getElementById("documentosTarefaFormTitulo").innerText = `Nova versão de ${documento.nome}`;
    document.getElementById("btnSalvarDocumentoTarefa").innerText = "Enviar nova versão";
}

async function salvarDocumentoTarefa() {
    if (!tarefaSelecionada) return;

    const documentoId = document.getElementById("docTarefaDocumentoId")?.value || "";
    const nome = document.getElementById("docTarefaNome")?.value.trim();
    const codigo = document.getElementById("docTarefaCodigo")?.value.trim();
    const tipo = document.getElementById("docTarefaTipo")?.value || "Documento";
    const status = document.getElementById("docTarefaStatus")?.value || "EM_ANALISE";
    const observacao = document.getElementById("docTarefaObservacao")?.value.trim();
    const arquivoInput = document.getElementById("docTarefaArquivo");
    const arquivo = arquivoInput?.files?.[0];

    if (!nome && !documentoId) {
        mostrarToast("Informe o nome do documento/desenho.", "erro");
        return;
    }

    if (!arquivo) {
        mostrarToast("Selecione um arquivo para enviar.", "erro");
        return;
    }

    const btn = document.getElementById("btnSalvarDocumentoTarefa");
    const textoOriginal = btn?.innerText;
    if (btn) {
        btn.disabled = true;
        btn.innerText = "Enviando...";
    }

    try {
        const formData = new FormData();
        formData.append("arquivo", arquivo);
        if (observacao) formData.append("observacao", observacao);
        if (status) formData.append("status", status);

        let resposta;

        if (documentoId) {
            resposta = await apiPost(`/api/documentos/${documentoId}/versoes`, formData, {
                errorMessage: "Não foi possível enviar a nova versão."
            });
        } else {
            formData.append("nomeDocumento", nome);
            formData.append("tipoDocumento", tipo);
            if (codigo) formData.append("codigoDocumento", codigo);

            resposta = await apiPost(`/api/tarefas/${tarefaSelecionada.id}/documentos`, formData, {
                errorMessage: "Não foi possível salvar o documento."
            });
        }

        const documentoAtualizado = normalizarDocumentoTarefa(resposta);
        const lista = obterDocumentosDaTarefaCache(tarefaSelecionada.id).filter(doc => String(doc.id) !== String(documentoAtualizado.id));
        lista.push(documentoAtualizado);
        documentosTarefaCache[String(tarefaSelecionada.id)] = lista;

        delete resumosDocumentosTarefaCache[String(tarefaSelecionada.id)];
        await carregarResumoDocumentosTarefa(tarefaSelecionada.id);

        limparFormularioDocumentoTarefa();
        await carregarDocumentosTarefaSelecionada();

        if (typeof renderizarBoard === "function") renderizarBoard();
        mostrarToast(documentoId ? "Nova versão enviada. Ela agora é a versão atual." : "Documento salvo com sucesso.");
    } catch (error) {
        mostrarToast(error.message, "erro");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = textoOriginal || "Salvar documento";
        }
    }
}

async function restaurarVersaoDocumentoTarefa(documentoId, versaoId) {
    if (!usuarioPodeVerHistoricoDocumentos()) {
        mostrarToast("Apenas administradores podem restaurar versões.", "erro");
        return;
    }

    if (!confirm("Restaurar esta versão como a versão atual?")) return;

    try {
        await apiRequest(`/api/admin/documentos/${documentoId}/versoes/${versaoId}/restaurar`, {
            method: "PATCH",
            errorMessage: "Não foi possível restaurar a versão."
        });

        const documento = obterDocumentoTarefaPorId(documentoId);
        if (documento) documento.historico = [];

        await carregarDocumentosTarefaSelecionada();
        if (typeof renderizarBoard === "function") renderizarBoard();
        mostrarToast("Versão restaurada como atual.");
    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

async function excluirVersaoDocumentoTarefa(documentoId, versaoId) {
    if (!usuarioPodeVerHistoricoDocumentos()) {
        mostrarToast("Apenas administradores podem excluir versões.", "erro");
        return;
    }

    const motivo = prompt("Informe o motivo da exclusão desta versão:");
    if (!motivo) return;

    try {
        await apiRequest(`/api/admin/documentos/${documentoId}/versoes/${versaoId}`, {
            method: "DELETE",
            body: { motivoExclusao: motivo },
            errorMessage: "Não foi possível excluir a versão."
        });

        const documento = obterDocumentoTarefaPorId(documentoId);
        if (documento) documento.historico = [];

        await carregarDocumentosTarefaSelecionada();
        if (typeof renderizarBoard === "function") renderizarBoard();
        mostrarToast("Versão excluída do histórico ativo.");
    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

async function baixarDocumentoAtualTarefa(documentoId) {
    await baixarArquivoDocumento(`/api/documentos/${documentoId}/download`, "documento");
}

async function baixarVersaoDocumentoTarefa(documentoId, versaoId) {
    await baixarArquivoDocumento(`/api/admin/documentos/${documentoId}/versoes/${versaoId}/download`, "documento-versao");
}

async function baixarArquivoDocumento(path, fallbackNome) {
    try {
        const response = await fetch(montarUrlApi(path), {
            method: "GET",
            headers: getAuthHeaders()
        });

        if (typeof tratarSessao === "function") tratarSessao(response);

        if (!response.ok) {
            const data = await lerRespostaApi(response);
            throw new Error(extrairMensagemErroApi(response.status, data, "Não foi possível baixar o arquivo."));
        }

        const blob = await response.blob();
        const filename = extrairNomeArquivoDownload(response.headers.get("Content-Disposition")) || fallbackNome;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

function extrairNomeArquivoDownload(contentDisposition) {
    if (!contentDisposition) return null;

    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);

    const normalMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
    return normalMatch?.[1] || null;
}

function abrirModalTarefaDocumentos(tarefaId) {
    abrirModalTarefa(tarefaId).then(() => alternarAbaModal("DOCUMENTOS"));
}
