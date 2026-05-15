// ==========================
// ALTERAR SENHA
// ==========================

function abrirModalSenha() {
    document.getElementById("senhaAtual").value = "";
    document.getElementById("novaSenha").value = "";
    document.getElementById("confirmarNovaSenha").value = "";

    document.getElementById("modalSenha").classList.remove("hidden");

    setTimeout(() => {
        document.getElementById("senhaAtual").focus();
    }, 100);
}

function fecharModalSenha() {
    document.getElementById("modalSenha").classList.add("hidden");
}

async function alterarSenha() {
    const senhaAtual = document.getElementById("senhaAtual").value.trim();
    const novaSenha = document.getElementById("novaSenha").value.trim();
    const confirmarNovaSenha = document.getElementById("confirmarNovaSenha").value.trim();

    if (!senhaAtual || !novaSenha || !confirmarNovaSenha) {
        mostrarToast("Preencha todos os campos.", "erro");
        return;
    }

    if (novaSenha.length < 8) {
        mostrarToast("A nova senha deve ter pelo menos 8 caracteres.", "erro");
        return;
    }

    if (novaSenha !== confirmarNovaSenha) {
        mostrarToast("A confirmação da nova senha não confere.", "erro");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/conta/senha`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders()
            },
            body: JSON.stringify({
                senhaAtual,
                novaSenha
            })
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao alterar senha:", erro);
            throw new Error("Erro ao alterar senha. Verifique a senha atual.");
        }

        fecharModalSenha();

        mostrarToast("Senha alterada com sucesso. Faça login novamente.");

        setTimeout(() => {
            logout();
        }, 1500);

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}
