// ===== Финансовое приложение — v1 =====
// Данные хранятся в браузере (localStorage), работает офлайн.

const STORE_KEY = 'finance_v1';

// --- Категории по умолчанию (иконка + цвет) ---
const DEFAULT_CATS = {
  expense: [
    { id: 'food',    name: 'Продукты',     emoji: '🛒', color: '#e5484d' },
    { id: 'cafe',    name: 'Кафе',         emoji: '🍔', color: '#f59e0b' },
    { id: 'transport', name: 'Транспорт',  emoji: '🚌', color: '#3b82f6' },
    { id: 'home',    name: 'Жильё',        emoji: '🏠', color: '#8b5cf6' },
    { id: 'fun',     name: 'Развлечения',  emoji: '🎮', color: '#ec4899' },
    { id: 'health',  name: 'Здоровье',     emoji: '💊', color: '#10b981' },
    { id: 'clothes', name: 'Одежда',       emoji: '👕', color: '#14b8a6' },
    { id: 'phone',   name: 'Связь',        emoji: '📱', color: '#6366f1' },
    { id: 'other_e', name: 'Другое',       emoji: '📦', color: '#8a90a2' },
  ],
  income: [
    { id: 'salary',  name: 'Зарплата',     emoji: '💼', color: '#23a06b' },
    { id: 'extra',   name: 'Подработка',   emoji: '🛠️', color: '#0ea5e9' },
    { id: 'gift',    name: 'Подарок',      emoji: '🎁', color: '#ec4899' },
    { id: 'other_i', name: 'Другое',       emoji: '💰', color: '#8a90a2' },
  ],
};

// --- Загрузка/сохранение состояния ---
function loadState() {
  const raw = localStorage.getItem(STORE_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch (e) {}
  }
  return {
    transactions: [],       // { id, type, amount, catId, note, date }
    categories: DEFAULT_CATS,
    limits: {},             // { catId: месячный лимит }
    goals: [],              // { id, name, target, saved }
    settings: { currency: '₽' },
  };
}
let state = loadState();
function save() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }

// --- Помощники ---
const $ = (sel) => document.querySelector(sel);
const app = $('#app');
const cur = () => state.settings.currency;
function money(n) {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + ' ' + cur();
}
function uid() { return Date.now().toString(36) + Math.floor(performance.now() % 1000); }
function catById(id) {
  return [...state.categories.expense, ...state.categories.income].find(c => c.id === id)
    || { name: 'Без категории', emoji: '❔', color: '#8a90a2' };
}
function ymNow() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}
function isThisMonth(iso) { return iso.slice(0, 7) === ymNow(); }
function dateLabel(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

// --- Итоги ---
function totals() {
  let inc = 0, exp = 0, monthInc = 0, monthExp = 0;
  for (const t of state.transactions) {
    if (t.type === 'income') { inc += t.amount; if (isThisMonth(t.date)) monthInc += t.amount; }
    else { exp += t.amount; if (isThisMonth(t.date)) monthExp += t.amount; }
  }
  return { balance: inc - exp, monthInc, monthExp };
}

// ===== Навигация по вкладкам =====
let tab = 'home';
const TABS = [
  { id: 'home',    ic: '🏠', label: 'Главная' },
  { id: 'report',  ic: '📊', label: 'Отчёт' },
  { id: 'goals',   ic: '🎯', label: 'Цели' },
  { id: 'settings',ic: '⚙️', label: 'Ещё' },
];
function render() {
  const t = totals();
  app.innerHTML = `
    <header>
      <div class="title">Баланс</div>
      <div class="balance">${money(t.balance)}</div>
      <div class="sub">
        <div class="inc">Доход за месяц<b>${money(t.monthInc)}</b></div>
        <div class="exp">Расход за месяц<b>${money(t.monthExp)}</b></div>
      </div>
    </header>
    <main id="screen"></main>
    <button class="fab" id="fab">+</button>
    <nav class="tabbar">
      ${TABS.map(x => `<button data-tab="${x.id}" class="${tab === x.id ? 'active' : ''}">
        <span class="ic">${x.ic}</span>${x.label}</button>`).join('')}
    </nav>`;
  // хедер прячем на вкладках без баланса
  if (tab === 'settings') $('header').classList.add('hidden');

  const scr = $('#screen');
  if (tab === 'home') renderHome(scr);
  else if (tab === 'report') renderReport(scr);
  else if (tab === 'goals') renderGoals(scr);
  else if (tab === 'settings') renderSettings(scr);

  $('#fab').onclick = openAddSheet;
  document.querySelectorAll('nav.tabbar button').forEach(b => {
    b.onclick = () => { tab = b.dataset.tab; render(); };
  });
}

// ===== Вкладка «Главная»: история операций =====
function renderHome(scr) {
  const list = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date));
  if (!list.length) {
    scr.innerHTML = `<p class="empty">Пока нет операций.<br>Нажми «+», чтобы добавить.</p>`;
    return;
  }
  scr.innerHTML = `<h2>Последние операции</h2>` + list.map(t => {
    const c = catById(t.catId);
    const sign = t.type === 'income' ? '+' : '−';
    return `<div class="card op">
      <div class="icon" style="background:${c.color}22;color:${c.color}">${c.emoji}</div>
      <div class="info">
        <div class="cat">${c.name}</div>
        <div class="note">${t.note ? t.note + ' · ' : ''}${dateLabel(t.date)}</div>
      </div>
      <div class="amt ${t.type === 'income' ? 'inc' : 'exp'}">${sign}${money(t.amount)}</div>
      <button class="del" data-del="${t.id}">✕</button>
    </div>`;
  }).join('');
  scr.querySelectorAll('[data-del]').forEach(b => {
    b.onclick = () => {
      state.transactions = state.transactions.filter(x => x.id !== b.dataset.del);
      save(); render();
    };
  });
}

// ===== Вкладка «Отчёт»: диаграмма + лимиты =====
function renderReport(scr) {
  const monthExp = state.transactions.filter(t => t.type === 'expense' && isThisMonth(t.date));
  if (!monthExp.length) {
    scr.innerHTML = `<h2>Расходы за месяц</h2><p class="empty">Нет расходов в этом месяце.</p>`;
    return;
  }
  // сумма по категориям
  const byCat = {};
  for (const t of monthExp) byCat[t.catId] = (byCat[t.catId] || 0) + t.amount;
  const rows = Object.entries(byCat).map(([id, sum]) => ({ ...catById(id), id, sum }))
    .sort((a, b) => b.sum - a.sum);
  const total = rows.reduce((s, r) => s + r.sum, 0);

  scr.innerHTML = `<h2>Расходы за месяц</h2>
    <div class="chart-wrap">${donut(rows, total)}</div>
    <div class="card">
      ${rows.map(r => {
        const pct = Math.round(r.sum / total * 100);
        const limit = state.limits[r.id] || 0;
        let bar = '';
        if (limit > 0) {
          const used = Math.min(100, Math.round(r.sum / limit * 100));
          const over = r.sum > limit;
          bar = `<div class="bar"><span style="width:${used}%;background:${over ? 'var(--expense)' : r.color}"></span></div>
            <div class="${over ? 'warn' : 'note'}" style="font-size:12px;color:${over ? '' : 'var(--muted)'}">
              ${money(r.sum)} из ${money(limit)}${over ? ' — превышен лимит!' : ''}</div>`;
        }
        return `<div class="legend-row">
            <span class="dot" style="background:${r.color}"></span>
            <span class="nm">${r.emoji} ${r.name}</span>
            <span class="val">${money(r.sum)} · ${pct}%</span>
          </div>${bar}`;
      }).join('')}
    </div>
    <button class="btn-ghost" id="editLimits">Настроить лимиты по категориям</button>`;
  $('#editLimits').onclick = openLimitsSheet;
}

// SVG-пончик (без сторонних библиотек)
function donut(rows, total) {
  const R = 70, r = 45, cx = 80, cy = 80;
  let a0 = -Math.PI / 2;
  let paths = '';
  for (const row of rows) {
    const frac = row.sum / total;
    const a1 = a0 + frac * Math.PI * 2;
    const large = frac > 0.5 ? 1 : 0;
    const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
    const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
    paths += `<path d="M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${cx} ${cy} Z" fill="${row.color}"/>`;
    a0 = a1;
  }
  return `<svg width="160" height="160" viewBox="0 0 160 160">
    ${paths}<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff"/>
    <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="11" fill="#8a90a2">Всего</text>
    <text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="14" font-weight="700" fill="#1a1f36">${total.toLocaleString('ru-RU')}</text>
  </svg>`;
}

// ===== Вкладка «Цели» =====
function renderGoals(scr) {
  scr.innerHTML = `<h2>Цели накопления</h2>` +
    (state.goals.length ? '' : `<p class="empty">Целей пока нет. Добавь первую.</p>`) +
    state.goals.map(g => {
      const pct = g.target > 0 ? Math.min(100, Math.round(g.saved / g.target * 100)) : 0;
      return `<div class="card goal">
        <div class="top"><span class="name">🎯 ${g.name}</span>
          <button class="del" data-delgoal="${g.id}">✕</button></div>
        <div class="bar"><span style="width:${pct}%;background:var(--income)"></span></div>
        <div class="nums"><span>${money(g.saved)}</span><span>${pct}% из ${money(g.target)}</span></div>
        <button class="add" data-addgoal="${g.id}">Пополнить</button>
      </div>`;
    }).join('') +
    `<button class="btn-primary" id="newGoal" style="margin-top:8px">+ Новая цель</button>`;

  $('#newGoal').onclick = () => {
    const name = prompt('Название цели (например: Отпуск):');
    if (!name) return;
    const target = parseFloat((prompt('Сколько накопить?') || '').replace(',', '.'));
    if (!target || target <= 0) return;
    state.goals.push({ id: uid(), name: name.trim(), target, saved: 0 });
    save(); render();
  };
  scr.querySelectorAll('[data-addgoal]').forEach(b => b.onclick = () => {
    const g = state.goals.find(x => x.id === b.dataset.addgoal);
    const add = parseFloat((prompt('Сколько добавить?') || '').replace(',', '.'));
    if (!add || add <= 0) return;
    g.saved += add; save(); render();
  });
  scr.querySelectorAll('[data-delgoal]').forEach(b => b.onclick = () => {
    state.goals = state.goals.filter(x => x.id !== b.dataset.delgoal);
    save(); render();
  });
}

// ===== Вкладка «Ещё» (настройки) =====
function renderSettings(scr) {
  scr.innerHTML = `<h2>Настройки</h2>
    <div class="card">
      <div class="set-row"><span>Валюта</span><span>${cur()}</span></div>
      <div class="set-row"><span>Операций всего</span><span>${state.transactions.length}</span></div>
      <div class="set-row"><span>Категорий</span><span>${state.categories.expense.length + state.categories.income.length}</span></div>
    </div>
    <div class="card">
      <div class="set-row"><span>Настроить лимиты</span><button class="add" id="limits2">Открыть</button></div>
      <div class="set-row"><span class="danger">Удалить все данные</span><button class="del danger" id="wipe">Очистить</button></div>
    </div>
    <p class="empty" style="font-size:12px">Финансы v1 · данные хранятся только на этом устройстве</p>`;
  $('#limits2').onclick = openLimitsSheet;
  $('#wipe').onclick = () => {
    if (confirm('Удалить все операции, цели и настройки? Это необратимо.')) {
      localStorage.removeItem(STORE_KEY);
      state = loadState(); tab = 'home'; render();
    }
  };
}

// ===== Шторка добавления операции =====
let draft = { type: 'expense', catId: null };
function openAddSheet() {
  draft = { type: 'expense', catId: null };
  const bg = document.createElement('div');
  bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet">
    <h3>Новая операция</h3>
    <div class="seg">
      <button id="segExp" class="on-exp">Расход</button>
      <button id="segInc">Доход</button>
    </div>
    <input class="amount-input" id="amt" inputmode="decimal" placeholder="0" />
    <div class="cats" id="cats"></div>
    <input class="field" id="note" placeholder="Комментарий (необязательно)" />
    <button class="btn-primary" id="saveOp">Сохранить</button>
    <button class="btn-ghost" id="closeOp">Отмена</button>
  </div>`;
  document.body.appendChild(bg);

  const drawCats = () => {
    const cats = state.categories[draft.type];
    $('#cats').innerHTML = cats.map(c =>
      `<button class="cat-btn ${draft.catId === c.id ? 'sel' : ''}" data-cat="${c.id}">
        <span class="e">${c.emoji}</span>${c.name}</button>`).join('');
    $('#cats').querySelectorAll('[data-cat]').forEach(b => b.onclick = () => {
      draft.catId = b.dataset.cat; drawCats();
    });
  };
  const setType = (type) => {
    draft.type = type; draft.catId = null;
    $('#segExp').className = type === 'expense' ? 'on-exp' : '';
    $('#segInc').className = type === 'income' ? 'on-inc' : '';
    drawCats();
  };
  setType('expense');

  $('#segExp').onclick = () => setType('expense');
  $('#segInc').onclick = () => setType('income');
  const close = () => bg.remove();
  bg.onclick = (e) => { if (e.target === bg) close(); };
  $('#closeOp').onclick = close;
  $('#saveOp').onclick = () => {
    const amount = parseFloat(($('#amt').value || '').replace(',', '.'));
    if (!amount || amount <= 0) { $('#amt').focus(); return; }
    if (!draft.catId) { alert('Выбери категорию'); return; }
    state.transactions.push({
      id: uid(), type: draft.type, amount,
      catId: draft.catId, note: $('#note').value.trim(),
      date: new Date().toISOString(),
    });
    save(); close(); render();
  };
  setTimeout(() => $('#amt').focus(), 50);
}

// ===== Шторка лимитов =====
function openLimitsSheet() {
  const bg = document.createElement('div');
  bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet">
    <h3>Лимиты на месяц</h3>
    ${state.categories.expense.map(c => `
      <div class="legend-row">
        <span class="nm">${c.emoji} ${c.name}</span>
        <input class="field" style="width:120px;margin:0;text-align:right"
          inputmode="numeric" data-lim="${c.id}"
          value="${state.limits[c.id] || ''}" placeholder="нет" />
      </div>`).join('')}
    <button class="btn-primary" id="saveLim" style="margin-top:12px">Сохранить</button>
    <button class="btn-ghost" id="closeLim">Отмена</button>
  </div>`;
  document.body.appendChild(bg);
  const close = () => bg.remove();
  bg.onclick = (e) => { if (e.target === bg) close(); };
  $('#closeLim').onclick = close;
  $('#saveLim').onclick = () => {
    bg.querySelectorAll('[data-lim]').forEach(inp => {
      const v = parseFloat((inp.value || '').replace(',', '.'));
      if (v && v > 0) state.limits[inp.dataset.lim] = v;
      else delete state.limits[inp.dataset.lim];
    });
    save(); close(); render();
  };
}

// --- Регистрация service worker (офлайн) ---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

render();
