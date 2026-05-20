let notificacoesInternas = [];

function atualizarNotificacoesInternas(tarefas = []) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const atrasadas = tarefas.filter(t => {
        if (!t.prazo || ["CONCLUIDA", "CANCELADA"].includes(t.status)) return false;
        const prazo = new Date(`${t.prazo}T00:00:00`);
        return prazo < hoje;
    });

    const vencemHoje = tarefas.filter(t => {
        if (!t.prazo || ["CONCLUIDA", "CANCELADA"].includes(t.status)) return false;
        const prazo = new Date(`${t.prazo}T00:00:00`);
        return prazo.getTime() === hoje.getTime();
    });

    const semResponsavel = tarefas.filter(t => !t.responsavel && t.projetoNome);

    notificacoesInternas = [
        ...atrasadas.slice(0, 8).map(t => ({ tipo: "danger", titulo: "Tarefa atrasada", texto: t.titulo || "Sem título" })),
        ...vencemHoje.slice(0, 8).map(t => ({ tipo: "warning", titulo: "Vence hoje", texto: t.titulo || "Sem título" })),
        ...semResponsavel.slice(0, 5).map(t => ({ tipo: "info", titulo: "Sem responsável", texto: t.titulo || "Sem título" }))
    ];

    renderizarNotificacoesInternas();
}

function renderizarNotificacoesInternas() {
    const lista = document.getElementById("listaNotificacoes");
    const badge = document.getElementById("badgeNotificacoes");

    if (badge) {
        badge.innerText = notificacoesInternas.length;
        badge.classList.toggle("hidden", notificacoesInternas.length === 0);
    }

    if (!lista) return;

    if (notificacoesInternas.length === 0) {
        lista.innerHTML = `<div class="admin-empty">Nenhuma notificação no momento.</div>`;
        return;
    }

    lista.innerHTML = notificacoesInternas.map(n => `
        <div class="notification-item ${n.tipo}">
            <strong>${escapeHtml(n.titulo)}</strong>
            <small>${escapeHtml(n.texto)}</small>
        </div>
    `).join("");
}

function alternarPainelNotificacoes() {
    document.getElementById("painelNotificacoes")?.classList.toggle("hidden");
}

function fecharPainelNotificacoes() {
    document.getElementById("painelNotificacoes")?.classList.add("hidden");
}
