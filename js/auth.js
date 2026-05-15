// ==========================
// LOGIN
// ==========================

async function login() {
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value.trim();
    const mensagem = document.getElementById("loginMensagem");

    mensagem.innerText = "";

    if (!email || !senha) {
        mensagem.innerText = "Informe e-mail e senha.";
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                senha
            })
        });

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro no login:", erro);
            throw new Error("E-mail ou senha inválidos.");
        }

        const data = await response.json();

        localStorage.setItem("token", data.token);
        document.getElementById("senha").value = "";

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

        mostrarToast("Login realizado com sucesso.");

    } catch (error) {
        mensagem.innerText = error.message;
    }
}

// ==========================
// LOGOUT
// ==========================

function logout() {
    localStorage.removeItem("token");

    usuarioLogado = null;
    usuariosAdmin = [];
    adminsSuper = [];
    projetosAdmin = [];
    todasTarefas = [];

    const emailInput = document.getElementById("email");
    const senhaInput = document.getElementById("senha");
    const mensagem = document.getElementById("loginMensagem");

    if (emailInput) {
        emailInput.value = "";
    }

    if (senhaInput) {
        senhaInput.value = "";
    }

    if (mensagem) {
        mensagem.innerText = "";
    }

    loginSection.classList.remove("hidden");
    dashboardSection.classList.add("hidden");
}

// ==========================
// TOKEN / PERFIL
// ==========================

function getToken() {
    return localStorage.getItem("token");
}

function authHeaders() {
    return {
        "Authorization": `Bearer ${getToken()}`
    };
}

function tratarSessao(response) {
    if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error("Sessão expirada ou acesso não permitido. Faça login novamente.");
    }
}

function obterUsuarioDoToken() {
    const token = getToken();

    if (!token) {
        return null;
    }

    try {
        let payloadBase64 = token.split(".")[1];

        payloadBase64 = payloadBase64
            .replace(/-/g, "+")
            .replace(/_/g, "/");

        while (payloadBase64.length % 4) {
            payloadBase64 += "=";
        }

        const payloadJson = decodeURIComponent(
            atob(payloadBase64)
                .split("")
                .map(char => {
                    return "%" + ("00" + char.charCodeAt(0).toString(16)).slice(-2);
                })
                .join("")
        );

        return JSON.parse(payloadJson);

    } catch (error) {
        console.error("Erro ao decodificar token:", error);
        return null;
    }
}

function isAdmin() {
    return usuarioLogado && usuarioLogado.perfil === "ADMIN";
}

function isSuperAdmin() {
    return usuarioLogado && usuarioLogado.perfil === "SUPER_ADMIN";
}

function aplicarPermissoesInterface() {
    document.querySelectorAll(".admin-only").forEach(elemento => {
        if (isAdmin()) {
            elemento.classList.remove("hidden");
        } else {
            elemento.classList.add("hidden");
        }
    });

    document.querySelectorAll(".super-admin-only").forEach(elemento => {
        if (isSuperAdmin()) {
            elemento.classList.remove("hidden");
        } else {
            elemento.classList.add("hidden");
        }
    });

    mostrarPagina(paginaAtual || "BOARD");
}
