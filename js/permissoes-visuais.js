function aplicarPermissoesVisuaisExtras() {
    const admin = typeof isAdmin === "function" && isAdmin();
    const superAdmin = typeof isSuperAdmin === "function" && isSuperAdmin();

    document.querySelectorAll(".admin-action").forEach(el => {
        el.classList.toggle("hidden", !admin && !superAdmin);
    });

    document.querySelectorAll(".super-admin-action").forEach(el => {
        el.classList.toggle("hidden", !superAdmin);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(aplicarPermissoesVisuaisExtras, 200);
});
