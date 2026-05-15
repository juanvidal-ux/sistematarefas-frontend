// ==========================
// COMENTÁRIOS DA TAREFA
// ==========================

async function carregarComentariosTarefa(tarefaId) {
    const container = document.getElementById("comentariosContainer");

    if (container) {
        container.innerHTML = `
            <div class="admin-empty">
                Carregando comentários...
            </div>
        `;
    }

    try {
        const response = await fetch(`${API_URL}/api/tarefas/${tarefaId}/comentarios`, {
            method: "GET",
            headers: authHeaders()
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao carregar comentários:", erro);
            throw new Error("Erro ao carregar comentários da tarefa.");
        }

        comentariosTarefaSelecionada = await response.json();
        renderizarComentariosTarefa();

    } catch (error) {
        comentariosTarefaSelecionada = [];
        renderizarComentariosTarefa();
        mostrarToast(error.message, "erro");
    }
}

function renderizarComentariosTarefa() {
    const container = document.getElementById("comentariosContainer");
    const contador = document.getElementById("comentariosCount");

    if (!container) {
        return;
    }

    const comentariosAtivos = comentariosTarefaSelecionada.filter(comentario => comentario.ativo !== false);

    if (contador) {
        contador.innerText = `${comentariosAtivos.length} ${comentariosAtivos.length === 1 ? "comentário" : "comentários"}`;
    }

    const tabCount = document.getElementById("tabComentariosCount");
    if (tabCount) {
        tabCount.innerText = comentariosAtivos.length;
    }

    container.innerHTML = "";

    if (comentariosAtivos.length === 0) {
        container.innerHTML = `
            <div class="admin-empty">
                Nenhum comentário registrado para esta tarefa.
            </div>
        `;
        return;
    }

    comentariosAtivos.forEach(comentario => {
        const autor = comentario.autorNome || "Usuário";

        container.innerHTML += `
            <div class="comment-card">

                <div class="comment-card-header">

                    <div class="comment-author">
                        <span class="comment-avatar">
                            ${obterIniciais(autor)}
                        </span>

                        <div>
                            <strong>${escapeHtml(autor)}</strong>
                            <small>${escapeHtml(comentario.autorEmail || "")}</small>
                        </div>
                    </div>

                    <div>
                        <span class="comment-date">
                            ${comentario.dataCriacao ? formatarDataHora(comentario.dataCriacao) : "-"}
                        </span>

                        <button class="btn-small danger" onclick="removerComentarioTarefa(${comentario.id})">
                            Remover
                        </button>
                    </div>

                </div>

                <div class="comment-message">
                    ${escapeHtml(comentario.mensagem || "")}
                </div>

            </div>
        `;
    });
}

async function adicionarComentarioTarefa() {
    if (!tarefaSelecionada) {
        mostrarToast("Nenhuma tarefa selecionada.", "erro");
        return;
    }

    const campoMensagem = document.getElementById("comentarioMensagem");
    const mensagem = campoMensagem?.value.trim() || "";

    if (!mensagem) {
        mostrarToast("Escreva um comentário antes de enviar.", "erro");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/tarefas/${tarefaSelecionada.id}/comentarios`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders()
            },
            body: JSON.stringify({ mensagem })
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao adicionar comentário:", erro);
            throw new Error("Erro ao adicionar comentário.");
        }

        limparFormularioComentario();
        await carregarComentariosTarefa(tarefaSelecionada.id);
        await carregarHistoricoTarefa(tarefaSelecionada.id);

        mostrarToast("Comentário adicionado.");

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

async function removerComentarioTarefa(comentarioId) {
    if (!tarefaSelecionada) {
        mostrarToast("Nenhuma tarefa selecionada.", "erro");
        return;
    }

    const confirmar = await confirmarAcao(
        "Remover comentário",
        "Deseja realmente remover este comentário da tarefa?"
    );

    if (!confirmar) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/tarefas/comentarios/${comentarioId}`, {
            method: "DELETE",
            headers: authHeaders()
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao remover comentário:", erro);
            throw new Error("Erro ao remover comentário.");
        }

        await carregarComentariosTarefa(tarefaSelecionada.id);
        await carregarHistoricoTarefa(tarefaSelecionada.id);

        mostrarToast("Comentário removido.");

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

function limparFormularioComentario() {
    const campoMensagem = document.getElementById("comentarioMensagem");

    if (campoMensagem) {
        campoMensagem.value = "";
    }
}

// ==========================
// LINHA DO TEMPO DA TAREFA
// ==========================

async function carregarHistoricoTarefaSelecionada() {
    if (!tarefaSelecionada) {
        mostrarToast("Nenhuma tarefa selecionada.", "erro");
        return;
    }

    await carregarHistoricoTarefa(tarefaSelecionada.id);
}

async function carregarHistoricoTarefa(tarefaId) {
    const container = document.getElementById("historicoContainer");

    if (container) {
        container.innerHTML = `
            <div class="admin-empty">
                Carregando linha do tempo...
            </div>
        `;
    }

    try {
        const response = await fetch(`${API_URL}/api/tarefas/${tarefaId}/historico`, {
            method: "GET",
            headers: authHeaders()
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao carregar histórico:", erro);
            throw new Error("Erro ao carregar linha do tempo da tarefa.");
        }

        historicoTarefaSelecionada = await response.json();
        renderizarHistoricoTarefa();

    } catch (error) {
        historicoTarefaSelecionada = [];
        renderizarHistoricoTarefa();
        mostrarToast(error.message, "erro");
    }
}

function renderizarHistoricoTarefa() {
    const container = document.getElementById("historicoContainer");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (!historicoTarefaSelecionada || historicoTarefaSelecionada.length === 0) {
        container.innerHTML = `
            <div class="admin-empty">
                Nenhum evento registrado ainda.
            </div>
        `;
        return;
    }

    historicoTarefaSelecionada.forEach(evento => {
        const usuario = evento.usuarioNome || "Sistema";
        const titulo = evento.descricao || formatarTexto(evento.tipo || "Evento");
        const itemTitulo = evento.itemTitulo ? `Item: ${evento.itemTitulo}` : "";

        container.innerHTML += `
            <div class="timeline-entry">

                <div class="timeline-marker">
                    <span class="timeline-avatar">
                        ${obterIniciais(usuario)}
                    </span>
                </div>

                <div class="timeline-card">

                    <div class="timeline-card-top">
                        <div>
                            <div class="timeline-title">
                                ${escapeHtml(titulo)}
                            </div>
                            <span class="timeline-date">
                                ${evento.dataCriacao ? formatarDataHora(evento.dataCriacao) : "-"} • ${escapeHtml(usuario)}
                            </span>
                        </div>

                        <span class="pill timeline-type">
                            ${formatarTexto(evento.tipo || "Evento")}
                        </span>
                    </div>

                    ${itemTitulo ? `
                        <div class="timeline-description">
                            ${escapeHtml(itemTitulo)}
                        </div>
                    ` : ""}

                    ${(evento.valorAnterior || evento.valorNovo) ? `
                        <div class="timeline-extra">
                            ${evento.valorAnterior ? `
                                <span class="pill timeline-value">
                                    Antes: ${escapeHtml(evento.valorAnterior)}
                                </span>
                            ` : ""}

                            ${evento.valorNovo ? `
                                <span class="pill timeline-value">
                                    Depois: ${escapeHtml(evento.valorNovo)}
                                </span>
                            ` : ""}
                        </div>
                    ` : ""}

                </div>

            </div>
        `;
    });
}
