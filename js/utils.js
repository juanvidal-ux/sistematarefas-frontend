// ==========================
// UTILITÁRIOS
// ==========================

function limparFormulario() {
    document.getElementById("titulo").value = "";
    document.getElementById("descricao").value = "";
    document.getElementById("prioridade").value = "MEDIA";
    document.getElementById("prazo").value = "";
    document.getElementById("observacoes").value = "";

    const responsavelSelect = document.getElementById("responsavelUsuarioId");

    if (responsavelSelect) {
        responsavelSelect.value = "";
    }

    const projetoSelect = document.getElementById("projetoTarefaId");

    if (projetoSelect) {
        projetoSelect.value = "";
    }
}

function formatarTexto(texto) {
    if (!texto) {
        return "-";
    }

    return texto
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, letra => letra.toUpperCase());
}

function formatarData(data) {
    if (!data) {
        return "-";
    }

    const dataLimpa = data.includes("T") ? data.split("T")[0] : data;

    const [ano, mes, dia] = dataLimpa.split("-");

    if (!ano || !mes || !dia) {
        return data;
    }

    return `${dia}/${mes}/${ano}`;
}

function formatarDataHora(dataHora) {
    if (!dataHora) {
        return "-";
    }

    const data = new Date(dataHora);

    if (Number.isNaN(data.getTime())) {
        return dataHora;
    }

    return data.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function escapeHtml(texto) {
    return String(texto)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatarMoeda(valor) {
    const numero = Number(valor || 0);

    return numero.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function mostrarToast(mensagem, tipo = "sucesso") {
    toast.innerText = mensagem;
    toast.classList.remove("hidden");

    if (tipo === "erro") {
        toast.style.background = "#de350b";
    } else {
        toast.style.background = "#172b4d";
    }

    setTimeout(() => {
        toast.classList.add("hidden");
    }, 3000);
}

function obterIniciais(nome) {
    if (!nome) {
        return "?";
    }

    return nome
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map(parte => parte[0].toUpperCase())
        .join("");
}

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        fecharModalTarefa();
        fecharModalSenha();
        fecharModalUsuario();
        cancelarEdicaoSubitem();
        fecharModalModeloCard();
        fecharModalAplicarModeloCard();
    }
});
