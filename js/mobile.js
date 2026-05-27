function alternarMenuMobile() {
    document.body.classList.toggle("menu-mobile-aberto");
    document.getElementById("mobileOverlay")?.classList.toggle("hidden", !document.body.classList.contains("menu-mobile-aberto"));
}

function fecharMenuMobile() {
    document.body.classList.remove("menu-mobile-aberto");
    document.getElementById("mobileOverlay")?.classList.add("hidden");
}

document.addEventListener("click", event => {
    if (event.target.closest(".menu-item")) {
        fecharMenuMobile();
    }
});
