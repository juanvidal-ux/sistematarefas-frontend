const loginSection = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");
const toast = document.getElementById("toast");

let todasTarefas = [];
let tarefaSelecionada = null;

let usuarioLogado = null;
let usuariosAdmin = [];
let adminsSuper = [];
let projetosAdmin = [];

let usuarioEdicaoContexto = null;

let paginaAtual = "BOARD";
let abaProjetosAtual = "ATIVOS";
let projetoDetalheSelecionado = null;
let tarefasProjetoDetalhe = [];
let usuariosProjetoDetalhe = [];
let subitensTarefaSelecionada = [];
let subitemEdicaoId = null;
let comentariosTarefaSelecionada = [];
let historicoTarefaSelecionada = [];
let modoCartao = localStorage.getItem("taskflow_modo_cartao") || "DETALHADO";
let abaModalAtiva = "DETALHES";
let resolverConfirmacao = null;

let modelosCardsAdmin = [];
let modeloCardEdicaoId = null;
let modeloCardChecklistTemporario = [];


// ==========================
// CONFIGURAÇÕES / DOCUMENTOS
// ==========================
let documentosProjetoAdmin = [];
