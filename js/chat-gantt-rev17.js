
/* =========================================================
   REV17 - Comentários estilo chat + Gantt do projeto
   Usa endpoints existentes:
   GET/POST /api/tarefas/{id}/comentarios
   GET /api/admin/projetos/{id}
   GET /api/admin/tarefas/projeto/{id}
   e funções já existentes do front.
   ========================================================= */

(function () {
    function normalizarTexto(valor) {
        return String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toUpperCase();
    }

    function obterUsuarioAtualRev17() {
        try {
            return JSON.parse(localStorage.getItem("usuario") || localStorage.getItem("user") || "{}");
        } catch (e) {
            return {};
        }
    }

    function autorEhUsuarioAtual(comentario) {
        const usuario = obterUsuarioAtualRev17();
        const emailAtual = normalizarTexto(usuario.email || usuario.username || "");
        const nomeAtual = normalizarTexto(usuario.nome || usuario.name || "");

        const emailComentario = normalizarTexto(comentario.autorEmail || comentario.usuarioEmail || "");
        const nomeComentario = normalizarTexto(comentario.autorNome || comentario.usuarioNome || comentario.autor || "");

        return Boolean(
            (emailAtual && emailComentario && emailAtual === emailComentario) ||
            (nomeAtual && nomeComentario && nomeAtual === nomeComentario)
        );
    }

    function textoComentario(comentario) {
        return comentario.mensagem || comentario.texto || comentario.comentario || "";
    }

    function dataComentario(comentario) {
        return comentario.dataCriacao || comentario.criadoEm || comentario.data || comentario.createdAt;
    }

    function escapeSeguro(valor) {
        if (typeof escapeHtml === "function") {
            return escapeHtml(valor);
        }

        return String(valor || "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function formatarDataHoraSeguro(valor) {
        if (!valor) return "-";

        if (typeof formatarDataHora === "function") {
            return formatarDataHora(valor);
        }

        const data = new Date(valor);
        if (Number.isNaN(data.getTime())) return String(valor);

        return data.toLocaleString("pt-BR");
    }

    function iniciaisSeguro(nome) {
        if (typeof obterIniciais === "function") {
            return obterIniciais(nome);
        }

        return String(nome || "U")
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(parte => parte.charAt(0).toUpperCase())
            .join("") || "U";
    }

    function mostrarToastSeguro(msg, tipo) {
        if (typeof mostrarToast === "function") {
            mostrarToast(msg, tipo);
        } else {
            console.log(msg);
        }
    }

    // Sobrescreve apenas a renderização visual dos comentários.
    window.renderizarComentariosTarefa = function () {
        const container = document.getElementById("comentariosContainer");
        const contador = document.getElementById("comentariosCount");

        if (!container) return;

        const lista = Array.isArray(window.comentariosTarefaSelecionada)
            ? window.comentariosTarefaSelecionada
            : (typeof comentariosTarefaSelecionada !== "undefined" ? comentariosTarefaSelecionada : []);

        const comentariosAtivos = lista.filter(comentario => comentario.ativo !== false);

        if (contador) {
            contador.innerText = `${comentariosAtivos.length} ${comentariosAtivos.length === 1 ? "comentário" : "comentários"}`;
        }

        const tabCount = document.getElementById("tabComentariosCount");
        if (tabCount) {
            tabCount.innerText = comentariosAtivos.length;
        }

        container.classList.add("chat-mode");
        container.innerHTML = "";

        const formActions = document.querySelector(".comment-form-actions");
        if (formActions && !document.getElementById("commentFormHintRev17")) {
            formActions.insertAdjacentHTML(
                "afterbegin",
                `<span id="commentFormHintRev17" class="comment-form-hint">Dica: Ctrl + Enter envia a mensagem</span>`
            );
        }

        if (comentariosAtivos.length === 0) {
            container.innerHTML = `
                <div class="chat-empty">
                    Nenhum comentário ainda. Use o campo acima para iniciar a conversa deste card.
                </div>
            `;
            return;
        }

        container.innerHTML = comentariosAtivos.map(comentario => {
            const autor = comentario.autorNome || comentario.usuarioNome || comentario.autor || "Usuário";
            const mine = autorEhUsuarioAtual(comentario);

            return `
                <div class="chat-message ${mine ? "mine" : ""}">
                    <div class="chat-avatar">${escapeSeguro(iniciaisSeguro(autor))}</div>

                    <div class="chat-bubble">
                        <div class="chat-meta">
                            <strong>${escapeSeguro(autor)}</strong>
                            <small>${escapeSeguro(formatarDataHoraSeguro(dataComentario(comentario)))}</small>
                        </div>

                        <div class="chat-text">${escapeSeguro(textoComentario(comentario))}</div>

                        <div class="chat-actions">
                            <button class="btn-small danger" onclick="removerComentarioTarefa(${comentario.id})">
                                Remover
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join("");

        container.scrollTop = container.scrollHeight;
    };

    // Mantém endpoint atual, mas melhora UX do envio.
    const adicionarOriginal = window.adicionarComentarioTarefa;

    window.adicionarComentarioTarefa = async function () {
        const botao = document.querySelector(".comment-form-actions .btn-save");
        const campo = document.getElementById("comentarioMensagem");

        if (botao) {
            botao.disabled = true;
            botao.dataset.textoOriginal = botao.innerText;
            botao.innerText = "Enviando...";
        }

        try {
            if (typeof adicionarOriginal === "function") {
                await adicionarOriginal();
            } else {
                mostrarToastSeguro("Função original de comentário não encontrada.", "erro");
            }

            if (campo) campo.focus();

            // Notificação visual local, sem exigir backend novo.
            mostrarToastSeguro("Comentário publicado no chat da tarefa.", "sucesso");

        } finally {
            if (botao) {
                botao.disabled = false;
                botao.innerText = botao.dataset.textoOriginal || "Adicionar comentário";
            }
        }
    };

    document.addEventListener("keydown", function (event) {
        const campo = document.getElementById("comentarioMensagem");
        if (!campo || document.activeElement !== campo) return;

        if (event.ctrlKey && event.key === "Enter") {
            event.preventDefault();
            window.adicionarComentarioTarefa();
        }
    });

    // ==========================
    // GANTT DO PROJETO
    // ==========================

    function obterData(valor) {
        if (!valor) return null;
        const data = new Date(valor);
        return Number.isNaN(data.getTime()) ? null : data;
    }

    function obterInicioTarefa(tarefa) {
        return obterData(tarefa.dataInicio || tarefa.inicio || tarefa.dataCriacao || tarefa.criadoEm || tarefa.createdAt);
    }

    function obterFimTarefa(tarefa) {
        return obterData(tarefa.dataPrevistaConclusao || tarefa.dataPrevista || tarefa.prazo || tarefa.dataFim || tarefa.dataConclusao || tarefa.atualizadoEm);
    }

    function adicionarDias(data, dias) {
        const nova = new Date(data);
        nova.setDate(nova.getDate() + dias);
        return nova;
    }

    function statusClasse(status) {
        return `gantt-status-${String(status || "PENDENTE").toUpperCase()}`;
    }

    function formatarDataCurta(data) {
        if (!data) return "-";
        return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    }

    function calcularPosicao(inicio, fim, minimo, maximo) {
        const total = maximo - minimo || 1;
        const left = Math.max(0, ((inicio - minimo) / total) * 100);
        const width = Math.max(3, ((fim - inicio) / total) * 100);

        return {
            left: Math.min(left, 97),
            width: Math.min(width, 100 - Math.min(left, 97))
        };
    }

    function normalizarTarefasParaGantt(pacote) {
        const detalhes = pacote?.detalhesTarefas || [];

        if (detalhes.length) {
            return detalhes.map(item => item.tarefa || item).filter(Boolean);
        }

        return pacote?.tarefas || [];
    }

    window.renderizarGanttProjetoRev17 = async function (forcarAtualizacao = false) {
        const container = document.getElementById("ganttProjetoRev17");

        if (!container) return;

        if (typeof projetoDetalheSelecionado === "undefined" || !projetoDetalheSelecionado) {
            container.innerHTML = `<div class="admin-empty">Abra um projeto para visualizar o Gantt.</div>`;
            return;
        }

        container.innerHTML = `<div class="admin-empty">Carregando Gantt do projeto...</div>`;

        try {
            if (typeof carregarPacoteProjetoRelatorio !== "function") {
                throw new Error("Função carregarPacoteProjetoRelatorio não encontrada.");
            }

            const pacote = await carregarPacoteProjetoRelatorio(Boolean(forcarAtualizacao));
            const filtroStatus = document.getElementById("ganttFiltroStatusRev17")?.value || "TODOS";
            const filtroBusca = normalizarTexto(document.getElementById("ganttBuscaRev17")?.value || "");

            let tarefas = normalizarTarefasParaGantt(pacote);

            tarefas = tarefas.filter(tarefa => {
                const status = String(tarefa.status || "PENDENTE").toUpperCase();
                const texto = normalizarTexto(`${tarefa.titulo || ""} ${tarefa.descricao || ""} ${tarefa.responsavel || ""} ${tarefa.responsavelNome || ""}`);

                const bateStatus = filtroStatus === "TODOS" || status === filtroStatus;
                const bateBusca = !filtroBusca || texto.includes(filtroBusca);

                return bateStatus && bateBusca;
            });

            if (!tarefas.length) {
                container.innerHTML = `<div class="admin-empty">Nenhuma tarefa encontrada para o filtro atual.</div>`;
                return;
            }

            const linhas = tarefas.map(tarefa => {
                let inicio = obterInicioTarefa(tarefa);
                let fim = obterFimTarefa(tarefa);

                if (!inicio && fim) inicio = adicionarDias(fim, -1);
                if (inicio && !fim) fim = adicionarDias(inicio, 3);
                if (!inicio && !fim) {
                    inicio = new Date();
                    fim = adicionarDias(inicio, 3);
                }

                if (fim < inicio) {
                    const temp = inicio;
                    inicio = fim;
                    fim = temp;
                }

                return { tarefa, inicio, fim };
            });

            const minimo = Math.min(...linhas.map(l => l.inicio.getTime()));
            const maximo = Math.max(...linhas.map(l => l.fim.getTime()));
            const concluidas = linhas.filter(l => String(l.tarefa.status || "").toUpperCase() === "CONCLUIDA").length;
            const atrasadas = linhas.filter(l => String(l.tarefa.status || "").toUpperCase() === "ATRASADA").length;

            container.innerHTML = `
                <div class="gantt-rev17-summary">
                    <span class="gantt-chip">${linhas.length} tarefa(s)</span>
                    <span class="gantt-chip">${concluidas} concluída(s)</span>
                    <span class="gantt-chip">${atrasadas} atrasada(s)</span>
                    <span class="gantt-chip">Período: ${formatarDataCurta(new Date(minimo))} até ${formatarDataCurta(new Date(maximo))}</span>
                </div>

                <div class="gantt-rev17-header">
                    <div>Tarefa</div>
                    <div class="gantt-rev17-scale">
                        <span>${formatarDataCurta(new Date(minimo))}</span>
                        <span></span>
                        <span></span>
                        <span>${formatarDataCurta(new Date(maximo))}</span>
                    </div>
                </div>

                <div class="gantt-rev17">
                    ${linhas.map(({ tarefa, inicio, fim }) => {
                        const pos = calcularPosicao(inicio.getTime(), fim.getTime(), minimo, maximo);
                        const status = String(tarefa.status || "PENDENTE").toUpperCase();

                        return `
                            <div class="gantt-rev17-row">
                                <div class="gantt-rev17-info">
                                    <strong>${escapeSeguro(tarefa.titulo || "Tarefa")}</strong>
                                    <small>${escapeSeguro(tarefa.responsavelNome || tarefa.responsavel || "Sem responsável")} • ${escapeSeguro(status)}</small>
                                </div>

                                <div class="gantt-rev17-track" title="${escapeSeguro(tarefa.titulo || "")}">
                                    <div class="gantt-rev17-bar ${statusClasse(status)}"
                                        style="left:${pos.left}%;width:${pos.width}%">
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join("")}
                </div>
            `;

        } catch (error) {
            console.error(error);
            container.innerHTML = `<div class="admin-empty">Não foi possível carregar o Gantt: ${escapeSeguro(error.message)}</div>`;
        }
    };

    // Quando a linha do tempo for atualizada, tenta atualizar o Gantt junto.
    const timelineOriginal = window.renderizarTimelineHorizontalProjeto;
    if (typeof timelineOriginal === "function") {
        window.renderizarTimelineHorizontalProjeto = async function (forcarAtualizacao = false) {
            await timelineOriginal(forcarAtualizacao);
            if (document.getElementById("ganttProjetoRev17")) {
                window.renderizarGanttProjetoRev17(false);
            }
        };
    }

})();
