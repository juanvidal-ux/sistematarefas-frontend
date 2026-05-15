// ==========================
// LINHA DO TEMPO HORIZONTAL DO PROJETO
// ==========================

function obterDataEvento(valor) {
    if (!valor) {
        return null;
    }

    const data = new Date(valor);

    return Number.isNaN(data.getTime()) ? null : data;
}

function montarEventosProjetoTimeline(pacote) {
    const projeto = pacote.projeto || {};
    const detalhes = pacote.detalhesTarefas || [];
    const eventos = [];

    if (projeto.dataCriacao) {
        eventos.push({
            data: obterDataEvento(projeto.dataCriacao),
            tipo: "Projeto",
            titulo: "Projeto criado",
            descricao: projeto.nome || "",
            classe: "event-created"
        });
    }

    detalhes.forEach(({ tarefa, subitens, comentarios, historico }) => {
        if (tarefa.dataCriacao) {
            eventos.push({
                data: obterDataEvento(tarefa.dataCriacao),
                tipo: "Tarefa",
                titulo: tarefa.titulo || "Tarefa criada",
                descricao: `Criada para ${tarefa.responsavel || "responsável não informado"}`,
                classe: "event-task"
            });
        }

        if (tarefa.dataConclusao) {
            eventos.push({
                data: obterDataEvento(tarefa.dataConclusao),
                tipo: "Conclusão",
                titulo: tarefa.titulo || "Tarefa concluída",
                descricao: "Tarefa concluída.",
                classe: "event-done"
            });
        }

        (subitens || []).forEach(item => {
            if (item.dataCriacao) {
                eventos.push({
                    data: obterDataEvento(item.dataCriacao),
                    tipo: "Subitem",
                    titulo: item.titulo || "Subitem criado",
                    descricao: `Tarefa: ${tarefa.titulo || "-"}`,
                    classe: "event-subitem"
                });
            }

            if (item.dataConclusao) {
                eventos.push({
                    data: obterDataEvento(item.dataConclusao),
                    tipo: "Subitem concluído",
                    titulo: item.titulo || "Subitem concluído",
                    descricao: `Responsável: ${item.responsavelNome || tarefa.responsavel || "-"}`,
                    classe: "event-done"
                });
            }
        });

        (comentarios || []).forEach(comentario => {
            const dataComentario = comentario.dataCriacao || comentario.criadoEm;

            if (dataComentario) {
                eventos.push({
                    data: obterDataEvento(dataComentario),
                    tipo: "Comentário",
                    titulo: comentario.autorNome || comentario.usuarioNome || "Comentário",
                    descricao: comentario.mensagem || "",
                    classe: "event-comment"
                });
            }
        });

        (historico || []).forEach(item => {
            const dataHistorico = item.dataCriacao || item.criadoEm;

            if (dataHistorico) {
                eventos.push({
                    data: obterDataEvento(dataHistorico),
                    tipo: formatarTexto(item.tipo || "Histórico"),
                    titulo: tarefa.titulo || "Evento",
                    descricao: item.descricao || item.mensagem || item.valorNovo || "",
                    classe: definirClasseEventoHistorico(item.tipo)
                });
            }
        });
    });

    return eventos
        .filter(evento => evento.data)
        .sort((a, b) => a.data - b.data);
}

function definirClasseEventoHistorico(tipo) {
    const texto = String(tipo || "").toUpperCase();

    if (texto.includes("CONCLUID") || texto.includes("STATUS")) {
        return "event-done";
    }

    if (texto.includes("COMENT")) {
        return "event-comment";
    }

    if (texto.includes("EXCL") || texto.includes("REMOV")) {
        return "event-danger";
    }

    if (texto.includes("EDIT")) {
        return "event-edit";
    }

    return "event-task";
}

async function renderizarTimelineHorizontalProjeto(forcarAtualizacao = false) {
    const container = document.getElementById("timelineHorizontalProjeto");

    if (!container) {
        return;
    }

    if (!projetoDetalheSelecionado) {
        container.innerHTML = `
            <div class="admin-empty">
                Abra um projeto para visualizar a linha do tempo horizontal.
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="admin-empty">
            Carregando eventos do projeto...
        </div>
    `;

    try {
        const pacote = await carregarPacoteProjetoRelatorio(Boolean(forcarAtualizacao));

        if (!pacote) {
            return;
        }

        const eventos = montarEventosProjetoTimeline(pacote);

        if (eventos.length === 0) {
            container.innerHTML = `
                <div class="admin-empty">
                    Nenhum evento encontrado para este projeto.
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="timeline-horizontal-track">
                ${eventos.map(evento => `
                    <div class="timeline-horizontal-item ${evento.classe}">
                        <div class="timeline-dot"></div>
                        <div class="timeline-card">
                            <span>${formatarDataHora(evento.data)}</span>
                            <strong>${escapeHtml(evento.tipo)}</strong>
                            <p>${escapeHtml(evento.titulo)}</p>
                            <small>${escapeHtml(String(evento.descricao || "").slice(0, 120))}</small>
                        </div>
                    </div>
                `).join("")}
            </div>
        `;

    } catch (error) {
        console.error(error);
        container.innerHTML = `
            <div class="admin-empty">
                Não foi possível carregar a linha do tempo horizontal.
            </div>
        `;
    }
}


// ==========================
// FILTROS DA LINHA DO TEMPO HORIZONTAL
// ==========================

function eventoBateFiltroTimeline(evento, filtro) {
    if (!filtro || filtro === "TODOS") return true;

    const tipo = String(evento.tipo || "").toUpperCase();

    if (filtro === "TAREFAS") return tipo.includes("TAREFA") || tipo.includes("PROJETO");
    if (filtro === "SUBITENS") return tipo.includes("SUBITEM") || tipo.includes("ITEM");
    if (filtro === "COMENTARIOS") return tipo.includes("COMENT");
    if (filtro === "STATUS") return tipo.includes("STATUS") || tipo.includes("CONCLUS") || tipo.includes("CONCLU");

    return true;
}

async function renderizarTimelineHorizontalProjeto(forcarAtualizacao = false) {
    const container = document.getElementById("timelineHorizontalProjeto");

    if (!container) return;

    if (!projetoDetalheSelecionado) {
        container.innerHTML = `<div class="admin-empty">Abra um projeto para visualizar a linha do tempo horizontal.</div>`;
        return;
    }

    container.innerHTML = `<div class="admin-empty">Carregando eventos do projeto...</div>`;

    try {
        const pacote = await carregarPacoteProjetoRelatorio(Boolean(forcarAtualizacao));
        if (!pacote) return;

        const filtro = document.getElementById("timelineFiltroTipoProjeto")?.value || "TODOS";
        const limiteValor = document.getElementById("timelineLimiteProjeto")?.value || "30";

        let eventos = montarEventosProjetoTimeline(pacote).filter(evento => eventoBateFiltroTimeline(evento, filtro));

        if (limiteValor !== "TODOS") {
            eventos = eventos.slice(-Number(limiteValor));
        }

        if (eventos.length === 0) {
            container.innerHTML = `<div class="admin-empty">Nenhum evento encontrado para este filtro.</div>`;
            return;
        }

        container.innerHTML = `
            <div class="timeline-horizontal-track">
                ${eventos.map(evento => `
                    <div class="timeline-horizontal-item ${evento.classe}">
                        <div class="timeline-dot"></div>
                        <div class="timeline-card">
                            <span>${formatarDataHora(evento.data)}</span>
                            <strong>${escapeHtml(evento.tipo)}</strong>
                            <p>${escapeHtml(evento.titulo)}</p>
                            <small>${escapeHtml(String(evento.descricao || "").slice(0, 120))}</small>
                        </div>
                    </div>
                `).join("")}
            </div>
        `;

    } catch (error) {
        console.error(error);
        container.innerHTML = `<div class="admin-empty">Não foi possível carregar a linha do tempo horizontal.</div>`;
    }
}
