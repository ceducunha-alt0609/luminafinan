/* Lumina Finance - Vanilla JS PWA */
(() => {
  'use strict';

  const STORAGE_KEY = 'lumina_finance_v1';
  const LEGACY_STORAGE_KEY = 'lumina_data';
  const PIN_KEY = 'lumina_finance_pin';
  const DEFAULT_PIN = '123456';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const isoDate = (d = new Date()) => d.toISOString().slice(0,10);
  const uid = () => crypto.randomUUID ? crypto.randomUUID() : `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const iconsByType = { Banco:'landmark', Carteira:'wallet', 'Cartão de Crédito':'credit-card', Investimentos:'trending-up' };

  const Demo = {
    accounts: [
      { id: uid(), name:'Nubank Principal', type:'Banco', balance:4820.75, limit:0, color:'#8b5cf6' },
      { id: uid(), name:'Carteira Pix', type:'Carteira', balance:640.20, limit:0, color:'#22c55e' },
      { id: uid(), name:'Cartão Black', type:'Cartão de Crédito', balance:-1280.40, limit:8500, color:'#f59e0b' },
      { id: uid(), name:'Reserva Investida', type:'Investimentos', balance:18200.00, limit:0, color:'#38bdf8' }
    ],
    categories: [
      { id:'cat_food', name:'Alimentação', color:'#fb7185', icon:'utensils', subs:['Restaurante','Supermercado','Delivery'] },
      { id:'cat_home', name:'Moradia', color:'#60a5fa', icon:'home', subs:['Condomínio','Energia','Internet','Água'] },
      { id:'cat_income', name:'Receitas', color:'#34d399', icon:'circle-dollar-sign', subs:['Salário','Freelance','Rendimentos'] },
      { id:'cat_transport', name:'Transporte', color:'#f59e0b', icon:'car', subs:['Combustível','Uber','Manutenção'] },
      { id:'cat_health', name:'Saúde', color:'#a78bfa', icon:'heart-pulse', subs:['Farmácia','Consulta','Academia'] },
      { id:'cat_leisure', name:'Lazer', color:'#f472b6', icon:'sparkles', subs:['Cinema','Viagem','Assinaturas'] },
      { id:'cat_invest', name:'Investimentos', color:'#22c55e', icon:'piggy-bank', subs:['Aporte','Reserva','Renda Fixa'] }
    ]
  };

  const state = {
    data: loadData(),
    view: 'home',
    charts: {},
    deferredPrompt: null,
    filters: { search:'', type:'', category:'', account:'', tag:'', start:'', end:'' }
  };

  function loadData(){
    const saved = localStorage.getItem(STORAGE_KEY);
    if(saved) {
      try { return JSON.parse(saved); } catch {}
    }

    const legacy = migrateLegacyData();
    if (legacy) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
      return legacy;
    }
    const accountIds = Demo.accounts.map(a=>a.id);
    const now = new Date();
    const tx = [
      t(-86.50,'despesa','Alimentação','Restaurante',accountIds[0],null,-1,'Almoço executivo','trabalho,cartão',true,'nenhuma'),
      t(-312.20,'despesa','Alimentação','Supermercado',accountIds[0],null,-3,'Compra do mês','mercado,casa',true,'nenhuma'),
      t(6200,'receita','Receitas','Salário',accountIds[0],null,-5,'Salário mensal','renda',true,'mensal'),
      t(-189.90,'despesa','Lazer','Assinaturas',accountIds[2],null,-7,'Streaming e apps','assinatura',false,'mensal'),
      t(-420,'despesa','Moradia','Energia',accountIds[0],null,-9,'Conta de luz','fixo,casa',true,'mensal'),
      t(-160,'despesa','Transporte','Combustível',accountIds[1],null,-12,'Abastecimento','carro',true,'nenhuma'),
      t(800,'receita','Receitas','Freelance',accountIds[0],null,-14,'Projeto extra','renda extra',true,'nenhuma'),
      t(-250,'despesa','Saúde','Academia',accountIds[2],null,-18,'Plano mensal','saúde',true,'mensal'),
      t(-780,'despesa','Moradia','Condomínio',accountIds[0],null,-20,'Condomínio','fixo',true,'mensal'),
      t(-1200,'transferência','Investimentos','Aporte',accountIds[0],accountIds[3],-22,'Aporte reserva','investimento',true,'mensal')
    ];
    const data = {
      accounts: Demo.accounts,
      categories: Demo.categories,
      transactions: tx,
      budgets: [
        {id:uid(), category:'Alimentação', month:monthKey(), limit:1200, recurring:true},
        {id:uid(), category:'Moradia', month:monthKey(), limit:1600, recurring:true},
        {id:uid(), category:'Lazer', month:monthKey(), limit:500, recurring:true},
        {id:uid(), category:'Transporte', month:monthKey(), limit:650, recurring:true}
      ],
      goals: [
        {id:uid(), name:'Reserva de Emergência', target:30000, current:18200, date:'2026-12-31', color:'#38bdf8'},
        {id:uid(), name:'Viagem Premium', target:9000, current:2450, date:'2026-10-20', color:'#f59e0b'},
        {id:uid(), name:'Notebook novo', target:7500, current:3200, date:'2026-08-15', color:'#a78bfa'}
      ],
      history: seedHistory(),
      settings:{ theme:'auto', notifications:true }
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;

    function t(amount,type,category,sub,acc,toAcc,days,description,tags,paid,recurrence){
      const d = new Date(now); d.setDate(d.getDate()+days);
      return { id:uid(), amount, type, category, subcategory:sub, account:acc, toAccount:toAcc, date:isoDate(d), time:'09:00', description, tags, attachment:'simulado.pdf', recurrence, paid };
    }
  }

  function seedHistory(){
    const result = [];
    const today = new Date();
    let base = 18000;
    for(let i=5;i>=0;i--){
      const d = new Date(today.getFullYear(), today.getMonth()-i, 1);
      base += Math.round((Math.random()*1800)-550);
      result.push({ month: d.toISOString().slice(0,7), value: base });
    }
    return result;
  }


  function migrateLegacyData(){
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if(!raw) return null;

    try {
      const legacy = JSON.parse(raw);
      const now = new Date();

      const migratedAccounts = (legacy.accounts || []).map(a => ({
        id: String(a.id || uid()),
        name: a.name || 'Conta importada',
        type: a.type === 'investimento' ? 'Investimentos' : a.type === 'carteira' ? 'Carteira' : a.type === 'cartao' ? 'Cartão de Crédito' : 'Banco',
        balance: Number(a.balance || 0),
        limit: Number(a.limit || 0),
        color: a.color || '#f59e0b'
      }));

      const categoryNames = new Set(Demo.categories.map(c => c.name));
      const migratedTransactions = (legacy.transactions || []).map(t => {
        const type = t.type === 'income' ? 'receita' : t.type === 'expense' ? 'despesa' : (t.type || 'despesa');
        const category = categoryNames.has(t.category) ? t.category : (type === 'receita' ? 'Receitas' : 'Alimentação');
        return {
          id: String(t.id || uid()),
          amount: Number(t.amount || 0),
          type,
          category,
          subcategory: t.subcategory || '',
          account: String(t.account || t.accountId || migratedAccounts[0]?.id || ''),
          toAccount: t.toAccount ? String(t.toAccount) : null,
          date: t.date || isoDate(now),
          time: t.time || '09:00',
          description: t.description || 'Transação importada',
          tags: Array.isArray(t.tags) ? t.tags.join(',') : (t.tags || ''),
          attachment: t.attachment || 'importado.json',
          recurrence: t.recurrence || 'nenhuma',
          paid: t.paid !== false
        };
      });

      const migratedBudgets = (legacy.budgets || []).map(b => ({
        id: String(b.id || uid()),
        category: categoryNames.has(b.category) ? b.category : 'Alimentação',
        month: b.month || monthKey(),
        limit: Number(b.limit || b.amount || 0),
        recurring: b.recurring !== false
      }));

      const migratedGoals = (legacy.goals || []).map(g => ({
        id: String(g.id || uid()),
        name: g.name || 'Meta importada',
        target: Number(g.target || 0),
        current: Number(g.current || 0),
        date: g.date || '2026-12-31',
        color: g.color || '#f6d17a'
      }));

      if (legacy.pin && !localStorage.getItem(PIN_KEY)) {
        localStorage.setItem(PIN_KEY, btoa(String(legacy.pin)));
      }

      return {
        accounts: migratedAccounts.length ? migratedAccounts : Demo.accounts,
        categories: Demo.categories,
        transactions: migratedTransactions,
        budgets: migratedBudgets,
        goals: migratedGoals,
        history: seedHistory(),
        settings:{ theme:'auto', notifications:true }
      };
    } catch (err) {
      console.warn('[Lumina] Falha ao migrar lumina_data:', err);
      return null;
    }
  }

  function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data)); }

  function monthKey(date = new Date()){ return date.toISOString().slice(0,7); }
  function isThisMonth(tx){ return tx.date?.slice(0,7) === monthKey(); }
  function account(id){ return state.data.accounts.find(a=>a.id===id); }
  function cat(name){ return state.data.categories.find(c=>c.name===name); }

  const Finance = {
    totalBalance(){ return state.data.accounts.reduce((s,a)=>s+Number(a.balance||0),0); },
    accountsBalance(){ return state.data.accounts.filter(a=>a.type!=='Investimentos').reduce((s,a)=>s+Number(a.balance||0),0); },
    invested(){ return state.data.accounts.filter(a=>a.type==='Investimentos').reduce((s,a)=>s+Number(a.balance||0),0); },
    monthIncome(){ return state.data.transactions.filter(t=>isThisMonth(t)&&t.type==='receita').reduce((s,t)=>s+Math.abs(Number(t.amount)),0); },
    monthExpense(){ return state.data.transactions.filter(t=>isThisMonth(t)&&t.type==='despesa').reduce((s,t)=>s+Math.abs(Number(t.amount)),0); },
    expenseByCategory(month = monthKey()){
      const map = {};
      state.data.transactions.filter(t=>t.type==='despesa' && t.date.slice(0,7)===month).forEach(t => map[t.category]=(map[t.category]||0)+Math.abs(Number(t.amount)));
      return map;
    },
    filteredTransactions(){
      return state.data.transactions.filter(tx => {
        const f = state.filters;
        const hay = `${tx.description} ${tx.tags} ${tx.category} ${tx.subcategory}`.toLowerCase();
        return (!f.search || hay.includes(f.search.toLowerCase()))
          && (!f.type || tx.type===f.type)
          && (!f.category || tx.category===f.category)
          && (!f.account || tx.account===f.account || tx.toAccount===f.account)
          && (!f.tag || (tx.tags||'').toLowerCase().includes(f.tag.toLowerCase()))
          && (!f.start || tx.date >= f.start)
          && (!f.end || tx.date <= f.end);
      }).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
    }
  };

  const UI = {
    init(){
      initTheme();
      bindNav();
      bindActions();
      checkPin();
      registerPWA();
      setTimeout(()=> $('#splash')?.remove(), 850);
      renderAll();
      console.log('%cLumina Finance carregado com sucesso ✨', 'color:#fbbf24; font-weight:900');
    },
    toast(msg, type='ok'){
      const el = document.createElement('div');
      el.className = `glass-card rounded-2xl px-4 py-3 text-sm shadow-glass border ${type==='error'?'border-rose-300/30':'border-emerald-300/20'}`;
      el.innerHTML = `<div class="flex items-center gap-2"><i data-lucide="${type==='error'?'circle-alert':'sparkles'}"></i><span>${msg}</span></div>`;
      $('#toastHost').appendChild(el);
      lucide?.createIcons();
      setTimeout(()=>{ el.style.opacity='0'; el.style.transform='translateY(-8px)'; setTimeout(()=>el.remove(),250); }, 2800);
    },
    setView(view){
      state.view = view;
      $$('.view').forEach(v=>v.classList.remove('active'));
      $(`#view-${view}`)?.classList.add('active');
      $$('.nav-item,.bottom-item').forEach(b=>b.classList.toggle('active', b.dataset.view===view));
      $('#viewTitle').textContent = ({home:'Dashboard',transactions:'Transações',budgets:'Orçamentos',reports:'Relatórios',goals:'Metas',accounts:'Contas',more:'Mais'})[view] || 'Lumina';
      $('#sidebar')?.classList.remove('open');
      renderAll();
      window.scrollTo({top:0, behavior:'smooth'});
    },
    modal(title, body, eyebrow='Lumina'){
      $('#modalTitle').textContent = title;
      $('#modalEyebrow').textContent = eyebrow;
      $('#modalBody').innerHTML = body;
      $('#modal').showModal();
      lucide?.createIcons();
    }
  };

  function bindNav(){
    $$('[data-view]').forEach(btn=>btn.addEventListener('click',()=>UI.setView(btn.dataset.view)));
    $$('[data-jump]').forEach(btn=>btn.addEventListener('click',()=>UI.setView(btn.dataset.jump)));
    $('#menuBtn').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
  }

  function bindActions(){
    $('#quickAddBtn').onclick = $('#addTransactionBtn').onclick = () => openTransactionForm();
    $('#addBudgetBtn').onclick = () => openBudgetForm();
    $('#addGoalBtn').onclick = () => openGoalForm();
    $('#addAccountBtn').onclick = () => openAccountForm();
    $('#themeBtn').onclick = toggleTheme;
    $('#lockBtn').onclick = () => { if(localStorage.getItem(PIN_KEY)) showPinGate(); else UI.toast('Defina um PIN em Mais > Segurança.'); };
    $('#savePinBtn').onclick = () => {
      const pin = $('#newPinInput').value.trim();
      if(pin.length < 4) return UI.toast('PIN precisa ter pelo menos 4 dígitos. Sugestão: 123456.', 'error');
      localStorage.setItem(PIN_KEY, btoa(pin)); $('#newPinInput').value=''; UI.toast('PIN ativado com sucesso.');
    };
    $('#disablePinBtn').onclick = () => { localStorage.removeItem(PIN_KEY); UI.toast('Proteção por PIN desativada.'); };
    $('#simulateNotifyBtn').onclick = () => UI.toast('Push simulado: orçamento de Alimentação perto do limite.');
    $('#exportJsonBtn').onclick = exportJson;
    $('#exportCsvBtn').onclick = exportCsv;
    $('#importJsonInput').onchange = importJson;

    ['searchInput','typeFilter','categoryFilter','accountFilter','tagFilter','startDateFilter','endDateFilter'].forEach(id=>{
      $(`#${id}`)?.addEventListener('input', updateFilters);
      $(`#${id}`)?.addEventListener('change', updateFilters);
    });
    $('#clearFiltersBtn').onclick = () => {
      ['searchInput','typeFilter','categoryFilter','accountFilter','tagFilter','startDateFilter','endDateFilter'].forEach(id=> $(`#${id}`).value='');
      updateFilters();
    };

    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault(); state.deferredPrompt = e; $('#installBtn').classList.remove('hidden');
    });
    $('#installBtn').onclick = async () => {
      if(!state.deferredPrompt) return UI.toast('Instalação será exibida quando o navegador liberar.');
      state.deferredPrompt.prompt(); await state.deferredPrompt.userChoice; state.deferredPrompt = null;
    };
  }

  function updateFilters(){
    state.filters = {
      search: $('#searchInput').value, type: $('#typeFilter').value, category: $('#categoryFilter').value,
      account: $('#accountFilter').value, tag: $('#tagFilter').value, start: $('#startDateFilter').value, end: $('#endDateFilter').value
    };
    renderTransactions();
  }

  function renderAll(){
    populateSelects();
    renderDashboard();
    renderTransactions();
    renderBudgets();
    renderReports();
    renderGoals();
    renderAccounts();
    renderMore();
    lucide?.createIcons();
  }

  function renderDashboard(){
    const income = Finance.monthIncome(), expense = Finance.monthExpense(), balance = income-expense;
    $('#totalBalance').textContent = brl(Finance.totalBalance());
    $('#accountsBalance').textContent = brl(Finance.accountsBalance());
    $('#investedBalance').textContent = brl(Finance.invested());
    $('#monthlyBalance').textContent = brl(balance);
    $('#monthIncome').textContent = brl(income);
    $('#monthExpense').textContent = brl(expense);
    $('#monthResult').textContent = brl(balance);
    $('#balanceDelta').textContent = `${balance>=0?'+':''}${((balance/(income||1))*100).toFixed(1)}% no mês atual`;
    $('#healthScore').textContent = Math.max(38, Math.min(96, Math.round(70 + (balance/300))));

    $('#accountCards').innerHTML = state.data.accounts.map(a=>`
      <article class="account-card relative overflow-hidden">
        <div class="absolute inset-x-0 top-0 h-1" style="background:${a.color}"></div>
        <div class="flex items-center justify-between">
          <div class="h-11 w-11 rounded-2xl flex items-center justify-center" style="background:${a.color}22;border:1px solid ${a.color}55"><i data-lucide="${iconsByType[a.type]||'wallet'}"></i></div>
          <span class="badge">${a.type}</span>
        </div>
        <h3 class="mt-4 font-black">${a.name}</h3>
        <p class="mt-2 text-2xl font-black">${brl(a.balance)}</p>
        ${a.limit?`<p class="mt-1 text-sm text-slate-400">Limite: ${brl(a.limit)}</p>`:''}
      </article>`).join('');

    const latest = [...state.data.transactions].sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time)).slice(0,5);
    $('#latestTransactions').innerHTML = latest.map(txRowMini).join('') || empty('Sem transações.');

    const byCat = Finance.expenseByCategory();
    const maxCat = Object.entries(byCat).sort((a,b)=>b[1]-a[1])[0];
    $('#insightsList').innerHTML = [
      maxCat ? insight('flame', `Maior categoria do mês: <b>${maxCat[0]}</b> com ${brl(maxCat[1])}.`) : insight('sparkles','Ainda não há gastos no mês.'),
      balance < 0 ? insight('triangle-alert', `Seu balanço mensal está negativo em <b>${brl(Math.abs(balance))}</b>.`) : insight('circle-check', `Balanço positivo de <b>${brl(balance)}</b>. Excelente.`),
      insight('calendar-clock', `${state.data.transactions.filter(t=>t.recurrence!=='nenhuma').length} recorrências configuradas.`)
    ].join('');

    renderChart('categoryPie', 'doughnut', {
      labels:Object.keys(byCat).length?Object.keys(byCat):['Sem dados'],
      datasets:[{ data:Object.values(byCat).length?Object.values(byCat):[1], borderWidth:0 }]
    }, { plugins:{legend:{position:'bottom', labels:{color:chartText()}}}, cutout:'62%' });

    renderChart('wealthLine', 'line', {
      labels: state.data.history.map(h=>h.month),
      datasets:[{ label:'Patrimônio', data:state.data.history.map(h=>h.value), tension:.42, fill:true }]
    }, lineOpts());
  }

  function txRowMini(t){
    const c = cat(t.category);
    return `<div class="tx-row flex items-center gap-3">
      <div class="h-11 w-11 shrink-0 rounded-2xl flex items-center justify-center" style="background:${c?.color||'#888'}22;border:1px solid ${c?.color||'#888'}55"><i data-lucide="${c?.icon||'circle'}"></i></div>
      <div class="min-w-0 flex-1"><p class="font-black truncate">${t.description}</p><p class="text-sm text-slate-400 truncate">${t.category} • ${t.date}</p></div>
      <strong class="${t.type==='receita'?'amount-income':t.type==='despesa'?'amount-expense':'amount-transfer'}">${brl(t.type==='despesa'?-Math.abs(t.amount):Math.abs(t.amount))}</strong>
    </div>`;
  }

  function renderTransactions(){
    const list = $('#transactionsList');
    if(!list) return;
    const txs = Finance.filteredTransactions();
    list.innerHTML = txs.map(t=>{
      const c = cat(t.category), a = account(t.account);
      return `<article class="tx-row">
        <div class="flex flex-col sm:flex-row sm:items-center gap-3">
          <div class="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0" style="background:${c?.color||'#888'}22;border:1px solid ${c?.color||'#888'}55"><i data-lucide="${c?.icon||'circle'}"></i></div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="font-black">${t.description}</h3>
              <span class="badge">${t.paid?'pago':'pendente'}</span>
              <span class="badge">${t.recurrence}</span>
            </div>
            <p class="mt-1 text-sm text-slate-400">${t.category} → ${t.subcategory || 'sem sub'} • ${a?.name || 'Conta'} • ${t.date} ${t.time}</p>
            <p class="mt-2 text-xs text-slate-500">Tags: ${t.tags || '—'} • Anexo: ${t.attachment || 'simulado'}</p>
          </div>
          <div class="sm:text-right">
            <p class="text-xl font-black ${t.type==='receita'?'amount-income':t.type==='despesa'?'amount-expense':'amount-transfer'}">${brl(t.type==='despesa'?-Math.abs(t.amount):Math.abs(t.amount))}</p>
            <div class="mt-2 flex flex-wrap gap-2 sm:justify-end">
              <button class="icon-btn" title="Pago/pendente" data-action="togglePaid" data-id="${t.id}"><i data-lucide="check-check"></i></button>
              <button class="icon-btn" title="Editar" data-action="editTx" data-id="${t.id}"><i data-lucide="pencil"></i></button>
              <button class="icon-btn" title="Duplicar" data-action="dupTx" data-id="${t.id}"><i data-lucide="copy"></i></button>
              <button class="icon-btn" title="Excluir" data-action="delTx" data-id="${t.id}"><i data-lucide="trash-2"></i></button>
            </div>
          </div>
        </div>
      </article>`;
    }).join('') || empty('Nenhuma transação encontrada.');
    list.onclick = handleTransactionActions;
    lucide?.createIcons();
  }

  function handleTransactionActions(e){
    const btn = e.target.closest('[data-action]');
    if(!btn) return;
    const tx = state.data.transactions.find(t=>t.id===btn.dataset.id);
    if(!tx) return;
    if(btn.dataset.action==='editTx') openTransactionForm(tx);
    if(btn.dataset.action==='togglePaid'){ tx.paid=!tx.paid; save(); renderAll(); UI.toast(tx.paid?'Marcada como paga.':'Marcada como pendente.'); }
    if(btn.dataset.action==='dupTx'){ state.data.transactions.unshift({...tx,id:uid(),date:isoDate(),description:tx.description+' cópia'}); save(); renderAll(); UI.toast('Transação duplicada.'); }
    if(btn.dataset.action==='delTx'){ state.data.transactions = state.data.transactions.filter(t=>t.id!==tx.id); save(); renderAll(); UI.toast('Transação excluída.'); }
  }

  function openTransactionForm(tx=null){
    const isEdit = !!tx;
    UI.modal(isEdit?'Editar transação':'Nova transação', `
      <div class="form-grid">
        <input id="f_amount" type="number" step="0.01" class="input-premium" placeholder="Valor" value="${Math.abs(tx?.amount||'')}">
        <select id="f_type" class="input-premium"><option>receita</option><option>despesa</option><option>transferência</option></select>
        <select id="f_category" class="input-premium">${state.data.categories.map(c=>`<option>${c.name}</option>`).join('')}</select>
        <input id="f_subcategory" class="input-premium" placeholder="Subcategoria" value="${tx?.subcategory||''}">
        <select id="f_account" class="input-premium">${state.data.accounts.map(a=>`<option value="${a.id}">${a.name}</option>`).join('')}</select>
        <select id="f_toAccount" class="input-premium"><option value="">Conta destino</option>${state.data.accounts.map(a=>`<option value="${a.id}">${a.name}</option>`).join('')}</select>
        <input id="f_date" type="date" class="input-premium" value="${tx?.date||isoDate()}">
        <input id="f_time" type="time" class="input-premium" value="${tx?.time||'09:00'}">
        <input id="f_description" class="input-premium full" placeholder="Descrição" value="${tx?.description||''}">
        <input id="f_tags" class="input-premium" placeholder="Tags separadas por vírgula" value="${tx?.tags||''}">
        <input id="f_attachment" class="input-premium" placeholder="Anexo simulado" value="${tx?.attachment||'recibo-simulado.pdf'}">
        <select id="f_recurrence" class="input-premium"><option>nenhuma</option><option>semanal</option><option>quinzenal</option><option>mensal</option><option>anual</option></select>
        <label class="full flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10"><input id="f_paid" type="checkbox" ${tx?.paid!==false?'checked':''}> Pago</label>
        <button id="saveTxBtn" type="button" class="btn-primary full">${isEdit?'Salvar alterações':'Adicionar transação'}</button>
      </div>`, 'Transações');
    $('#f_type').value = tx?.type || 'despesa';
    $('#f_category').value = tx?.category || state.data.categories[0].name;
    $('#f_account').value = tx?.account || state.data.accounts[0].id;
    $('#f_toAccount').value = tx?.toAccount || '';
    $('#f_recurrence').value = tx?.recurrence || 'nenhuma';
    $('#saveTxBtn').onclick = () => {
      const type = $('#f_type').value;
      const amount = Math.abs(Number($('#f_amount').value||0)) * (type==='despesa' ? -1 : 1);
      const item = {
        id: tx?.id || uid(), amount, type, category:$('#f_category').value, subcategory:$('#f_subcategory').value,
        account:$('#f_account').value, toAccount:$('#f_toAccount').value, date:$('#f_date').value, time:$('#f_time').value,
        description:$('#f_description').value || 'Transação sem descrição', tags:$('#f_tags').value, attachment:$('#f_attachment').value,
        recurrence:$('#f_recurrence').value, paid:$('#f_paid').checked
      };
      if(isEdit) Object.assign(tx,item); else state.data.transactions.unshift(item);
      applyTransactionToAccounts(item, isEdit ? null : 'new');
      save(); $('#modal').close(); renderAll(); UI.toast(isEdit?'Transação atualizada.':'Transação adicionada.');
    };
  }

  function applyTransactionToAccounts(tx){
    // Ajuste simplificado para novas transações. Em produção, recalcular saldos por ledger completo.
    const a = account(tx.account);
    if(!a) return;
    if(tx.type==='transferência' && tx.toAccount){
      a.balance -= Math.abs(tx.amount);
      const dest = account(tx.toAccount); if(dest) dest.balance += Math.abs(tx.amount);
    } else {
      a.balance += Number(tx.amount);
    }
  }

  function renderBudgets(){
    const el = $('#budgetsGrid'); if(!el) return;
    const expenses = Finance.expenseByCategory();
    el.innerHTML = state.data.budgets.map(b=>{
      const spent = expenses[b.category] || 0, pct = Math.round((spent / (b.limit||1))*100), c = cat(b.category);
      return `<article class="budget-card">
        <div class="flex items-center justify-between">
          <div class="h-12 w-12 rounded-2xl flex items-center justify-center" style="background:${c?.color}22;border:1px solid ${c?.color}55"><i data-lucide="${c?.icon||'wallet'}"></i></div>
          <span class="badge">${b.recurring?'recorrente':'mensal'}</span>
        </div>
        <h3 class="mt-4 font-black text-lg">${b.category}</h3>
        <p class="text-sm text-slate-400">${brl(spent)} de ${brl(b.limit)}</p>
        <div class="progress mt-4"><span style="width:${Math.min(pct,100)}%"></span></div>
        <div class="mt-3 flex items-center justify-between"><b class="${pct>100?'amount-expense':''}">${pct}%</b><span class="text-sm text-slate-400">${pct>100?'Extrapolado':'Controlado'}</span></div>
      </article>`;
    }).join('') || empty('Nenhum orçamento.');
    lucide?.createIcons();
  }

  function openBudgetForm(){
    UI.modal('Novo orçamento', `
      <div class="form-grid">
        <select id="b_category" class="input-premium full">${state.data.categories.map(c=>`<option>${c.name}</option>`).join('')}</select>
        <input id="b_limit" type="number" class="input-premium" placeholder="Limite mensal">
        <input id="b_month" type="month" class="input-premium" value="${monthKey()}">
        <label class="full flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10"><input id="b_recurring" type="checkbox" checked> Recorrente</label>
        <button id="saveBudget" type="button" class="btn-primary full">Criar orçamento</button>
      </div>`, 'Budgets');
    $('#saveBudget').onclick = () => {
      state.data.budgets.push({id:uid(), category:$('#b_category').value, limit:Number($('#b_limit').value||0), month:$('#b_month').value, recurring:$('#b_recurring').checked});
      save(); $('#modal').close(); renderAll(); UI.toast('Orçamento criado.');
    };
  }

  function renderGoals(){
    const el = $('#goalsGrid'); if(!el) return;
    el.innerHTML = state.data.goals.map(g=>{
      const pct = Math.round((g.current/(g.target||1))*100);
      return `<article class="goal-card">
        <div class="flex items-center justify-between"><div class="h-12 w-12 rounded-2xl flex items-center justify-center" style="background:${g.color}22;border:1px solid ${g.color}55"><i data-lucide="target"></i></div><span class="badge">${g.date}</span></div>
        <h3 class="mt-4 font-black text-lg">${g.name}</h3>
        <p class="text-sm text-slate-400">${brl(g.current)} de ${brl(g.target)}</p>
        <div class="progress mt-4"><span style="width:${Math.min(pct,100)}%;background:${g.color}"></span></div>
        <b class="block mt-3">${pct}% concluído</b>
      </article>`;
    }).join('');
  }

  function openGoalForm(){
    UI.modal('Nova meta', `
      <div class="form-grid">
        <input id="g_name" class="input-premium full" placeholder="Nome da meta">
        <input id="g_target" type="number" class="input-premium" placeholder="Valor alvo">
        <input id="g_current" type="number" class="input-premium" placeholder="Valor atual">
        <input id="g_date" type="date" class="input-premium" value="${isoDate()}">
        <input id="g_color" type="color" class="input-premium" value="#f6d17a">
        <button id="saveGoal" type="button" class="btn-primary full">Criar meta</button>
      </div>`, 'Metas');
    $('#saveGoal').onclick = () => {
      state.data.goals.push({id:uid(), name:$('#g_name').value||'Nova meta', target:Number($('#g_target').value||0), current:Number($('#g_current').value||0), date:$('#g_date').value, color:$('#g_color').value});
      save(); $('#modal').close(); renderAll(); UI.toast('Meta criada.');
    };
  }

  function renderAccounts(){
    const el = $('#accountsGrid'); if(!el) return;
    el.innerHTML = state.data.accounts.map(a=>`
      <article class="account-card">
        <div class="flex items-center justify-between">
          <div class="h-12 w-12 rounded-2xl flex items-center justify-center" style="background:${a.color}22;border:1px solid ${a.color}55"><i data-lucide="${iconsByType[a.type]||'wallet'}"></i></div>
          <span class="badge">${a.type}</span>
        </div>
        <h3 class="mt-4 font-black text-lg">${a.name}</h3>
        <p class="mt-2 text-3xl font-black">${brl(a.balance)}</p>
        <p class="mt-1 text-sm text-slate-400">${a.limit?`Limite: ${brl(a.limit)}`:'Sem limite'}</p>
      </article>`).join('');
  }

  function openAccountForm(){
    UI.modal('Nova conta', `
      <div class="form-grid">
        <input id="a_name" class="input-premium full" placeholder="Nome da conta">
        <select id="a_type" class="input-premium"><option>Banco</option><option>Cartão de Crédito</option><option>Carteira</option><option>Investimentos</option></select>
        <input id="a_balance" type="number" class="input-premium" placeholder="Saldo atual">
        <input id="a_limit" type="number" class="input-premium" placeholder="Limite">
        <input id="a_color" type="color" class="input-premium" value="#f6d17a">
        <button id="saveAccount" type="button" class="btn-primary full">Criar conta</button>
      </div>`, 'Contas');
    $('#saveAccount').onclick = () => {
      state.data.accounts.push({id:uid(), name:$('#a_name').value||'Nova conta', type:$('#a_type').value, balance:Number($('#a_balance').value||0), limit:Number($('#a_limit').value||0), color:$('#a_color').value});
      save(); $('#modal').close(); renderAll(); UI.toast('Conta criada.');
    };
  }

  function renderReports(){
    const months = [...new Set(state.data.transactions.map(t=>t.date.slice(0,7)).concat([monthKey()]))].sort().reverse();
    $('#reportMonth').innerHTML = months.map(m=>`<option>${m}</option>`).join('');
    const m = $('#reportMonth').value || monthKey();
    const txs = state.data.transactions.filter(t=>t.date.slice(0,7)===m);
    const inc = txs.filter(t=>t.type==='receita').reduce((s,t)=>s+Math.abs(t.amount),0);
    const exp = txs.filter(t=>t.type==='despesa').reduce((s,t)=>s+Math.abs(t.amount),0);

    renderChart('incomeExpenseChart','bar',{labels:['Receitas','Despesas','Balanço'],datasets:[{label:m,data:[inc,exp,inc-exp]}]}, lineOpts(false));

    const last6 = [];
    for(let i=5;i>=0;i--){ const d = new Date(); d.setMonth(d.getMonth()-i); last6.push(d.toISOString().slice(0,7)); }
    renderChart('monthComparisonChart','line',{labels:last6,datasets:[
      {label:'Receitas',data:last6.map(mm=>sumMonth(mm,'receita')),tension:.35},
      {label:'Despesas',data:last6.map(mm=>sumMonth(mm,'despesa')),tension:.35}
    ]}, lineOpts());

    const top = txs.filter(t=>t.type==='despesa').sort((a,b)=>Math.abs(b.amount)-Math.abs(a.amount)).slice(0,5);
    $('#topExpenses').innerHTML = top.map(t=>txRowMini(t)).join('') || empty('Sem gastos no período.');

    const avgBalance = last6.map(mm=>sumMonth(mm,'receita')-sumMonth(mm,'despesa')).reduce((a,b)=>a+b,0)/6;
    $('#forecastBox').innerHTML = `<div class="text-4xl font-black ${avgBalance>=0?'amount-income':'amount-expense'}">${brl(Finance.totalBalance()+avgBalance*3)}</div>
      <p class="mt-3 text-sm text-slate-400">Projeção simples para 90 dias considerando a média líquida dos últimos 6 meses: ${brl(avgBalance)}/mês.</p>`;
  }

  function sumMonth(mm,type){ return state.data.transactions.filter(t=>t.date.slice(0,7)===mm && t.type===type).reduce((s,t)=>s+Math.abs(t.amount),0); }

  function renderMore(){
    $('#categoryManager').innerHTML = state.data.categories.map(c=>`
      <div class="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
        <span class="h-9 w-9 rounded-xl flex items-center justify-center" style="background:${c.color}22;border:1px solid ${c.color}55"><i data-lucide="${c.icon}"></i></span>
        <div class="min-w-0"><b>${c.name}</b><p class="text-xs text-slate-400 truncate">${c.subs.join(' • ')}</p></div>
      </div>`).join('');
    $('#recurrencesList').innerHTML = state.data.transactions.filter(t=>t.recurrence!=='nenhuma').map(t=>`
      <div class="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
        <span><b>${t.description}</b><p class="text-xs text-slate-400">${t.recurrence} • ${brl(Math.abs(t.amount))}</p></span>
        <span class="badge">${t.type}</span>
      </div>`).join('') || empty('Nenhuma recorrência.');
  }

  function populateSelects(){
    const catSel = $('#categoryFilter'), accSel = $('#accountFilter');
    if(catSel && catSel.options.length <= 1) catSel.innerHTML = '<option value="">Categoria</option>' + state.data.categories.map(c=>`<option>${c.name}</option>`).join('');
    if(accSel && accSel.options.length <= 1) accSel.innerHTML = '<option value="">Conta</option>' + state.data.accounts.map(a=>`<option value="${a.id}">${a.name}</option>`).join('');
  }

  function renderChart(id,type,data,options){
    const canvas = document.getElementById(id); if(!canvas || !window.Chart) return;
    if(state.charts[id]) state.charts[id].destroy();
    state.charts[id] = new Chart(canvas, { type, data, options:{ responsive:true, maintainAspectRatio:false, ...options } });
  }
  function chartText(){ return document.documentElement.classList.contains('light') ? '#334155' : '#cbd5e1'; }
  function lineOpts(showLegend=true){
    return { plugins:{legend:{display:showLegend, labels:{color:chartText()}}}, scales:{x:{ticks:{color:chartText()},grid:{color:'rgba(148,163,184,.12)'}}, y:{ticks:{color:chartText()},grid:{color:'rgba(148,163,184,.12)'}}} };
  }
  function insight(icon, txt){ return `<div class="insight-card flex gap-3"><i data-lucide="${icon}" class="text-amber-200 shrink-0"></i><p class="text-sm text-slate-300">${txt}</p></div>`; }
  function empty(txt){ return `<div class="glass-card rounded-2xl p-5 text-center text-slate-400">${txt}</div>`; }

  function initTheme(){
    const saved = localStorage.getItem('lumina_theme');
    const prefersLight = matchMedia('(prefers-color-scheme: light)').matches;
    document.documentElement.classList.toggle('light', saved ? saved==='light' : prefersLight);
  }
  function toggleTheme(){
    const light = !document.documentElement.classList.contains('light');
    document.documentElement.classList.toggle('light', light);
    localStorage.setItem('lumina_theme', light?'light':'dark');
    renderAll();
  }

  function checkPin(){ if(localStorage.getItem(PIN_KEY)) showPinGate(); }
  function showPinGate(){ $('#pinGate').classList.remove('hidden'); $('#pinInput').focus(); }
  $('#unlockBtn')?.addEventListener('click', unlock);
  $('#fakeBioBtn')?.addEventListener('click', unlockBio);
  $('#pinInput')?.addEventListener('keydown', e=>{ if(e.key==='Enter') unlock(); });
  function unlock(){
    const ok = btoa($('#pinInput').value) === localStorage.getItem(PIN_KEY);
    if(ok){ $('#pinGate').classList.add('hidden'); $('#pinInput').value=''; }
    else { $('#pinError').textContent='PIN incorreto.'; $('#pinError').classList.remove('hidden'); }
  }
  function unlockBio(){ $('#pinGate').classList.add('hidden'); UI.toast('Biometria simulada aprovada.'); }

  function exportJson(){
    download('lumina-finance-backup.json', JSON.stringify(state.data,null,2), 'application/json');
  }
  function exportCsv(){
    const headers = ['data','hora','tipo','valor','categoria','subcategoria','conta','descricao','tags','pago','recorrencia'];
    const rows = state.data.transactions.map(t=>[t.date,t.time,t.type,t.amount,t.category,t.subcategory,account(t.account)?.name||'',t.description,t.tags,t.paid,t.recurrence]);
    download('lumina-transacoes.csv', [headers, ...rows].map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n'), 'text/csv');
  }
  function download(name, content, type){
    const blob = new Blob([content], {type}); const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href);
  }
  function importJson(e){
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = () => { try { state.data = JSON.parse(reader.result); save(); renderAll(); UI.toast('Dados importados.'); } catch { UI.toast('JSON inválido.', 'error'); } };
    reader.readAsText(file);
  }

  function registerPWA(){
    if('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').then(()=>console.log('[Lumina] Service Worker registrado')).catch(console.warn);
    }
  }

  document.addEventListener('DOMContentLoaded', UI.init);
})(); 
