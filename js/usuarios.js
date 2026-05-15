// ==========================
// ADMIN - USUÁRIOS
// ==========================

async function carregarUsuariosAdmin() {
    if (!isAdmin()) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/admin/usuarios`, {
            method: "GET",
            headers: authHeaders()
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao carregar usuários:", erro);
            throw new Error("Erro ao carregar usuários do administrador.");
        }

        usuariosAdmin = await response.json();

        renderizarUsuariosAdmin();

        popularSelectResponsaveis();

        popularVisaoTarefasAdmin();

        popularSelectUsuariosVinculo();

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

async function cadastrarUsuarioAdmin() {
    if (!isAdmin()) {
        mostrarToast("Acesso permitido apenas para administrador.", "erro");
        return;
    }

    const nome = document.getElementById("adminNomeUsuario").value.trim();
    const email = document.getElementById("adminEmailUsuario").value.trim();
    const senha = document.getElementById("adminSenhaUsuario").value.trim();

    if (!nome || !email || !senha) {
        mostrarToast("Preencha nome, e-mail e senha.", "erro");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/admin/usuarios`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders()
            },
            body: JSON.stringify({
                nome,
                email,
                senha
            })
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao cadastrar usuário:", erro);
            throw new Error("Erro ao cadastrar usuário.");
        }

        document.getElementById("adminNomeUsuario").value = "";
        document.getElementById("adminEmailUsuario").value = "";
        document.getElementById("adminSenhaUsuario").value = "";

        await carregarUsuariosAdmin();

        mostrarToast("Usuário cadastrado com sucesso.");

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

function renderizarUsuariosAdmin() {
    const container = document.getElementById("adminUsuariosContainer");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (!usuariosAdmin || usuariosAdmin.length === 0) {
        container.innerHTML = `
            <div class="admin-empty">
                Nenhum usuário cadastrado por este administrador.
            </div>
        `;
        return;
    }

    usuariosAdmin.forEach(usuario => {
        const ativo = usuario.ativo === true;

        container.innerHTML += `
            <div class="usuario-row ${ativo ? "" : "inativo"}">

                <div class="usuario-info">

                    <div class="usuario-avatar">
                        ${obterIniciais(usuario.nome)}
                    </div>

                    <div>
                        <strong>${escapeHtml(usuario.nome)}</strong>
                        <small>${escapeHtml(usuario.email)}</small>
                    </div>

                </div>

                <div class="usuario-actions">

                    <span class="status-usuario ${ativo ? "ativo" : "inativo"}">
                        ${ativo ? "Ativo" : "Inativo"}
                    </span>

                    <button
                        class="btn-small"
                        onclick="selecionarResponsavelAdmin(${usuario.id})"
                        ${ativo ? "" : "disabled"}
                    >
                        Criar tarefa
                    </button>

                    <button
                        class="btn-small neutral"
                        onclick="selecionarVisaoUsuario(${usuario.id})"
                    >
                        Ver tarefas
                    </button>

                    <button
                        class="btn-small warning"
                        onclick="abrirModalEditarUsuarioPainel('ADMIN_USUARIO', ${usuario.id})"
                    >
                        Editar
                    </button>

                    ${
                        ativo
                            ? `
                                <button
                                    class="btn-small danger"
                                    onclick="inativarUsuarioPainel('ADMIN_USUARIO', ${usuario.id})"
                                >
                                    Inativar
                                </button>
                              `
                            : `
                                <button
                                    class="btn-small success"
                                    onclick="reativarUsuarioPainel('ADMIN_USUARIO', ${usuario.id})"
                                >
                                    Reativar
                                </button>
                              `
                    }

                </div>

            </div>
        `;
    });
}

function popularSelectResponsaveis() {
    const select = document.getElementById("responsavelUsuarioId");

    if (!select) {
        return;
    }

    select.innerHTML = `
        <option value="">
            Minha tarefa
        </option>
    `;

    usuariosAdmin
        .filter(usuario => usuario.ativo === true)
        .forEach(usuario => {
            select.innerHTML += `
                <option value="${usuario.id}">
                    ${escapeHtml(usuario.nome)} - ${escapeHtml(usuario.email)}
                </option>
            `;
        });
}

function popularVisaoTarefasAdmin() {
    const select = document.getElementById("visaoTarefas");

    if (!select) {
        return;
    }

    const valorAtual = select.value || "MINHAS";

    select.innerHTML = `
        <option value="MINHAS">
            Minhas tarefas
        </option>

        <option value="USUARIOS">
            Tarefas dos meus usuários
        </option>
    `;

    usuariosAdmin.forEach(usuario => {
        select.innerHTML += `
            <option value="USUARIO_${usuario.id}">
                Usuário: ${escapeHtml(usuario.nome)}
            </option>
        `;
    });

    projetosAdmin
        .filter(projeto => projeto.ativo === true)
        .forEach(projeto => {
            select.innerHTML += `
                <option value="PROJETO_${projeto.id}">
                    Projeto: ${escapeHtml(projeto.nome)}
                </option>
            `;
        });

    const existeValorAtual = Array.from(select.options)
        .some(option => option.value === valorAtual);

    select.value = existeValorAtual ? valorAtual : "MINHAS";
}

function selecionarResponsavelAdmin(usuarioId) {
    const usuario = usuariosAdmin.find(u => u.id === usuarioId);

    if (!usuario) {
        mostrarToast("Usuário não encontrado.", "erro");
        return;
    }

    if (!usuario.ativo) {
        mostrarToast("Usuário inativo não pode receber nova tarefa.", "erro");
        return;
    }

    const select = document.getElementById("responsavelUsuarioId");

    if (select) {
        select.value = usuarioId;
    }

    focarNovaTarefa();

    mostrarToast("Responsável selecionado para nova tarefa.");
}

async function selecionarVisaoUsuario(usuarioId) {
    const select = document.getElementById("visaoTarefas");

    if (select) {
        select.value = `USUARIO_${usuarioId}`;
    }

    await buscarTarefas();

    mostrarToast("Visualização alterada para o usuário selecionado.");
}

// ==========================
// SUPER ADMIN
// ==========================

async function carregarAdminsSuper() {
    if (!isSuperAdmin()) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/super-admin/admins`, {
            method: "GET",
            headers: authHeaders()
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao carregar administradores:", erro);
            throw new Error("Erro ao carregar administradores.");
        }

        adminsSuper = await response.json();

        renderizarAdminsSuper();

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

async function cadastrarAdminSuper() {
    if (!isSuperAdmin()) {
        mostrarToast("Acesso permitido apenas para SUPER_ADMIN.", "erro");
        return;
    }

    const nome = document.getElementById("superNomeAdmin").value.trim();
    const email = document.getElementById("superEmailAdmin").value.trim();
    const senha = document.getElementById("superSenhaAdmin").value.trim();

    if (!nome || !email || !senha) {
        mostrarToast("Preencha nome, e-mail e senha.", "erro");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/super-admin/admins`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders()
            },
            body: JSON.stringify({
                nome,
                email,
                senha
            })
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao cadastrar ADMIN:", erro);
            throw new Error("Erro ao cadastrar administrador.");
        }

        document.getElementById("superNomeAdmin").value = "";
        document.getElementById("superEmailAdmin").value = "";
        document.getElementById("superSenhaAdmin").value = "";

        await carregarAdminsSuper();

        mostrarToast("Administrador cadastrado com sucesso.");

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

function renderizarAdminsSuper() {
    const container = document.getElementById("superAdminsContainer");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (!adminsSuper || adminsSuper.length === 0) {
        container.innerHTML = `
            <div class="admin-empty">
                Nenhum administrador cadastrado por este SUPER_ADMIN.
            </div>
        `;
        return;
    }

    adminsSuper.forEach(admin => {
        const ativo = admin.ativo === true;

        container.innerHTML += `
            <div class="usuario-row ${ativo ? "" : "inativo"}">

                <div class="usuario-info">

                    <div class="usuario-avatar">
                        ${obterIniciais(admin.nome)}
                    </div>

                    <div>
                        <strong>${escapeHtml(admin.nome)}</strong>
                        <small>${escapeHtml(admin.email)}</small>
                    </div>

                </div>

                <div class="usuario-actions">

                    <span class="pill owner-pill">
                        ADMIN
                    </span>

                    <span class="status-usuario ${ativo ? "ativo" : "inativo"}">
                        ${ativo ? "Ativo" : "Inativo"}
                    </span>

                    <button
                        class="btn-small warning"
                        onclick="abrirModalEditarUsuarioPainel('SUPER_ADMIN_ADMIN', ${admin.id})"
                    >
                        Editar
                    </button>

                    ${
                        ativo
                            ? `
                                <button
                                    class="btn-small danger"
                                    onclick="inativarUsuarioPainel('SUPER_ADMIN_ADMIN', ${admin.id})"
                                >
                                    Inativar
                                </button>
                              `
                            : `
                                <button
                                    class="btn-small success"
                                    onclick="reativarUsuarioPainel('SUPER_ADMIN_ADMIN', ${admin.id})"
                                >
                                    Reativar
                                </button>
                              `
                    }

                </div>

            </div>
        `;
    });
}

// ==========================
// EDITAR / INATIVAR / REATIVAR USUÁRIO OU ADMIN
// ==========================

function abrirModalEditarUsuarioPainel(tipo, id) {
    let registro = null;

    if (tipo === "ADMIN_USUARIO") {
        registro = usuariosAdmin.find(usuario => usuario.id === id);
    }

    if (tipo === "SUPER_ADMIN_ADMIN") {
        registro = adminsSuper.find(admin => admin.id === id);
    }

    if (!registro) {
        mostrarToast("Registro não encontrado.", "erro");
        return;
    }

    usuarioEdicaoContexto = {
        tipo,
        id
    };

    document.getElementById("editUsuarioNome").value = registro.nome || "";
    document.getElementById("editUsuarioEmail").value = registro.email || "";
    document.getElementById("editUsuarioSenha").value = "";

    if (tipo === "ADMIN_USUARIO") {
        document.getElementById("modalUsuarioTipo").innerText = "Usuário";
        document.getElementById("modalUsuarioTitulo").innerText = "Editar usuário";
    }

    if (tipo === "SUPER_ADMIN_ADMIN") {
        document.getElementById("modalUsuarioTipo").innerText = "Administrador";
        document.getElementById("modalUsuarioTitulo").innerText = "Editar administrador";
    }

    document.getElementById("modalUsuario").classList.remove("hidden");

    setTimeout(() => {
        document.getElementById("editUsuarioNome").focus();
    }, 100);
}

function fecharModalUsuario() {
    document.getElementById("modalUsuario").classList.add("hidden");
    usuarioEdicaoContexto = null;
}

async function salvarEdicaoUsuarioPainel() {
    if (!usuarioEdicaoContexto) {
        mostrarToast("Nenhum registro selecionado.", "erro");
        return;
    }

    const contextoAtual = { ...usuarioEdicaoContexto };

    const nome = document.getElementById("editUsuarioNome").value.trim();
    const email = document.getElementById("editUsuarioEmail").value.trim();
    const senha = document.getElementById("editUsuarioSenha").value.trim();

    if (!nome || !email) {
        mostrarToast("Nome e e-mail são obrigatórios.", "erro");
        return;
    }

    if (senha && senha.length < 8) {
        mostrarToast("A senha deve ter pelo menos 8 caracteres.", "erro");
        return;
    }

    const payload = {
        nome,
        email
    };

    if (senha) {
        payload.senha = senha;
    }

    let url = "";

    if (contextoAtual.tipo === "ADMIN_USUARIO") {
        url = `${API_URL}/api/admin/usuarios/${contextoAtual.id}`;
    }

    if (contextoAtual.tipo === "SUPER_ADMIN_ADMIN") {
        url = `${API_URL}/api/super-admin/admins/${contextoAtual.id}`;
    }

    try {
        const response = await fetch(url, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders()
            },
            body: JSON.stringify(payload)
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao editar registro:", erro);
            throw new Error("Erro ao salvar alterações.");
        }

        fecharModalUsuario();

        if (contextoAtual.tipo === "ADMIN_USUARIO") {
            await carregarUsuariosAdmin();
        }

        if (contextoAtual.tipo === "SUPER_ADMIN_ADMIN") {
            await carregarAdminsSuper();
        }

        mostrarToast("Alterações salvas com sucesso.");

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

async function inativarUsuarioPainel(tipo, id) {
    const confirmar = await confirmarAcao(
        "Inativar registro",
        "Deseja realmente inativar este registro? Ele poderá ser reativado depois."
    );

    if (!confirmar) {
        return;
    }

    let url = "";

    if (tipo === "ADMIN_USUARIO") {
        url = `${API_URL}/api/admin/usuarios/${id}`;
    }

    if (tipo === "SUPER_ADMIN_ADMIN") {
        url = `${API_URL}/api/super-admin/admins/${id}`;
    }

    try {
        const response = await fetch(url, {
            method: "DELETE",
            headers: authHeaders()
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao inativar:", erro);
            throw new Error("Erro ao inativar registro.");
        }

        if (tipo === "ADMIN_USUARIO") {
            await carregarUsuariosAdmin();
        }

        if (tipo === "SUPER_ADMIN_ADMIN") {
            await carregarAdminsSuper();
        }

        mostrarToast("Registro inativado com sucesso.");

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}

async function reativarUsuarioPainel(tipo, id) {
    let url = "";

    if (tipo === "ADMIN_USUARIO") {
        url = `${API_URL}/api/admin/usuarios/${id}/reativar`;
    }

    if (tipo === "SUPER_ADMIN_ADMIN") {
        url = `${API_URL}/api/super-admin/admins/${id}/reativar`;
    }

    try {
        const response = await fetch(url, {
            method: "PATCH",
            headers: authHeaders()
        });

        tratarSessao(response);

        if (!response.ok) {
            const erro = await response.text();
            console.error("Erro backend ao reativar:", erro);
            throw new Error("Erro ao reativar registro.");
        }

        if (tipo === "ADMIN_USUARIO") {
            await carregarUsuariosAdmin();
        }

        if (tipo === "SUPER_ADMIN_ADMIN") {
            await carregarAdminsSuper();
        }

        mostrarToast("Registro reativado com sucesso.");

    } catch (error) {
        mostrarToast(error.message, "erro");
    }
}
