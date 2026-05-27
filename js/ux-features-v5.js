(function(){
    "use strict";

    const CUSTOM_PAGES = new Set([
        "UX_MINHA_AREA",
        "UX_TABELA",
        "UX_CALENDARIO",
        "UX_RELATORIOS",
        "UX_FILTROS",
        "UX_AJUDA",
        "UX_APRESENTACAO"
    ]);

    const PAGE_LABELS = {
        UX_MINHA_AREA: "Minha área",
        UX_TABELA: "Lista/Tabela",
        UX_CALENDARIO: "Calendário",
        UX_RELATORIOS: "Relatórios",
        UX_FILTROS: "Filtros salvos",
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
        const status = $("uxFiltroStatus")?.value || "";
        const prioridade = $("uxFiltroPrioridade")?.value || "";
        const prazo = $("uxFiltroPrazo")?.value || "";
        const lista = tarefas().filter(t => {
            const alvo = [t.titulo,t.descricao,t.responsavel,t.projetoNome,t.observacoes,t.status,t.prioridade].join(" ").toLowerCase();
            const bateTexto = !texto || alvo.includes(texto);
            const bateStatus = !status || t.status === status;
            const batePrio = !prioridade || t.prioridade === prioridade;
            let batePrazo = true;
            const dias = diasAte(t.prazo);
            if (prazo === "VENCIDAS") batePrazo = t.status !== "CONCLUIDA" && dias !== null && dias < 0;
            if (prazo === "HOJE") batePrazo = dias === 0;
            if (prazo === "SEMANA") batePrazo = dias !== null && dias >= 0 && dias <= 7;
            if (prazo === "SEM_PRAZO") batePrazo = !t.prazo;
            return bateTexto && bateStatus && batePrio && batePrazo;
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

    function toolbarHTML(){
        return `
            <div class="ux-toolbar">
                <input id="uxBuscaGlobal" type="text" placeholder="Buscar tarefa, descrição, responsável ou projeto" oninput="uxAtualizarPaginaAtual()">
                <select id="uxFiltroStatus" onchange="uxAtualizarPaginaAtual()">
                    <option value="">Todos os status</option><option value="PENDENTE">Pendente</option><option value="EM_ANDAMENTO">Em andamento</option><option value="CONCLUIDA">Concluída</option><option value="CANCELADA">Cancelada</option>
                </select>
                <select id="uxFiltroPrioridade" onchange="uxAtualizarPaginaAtual()">
                    <option value="">Todas as prioridades</option><option value="CRITICA">Crítica</option><option value="ALTA">Alta</option><option value="MEDIA">Média</option><option value="BAIXA">Baixa</option>
                </select>
                <select id="uxFiltroPrazo" onchange="uxAtualizarPaginaAtual()">
                    <option value="">Todos os prazos</option><option value="VENCIDAS">Vencidas</option><option value="HOJE">Hoje</option><option value="SEMANA">Próximos 7 dias</option><option value="SEM_PRAZO">Sem prazo</option>
                </select>
                <select id="uxOrdenacao" onchange="uxAtualizarPaginaAtual()">
                    <option value="PRAZO">Menor prazo</option><option value="PRIORIDADE">Maior prioridade</option><option value="STATUS">Status</option><option value="TITULO">Título</option>
                </select>
                <button class="btn-secondary" onclick="uxLimparFiltrosGlobais()">Limpar</button>
                <button class="btn-primary" onclick="uxSalvarFiltroAtual()">Salvar filtro</button>
            </div>`;
    }

    function kpiHTML(k){
        return `<div class="ux-kpi-grid">
            <div class="ux-kpi-card"><span>Total</span><strong>${k.total}</strong><small>Tarefas consideradas</small></div>
            <div class="ux-kpi-card danger"><span>Vencidas</span><strong>${k.vencidas}</strong><small>Precisam de atenção</small></div>
            <div class="ux-kpi-card warning"><span>Hoje</span><strong>${k.hoje}</strong><small>Vencem hoje</small></div>
            <div class="ux-kpi-card success"><span>Conclusão</span><strong>${k.percentual}%</strong><small>${k.concluidas} concluídas</small></div>
        </div>`;
    }

    function tabelaHTML(lista){
        if (!lista.length) return `<div class="ux-empty">Nenhuma tarefa encontrada com os filtros atuais.</div>`;
        return `<div class="ux-table-wrap"><table class="ux-table"><thead><tr>
            <th>Tarefa</th><th>Status</th><th>Prioridade</th><th>Responsável</th><th>Projeto</th><th>Prazo</th><th>Ações</th>
        </tr></thead><tbody>${lista.map(t=>{
            const prazo = infoPrazo(t);
            return `<tr>
                <td><div class="ux-task-title">${esc(t.titulo)}</div><div class="ux-task-sub">${esc(t.descricao || "Sem descrição")}</div></td>
                <td><span class="ux-pill ${statusClass(t.status)}">${STATUS_LABELS[t.status] || fmt(t.status)}</span></td>
                <td><span class="ux-pill ${prioClass(t.prioridade)}">${fmt(t.prioridade)}</span></td>
                <td>${esc(t.responsavel || "Usuário")}</td>
                <td>${esc(t.projetoNome || "Sem projeto")}</td>
                <td><span class="ux-pill ${prazo.classe}">${esc(prazo.texto)}</span></td>
                <td><button class="btn-secondary" onclick="abrirTarefaUx(${t.id})">Abrir</button></td>
            </tr>`;
        }).join("")}</tbody></table></div>`;
    }

    function renderTabela(){
        const lista = filtrarBase(); const el = $("uxTabelaConteudo"); if(!el) return;
        el.innerHTML = toolbarHTML() + kpiHTML(kpis(lista)) + tabelaHTML(lista);
    }

    function renderMinhaArea(){
        const u = usuario();
        const nome = u?.nome || u?.email || "Usuário";
        const minhas = tarefas().filter(t => !u?.nome || (t.responsavel || "").toLowerCase().includes(String(u.nome||"").toLowerCase()) || !t.responsavel);
        const base = minhas.length ? minhas : tarefas();
        const vencidas = base.filter(t => t.status !== "CONCLUIDA" && diasAte(t.prazo) !== null && diasAte(t.prazo) < 0).slice(0,6);
        const hoje = base.filter(t => diasAte(t.prazo) === 0 && t.status !== "CONCLUIDA").slice(0,6);
        const proximas = base.filter(t => { const d=diasAte(t.prazo); return d !== null && d > 0 && d <= 7 && t.status !== "CONCLUIDA"; }).slice(0,8);
        const conteudo = $("uxMinhaAreaConteudo"); if(!conteudo) return;
        conteudo.innerHTML = `${kpiHTML(kpis(base))}
            <div class="ux-grid-2">
                <div class="ux-card"><div class="ux-card-header"><div><h3>Olá, ${esc(nome)}</h3><p>Estas são as prioridades mais importantes para sua rotina.</p></div><button class="btn-primary" onclick="focarNovaTarefa()">+ Nova tarefa</button></div>${listaCompactaHTML([...vencidas,...hoje,...proximas].slice(0,10), "Nenhuma pendência urgente encontrada.")}</div>
                <div class="ux-card"><div class="ux-card-header"><div><h3>Atalhos rápidos</h3><p>Acesse as principais visões do sistema.</p></div></div><div class="ux-list">
                    <button class="ux-list-item" onclick="abrirTabelaTarefas()"><span class="ux-list-main"><strong>Ver em tabela</strong><small>Ideal para filtrar e comparar tarefas.</small></span><span>→</span></button>
                    <button class="ux-list-item" onclick="abrirCalendarioTarefas()"><span class="ux-list-main"><strong>Ver calendário</strong><small>Organize a semana pelos prazos.</small></span><span>→</span></button>
                    <button class="ux-list-item" onclick="abrirRelatoriosAvancados()"><span class="ux-list-main"><strong>Relatórios</strong><small>Acompanhe status, responsáveis e atrasos.</small></span><span>→</span></button>
                </div></div>
            </div>
            <div class="ux-grid-2"><div class="ux-card"><div class="ux-card-header"><div><h3>Vencidas</h3><p>Prioridade máxima.</p></div></div>${listaCompactaHTML(vencidas, "Nenhuma tarefa vencida.")}</div><div class="ux-card"><div class="ux-card-header"><div><h3>Próximas da semana</h3><p>Prazos que merecem acompanhamento.</p></div></div>${listaCompactaHTML(proximas, "Nenhuma tarefa para os próximos 7 dias.")}</div></div>`;
    }

    function listaCompactaHTML(lista, vazio){
        if(!lista.length) return `<div class="ux-empty">${vazio}</div>`;
        return `<div class="ux-list">${lista.map(t=>`<div class="ux-list-item"><div class="ux-list-main"><strong>${esc(t.titulo)}</strong><small>${esc(t.responsavel || "Usuário")} • ${esc(t.projetoNome || "Sem projeto")} • ${fmtData(t.prazo)}</small></div><div class="ux-list-actions"><span class="ux-pill ${prioClass(t.prioridade)}">${fmt(t.prioridade)}</span><button class="btn-secondary" onclick="abrirTarefaUx(${t.id})">Abrir</button></div></div>`).join("")}</div>`;
    }

    function calendarioReferenciaAtual(){
        const hoje = dataHoje();
        if (window.uxCalendarioAno === undefined || window.uxCalendarioMes === undefined) {
            window.uxCalendarioAno = hoje.getFullYear();
            window.uxCalendarioMes = hoje.getMonth();
        }
        return new Date(Number(window.uxCalendarioAno), Number(window.uxCalendarioMes), 1);
    }

    function calendarioPickerHTML(referencia){
        const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
        const anoAtual = dataHoje().getFullYear();
        const anoRef = referencia.getFullYear();
        const inicioAno = Math.min(anoAtual - 3, anoRef - 3);
        const fimAno = Math.max(anoAtual + 5, anoRef + 5);
        const mesesOptions = meses.map((m,i)=>`<option value="${i}" ${i===referencia.getMonth()?"selected":""}>${m}</option>`).join("");
        let anosOptions = "";
        for(let ano = inicioAno; ano <= fimAno; ano++) anosOptions += `<option value="${ano}" ${ano===anoRef?"selected":""}>${ano}</option>`;
        return `<div class="ux-calendar-picker" aria-label="Escolher mês do calendário"><label>Mês <select id="uxCalendarioMesSelect" onchange="uxSelecionarMesCalendario()">${mesesOptions}</select></label><label>Ano <select id="uxCalendarioAnoSelect" onchange="uxSelecionarMesCalendario()">${anosOptions}</select></label></div>`;
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

    function getFiltrosSalvos(){ try{return JSON.parse(localStorage.getItem("vidalsystem_filtros_salvos")||"[]");}catch(e){return [];} }
    function setFiltrosSalvos(v){ localStorage.setItem("vidalsystem_filtros_salvos", JSON.stringify(v)); }
    window.uxSalvarFiltroAtual = function(){
        const nome = prompt("Nome para este filtro:", "Minhas tarefas filtradas"); if(!nome) return;
        const filtro = { id: Date.now(), nome, texto: $("uxBuscaGlobal")?.value || $("filtroTexto")?.value || "", status: $("uxFiltroStatus")?.value || $("filtroStatus")?.value || "", prioridade: $("uxFiltroPrioridade")?.value || $("filtroPrioridade")?.value || "", prazo: $("uxFiltroPrazo")?.value || $("filtroPrazo")?.value || "", criadoEm: new Date().toISOString() };
        const filtros = getFiltrosSalvos(); filtros.unshift(filtro); setFiltrosSalvos(filtros.slice(0,20));
        if(typeof mostrarToast === "function") mostrarToast("Filtro salvo.");
        renderFiltros();
    };
    window.uxAplicarFiltroSalvo = function(id){
        const f = getFiltrosSalvos().find(x=>String(x.id)===String(id)); if(!f) return;
        if($("filtroTexto")) $("filtroTexto").value = f.texto || "";
        if($("filtroStatus")) $("filtroStatus").value = f.status || "";
        if($("filtroPrioridade")) $("filtroPrioridade").value = f.prioridade || "";
        if($("filtroPrazo")) $("filtroPrazo").value = f.prazo || "";
        ["uxBuscaGlobal","uxFiltroStatus","uxFiltroPrioridade","uxFiltroPrazo"].forEach(idEl=>{ if($(idEl)) $(idEl).value = f[idEl==="uxBuscaGlobal"?"texto":idEl.replace("uxFiltro","").toLowerCase()] || ""; });
        if(typeof renderizarBoard === "function") renderizarBoard();
        abrirTabelaTarefas();
    };
    window.uxExcluirFiltroSalvo = function(id){ setFiltrosSalvos(getFiltrosSalvos().filter(f=>String(f.id)!==String(id))); renderFiltros(); };
    function renderFiltros(){
        const el = $("uxFiltrosConteudo"); if(!el) return;
        const filtros = getFiltrosSalvos();
        el.innerHTML = `<div class="ux-card"><div class="ux-card-header"><div><h3>Filtros salvos</h3><p>Guarde combinações usadas com frequência.</p></div><button class="btn-primary" onclick="uxSalvarFiltroAtual()">Salvar filtro atual</button></div>${filtros.length ? `<div class="ux-list">${filtros.map(f=>`<div class="ux-saved-filter"><div><strong>${esc(f.nome)}</strong><small>${esc([f.texto, f.status, f.prioridade, f.prazo].filter(Boolean).join(" • ") || "Sem critérios específicos")}</small></div><div class="ux-list-actions"><button class="btn-secondary" onclick="uxAplicarFiltroSalvo(${f.id})">Aplicar</button><button class="btn-delete" onclick="uxExcluirFiltroSalvo(${f.id})">Excluir</button></div></div>`).join("")}</div>` : `<div class="ux-empty">Nenhum filtro salvo ainda.</div>`}</div>`;
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
                ["📊","Relatórios","Acompanhe vencidas, responsáveis, projetos e progresso geral."],
                ["⌨️","Atalhos","Ctrl + K foca a busca. Esc fecha alguns modais."],
                ["🧭","Visualizações","Use Kanban, tabela, calendário e apresentação conforme sua rotina."],
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
            ${criarPainel("uxTabelaPanel","Visualização em lista/tabela","Tabela operacional para localizar, ordenar e abrir tarefas com mais velocidade.","uxTabelaConteudo","<button class='btn-primary' onclick='uxSalvarFiltroAtual()'>Salvar filtro</button>")}
            ${criarPainel("uxCalendarioPanel","Calendário de tarefas","Prazos em visão semanal/quinzenal para acompanhar tarefas vencidas, do dia e próximas.","uxCalendarioConteudo")}
            ${criarPainel("uxRelatoriosPanel","Relatórios","Indicadores por status, responsável, projeto, atraso e prioridade, usando os dados já carregados.","uxRelatoriosConteudo","<button class='btn-secondary' onclick='abrirModoApresentacaoGeral()'>Modo apresentação</button>")}
            ${criarPainel("uxFiltrosPanel","Filtros salvos","Salve filtros frequentes e aplique com um clique no Board ou na tabela.","uxFiltrosConteudo")}
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
            <button class="menu-item" data-page="UX_MINHA_AREA" onclick="abrirMinhaAreaUx()"><span>🏠</span> Minha área</button>
            <button class="menu-item" data-page="UX_TABELA" onclick="abrirTabelaTarefas()"><span>📋</span> Lista/Tabela</button>
            <button class="menu-item" data-page="UX_CALENDARIO" onclick="abrirCalendarioTarefas()"><span>📅</span> Calendário</button>
            <button class="menu-item" data-page="UX_RELATORIOS" onclick="abrirRelatoriosAvancados()"><span>📈</span> Relatórios</button>
            <button class="menu-item" data-page="UX_FILTROS" onclick="abrirFiltrosSalvos()"><span>⭐</span> Filtros salvos</button>
            <button class="menu-item" data-page="UX_AJUDA" onclick="abrirAjudaSistema()"><span>❔</span> Ajuda</button>
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
        const panelMap = { UX_MINHA_AREA:"uxMinhaAreaPanel", UX_TABELA:"uxTabelaPanel", UX_CALENDARIO:"uxCalendarioPanel", UX_RELATORIOS:"uxRelatoriosPanel", UX_FILTROS:"uxFiltrosPanel", UX_AJUDA:"uxAjudaPanel", UX_APRESENTACAO:"uxApresentacaoPanel" };
        $(panelMap[page])?.classList.remove("app-page-hidden");
        window.paginaAtual = page;
        renderPage(page);
    }
    function renderPage(page){
        if(page === "UX_MINHA_AREA") renderMinhaArea();
        if(page === "UX_TABELA") renderTabela();
        if(page === "UX_CALENDARIO") renderCalendario();
        if(page === "UX_RELATORIOS") renderRelatorios();
        if(page === "UX_FILTROS") renderFiltros();
        if(page === "UX_AJUDA") renderAjuda();
        if(page === "UX_APRESENTACAO") renderApresentacao();
    }

    window.uxAtualizarPaginaAtual = function(){ renderPage(window.paginaAtual || (typeof paginaAtual !== "undefined" ? paginaAtual : "")); };
    window.uxLimparFiltrosGlobais = function(){ ["uxBuscaGlobal","uxFiltroStatus","uxFiltroPrioridade","uxFiltroPrazo"].forEach(id=>{ if($(id)) $(id).value=""; }); window.uxAtualizarPaginaAtual(); };
    window.abrirMinhaAreaUx = function(){ mostrarCustom("UX_MINHA_AREA"); };
    window.abrirTabelaTarefas = function(){ mostrarCustom("UX_TABELA"); };
    window.abrirCalendarioTarefas = function(){ mostrarCustom("UX_CALENDARIO"); };
    window.abrirRelatoriosAvancados = function(){ mostrarCustom("UX_RELATORIOS"); };
    window.abrirFiltrosSalvos = function(){ mostrarCustom("UX_FILTROS"); };
    window.abrirAjudaSistema = function(){ mostrarCustom("UX_AJUDA"); };
    window.abrirModoApresentacaoGeral = function(){ mostrarCustom("UX_APRESENTACAO"); };

    function inserirAtalhosBoard(){
        const toolbar = document.querySelector(".board-toolbar"); if(!toolbar || toolbar.dataset.uxViews) return;
        toolbar.dataset.uxViews = "1";
        toolbar.insertAdjacentHTML("afterbegin", `<button class="btn-secondary" type="button" onclick="abrirTabelaTarefas()">Tabela</button><button class="btn-secondary" type="button" onclick="abrirCalendarioTarefas()">Calendário</button><button class="btn-secondary" type="button" onclick="abrirRelatoriosAvancados()">Relatórios</button>`);
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
