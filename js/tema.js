function aplicarTemaSistema() {
    const tema = localStorage.getItem("temaSistema") || "light";
    document.body.dataset.theme = tema;
    const icone = document.getElementById("iconeTemaSistema");
    if (icone) icone.innerText = tema === "dark" ? "☀️" : "🌙";
}

function alternarTemaSistema() {
    const atual = document.body.dataset.theme === "dark" ? "dark" : "light";
    const proximo = atual === "dark" ? "light" : "dark";
    localStorage.setItem("temaSistema", proximo);
    aplicarTemaSistema();
    if (typeof mostrarToast === "function") {
        mostrarToast(proximo === "dark" ? "Tema escuro ativado." : "Tema claro ativado.");
    }
}

document.addEventListener("DOMContentLoaded", aplicarTemaSistema);
