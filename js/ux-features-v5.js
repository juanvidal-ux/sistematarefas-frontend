(function(){
    "use strict";

    const CUSTOM_PAGES = new Set([
        "UX_MINHA_AREA",
        "UX_TABELA",
        "UX_CALENDARIO",
        "UX_AJUDA",
        "UX_APRESENTACAO"
    ]);

    const PAGE_LABELS = {
        UX_MINHA_AREA: "Minha área",
        UX_TABELA: "Lista/Tabela",
        UX_CALENDARIO: "Calendário",
        UX_AJUDA: "Ajuda",
        UX_APRESENTACAO: "Apresentação"
    };

    const STATUS_LABELS = {
        PENDENTE: "Pendente",
        EM_ANDAMENTO: "Em andamento",
        CONCLUIDA: "Concluída",
        CANCELADA: "Cancelada"
    };

    const PRIORIDADE_VALOR = { CRITICA: 4, ALTA: 3, MEDIA: 2, BAIXA: 1 };

    function $(id){ return document.getElementById(id); }
    function tarefas(){ return Array.isArray(window.todasTarefas) ? window.todasTarefas : (typeof todasTarefas !== "undefined" ? todasTarefas : []); }
    function projetosDisponiveis(){
        const lista = tarefas();
        const mapa = new Map();
        lista.forEach(t => {
            const id = t.projetoId ?? t.projeto_id ?? t.projeto?.id ?? "";
            const nome = t.projetoNome ?? t.projeto_nome ?? t.projeto?.nome ?? t.projeto ?? "Sem projeto";
            const key = id ? String(id) : String(nome);
            if (!mapa.has(key)) mapa.set(key, { key, nome: String(nome || "Sem projeto") });
        });
        return [...mapa.values()].sort((a,b)=>a.nome.localeCompare(b.nome));
    }
    function tiposProjetoDisponiveis(){
        const campos = ["tipoProjeto", "tipo_projeto", "tipo", "categoria", "segmento"];
        const set = new Set();
        tarefas().forEach(t => {
            const projeto = t.projeto || {};
            for (const campo of campos) {
                const valor = t[campo] ?? projeto[campo];
                if (valor) set.add(String(valor));
            }
        });
        return [...set].sort((a,b)=>a.localeCompare(b));
    }
    function chaveProjetoTarefa(t){
        const id = t.projetoId ?? t.projeto_id ?? t.projeto?.id ?? "";
        const nome = t.projetoNome ?? t.projeto_nome ?? t.projeto?.nome ?? t.projeto ?? "Sem projeto";
        return id ? String(id) : String(nome);
    }
    function tipoProjetoTarefa(t){
        const projeto = t.projeto || {};
        return String(t.tipoProjeto ?? t.tipo_projeto ?? t.tipo ?? t.categoria ?? t.segmento ?? projeto.tipoProjeto ?? projeto.tipo_projeto ?? projeto.tipo ?? projeto.categoria ?? projeto.segmento ?? "");
    }
    function usuario(){ return window.usuarioLogado || (typeof usuarioLogado !== "undefined" ? usuarioLogado : null); }
    function esc(v){
        if (typeof escapeHtml === "function") return escapeHtml(v ?? "");
        return String(v ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;","\"":"&quot;"}[c]));
    }
    function fmt(v){
        if (!v) return "-";
        if (typeof formatarTexto === "function") return formatarTexto(v);
        return String(v).replaceAll("_"," ").toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase());
    }
    function fmtData(iso){
        if (!iso) return "Sem prazo";
        const [y,m,d] = String(iso).split("T")[0].split("-");
        if (!y || !m || !d) return iso;
        return `${d}/${m}/${y}`;
    }
    function dataHoje(){ const d = new Date(); d.setHours(0,0,0,0); return d; }
    function parseData(iso){
        if (!iso) return null;
        const d = new Date(String(iso).split("T")[0] + "T00:00:00");
        return Number.isNaN(d.getTime()) ? null : d;
    }
    function diasAte(iso){
        const d = parseData(iso); if(!d) return null;
        return Math.ceil((d - dataHoje()) / 86400000);
    }
    function infoPrazo(t){
        if (typeof obterInfoPrazo === "function") return obterInfoPrazo(t.prazo, t.status);
        const dias = diasAte(t.prazo);
        if (dias === null) return { texto:"Sem prazo", classe:"" };
        if (t.status !== "CONCLUIDA" && dias < 0) return { texto:"Vencida", classe:"vencida" };
        if (dias === 0) return { texto:"Hoje", classe:"hoje" };
        return { texto: fmtData(t.prazo), classe:"" };
    }
    function statusClass(s){ return `status-${s || "PENDENTE"}`; }
    function prioClass(p){ return `prio-${p || "MEDIA"}`; }
    function abrirTarefa(id){ if (typeof abrirModalTarefa === "function") abrirModalTarefa(id); }
    window.abrirTarefaUx = abrirTarefa;

    function filtrarBase(){
        const texto = ($("uxBuscaGlobal")?.value || "").toLowerCase().trim();
        const tipoProjeto = $("uxFiltroTipoProjeto")?.value || "";
        const projeto = $("uxFiltroProjeto")?.value || "";
        const status = $("uxFiltroStatus")?.value || "";
        const prioridade = $("uxFiltroPrioridade")?.value || "";
        const prazo = $("uxFiltroPrazo")?.value || "";
        const lista = tarefas().filter(t => {
            const nomeProjeto = t.projetoNome ?? t.projeto_nome ?? t.projeto?.nome ?? t.projeto ?? "";
            const alvo = [t.titulo,t.descricao,t.responsavel,nomeProjeto,t.observacoes,t.status,t.prioridade,tipoProjetoTarefa(t)].join(" ").toLowerCase();
            const bateTexto = !texto || alvo.includes(texto);
            const bateTipoProjeto = !tipoProjeto || tipoProjetoTarefa(t) === tipoProjeto;
            const bateProjeto = !projeto || chaveProjetoTarefa(t) === projeto;
            const bateStatus = !status || t.status === status;
            const batePrio = !prioridade || t.prioridade === prioridade;
            let batePrazo = true;
            const dias = diasAte(t.prazo);
            if (prazo === "VENCIDAS") batePrazo = t.status !== "CONCLUIDA" && dias !== null && dias < 0;
            if (prazo === "HOJE") batePrazo = dias === 0;
            if (prazo === "SEMANA") batePrazo = dias !== null && dias >= 0 && dias <= 7;
            if (prazo === "SEM_PRAZO") batePrazo = !t.prazo;
            return bateTexto && bateTipoProjeto && bateProjeto && bateStatus && batePrio && batePrazo;
        });
        const ordem = $("uxOrdenacao")?.value || "PRAZO";
        return lista.sort((a,b)=>{
            if (ordem === "PRIORIDADE") return (PRIORIDADE_VALOR[b.prioridade]||0) - (PRIORIDADE_VALOR[a.prioridade]||0);
            if (ordem === "STATUS") return String(a.status||"").localeCompare(String(b.status||""));
            if (ordem === "TITULO") return String(a.titulo||"").localeCompare(String(b.titulo||""));
            const da = parseData(a.prazo)?.getTime() || 9999999999999;
            const db = parseData(b.prazo)?.getTime() || 9999999999999;
            return da - db;
        });
    }

    function kpis(lista){
        const total = lista.length;
        const vencidas = lista.filter(t => t.status !== "CONCLUIDA" && diasAte(t.prazo) !== null && diasAte(t.prazo) < 0).length;
        const hoje = lista.filter(t => diasAte(t.prazo) === 0 && t.status !== "CONCLUIDA").length;
        const criticas = lista.filter(t => ["CRITICA","ALTA"].includes(t.prioridade) && t.status !== "CONCLUIDA").length;
        const concluidas = lista.filter(t => t.status === "CONCLUIDA").length;
        return { total, vencidas, hoje, criticas, concluidas, percentual: total ? Math.round((concluidas/total)*100) : 0 };
    }


    // Correção Rev16.29 — funções auxiliares restauradas para o calendário e páginas UX.
    // Sem estas funções, o clique em "Calendário" gera ReferenceError e a tela não renderiza.
    function kpiHTML(k){
        const itens = [
            ["Total", k.total, "Tarefas filtradas"],
            ["Vencidas", k.vencidas, "Precisam de atenção"],
            ["Hoje", k.hoje, "Vencem hoje"],
            ["Críticas/Altas", k.criticas, "Prioridade elevada"],
            ["Concluídas", `${k.percentual}%`, `${k.concluidas} finalizada${k.concluidas === 1 ? "" : "s"}`]
        ];
        return `<div class="ux-kpi-grid">${itens.map(([label, valor, desc]) => `
            <div class="ux-kpi-card">
                <small>${esc(label)}</small>
                <strong>${esc(valor)}</strong>
                <span>${esc(desc)}</span>
            </div>`).join("")}</div>`;
    }

    function listaCompactaHTML(lista, vazio){
        if(!lista || !lista.length) return `<div class="ux-empty">${esc(vazio || "Sem dados para exibir.")}</div>`;
        return `<div class="ux-list">${lista.map(t => {
            const prazo = infoPrazo(t);
            return `<div class="ux-list-item">
                <div class="ux-list-main">
                    <strong>${esc(t.titulo || "Tarefa sem título")}</strong>
                    <small>${esc(t.projetoNome || t.projeto_nome || t.projeto?.nome || "Sem projeto")} • ${esc(t.responsavel || "Sem responsável")}</small>
                </div>
                <div class="ux-list-actions">
                    <span class="pill ${prioClass(t.prioridade)}">${esc(fmt(t.prioridade || "MEDIA"))}</span>
                    <span class="pill ${prazo.classe || ""}">${esc(prazo.texto || fmtData(t.prazo))}</span>
                    <button class="btn-secondary" onclick="abrirTarefaUx(${Number(t.id) || 0})">Abrir</button>
                </div>
            </div>`;
        }).join("")}</div>`;
    }

    function calendarioReferenciaAtual(){
        const hoje = dataHoje();
        const ano = Number.isInteger(window.uxCalendarioAno) ? window.uxCalendarioAno : hoje.getFullYear();
        const mes = Number.isInteger(window.uxCalendarioMes) ? window.uxCalendarioMes : hoje.getMonth();
        return new Date(ano, mes, 1);
    }

    function calendarioPickerHTML(referencia){
        const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
        const anoAtual = dataHoje().getFullYear();
        const anos = [];
        for(let ano = anoAtual - 3; ano <= anoAtual + 4; ano++) anos.push(ano);
        return `<div class="ux-calendar-picker">
            <label>Mês
                <select id="uxCalendarioMesSelect" onchange="uxSelecionarMesCalendario()">
                    ${meses.map((nome, idx) => `<option value="${idx}" ${idx === referencia.getMonth() ? "selected" : ""}>${esc(nome)}</option>`).join("")}
                </select>
            </label>
            <label>Ano
                <select id="uxCalendarioAnoSelect" onchange="uxSelecionarMesCalendario()">
                    ${anos.map(ano => `<option value="${ano}" ${ano === referencia.getFullYear() ? "selected" : ""}>${ano}</option>`).join("")}
                </select>
            </label>
        </div>`;
    }

    function renderMinhaArea(){
        const el = $("uxMinhaAreaConteudo"); if(!el) return;
        const base = filtrarBase();
        const atual = usuario();
        const nome = String(atual?.nome || atual?.email || "").toLowerCase();
        const minhas = nome
            ? base.filter(t => String(t.responsavel || t.responsavelNome || t.usuarioNome || "").toLowerCase().includes(nome.split("@")[0]))
            : base;
        const atencao = minhas.filter(t => {
            const dias = diasAte(t.prazo);
            return t.status !== "CONCLUIDA" && ((dias !== null && dias <= 7) || ["CRITICA","ALTA"].includes(t.prioridade));
        }).slice(0, 12);
        el.innerHTML = toolbarHTML() + kpiHTML(kpis(minhas)) + `
            <div class="ux-grid-2">
                <div class="ux-card">
                    <div class="ux-card-header"><div><h3>Prioridades da minha área</h3><p>Tarefas próximas, vencidas ou de maior prioridade.</p></div></div>
                    ${listaCompactaHTML(atencao, "Nenhuma prioridade encontrada para os filtros atuais.")}
                </div>
                <div class="ux-card">
                    <div class="ux-card-header"><div><h3>Minhas tarefas recentes</h3><p>Lista rápida para abrir e acompanhar.</p></div></div>
                    ${listaCompactaHTML(minhas.slice(0, 12), "Nenhuma tarefa encontrada.")}
                </div>
            </div>`;
    }

    function renderTabela(){
        const el = $("uxTabelaConteudo"); if(!el) return;
        const lista = filtrarBase();
        const linhas = lista.map(t => {
            const prazo = infoPrazo(t);
            return `<tr>
                <td><button class="btn-link" onclick="abrirTarefaUx(${Number(t.id) || 0})">${esc(t.titulo || "Sem título")}</button></td>
                <td>${esc(t.projetoNome || t.projeto_nome || t.projeto?.nome || "Sem projeto")}</td>
                <td>${esc(t.responsavel || "-")}</td>
                <td><span class="pill ${statusClass(t.status)}">${esc(STATUS_LABELS[t.status] || fmt(t.status || "PENDENTE"))}</span></td>
                <td><span class="pill ${prioClass(t.prioridade)}">${esc(fmt(t.prioridade || "MEDIA"))}</span></td>
                <td><span class="pill ${prazo.classe || ""}">${esc(prazo.texto || fmtData(t.prazo))}</span></td>
            </tr>`;
        }).join("");
        el.innerHTML = toolbarHTML() + kpiHTML(kpis(lista)) + `
            <div class="ux-card">
                <div class="ux-card-header"><div><h3>Lista de tarefas</h3><p>${lista.length} tarefa${lista.length === 1 ? "" : "s"} encontrada${lista.length === 1 ? "" : "s"}.</p></div></div>
                <div class="ux-table-wrap"><table class="ux-table">
                    <thead><tr><th>Tarefa</th><th>Projeto</th><th>Responsável</th><th>Status</th><th>Prioridade</th><th>Prazo</th></tr></thead>
                    <tbody>${linhas || `<tr><td colspan="6"><div class="ux-empty">Nenhuma tarefa encontrada para os filtros atuais.</div></td></tr>`}</tbody>
                </table></div>
            </div>`;
    }

    function toolbarHTML(){
        const tipoAtual = $("uxFiltroTipoProjeto")?.value || "";
        const projetoAtual = $("uxFiltroProjeto")?.value || "";
        const statusAtual = $("uxFiltroStatus")?.value || "";
        const prioridadeAtual = $("uxFiltroPrioridade")?.value || "";
        const prazoAtual = $("uxFiltroPrazo")?.value || "";
        const ordemAtual = $("uxOrdenacao")?.value || "PRAZO";
        const tipos = tiposProjetoDisponiveis();
        const projetos = projetosDisponiveis();
        const opt = (value, label, atual) => `<option value="${esc(value)}" ${String(value)===String(atual)?"selected":""}>${esc(label)}</option>`;
        return `
            <div class="ux-toolbar ux-toolbar-calendar">
                <input id="uxBuscaGlobal" type="text" placeholder="Buscar tarefa, descrição, responsável ou projeto" oninput="uxAtualizarPaginaAtual()" value="${esc($("uxBuscaGlobal")?.value || "")}">
                <select id="uxFiltroTipoProjeto" onchange="uxAtualizarPaginaAtual()">
                    <option value="">Todos os tipos</option>${tipos.map(t=>opt(t,t,tipoAtual)).join("")}
                </select>
                <select id="uxFiltroProjeto" onchange="uxAtualizarPaginaAtual()">
                    <option value="">Todos os projetos</option>${projetos.map(p=>opt(p.key,p.nome,projetoAtual)).join("")}
                </select>
                <select id="uxFiltroStatus" onchange="uxAtualizarPaginaAtual()">
                    ${opt("", "Todos os status", statusAtual)}${opt("PENDENTE", "Pendente", statusAtual)}${opt("EM_ANDAMENTO", "Em andamento", statusAtual)}${opt("CONCLUIDA", "Concluída", statusAtual)}${opt("CANCELADA", "Cancelada", statusAtual)}
                </select>
                <select id="uxFiltroPrioridade" onchange="uxAtualizarPaginaAtual()">
                    ${opt("", "Todas as prioridades", prioridadeAtual)}${opt("CRITICA", "Crítica", prioridadeAtual)}${opt("ALTA", "Alta", prioridadeAtual)}${opt("MEDIA", "Média", prioridadeAtual)}${opt("BAIXA", "Baixa", prioridadeAtual)}
                </select>
                <select id="uxFiltroPrazo" onchange="uxAtualizarPaginaAtual()">
                    ${opt("", "Todos os prazos", prazoAtual)}${opt("VENCIDAS", "Vencidas", prazoAtual)}${opt("HOJE", "Hoje", prazoAtual)}${opt("SEMANA", "Próximos 7 dias", prazoAtual)}${opt("SEM_PRAZO", "Sem prazo", prazoAtual)}
                </select>
                <select id="uxOrdenacao" onchange="uxAtualizarPaginaAtual()">
                    ${opt("PRAZO", "Menor prazo", ordemAtual)}${opt("PRIORIDADE", "Maior prioridade", ordemAtual)}${opt("STATUS", "Status", ordemAtual)}${opt("TITULO", "Título", ordemAtual)}
                </select>
                <button class="btn-secondary" onclick="uxLimparFiltrosGlobais()">Limpar</button>
            </div>`;
    }

    function renderCalendario(){
        const lista = filtrarBase();
        const conteudo = $("uxCalendarioConteudo"); if(!conteudo) return;
        const hoje = dataHoje();
        const referencia = calendarioReferenciaAtual();
        const primeiroDiaMes = new Date(referencia.getFullYear(), referencia.getMonth(), 1);
        const ultimoDiaMes = new Date(referencia.getFullYear(), referencia.getMonth() + 1, 0);
        const inicio = new Date(primeiroDiaMes);
        inicio.setDate(primeiroDiaMes.getDate() - primeiroDiaMes.getDay());
        const fim = new Date(ultimoDiaMes);
        fim.setDate(ultimoDiaMes.getDate() + (6 - ultimoDiaMes.getDay()));
        const dias = [];
        for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) dias.push(new Date(d));
        const tituloMes = referencia.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
        const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d=>`<div class="ux-calendar-weekday">${d}</div>`).join("");
        const grid = dias.map(d=>{
            const iso = d.toISOString().slice(0,10);
            const doDia = lista.filter(t => String(t.prazo||"").slice(0,10) === iso);
            const isToday = d.toDateString() === hoje.toDateString();
            const foraMes = d.getMonth() !== referencia.getMonth();
            const tarefasVisiveis = doDia.slice(0,3);
            const extras = doDia.length - tarefasVisiveis.length;
            return `<div class="ux-calendar-day ${isToday ? "is-today" : ""} ${foraMes ? "is-outside-month" : ""}"><div class="ux-calendar-date"><span>${d.toLocaleDateString("pt-BR",{day:"2-digit"})}</span><small>${d.toLocaleDateString("pt-BR",{month:"2-digit"})}</small></div>${tarefasVisiveis.length ? tarefasVisiveis.map(t=>`<button class="ux-calendar-task ${infoPrazo(t).classe}" onclick="abrirTarefaUx(${t.id})">${esc(t.titulo)}</button>`).join("") : `<div class="ux-task-sub">Sem tarefas</div>`}${extras > 0 ? `<button class="ux-calendar-more" onclick="abrirTabelaTarefas()">+${extras} tarefa${extras>1?"s":""}</button>` : ""}</div>`;
        }).join("");
        const semPrazo = lista.filter(t=>!t.prazo).slice(0,8);
        conteudo.innerHTML = toolbarHTML() + kpiHTML(kpis(lista)) + `<div class="ux-card"><div class="ux-card-header ux-calendar-toolbar"><div><h3>Calendário mensal</h3><p>Tarefas agrupadas por prazo — ${esc(tituloMes)}.</p></div><div class="ux-calendar-actions">${calendarioPickerHTML(referencia)}<button class="btn-secondary" onclick="uxMesCalendario(-1)">← Mês anterior</button><button class="btn-secondary" onclick="uxMesCalendario(0)">Hoje</button><button class="btn-primary" onclick="uxMesCalendario(1)">Próximo mês →</button></div></div><div class="ux-calendar ux-calendar-month">${diasSemana}${grid}</div></div><div class="ux-card"><div class="ux-card-header"><div><h3>Sem prazo definido</h3><p>Tarefas que podem precisar de planejamento.</p></div></div>${listaCompactaHTML(semPrazo, "Nenhuma tarefa sem prazo.")}</div>`;
    }

    window.uxSelecionarMesCalendario = function(){
        const mes = $("uxCalendarioMesSelect")?.value;
        const ano = $("uxCalendarioAnoSelect")?.value;
        if (mes !== undefined && ano !== undefined) {
            window.uxCalendarioMes = Number(mes);
            window.uxCalendarioAno = Number(ano);
            renderCalendario();
        }
    };

    window.uxMesCalendario = function(direcao){
        const hoje = dataHoje();
        if (direcao === 0) {
            window.uxCalendarioAno = hoje.getFullYear();
            window.uxCalendarioMes = hoje.getMonth();
        } else {
            const base = calendarioReferenciaAtual();
            const novoMes = new Date(base.getFullYear(), base.getMonth() + direcao, 1);
            window.uxCalendarioAno = novoMes.getFullYear();
            window.uxCalendarioMes = novoMes.getMonth();
        }
        renderCalendario();
    };

    function renderRelatorios(){
        const lista = filtrarBase(); const k = kpis(lista); const conteudo = $("uxRelatoriosConteudo"); if(!conteudo) return;
        const porStatus = agrupar(lista, t => STATUS_LABELS[t.status] || fmt(t.status));
        const porResp = agrupar(lista, t => t.responsavel || "Usuário");
        const porProjeto = agrupar(lista, t => t.projetoNome || "Sem projeto");
        conteudo.innerHTML = toolbarHTML() + kpiHTML(k) + `<div class="ux-grid-2"><div class="ux-card"><div class="ux-card-header"><div><h3>Tarefas por status</h3><p>Distribuição operacional atual.</p></div></div>${barrasHTML(porStatus)}</div><div class="ux-card"><div class="ux-card-header"><div><h3>Tarefas por responsável</h3><p>Carga de trabalho por pessoa.</p></div></div>${barrasHTML(porResp, 8)}</div></div><div class="ux-grid-2"><div class="ux-card"><div class="ux-card-header"><div><h3>Tarefas por projeto</h3><p>Projetos com maior volume.</p></div></div>${barrasHTML(porProjeto, 8)}</div><div class="ux-card"><div class="ux-card-header"><div><h3>Lista crítica</h3><p>Alta prioridade e/ou vencidas.</p></div></div>${listaCompactaHTML(lista.filter(t=>["CRITICA","ALTA"].includes(t.prioridade) || (t.status!=="CONCLUIDA" && diasAte(t.prazo)<0)).slice(0,10), "Nenhuma tarefa crítica encontrada.")}</div></div>`;
    }
    function agrupar(lista, fn){ const m={}; lista.forEach(t=>{ const k=fn(t); m[k]=(m[k]||0)+1; }); return Object.entries(m).sort((a,b)=>b[1]-a[1]); }
    function barrasHTML(dados, lim=20){
        if(!dados.length) return `<div class="ux-empty">Sem dados para exibir.</div>`;
        const max = Math.max(...dados.map(d=>d[1]),1);
        return `<div class="ux-report-bars">${dados.slice(0,lim).map(([label,valor])=>`<div class="ux-bar-row"><div class="ux-bar-label">${esc(label)}</div><div class="ux-bar-track"><div class="ux-bar-fill" style="width:${Math.max(4,Math.round(valor/max*100))}%"></div></div><div class="ux-bar-value">${valor}</div></div>`).join("")}</div>`;
    }

    function renderAjuda(){
        const el = $("uxAjudaConteudo"); if(!el) return;
        el.innerHTML = `<div class="ux-help-grid">
            ${[
                ["📌","Criar tarefa","Use o botão + Nova tarefa ou o formulário lateral do Board."],
                ["▦","Mover no Kanban","Arraste o card entre colunas ou use os botões de status."],
                ["🔎","Filtrar tarefas","Use busca, status, prioridade, prazo e responsável."],
                ["✅","Subitens","Abra uma tarefa e use a aba Subitens para criar checklists."],
                ["💬","Comentários","Registre atualizações na aba Comentários da tarefa."],
                ["⌨️","Atalhos","Ctrl + K foca a busca. Esc fecha alguns modais."],
                ["🧭","Visualizações","Use o Kanban para operação diária e acesse calendário apenas pelo menu Calendário."],
                ["🛡️","Permissões","Algumas ações aparecem apenas para administradores."],
            ].map(x=>`<div class="ux-help-card"><span>${x[0]}</span><h3>${x[1]}</h3><p>${x[2]}</p></div>`).join("")}
        </div>`;
    }

    function renderApresentacao(){
        const lista = tarefas(); const k = kpis(lista); const el = $("uxApresentacaoConteudo"); if(!el) return;
        const criticas = lista.filter(t=>["CRITICA","ALTA"].includes(t.prioridade) || (t.status!=="CONCLUIDA" && diasAte(t.prazo)<0)).slice(0,8);
        el.innerHTML = `${kpiHTML(k)}<div class="ux-grid-2"><div class="ux-card"><div class="ux-card-header"><div><h3>Resumo para reunião</h3><p>Visão limpa para apresentar à equipe ou coordenação.</p></div><button class="btn-secondary" onclick="window.print()">Imprimir</button></div>${barrasHTML(agrupar(lista,t=>STATUS_LABELS[t.status]||fmt(t.status)))}</div><div class="ux-card"><div class="ux-card-header"><div><h3>Pontos de atenção</h3><p>Tarefas críticas, atrasadas ou de alta prioridade.</p></div></div>${listaCompactaHTML(criticas,"Nenhum ponto crítico no momento.")}</div></div>`;
    }

    function criarPainel(id, titulo, desc, conteudoId, extraActions=""){
        return `<section id="${id}" class="admin-panel ux-panel app-page-hidden"><div class="ux-page-header"><div><span class="eyebrow">VidalSystem</span><h2>${titulo}</h2><p>${desc}</p></div><div class="ux-page-actions">${extraActions}<button class="btn-secondary" onclick="recarregarTudo()">Atualizar dados</button></div></div><div id="${conteudoId}"></div></section>`;
    }

    function criarEstrutura(){
        const main = document.querySelector("main.main"); if(!main || $("uxTabelaPanel")) return;
        main.insertAdjacentHTML("beforeend", `
            ${criarPainel("uxMinhaAreaPanel","Minha área","Uma visão focada no usuário logado, com prioridades, vencimentos e atalhos operacionais.","uxMinhaAreaConteudo","<button class='btn-primary' onclick='focarNovaTarefa()'>+ Nova tarefa</button>")}
            ${criarPainel("uxTabelaPanel","Visualização em lista/tabela","Tabela operacional para localizar, ordenar e abrir tarefas com mais velocidade.","uxTabelaConteudo")}
            ${criarPainel("uxCalendarioPanel","Calendário de tarefas","Prazos em visão semanal/quinzenal para acompanhar tarefas vencidas, do dia e próximas.","uxCalendarioConteudo")}
            ${criarPainel("uxAjudaPanel","Ajuda interna","Guia rápido de uso do sistema para reduzir dúvidas e facilitar treinamento.","uxAjudaConteudo")}
            ${criarPainel("uxApresentacaoPanel","Modo apresentação","Painel limpo para reuniões, acompanhamento com coordenação e status report.","uxApresentacaoConteudo","<button class='btn-primary' onclick='window.print()'>Imprimir</button>")}
        `);
    }

    function adicionarMenu(){
        const menu = document.querySelector(".sidebar .menu"); if(!menu || menu.dataset.uxV5) return;
        menu.dataset.uxV5 = "1";
        const bloco = document.createElement("div");
        bloco.className = "ux-menu-extension";
        bloco.innerHTML = `
            <div class="menu-section-label">Apoio</div>
            <button class="menu-item" data-page="UX_MINHA_AREA" onclick="abrirMinhaAreaUx()"><span>🏠</span><span class="menu-text">Minha área</span></button>
            <button class="menu-item" data-page="UX_CALENDARIO" onclick="abrirCalendarioTarefas()"><span>📅</span><span class="menu-text">Calendário</span></button>
            <button class="menu-item" data-page="UX_AJUDA" onclick="abrirAjudaSistema()"><span>❔</span><span class="menu-text">Ajuda</span></button>
        `;
        const temaBtn = Array.from(menu.querySelectorAll("button")).find(b => b.textContent.includes("Tema"));
        menu.insertBefore(bloco, temaBtn || null);
    }

    function adicionarAcessibilidade(){
        if($("uxAcessibilidadeBar")) return;
        document.body.insertAdjacentHTML("beforeend", `<div id="uxAcessibilidadeBar" class="ux-accessibility-bar ux-hidden"><button onclick="uxFonteMais()">A+</button><button onclick="uxFonteMenos()">A-</button><button onclick="uxAlternarContraste()">Contraste</button><button onclick="uxFecharAcessibilidade()">×</button></div><div class="ux-fab-stack"><button class="ux-fab" title="Acessibilidade" onclick="uxAlternarAcessibilidade()">♿</button></div>`);
    }
    window.uxAlternarAcessibilidade = ()=>$("uxAcessibilidadeBar")?.classList.toggle("ux-hidden");
    window.uxFecharAcessibilidade = ()=>$("uxAcessibilidadeBar")?.classList.add("ux-hidden");
    window.uxFonteMais = ()=>document.body.classList.add("ux-font-lg");
    window.uxFonteMenos = ()=>document.body.classList.remove("ux-font-lg");
    window.uxAlternarContraste = ()=>document.body.classList.toggle("ux-contrast");

    function onboarding(){
        // UX V18: não exibe onboarding automático.
        // Evita bloquear a tela ao atualizar e elimina armazenamento local desse aviso.
        $("uxOnboarding")?.remove();
    }
    window.uxFecharOnboarding = function(){ $("uxOnboarding")?.remove(); };

    function esconderPadrao(){
        document.querySelectorAll(".metrics,.workspace,#dashboardHomePanel,#projetosPanel,#modelosCardsPanel,#projetoDetalhePanel,#adminPanel,#superAdminPanel").forEach(el=>el.classList.add("app-page-hidden"));
        document.querySelectorAll(".ux-panel").forEach(el=>el.classList.add("app-page-hidden"));
    }
    function ativarMenu(page){ document.querySelectorAll(".menu-item[data-page]").forEach(item=>item.classList.toggle("active", item.dataset.page === page)); }
    function mostrarCustom(page){
        criarEstrutura(); esconderPadrao(); ativarMenu(page);
        const panelMap = { UX_MINHA_AREA:"uxMinhaAreaPanel", UX_TABELA:"uxTabelaPanel", UX_CALENDARIO:"uxCalendarioPanel", UX_AJUDA:"uxAjudaPanel", UX_APRESENTACAO:"uxApresentacaoPanel" };
        $(panelMap[page])?.classList.remove("app-page-hidden");
        window.paginaAtual = page;
        if (typeof atualizarTopbarContexto === "function") atualizarTopbarContexto(page);
        renderPage(page);
    }
    function renderPage(page){
        if(page === "UX_MINHA_AREA") renderMinhaArea();
        if(page === "UX_TABELA") renderTabela();
        if(page === "UX_CALENDARIO") renderCalendario();
        if(page === "UX_AJUDA") renderAjuda();
        if(page === "UX_APRESENTACAO") renderApresentacao();
    }

    window.uxAtualizarPaginaAtual = function(){ renderPage(window.paginaAtual || (typeof paginaAtual !== "undefined" ? paginaAtual : "")); };
    window.uxLimparFiltrosGlobais = function(){ ["uxBuscaGlobal","uxFiltroTipoProjeto","uxFiltroProjeto","uxFiltroStatus","uxFiltroPrioridade","uxFiltroPrazo"].forEach(id=>{ if($(id)) $(id).value=""; }); window.uxAtualizarPaginaAtual(); };
    window.abrirMinhaAreaUx = function(){ mostrarCustom("UX_MINHA_AREA"); };
    window.abrirTabelaTarefas = function(){ mostrarCustom("UX_TABELA"); };
    window.abrirCalendarioTarefas = function(){ mostrarCustom("UX_CALENDARIO"); };
    window.abrirAjudaSistema = function(){ mostrarCustom("UX_AJUDA"); };
    window.abrirModoApresentacaoGeral = function(){ mostrarCustom("UX_APRESENTACAO"); };

    function inserirAtalhosBoard(){
        // Rev16.19: a opção Lista/Tabela saiu do Kanban para evitar duplicidade visual.
        const toolbar = document.querySelector(".board-toolbar");
        if (toolbar) toolbar.dataset.uxViews = "1";
    }

    function wrapRender(){
        const originalRender = window.renderizarBoard;
        if(typeof originalRender === "function" && !originalRender.__uxV5){
            window.renderizarBoard = function(){
                const r = originalRender.apply(this, arguments);
                setTimeout(()=>{ inserirAtalhosBoard(); if(CUSTOM_PAGES.has(window.paginaAtual)) renderPage(window.paginaAtual); }, 0);
                return r;
            };
            window.renderizarBoard.__uxV5 = true;
        }
        const originalBuscar = window.buscarTarefas;
        if(typeof originalBuscar === "function" && !originalBuscar.__uxV5){
            window.buscarTarefas = async function(){
                document.body.classList.add("ux-loading-data");
                try { return await originalBuscar.apply(this, arguments); }
                finally { document.body.classList.remove("ux-loading-data"); setTimeout(()=>{ if(CUSTOM_PAGES.has(window.paginaAtual)) renderPage(window.paginaAtual); }, 50); }
            };
            window.buscarTarefas.__uxV5 = true;
        }
    }

    function init(){
        criarEstrutura(); adicionarMenu(); adicionarAcessibilidade(); inserirAtalhosBoard(); wrapRender();
        // UX V18: onboarding desativado para evitar modal bloqueando a tela e sensação de travamento.
        // setTimeout(onboarding, 900);
    }

    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
    setTimeout(init, 800);
})();
