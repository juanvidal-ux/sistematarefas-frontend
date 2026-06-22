// ==========================
// API CENTRALIZADA
// ==========================

function getToken() {
    return localStorage.getItem("token") || "";
}

function getAuthHeaders() {
    const token = getToken();

    return token
        ? { Authorization: `Bearer ${token}` }
        : {};
}

function montarUrlApi(path) {
    if (!path) {
        return API_URL;
    }

    if (path.startsWith("http")) {
        return path;
    }

    return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function lerRespostaApi(response) {
    const contentType = response.headers.get("content-type") || "";

    if (response.status === 204) {
        return null;
    }

    if (contentType.includes("application/json")) {
        return response.json();
    }

    return response.text();
}

function extrairMensagemErroApi(status, data, fallback = "Erro na comunicação com o servidor.") {
    if (data && typeof data === "object") {
        return data.message || data.error || data.mensagem || fallback;
    }

    if (typeof data === "string" && data.trim()) {
        try {
            const json = JSON.parse(data);
            return json.message || json.error || json.mensagem || fallback;
        } catch (_) {
            return data;
        }
    }

    if (status === 401) return "Sessão expirada. Faça login novamente.";
    if (status === 403) return "Você não tem permissão para realizar esta ação.";
    if (status === 404) return "Recurso não encontrado.";
    if (status >= 500) return "Erro interno no servidor.";

    return fallback;
}

async function apiRequest(path, options = {}) {
    const {
        method = "GET",
        body,
        headers = {},
        auth = true,
        errorMessage = "Erro na comunicação com o servidor."
    } = options;

    const requestHeaders = {
        ...(auth ? getAuthHeaders() : {}),
        ...headers
    };

    let requestBody = body;

    if (body !== undefined && body !== null && !(body instanceof FormData)) {
        requestHeaders["Content-Type"] = requestHeaders["Content-Type"] || "application/json";
        requestBody = typeof body === "string" ? body : JSON.stringify(body);
    }

    const response = await fetch(montarUrlApi(path), {
        method,
        headers: requestHeaders,
        body: requestBody
    });

    if (typeof tratarSessao === "function") {
        tratarSessao(response);
    }

    const data = await lerRespostaApi(response);

    if (!response.ok) {
        const mensagem = extrairMensagemErroApi(response.status, data, errorMessage);
        const erro = new Error(mensagem);
        erro.status = response.status;
        erro.data = data;
        throw erro;
    }

    return data;
}

const apiGet = (path, options = {}) => apiRequest(path, { ...options, method: "GET" });
const apiPost = (path, body, options = {}) => apiRequest(path, { ...options, method: "POST", body });
const apiPut = (path, body, options = {}) => apiRequest(path, { ...options, method: "PUT", body });
const apiPatch = (path, body, options = {}) => apiRequest(path, { ...options, method: "PATCH", body });
const apiDelete = (path, options = {}) => apiRequest(path, { ...options, method: "DELETE" });
