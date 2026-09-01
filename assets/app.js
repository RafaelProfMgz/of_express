/* ================================================================
   OF — Ofício de Diárias · camada compartilhada (MVP / localStorage)
   ================================================================
   Tudo é persistido em localStorage. Nenhum backend, nenhum
   pagamento real — o checkout é uma simulação para o MVP.
   ================================================================ */
(function () {
  'use strict';

  const K = {
    users:    'diarias_users',
    sessao:   'diarias_logged',
    diarias:  'diarias_vagas',
    contatos: 'diarias_contatos',   // leads enviados pelas páginas de detalhe
    mensagens:'diarias_mensagens',  // mensagens para a administradora
    pagtos:   'diarias_pagamentos', // pagamentos simulados
    seed:     'diarias_seed',
    cookies:  'diarias_cookies'
  };

  /* ---------- Config do site ---------- */
  const CFG = {
    nome: 'Ofício de Diárias',
    sigla: 'OF',
    slogan: 'Grupo de diárias administrado',
    whatsappAdmin: '5511000000000',
    emailAdmin: 'contato@oficiodediarias.com.br',
    pixAdmin: 'contato@oficiodediarias.com.br',
    admin: { user: 'admin', pass: 'admin', nome: 'Administradora' }
  };

  /* ---------- Utilitários ---------- */
  function esc(t) {
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function brl(n) {
    return 'R$ ' + (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function taxa(valor) {
    const v = Number(valor) || 0;
    return v <= 150 ? 20 : Math.max(10, v * 0.10);
  }
  function ler(chave, padrao) {
    try {
      const raw = localStorage.getItem(chave);
      if (raw === null || raw === 'undefined') return padrao;
      const val = JSON.parse(raw);
      return val === null ? padrao : val;
    } catch (e) { return padrao; }
  }
  function gravar(chave, valor) {
    try { localStorage.setItem(chave, JSON.stringify(valor)); return true; }
    catch (e) { alert('Não foi possível salvar os dados neste navegador.'); return false; }
  }
  function digitos(t) { return String(t || '').replace(/\D/g, ''); }
  function waNumero(tel) {
    let d = digitos(tel);
    if (!d) return '';
    if (d.length <= 11) d = '55' + d;
    return d;
  }
  function dataBR(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d) ? '—' : d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  function iniciais(nome) {
    const p = String(nome || '?').trim().split(/\s+/);
    return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  }
  function idNovo() { return Date.now() + Math.floor(Math.random() * 1000); }

  /* ---------- Sessão / usuários ---------- */
  function users() { return ler(K.users, []); }
  function salvarUsers(lista) { return gravar(K.users, lista); }
  function sessao() {
    const s = ler(K.sessao, null);
    return s && s.user ? s : null;
  }
  function logado() { return sessao() !== null; }
  function ehAdmin() { const s = sessao(); return !!s && s.tipo === 'admin'; }

  function abrirSessao(u) {
    gravar(K.sessao, { user: u.user, nome: u.nome || u.name || u.user, tipo: u.tipo || 'ambos' });
  }
  function sair(destino) {
    localStorage.removeItem(K.sessao);
    location.href = destino || 'index.html';
  }
  function login(user, pass) {
    const u = String(user || '').trim();
    if (!u || !pass) return { ok: false, erro: 'Informe usuário e senha.' };
    if (u.toLowerCase() === CFG.admin.user && pass === CFG.admin.pass) {
      abrirSessao({ user: CFG.admin.user, nome: CFG.admin.nome, tipo: 'admin' });
      return { ok: true, admin: true };
    }
    const achado = users().find(x =>
      x.user.toLowerCase() === u.toLowerCase() || String(x.email || '').toLowerCase() === u.toLowerCase()
    );
    if (!achado || achado.pass !== pass) return { ok: false, erro: 'Usuário ou senha incorretos.' };
    abrirSessao(achado);
    return { ok: true, usuario: achado };
  }
  /* Cadastro: cria a conta E já entra nela (requisito do MVP) */
  function cadastrar(dados) {
    const user = String(dados.user || '').trim();
    if (user.length < 3) return { ok: false, erro: 'O usuário precisa ter ao menos 3 caracteres.' };
    if (user.toLowerCase() === CFG.admin.user) return { ok: false, erro: 'Este nome de usuário é reservado.' };
    if (String(dados.pass || '').length < 4) return { ok: false, erro: 'A senha precisa ter ao menos 4 caracteres.' };
    const lista = users();
    if (lista.some(x => x.user.toLowerCase() === user.toLowerCase())) return { ok: false, erro: 'Já existe uma conta com esse usuário.' };
    if (lista.some(x => String(x.email || '').toLowerCase() === String(dados.email || '').toLowerCase())) return { ok: false, erro: 'Já existe uma conta com esse e-mail.' };
    const novo = {
      user: user,
      nome: String(dados.nome || user).trim(),
      email: String(dados.email || '').trim(),
      tel: String(dados.tel || '').trim(),
      cidade: String(dados.cidade || '').trim(),
      tipo: dados.tipo || 'ambos',
      pass: dados.pass,
      criado: new Date().toISOString()
    };
    lista.push(novo);
    if (!salvarUsers(lista)) return { ok: false, erro: 'Falha ao salvar a conta.' };
    abrirSessao(novo);                       // login automático
    return { ok: true, usuario: novo };
  }
  function usuarioAtual() {
    const s = sessao();
    if (!s) return null;
    if (s.tipo === 'admin') return { user: CFG.admin.user, nome: CFG.admin.nome, email: CFG.emailAdmin, tel: CFG.whatsappAdmin, tipo: 'admin' };
    return users().find(x => x.user === s.user) || { user: s.user, nome: s.nome, tipo: s.tipo };
  }
  function atualizarUsuario(campos) {
    const s = sessao();
    if (!s) return { ok: false, erro: 'Você não está logado.' };
    const lista = users();
    const i = lista.findIndex(x => x.user === s.user);
    if (i < 0) return { ok: false, erro: 'Conta não encontrada.' };
    Object.assign(lista[i], campos);
    if (!salvarUsers(lista)) return { ok: false, erro: 'Falha ao salvar.' };
    abrirSessao(lista[i]);
    return { ok: true, usuario: lista[i] };
  }
  function podePublicar() {
    const s = sessao();
    return !!s && (s.tipo === 'contratando' || s.tipo === 'ambos' || s.tipo === 'admin');
  }
  const LABEL_TIPO = {
    contratando: 'Contratante',
    diarista: 'Diarista',
    ambos: 'Contratante e diarista',
    admin: 'Administradora'
  };

  /* ---------- Diárias ---------- */
  const SEED = [
    { id: 1001, titulo: 'Limpeza residencial completa', tipo: 'residencial', nome: 'Ana P.', local: 'Av. Main, 450 — Centro', cidade: 'São Paulo', tel: '(11) 99999-0000',
      desc: 'Apartamento de 2 quartos, 68m². Limpeza completa: cozinha, banheiros, quartos e sala. Produtos no local.', dur: '1 dia (8h)', periodo: 'Comercial', valor: 160, destaque: true },
    { id: 1002, titulo: 'Limpeza pesada pós-obra', tipo: 'pos-obra', nome: 'Carlos M.', local: 'Rua das Flores, 120 — Jardim', cidade: 'São Paulo', tel: '(11) 98888-1111',
      desc: 'Casa de 60m² recém-reformada. Retirada de resíduos finos, vidros e pisos. Precisa de disposição para trabalho pesado.', dur: '2 dias', periodo: 'Comercial', valor: 250, destaque: true },
    { id: 1003, titulo: 'Limpeza de escritório', tipo: 'comercial', nome: 'Fernanda L.', local: 'Rua B, 78 — Zona Norte', cidade: 'São Paulo', tel: '(11) 97777-2222',
      desc: 'Escritório pequeno, 4 estações e 1 banheiro. Serviço rápido no fim do dia.', dur: '3 horas', periodo: 'Noturno', valor: 90, destaque: true },
    { id: 1004, titulo: 'Organização de closet e armários', tipo: 'organizacao', nome: 'Mariana R.', local: 'Al. Santos, 900 — Jardins', cidade: 'São Paulo', tel: '(11) 96666-3333',
      desc: 'Organização de closet, troca de estação e dobra de roupas. Trabalho detalhista.', dur: '1 dia (6h)', periodo: 'Comercial', valor: 180, destaque: false },
    { id: 1005, titulo: 'Passadoria semanal', tipo: 'passadoria', nome: 'Roberto S.', local: 'Rua Aurora, 33 — Santa Cecília', cidade: 'São Paulo', tel: '(11) 95555-4444',
      desc: 'Cesto de roupas de família de 4 pessoas. Uma vez por semana, dia flexível.', dur: '4 horas', periodo: 'Flexível', valor: 120, destaque: false }
  ];
  function diarias() {
    if (!localStorage.getItem(K.seed)) {          // popula a vitrine na 1ª visita
      const atuais = ler(K.diarias, []);
      gravar(K.diarias, atuais.length ? atuais : SEED.slice());
      localStorage.setItem(K.seed, '1');
    }
    return ler(K.diarias, []);
  }
  function salvarDiarias(lista) { return gravar(K.diarias, lista); }
  function diaria(id) {
    const n = Number(id);
    return diarias().find(d => Number(d.id) === n) || null;
  }
  function criarDiaria(d) {
    const lista = diarias();
    const nova = Object.assign({ id: idNovo(), criado: new Date().toISOString(), destaque: false }, d);
    lista.unshift(nova);
    return salvarDiarias(lista) ? nova : null;
  }
  function removerDiaria(id) {
    const n = Number(id);
    salvarDiarias(diarias().filter(d => Number(d.id) !== n));
  }
  const TIPOS = [
    ['residencial', 'Residencial'],
    ['comercial', 'Comercial'],
    ['pos-obra', 'Pós-obra'],
    ['organizacao', 'Organização'],
    ['passadoria', 'Passadoria'],
    ['outro', 'Outro']
  ];
  function labelTipo(t) { const f = TIPOS.find(x => x[0] === t); return f ? f[1] : 'Outro'; }

  /* Card de diária reutilizado na home e na listagem */
  function cardDiaria(d) {
    return `
      <article class="diaria-card">
        <div class="top">
          <div>
            <h3>${esc(d.titulo || d.desc)}</h3>
            <div class="meta">${esc(d.local)}${d.cidade ? ' · ' + esc(d.cidade) : ''}</div>
          </div>
          <div class="preco">${brl(d.valor)}<small>${esc(d.dur || '')}</small></div>
        </div>
        <p class="desc">${esc(String(d.desc || '').slice(0, 120))}${String(d.desc || '').length > 120 ? '…' : ''}</p>
        <div class="tags">
          <span class="tag accent">${esc(labelTipo(d.tipo))}</span>
          <span class="tag">Contratante: ${esc(d.nome)}</span>
          ${d.periodo ? `<span class="tag">${esc(d.periodo)}</span>` : ''}
        </div>
        <div class="acoes">
          <a href="detalhes-diaria.html?id=${encodeURIComponent(d.id)}" class="btn-small">Ver detalhes</a>
          <a href="detalhes-diaria.html?id=${encodeURIComponent(d.id)}#contato" class="btn-ghost-small">Entrar em contato</a>
        </div>
      </article>`;
  }

  /* ---------- Contatos / mensagens ---------- */
  function registrarContato(c) {
    const lista = ler(K.contatos, []);
    lista.unshift(Object.assign({ id: idNovo(), quando: new Date().toISOString() }, c));
    gravar(K.contatos, lista);
  }
  function contatos() { return ler(K.contatos, []); }
  function registrarMensagem(m) {
    const lista = ler(K.mensagens, []);
    lista.unshift(Object.assign({ id: idNovo(), quando: new Date().toISOString() }, m));
    gravar(K.mensagens, lista);
  }
  function registrarPagamento(p) {
    const lista = ler(K.pagtos, []);
    lista.unshift(Object.assign({ id: idNovo(), quando: new Date().toISOString() }, p));
    gravar(K.pagtos, lista);
  }
  function pagamentos() { return ler(K.pagtos, []); }

  /* ================================================================
     Header e footer compartilhados
     ================================================================ */
  function montarHeader(ativo) {
    const alvo = document.getElementById('of-header');
    if (!alvo) return;
    const s = sessao();
    const marca = (p) => `aria-current="${ativo === p ? 'page' : 'false'}"`;
    let direita;
    if (s) {
      direita = `
        <button class="user-btn" id="of-user-btn" aria-haspopup="true" aria-expanded="false" aria-controls="of-dropdown">
          <span class="avatar" aria-hidden="true">${esc(iniciais(s.nome || s.user))}</span>
          <span class="uname">${esc((s.nome || s.user).split(' ')[0])}</span>
          <span class="caret" aria-hidden="true">▼</span>
        </button>
        <div class="dropdown" id="of-dropdown" role="menu">
          <div class="dd-head">
            <strong>${esc(s.nome || s.user)}</strong>
            <span>${esc(LABEL_TIPO[s.tipo] || 'Usuário')}</span>
          </div>
          <a href="perfil.html" role="menuitem">Perfil</a>
          ${s.tipo === 'admin' ? '<a href="admin.html" role="menuitem">Painel admin</a>' : ''}
          <button type="button" class="sair" role="menuitem" id="of-sair">Sair</button>
        </div>`;
    } else {
      direita = `
        <a href="login.html" class="btn-small">Entrar</a>
        <a href="cadastro.html" class="btn-ghost-small">Criar</a>`;
    }
    alvo.outerHTML = `
      <header class="site-header">
        <div class="header-inner">
          <a href="index.html" class="logo-block" aria-label="${esc(CFG.sigla)} — ${esc(CFG.nome)}">
            <div class="logo-sigla" aria-hidden="true">${esc(CFG.sigla)}</div>
            <div class="logo-text">${esc(CFG.nome)}<small>Diárias com suporte</small></div>
          </a>
          <nav class="nav-center" aria-label="Navegação principal">
            <a href="index.html" ${marca('home')}>Home</a>
            <a href="diarias.html" ${marca('diarias')}>Diárias</a>
          </nav>
          <div class="nav-right">${direita}</div>
        </div>
      </header>`;

    const btn = document.getElementById('of-user-btn');
    if (btn) {
      const menu = document.getElementById('of-dropdown');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const aberto = menu.classList.toggle('show');
        btn.setAttribute('aria-expanded', aberto ? 'true' : 'false');
      });
      document.addEventListener('click', () => {
        menu.classList.remove('show');
        btn.setAttribute('aria-expanded', 'false');
      });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') menu.classList.remove('show'); });
      document.getElementById('of-sair').addEventListener('click', () => sair('index.html'));
    }
  }

  function montarFooter() {
    const alvo = document.getElementById('of-footer');
    if (!alvo) return;
    alvo.outerHTML = `
      <footer class="site-footer">
        <div class="foot-inner">
          <div class="foot-brand">
            <div class="logo-sigla" aria-hidden="true">${esc(CFG.sigla)}</div>
            <strong>${esc(CFG.nome)}</strong>
          </div>
          <p>Grupo de diárias administrado: publicação de vagas, match com diaristas e suporte da administradora do começo ao fim.</p>
          <div class="cols">
            <div>
              <h4>Navegar</h4>
              <ul>
                <li><a href="index.html">Home</a></li>
                <li><a href="diarias.html">Diárias</a></li>
                <li><a href="cadastrar-diaria.html">Publicar diária</a></li>
                <li><a href="perfil.html">Meu perfil</a></li>
              </ul>
            </div>
            <div>
              <h4>Ajuda</h4>
              <ul>
                <li><a href="contato.html">Falar com a admin</a></li>
                <li><a href="termos.html">Termos de uso</a></li>
                <li><a href="privacidade.html">Privacidade</a></li>
                <li><a href="https://wa.me/${esc(CFG.whatsappAdmin)}" target="_blank" rel="noopener">WhatsApp</a></li>
              </ul>
            </div>
          </div>
          <div class="foot-bottom">
            <span>© ${new Date().getFullYear()} ${esc(CFG.nome)}</span>
            <span>MVP — dados neste navegador</span>
          </div>
        </div>
      </footer>`;
  }

  function montarCookies() {
    if (localStorage.getItem(K.cookies)) return;
    const div = document.createElement('div');
    div.className = 'cookie-banner show';
    div.setAttribute('role', 'dialog');
    div.setAttribute('aria-label', 'Aviso de armazenamento local');
    div.innerHTML = `
      <div class="cb-inner">
        <p><strong>Armazenamento local.</strong> Guardamos login, diárias e preferências no seu navegador (localStorage). Sem cookies de terceiros.</p>
        <button type="button">Entendi</button>
      </div>`;
    div.querySelector('button').addEventListener('click', () => {
      localStorage.setItem(K.cookies, '1');
      div.remove();
    });
    document.body.appendChild(div);
  }

  /* ================================================================
     Checkout simulado: PIX, cartão de crédito e cartão de débito
     ================================================================ */
  const ICO = {
    pix: '<svg viewBox="0 0 24 24" fill="none" stroke="#32bcad" stroke-width="2" stroke-linejoin="round"><path d="M12 2.8 21.2 12 12 21.2 2.8 12z"/><path d="M8 8l8 8M16 8l-8 8" stroke-width="1.5"/></svg>',
    credito: '<svg viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/><path d="M6 15h4"/></svg>',
    debito: '<svg viewBox="0 0 24 24" fill="none" stroke="#2a2a2a" stroke-width="2" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/><path d="M15 15h3"/><circle cx="7" cy="15" r="1.4"/></svg>'
  };
  const NOME_METODO = { pix: 'PIX', credito: 'Cartão de crédito', debito: 'Cartão de débito' };

  /* pagamento.abrir({titulo, descricao, itens:[{label,valor}], onSucesso(dados), onCancelar()}) */
  const pagamento = (function () {
    let ctx = null, modal = null, box = null, cronometro = null;

    function total() { return ctx.itens.reduce((s, i) => s + (Number(i.valor) || 0), 0); }

    function abrir(opcoes) {
      ctx = Object.assign({ titulo: 'Pagamento', descricao: '', itens: [], onSucesso: null, onCancelar: null }, opcoes);
      if (!modal) {
        modal = document.createElement('div');
        modal.className = 'modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.innerHTML = '<div class="modal-box" role="document"></div>';
        modal.addEventListener('click', (e) => { if (e.target === modal) cancelar(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('show')) cancelar(); });
        document.body.appendChild(modal);
        box = modal.querySelector('.modal-box');
      }
      modal.classList.add('show');
      document.body.style.overflow = 'hidden';
      telaMetodos();
    }
    function fechar() {
      if (cronometro) { clearInterval(cronometro); cronometro = null; }
      modal.classList.remove('show');
      document.body.style.overflow = '';
    }
    function cancelar() {
      fechar();
      if (ctx && typeof ctx.onCancelar === 'function') ctx.onCancelar();
    }

    function cabecalho(passo, titulo, sub, voltar) {
      return `
        <div class="passos" aria-hidden="true"><i class="${passo >= 1 ? 'on' : ''}"></i><i class="${passo >= 2 ? 'on' : ''}"></i><i class="${passo >= 3 ? 'on' : ''}"></i></div>
        <div class="modal-head">
          <h2>${esc(titulo)}</h2>
          <button type="button" class="fechar" aria-label="Fechar" data-acao="${voltar ? 'voltar' : 'cancelar'}">${voltar ? '←' : '×'}</button>
        </div>
        <p class="modal-sub">${esc(sub)}</p>`;
    }
    function resumo() {
      return `
        <div class="resumo">
          ${ctx.itens.map(i => `<div class="lin"><span>${esc(i.label)}</span><span>${brl(i.valor)}</span></div>`).join('')}
          <div class="lin total"><span>Total</span><span>${brl(total())}</span></div>
        </div>`;
    }

    /* --- passo 1: escolha do método --- */
    function telaMetodos() {
      box.innerHTML =
        cabecalho(1, ctx.titulo, ctx.descricao || 'Escolha como quer pagar. É uma simulação — nada é cobrado.', false) +
        resumo() +
        `<div class="metodos">
          ${['pix', 'credito', 'debito'].map(m => `
            <button type="button" class="metodo" data-metodo="${m}">
              <span class="ico" aria-hidden="true">${ICO[m]}</span>
              <span class="txt">
                <strong>${NOME_METODO[m]}</strong>
                <span>${m === 'pix' ? 'Aprovação imediata' : m === 'credito' ? 'Em até 3x sem juros' : 'Debitado na hora'}</span>
              </span>
              <span class="seta" aria-hidden="true">›</span>
            </button>`).join('')}
        </div>
        <p class="small center mt1">Ambiente de demonstração · nenhum dado real é enviado</p>`;
      box.querySelectorAll('[data-metodo]').forEach(b => b.addEventListener('click', () => {
        const m = b.dataset.metodo;
        if (m === 'pix') telaPix(); else telaCartao(m);
      }));
      ligarFechar();
    }

    /* --- passo 2a: PIX --- */
    function telaPix() {
      const chave = CFG.pixAdmin;
      const copiaCola = '00020126580014BR.GOV.BCB.PIX0136' + chave +
        '5204000053039865802BR5913OFICIO DIARIAS6009SAO PAULO62070503***6304' +
        String(Math.floor(1000 + Math.random() * 8999));
      box.innerHTML =
        cabecalho(2, 'Pagar com PIX', 'Escaneie o QR Code ou copie o código abaixo.', true) +
        `<div class="pix-box">
          ${qrFake(copiaCola)}
          <div class="timer">Código válido por <strong id="pix-timer">10:00</strong></div>
          <label for="pix-copia" class="sr-only">Código PIX copia e cola</label>
          <div class="pix-chave">
            <input id="pix-copia" type="text" readonly value="${esc(copiaCola)}" />
            <button type="button" id="pix-copiar">Copiar</button>
          </div>
          <p class="small">Chave: <strong>${esc(chave)}</strong> · Recebedor: ${esc(CFG.nome)}</p>
          ${resumo()}
          <button type="button" class="btn" id="pix-pago">Já fiz o PIX</button>
          <button type="button" class="btn btn-outline" data-acao="voltar">Escolher outro método</button>
        </div>`;
      const inp = document.getElementById('pix-copia');
      document.getElementById('pix-copiar').addEventListener('click', function () {
        const botao = this;
        function aviso(copiou) {
          botao.textContent = copiou ? 'Copiado!' : 'Selecionado';
          setTimeout(() => { botao.textContent = 'Copiar'; }, 1800);
        }
        inp.focus();
        inp.select();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(inp.value).then(() => aviso(true), () => aviso(copiaLegado()));
        } else {
          aviso(copiaLegado());
        }
      });
      document.getElementById('pix-pago').addEventListener('click', () => processar('pix', { chave: chave }));
      iniciarCronometro();
      ligarFechar();
    }
    /* Fallback de cópia para navegadores sem a Clipboard API */
    function copiaLegado() {
      try { return !!(document.execCommand && document.execCommand('copy')); }
      catch (e) { return false; }
    }
    function iniciarCronometro() {
      let resta = 600;
      const el = document.getElementById('pix-timer');
      if (cronometro) clearInterval(cronometro);
      cronometro = setInterval(() => {
        resta--;
        if (!document.body.contains(el)) { clearInterval(cronometro); cronometro = null; return; }
        if (resta <= 0) { clearInterval(cronometro); cronometro = null; el.textContent = 'expirado'; return; }
        el.textContent = String(Math.floor(resta / 60)).padStart(2, '0') + ':' + String(resta % 60).padStart(2, '0');
      }, 1000);
    }
    /* QR "decorativo" gerado a partir do texto — só para a simulação */
    function qrFake(texto) {
      const n = 21, cel = 8;
      let semente = 0;
      for (let i = 0; i < texto.length; i++) semente = (semente * 31 + texto.charCodeAt(i)) % 2147483647;
      let rnd = semente || 12345;
      const prox = () => (rnd = (rnd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
      let quadrados = '';
      const marcador = (ox, oy) => {
        quadrados += `<rect x="${ox * cel}" y="${oy * cel}" width="${7 * cel}" height="${7 * cel}" fill="#2a2a2a"/>`;
        quadrados += `<rect x="${(ox + 1) * cel}" y="${(oy + 1) * cel}" width="${5 * cel}" height="${5 * cel}" fill="#fff"/>`;
        quadrados += `<rect x="${(ox + 2) * cel}" y="${(oy + 2) * cel}" width="${3 * cel}" height="${3 * cel}" fill="#2a2a2a"/>`;
      };
      const reservado = (x, y) =>
        (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        if (reservado(x, y)) continue;
        if (prox() > .5) quadrados += `<rect x="${x * cel}" y="${y * cel}" width="${cel}" height="${cel}" fill="#2a2a2a"/>`;
      }
      marcador(0, 0); marcador(n - 7, 0); marcador(0, n - 7);
      return `<svg class="pix-qr" viewBox="0 0 ${n * cel} ${n * cel}" role="img" aria-label="QR Code PIX simulado">
        <rect width="100%" height="100%" fill="#fff"/>${quadrados}</svg>`;
    }

    /* --- passo 2b: cartão --- */
    function telaCartao(tipo) {
      const credito = tipo === 'credito';
      const t = total();
      box.innerHTML =
        cabecalho(2, NOME_METODO[tipo], 'Dados fictícios são aceitos — é uma simulação.', true) +
        `<div class="cartao-preview" id="cp">
          <div class="chip" aria-hidden="true"></div>
          <div class="num" id="cp-num">•••• •••• •••• ••••</div>
          <div class="base">
            <div><span>Titular</span><strong id="cp-nome">SEU NOME</strong></div>
            <div><span>Validade</span><strong id="cp-val">MM/AA</strong></div>
            <div class="bandeira" id="cp-band">${credito ? 'CRÉDITO' : 'DÉBITO'}</div>
          </div>
        </div>
        <form id="form-cartao" class="form" novalidate>
          <div>
            <label for="cc-num">Número do cartão</label>
            <input id="cc-num" type="text" inputmode="numeric" autocomplete="off" placeholder="0000 0000 0000 0000" maxlength="19" required />
          </div>
          <div>
            <label for="cc-nome">Nome impresso no cartão</label>
            <input id="cc-nome" type="text" autocomplete="off" placeholder="Como está no cartão" required />
          </div>
          <div class="grid2">
            <div>
              <label for="cc-val">Validade</label>
              <input id="cc-val" type="text" inputmode="numeric" placeholder="MM/AA" maxlength="5" required />
            </div>
            <div>
              <label for="cc-cvv">CVV</label>
              <input id="cc-cvv" type="text" inputmode="numeric" placeholder="123" maxlength="4" required />
            </div>
          </div>
          ${credito ? `
          <div>
            <label for="cc-parc">Parcelas</label>
            <select id="cc-parc">
              <option value="1">1x de ${brl(t)} sem juros</option>
              <option value="2">2x de ${brl(t / 2)} sem juros</option>
              <option value="3">3x de ${brl(t / 3)} sem juros</option>
            </select>
          </div>` : `<p class="small">O valor de ${brl(t)} é debitado à vista da conta vinculada.</p>`}
          <div id="cc-erro" class="msg err hidden" role="alert"></div>
          ${resumo()}
          <button type="submit" class="btn">Pagar ${brl(t)}</button>
          <button type="button" class="btn btn-outline" data-acao="voltar">Escolher outro método</button>
        </form>`;

      const num = document.getElementById('cc-num'), val = document.getElementById('cc-val'), cvv = document.getElementById('cc-cvv'), nome = document.getElementById('cc-nome');
      num.addEventListener('input', () => {
        num.value = digitos(num.value).slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
        document.getElementById('cp-num').textContent = num.value || '•••• •••• •••• ••••';
        document.getElementById('cp-band').textContent = bandeira(num.value) || (credito ? 'CRÉDITO' : 'DÉBITO');
      });
      nome.addEventListener('input', () => {
        document.getElementById('cp-nome').textContent = (nome.value || 'SEU NOME').toUpperCase();
      });
      val.addEventListener('input', () => {
        const d = digitos(val.value).slice(0, 4);
        val.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
        document.getElementById('cp-val').textContent = val.value || 'MM/AA';
      });
      cvv.addEventListener('input', () => { cvv.value = digitos(cvv.value).slice(0, 4); });

      document.getElementById('form-cartao').addEventListener('submit', (e) => {
        e.preventDefault();
        const erro = validarCartao(num.value, nome.value, val.value, cvv.value);
        const cxErro = document.getElementById('cc-erro');
        if (erro) {
          cxErro.textContent = erro;
          cxErro.classList.remove('hidden');
          return;
        }
        const parcelas = credito ? Number(document.getElementById('cc-parc').value) : 1;
        processar(tipo, {
          bandeira: bandeira(num.value) || 'CARTÃO',
          final: digitos(num.value).slice(-4),
          titular: nome.value.trim(),
          parcelas: parcelas
        });
      });
      ligarFechar();
    }
    function bandeira(numero) {
      const d = digitos(numero);
      if (/^4/.test(d)) return 'VISA';
      if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return 'MASTERCARD';
      if (/^3[47]/.test(d)) return 'AMEX';
      if (/^(4011|4312|5067|509|6277|6362|650)/.test(d)) return 'ELO';
      if (/^6/.test(d)) return 'HIPERCARD';
      return '';
    }
    function validarCartao(numero, nome, validade, cvv) {
      const d = digitos(numero);
      if (d.length < 13) return 'Número do cartão incompleto.';
      if (String(nome).trim().length < 3) return 'Informe o nome impresso no cartão.';
      const mv = /^(\d{2})\/(\d{2})$/.exec(String(validade).trim());
      if (!mv) return 'Validade deve estar no formato MM/AA.';
      const mes = Number(mv[1]), ano = 2000 + Number(mv[2]);
      if (mes < 1 || mes > 12) return 'Mês da validade inválido.';
      const fim = new Date(ano, mes, 0, 23, 59, 59);
      if (fim < new Date()) return 'Cartão vencido.';
      if (digitos(cvv).length < 3) return 'CVV inválido.';
      return null;
    }

    /* --- passo 3: processamento e recibo --- */
    function processar(metodo, detalhes) {
      if (cronometro) { clearInterval(cronometro); cronometro = null; }
      box.innerHTML = `
        <div class="passos" aria-hidden="true"><i class="on"></i><i class="on"></i><i class="on"></i></div>
        <div class="processando" role="status" aria-live="polite">
          <div class="spinner" aria-hidden="true"></div>
          <h3 style="font-family:var(--serif);font-size:1.1rem">Processando pagamento…</h3>
          <p class="small mt1">${metodo === 'pix' ? 'Confirmando o PIX com o banco (simulado)' : 'Autorizando com a operadora (simulado)'}</p>
        </div>`;
      setTimeout(() => telaSucesso(metodo, detalhes), 1900);
    }
    function telaSucesso(metodo, detalhes) {
      const dados = {
        metodo: metodo,
        metodoLabel: NOME_METODO[metodo],
        valor: total(),
        transacao: 'OF-' + Date.now().toString(36).toUpperCase(),
        autorizacao: String(Math.floor(100000 + Math.random() * 899999)),
        quando: new Date().toISOString(),
        detalhes: detalhes || {},
        simulado: true
      };
      registrarPagamento(dados);
      const linhas = [
        ['Transação', dados.transacao],
        ['Método', dados.metodoLabel + (detalhes && detalhes.parcelas > 1 ? ' · ' + detalhes.parcelas + 'x' : '')],
        detalhes && detalhes.final ? ['Cartão', (detalhes.bandeira || '') + ' •••• ' + detalhes.final] : null,
        detalhes && detalhes.chave ? ['Chave PIX', detalhes.chave] : null,
        ['Autorização', dados.autorizacao],
        ['Data', dataBR(dados.quando)],
        ['Valor pago', brl(dados.valor)]
      ].filter(Boolean);
      box.innerHTML = `
        <div class="passos" aria-hidden="true"><i class="on"></i><i class="on"></i><i class="on"></i></div>
        <div class="sucesso" role="status" aria-live="polite">
          <div class="marca" aria-hidden="true">✓</div>
          <h3>Pagamento aprovado</h3>
          <p>Sua diária foi publicada e já aparece na listagem.</p>
          <div class="comprovante">
            ${linhas.map(l => `<div class="lin"><span>${esc(l[0])}</span><span>${esc(l[1])}</span></div>`).join('')}
            <div class="lin" style="margin-top:.4rem;border-top:1px dashed #d8d6cf;padding-top:.4rem">
              <span>Ambiente</span><span>SIMULADO (MVP)</span>
            </div>
          </div>
          <button type="button" class="btn" id="pg-ok">Ver minhas diárias</button>
        </div>`;
      document.getElementById('pg-ok').addEventListener('click', () => {
        fechar();
        if (typeof ctx.onSucesso === 'function') ctx.onSucesso(dados);
      });
      if (typeof ctx.onPago === 'function') ctx.onPago(dados);
    }

    function ligarFechar() {
      box.querySelectorAll('[data-acao="cancelar"]').forEach(b => b.addEventListener('click', cancelar));
      box.querySelectorAll('[data-acao="voltar"]').forEach(b => b.addEventListener('click', telaMetodos));
    }

    return { abrir: abrir, fechar: fechar };
  })();

  /* ================================================================
     Bootstrap por página: <body data-pagina="home">
     ================================================================ */
  function iniciar() {
    const pagina = document.body.getAttribute('data-pagina') || '';
    montarHeader(pagina);
    montarFooter();
    montarCookies();
    document.dispatchEvent(new CustomEvent('of:pronto'));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();

  /* ---------- API pública ---------- */
  window.OF = {
    CFG: CFG, K: K, TIPOS: TIPOS, LABEL_TIPO: LABEL_TIPO,
    esc: esc, brl: brl, taxa: taxa, digitos: digitos, waNumero: waNumero,
    dataBR: dataBR, iniciais: iniciais, idNovo: idNovo, labelTipo: labelTipo,
    users: users, sessao: sessao, logado: logado, ehAdmin: ehAdmin,
    login: login, cadastrar: cadastrar, sair: sair,
    usuarioAtual: usuarioAtual, atualizarUsuario: atualizarUsuario, podePublicar: podePublicar,
    cardDiaria: cardDiaria,
    diarias: diarias, diaria: diaria, criarDiaria: criarDiaria, removerDiaria: removerDiaria, salvarDiarias: salvarDiarias,
    registrarContato: registrarContato, contatos: contatos,
    registrarMensagem: registrarMensagem, pagamentos: pagamentos,
    pagamento: pagamento
  };
})();
