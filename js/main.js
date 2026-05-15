// ==========================
// INICIALIZAÇÃO
// ==========================

window.onload = async () => {
    const token = localStorage.getItem("token");

    if (token) {
        usuarioLogado = obterUsuarioDoToken();

        mostrarDashboard();

        aplicarPermissoesInterface();

        await buscarTarefas();

        if (isAdmin()) {
            await carregarUsuariosAdmin();
            await carregarProjetosAdmin();
        }

        if (isSuperAdmin()) {
            await carregarAdminsSuper();
        }
    }
};
