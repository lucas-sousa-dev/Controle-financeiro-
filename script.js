
"use strict";

/* GESTÃO FINANCEIRA — CALCULADORA ATUALIZADA */

const $ = id => document.getElementById(id);

const KEY = "gestao-financeira-v1";
const OLD_KEY = "movimentacoes";
const AGENDA_KEY = "gestao-financeira-agenda-v1";

const money = value =>
  Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const makeId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const validDate = value =>
  typeof value === "string" &&
  /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value) &&
  !Number.isNaN(new Date(`${value}T12:00:00`).getTime()) &&
  new Date(`${value}T12:00:00`).toISOString().slice(0, 10) === value;

const validEntry = e =>
  e &&
  typeof e.id === "string" &&
  typeof e.descricao === "string" &&
  e.descricao.trim().length > 0 &&
  e.descricao.length <= 100 &&
  typeof e.categoria === "string" &&
  e.categoria.length <= 80 &&
  ["receita", "despesa"].includes(e.tipo) &&
  validDate(e.data) &&
  typeof e.valor === "number" &&
  Number.isFinite(e.valor) &&
  e.valor > 0 &&
  e.valor <= 1e12;

let entries = [];
let editingId = null;
let calcFirst = null;
let calcOp = null;
let calcFresh = false;

// ARMAZENAMENTO

function readData() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(KEY) || "null"
    );

    if (Array.isArray(saved)) {
      return saved.filter(validEntry);
    }
  } catch (e) {
    console.warn("Dados locais inválidos", e);
  }

  try {
    const old = JSON.parse(
      localStorage.getItem(OLD_KEY) || "null"
    );

    if (Array.isArray(old)) {
      const converted = old
        .filter(x =>
          x &&
          Number(x.valor) > 0 &&
          ["receita", "despesa"].includes(x.tipo)
        )
        .map(x => ({
          id: makeId(),
          descricao: String(
            x.descricao || "Lançamento"
          ).slice(0, 100),
          valor: Number(x.valor),
          tipo: x.tipo,
          categoria: "Outros",
          data: today()
        }))
        .filter(validEntry);

      if (converted.length) {
        localStorage.setItem(
          KEY,
          JSON.stringify(converted)
        );
        return converted;
      }
    }
  } catch (e) {
    console.warn("Erro ao importar dados antigos", e);
  }

  return [];
}

function persist(next) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    entries = next;
    return true;
  } catch {
    alert("Não foi possível salvar. Verifique o armazenamento e faça backup.");
    return false;
  }
}

// CONSULTA À AGENDA FINANCEIRA

function readAgenda() {
  try {
    const data = JSON.parse(
      localStorage.getItem(AGENDA_KEY) || "[]"
    );

    if (!Array.isArray(data)) return [];

    return data.filter(item =>
      item &&
      typeof item.id === "string" &&
      typeof item.descricao === "string" &&
      validDate(item.vencimento) &&
      Number.isInteger(item.centavos) &&
      item.centavos > 0 &&
      item.centavos <= 1e14
    );
  } catch (e) {
    console.warn("Não foi possível consultar a agenda", e);
    return [];
  }
}

function agendaPaid(item) {
  return item.pagoAnteriormente === true ||
    entries.some(e => e.id === `agenda-${item.id}`);
}

function pendingAgenda() {
  return readAgenda().filter(item => !agendaPaid(item));
}

function pendingInMonth(month) {
  return pendingAgenda().filter(
    item => item.vencimento.slice(0, 7) === month
  );
}

function pendingTotal(list) {
  return list.reduce(
    (sum, item) => sum + item.centavos / 100,
    0
  );
}

// DATAS E CÁLCULOS

function selectedMonth() {
  return $("mes").value || today().slice(0, 7);
}

function shiftMonth(month, offset) {
  const [year, number] = month.split("-").map(Number);
  const date = new Date(year, number - 1 + offset, 1);

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

function monthName(month) {
  const [year, number] = month.split("-").map(Number);

  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric"
  }).format(new Date(year, number - 1, 1));
}

function monthEntries(month = selectedMonth()) {
  return entries.filter(
    e => e.data.slice(0, 7) === month
  );
}

function total(list, tipo) {
  return list
    .filter(e => e.tipo === tipo)
    .reduce((sum, e) => sum + e.valor, 0);
}

function monthSummary(month) {
  const list = monthEntries(month);
  const revenue = total(list, "receita");
  const expense = total(list, "despesa");
  const pending = pendingInMonth(month);

  return {
    revenue,
    expense,
    result: revenue - expense,
    pending: pendingTotal(pending),
    pendingCount: pending.length,
    entryCount: list.length
  };
}

function accumulatedBalance(month) {
  const through = entries.filter(
    e => e.data.slice(0, 7) <= month
  );

  return total(through, "receita") -
    total(through, "despesa");
}

function projectedBalance(month) {
  const pending = pendingAgenda()
    .filter(item =>
      item.vencimento.slice(0, 7) <= month
    );

  return accumulatedBalance(month) -
    pendingTotal(pending);
}

function setColor(el, value) {
  el.classList.remove(
    "positivo",
    "negativo",
    "zerado"
  );

  el.classList.add(
    value > 0 ? "positivo" :
    value < 0 ? "negativo" : "zerado"
  );
}

function element(tag, className, content) {
  const el = document.createElement(tag);

  if (className) el.className = className;

  if (content !== undefined) {
    el.textContent = content;
  }

  return el;
}

// PREVISÃO DE PAGAMENTOS DO PRÓXIMO MÊS

function renderNextMonthForecast() {
  const root = $("previsao-proximo-lista");
  const title = $("previsao-proximo-titulo");
  const totalEl = $("previsao-proximo-total");

  if (!root || !title || !totalEl) return;

  const currentMonth = today().slice(0, 7);
  const nextMonth = shiftMonth(currentMonth, 1);

  title.textContent = monthName(nextMonth);

  const items = pendingInMonth(nextMonth)
    .sort((a, b) =>
      a.vencimento.localeCompare(b.vencimento) ||
      a.descricao.localeCompare(b.descricao, "pt-BR")
    );

  root.replaceChildren();

  if (!items.length) {
    root.append(
      element(
        "p",
        "empty",
        "Nenhuma conta pendente cadastrada para o próximo mês."
      )
    );

    totalEl.textContent = money(0);
    return;
  }

  const list = element("div");
  list.style.display = "grid";
  list.style.gap = "10px";
  list.style.marginBottom = "18px";

  let totalCentavos = 0;

  items.forEach(item => {
    totalCentavos += item.centavos;

    const row = element("div");

    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.alignItems = "flex-start";
    row.style.flexWrap = "wrap";
    row.style.gap = "8px";
    row.style.padding = "12px";
    row.style.border = "1px solid #dce4ed";
    row.style.borderRadius = "10px";

    const info = element("div");

    const name = element(
      "strong",
      "",
      `${item.descricao}${
        item.totalParcelas > 1
          ? ` — ${item.parcela}/${item.totalParcelas}`
          : ""
      }`
    );

    const due = element(
      "small",
      "",
      `Vencimento: ${item.vencimento
        .split("-")
        .reverse()
        .join("/")}`
    );

    due.style.display = "block";
    due.style.marginTop = "4px";
    due.style.color = "#64748b";

    info.append(name, due);

    const amount = element(
      "strong",
      "",
      money(item.centavos / 100)
    );

    row.append(info, amount);
    list.append(row);
  });

  root.append(list);

  totalEl.textContent = money(totalCentavos / 100);
}

// PAINEL PRINCIPAL

function render() {
  const month = selectedMonth();
  const list = monthEntries(month);
  const summary = monthSummary(month);
  const balance = accumulatedBalance(month);

  $("receitas").textContent = money(summary.revenue);
  $("despesas").textContent = money(summary.expense);
  $("resultado").textContent = money(summary.result);
  $("saldo").textContent = money(balance);

  setColor($("resultado"), summary.result);
  setColor($("saldo"), balance);

  $("periodo-label").textContent = monthName(month);

  renderNextMonthForecast();
  renderCategories(list);
  renderForecast();
  renderHistory();
  renderEntries(list);
}

// RESUMO POR CATEGORIA

function renderCategories(list) {
  const root = $("categorias-resumo");
  root.replaceChildren();

  const sums = new Map();

  list
    .filter(e => e.tipo === "despesa")
    .forEach(e => {
      sums.set(
        e.categoria,
        (sums.get(e.categoria) || 0) + e.valor
      );
    });

  const items = [...sums.entries()]
    .sort((a, b) => b[1] - a[1]);

  if (!items.length) {
    root.append(
      element(
        "p",
        "empty",
        "Nenhuma despesa neste mês."
      )
    );
    return;
  }

  const max = items[0][1];

  items.forEach(([name, value]) => {
    const wrapper = element("div");
    const line = element("div", "category-row");

    line.append(
      element("span", "", name),
      element("strong", "", money(value))
    );

    const bar = element("div", "category-bar");
    const fill = element("div", "category-fill");

    fill.style.width =
      `${Math.min(100, value / max * 100)}%`;

    bar.append(fill);
    wrapper.append(line, bar);
    root.append(wrapper);
  });
}

// HISTÓRICO E PREVISÃO EXISTENTES

function createForecastPanel() {
  let root = $("previsao-financeira");

  if (root) return root;

  root = element("section");
  root.id = "previsao-financeira";

  root.style.margin = "24px 0";
  root.style.padding = "20px";
  root.style.border = "1px solid #dce4ed";
  root.style.borderRadius = "14px";
  root.style.background = "#ffffff";

  const history = $("historico");

  if (history && history.parentNode) {
    history.parentNode.insertBefore(root, history);
  }

  return root;
}

function forecastCard(month, heading) {
  const summary = monthSummary(month);

  const card = element("article");
  card.style.border = "1px solid #dce4ed";
  card.style.borderRadius = "12px";
  card.style.padding = "14px";
  card.style.background = "#f8fafc";

  const title = element(
    "strong",
    "",
    `${heading} — ${monthName(month)}`
  );

  const revenue = element(
    "p",
    "",
    `Receitas realizadas: ${money(summary.revenue)}`
  );

  const expense = element(
    "p",
    "",
    `Despesas realizadas: ${money(summary.expense)}`
  );

  const pending = element(
    "p",
    "",
    `Contas pendentes: ${money(summary.pending)}`
  );

  const result = element(
    "p",
    "",
    `Resultado realizado: ${money(summary.result)}`
  );

  const projected = projectedBalance(month);

  const balance = element(
    "strong",
    "",
    `Saldo projetado: ${money(projected)}`
  );

  setColor(balance, projected);

  const count = element(
    "small",
    "",
    `${summary.pendingCount} compromisso(s) pendente(s)`
  );

  card.append(
    title,
    revenue,
    expense,
    pending,
    result,
    balance,
    element("div"),
    count
  );

  return card;
}

function renderForecast() {
  const root = createForecastPanel();
  root.replaceChildren();

  const title = element(
    "h3",
    "",
    "Histórico e previsão financeira"
  );

  title.style.margin = "0 0 8px";

  const description = element(
    "p",
    "",
    "Valores realizados e compromissos previstos são apresentados separadamente. Pagamentos anteriores não são lançados novamente como despesas."
  );

  description.style.color = "#64748b";
  description.style.fontSize = "14px";

  const grid = element("div");

  grid.style.display = "grid";
  grid.style.gridTemplateColumns =
    "repeat(auto-fit, minmax(220px, 1fr))";
  grid.style.gap = "12px";
  grid.style.marginTop = "16px";

  const base = selectedMonth();

  grid.append(
    forecastCard(
      shiftMonth(base, -1),
      "Mês anterior"
    ),
    forecastCard(
      base,
      "Mês selecionado"
    ),
    forecastCard(
      shiftMonth(base, 1),
      "Próximo mês"
    ),
    forecastCard(
      shiftMonth(base, 2),
      "Daqui a dois meses"
    )
  );

  root.append(title, description, grid);
}

// HISTÓRICO MENSAL

function renderHistory() {
  const root = $("historico");
  root.replaceChildren();

  const year = Number($("ano").value) ||
    new Date().getFullYear();

  const entryMonths = entries
    .filter(e =>
      Number(e.data.slice(0, 4)) === year
    )
    .map(e => e.data.slice(0, 7));

  const agendaMonths = readAgenda()
    .filter(item =>
      Number(item.vencimento.slice(0, 4)) === year
    )
    .map(item => item.vencimento.slice(0, 7));

  const months = [...new Set([
    ...entryMonths,
    ...agendaMonths
  ])].sort().reverse();

  if (!months.length) {
    root.append(
      element(
        "p",
        "empty",
        "Nenhuma movimentação ou provisão registrada neste ano."
      )
    );
    return;
  }

  months.forEach(key => {
    const summary = monthSummary(key);

    const btn = element(
      "button",
      "month-card"
    );

    btn.type = "button";

    if (key === selectedMonth()) {
      btn.classList.add("active");
    }

    btn.classList.add(
      summary.result < 0
        ? "negative"
        : "positive"
    );

    const status = element(
      "strong",
      summary.result < 0
        ? "negativo"
        : summary.result > 0
          ? "positivo"
          : "zerado",
      money(summary.result)
    );

    const detail = element(
      "small",
      "",
      `${summary.entryCount} lançamento(s) · ${summary.pendingCount} provisão(ões) pendente(s)`
    );

    const pending = element(
      "small",
      "",
      `A pagar: ${money(summary.pending)}`
    );

    btn.append(
      element("span", "", monthName(key)),
      status,
      detail,
      pending
    );

    btn.addEventListener("click", () => {
      $("mes").value = key;
      $("busca").value = "";
      render();

      $("lista-movimentacoes").scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    });

    root.append(btn);
  });
}

// LISTA DE MOVIMENTAÇÕES

function renderEntries(list) {
  const root = $("lista-movimentacoes");
  root.replaceChildren();

  const q = $("busca").value
    .trim()
    .toLocaleLowerCase("pt-BR");

  const filtered = list
    .filter(e =>
      `${e.descricao} ${e.categoria}`
        .toLocaleLowerCase("pt-BR")
        .includes(q)
    )
    .sort((a, b) =>
      b.data.localeCompare(a.data)
    );

  if (!filtered.length) {
    root.append(
      element(
        "p",
        "empty",
        "Nenhuma movimentação encontrada."
      )
    );
    return;
  }

  filtered.forEach(e => {
    const row = element("div", "entry");
    const info = element("div", "entry-info");
    const right = element("div", "entry-right");

    const date = e.data
      .split("-")
      .reverse()
      .join("/");

    info.append(
      element("strong", "", e.descricao),
      element(
        "small",
        "",
        `${date} · ${e.categoria} · ${e.tipo}`
      )
    );

    const amount = element(
      "strong",
      e.tipo === "receita"
        ? "positivo"
        : "negativo",
      `${e.tipo === "receita" ? "+" : "−"} ${money(e.valor)}`
    );

    const edit = element(
      "button",
      "outline",
      "Editar"
    );

    edit.type = "button";
    edit.addEventListener(
      "click",
      () => editEntry(e.id)
    );

    const remove = element(
      "button",
      "danger-btn",
      "Excluir"
    );

    remove.type = "button";
    remove.addEventListener(
      "click",
      () => deleteEntry(e.id)
    );

    right.append(amount, edit, remove);
    row.append(info, right);
    root.append(row);
  });
}

// EDIÇÃO DE MOVIMENTAÇÕES

function resetForm() {
  editingId = null;

  $("formulario").reset();
  $("data").value = today();

  $("form-title").textContent =
    "Nova movimentação";

  $("save").textContent =
    "Adicionar movimentação";

  $("cancel-edit").classList.add("hidden");
}

function editEntry(id) {
  const e = entries.find(x => x.id === id);

  if (!e) return;

  if (e.id.startsWith("agenda-")) {
    alert(
      "Este pagamento está vinculado à Agenda Financeira. Use a opção Desfazer pagamento na agenda antes de alterá-lo."
    );
    return;
  }

  editingId = id;

  $("descricao").value = e.descricao;
  $("valor").value = e.valor;
  $("data").value = e.data;
  $("tipo").value = e.tipo;
  $("categoria").value = e.categoria;

  $("form-title").textContent =
    "Editar movimentação";

  $("save").textContent =
    "Salvar alterações";

  $("cancel-edit").classList.remove("hidden");

  $("formulario").scrollIntoView({
    behavior: "smooth",
    block: "center"
  });

  $("descricao").focus();
}

function deleteEntry(id) {
  const e = entries.find(x => x.id === id);

  if (!e) return;

  if (e.id.startsWith("agenda-")) {
    alert(
      "Este pagamento está vinculado à Agenda Financeira. Para excluí-lo, utilize Desfazer pagamento na agenda."
    );
    return;
  }

  if (!confirm(
    `Excluir a movimentação "${e.descricao}"?`
  )) {
    return;
  }

  if (persist(entries.filter(x => x.id !== id))) {
    if (editingId === id) resetForm();
    render();
  }
}

// EXPORTAÇÃO

function download(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;

  document.body.append(a);
  a.click();
  a.remove();

  setTimeout(
    () => URL.revokeObjectURL(url),
    1000
  );
}

function exportCsv() {
  const list = [...monthEntries()].sort(
    (a, b) => a.data.localeCompare(b.data)
  );

  const rows = [
    [
      "Data",
      "Descrição",
      "Categoria",
      "Tipo",
      "Valor (R$)"
    ],
    ...list.map(e => [
      e.data.split("-").reverse().join("/"),
      e.descricao,
      e.categoria,
      e.tipo,
      e.tipo === "despesa"
        ? -e.valor
        : e.valor
    ])
  ];

  const csv = "\uFEFF" + rows.map(r =>
    r.map(v =>
      `"${String(
        typeof v === "number"
          ? v.toFixed(2).replace(".", ",")
          : v
      ).replace(/"/g, '""')}"`
    ).join(";")
  ).join("\r\n");

  download(
    csv,
    `financeiro-${selectedMonth()}.csv`,
    "text/csv;charset=utf-8"
  );
}

// BACKUP

function backup() {
  download(
    JSON.stringify({
      app: "gestao-financeira",
      version: 1,
      exportedAt: new Date().toISOString(),
      entries
    }, null, 2),
    `backup-financeiro-${today()}.json`,
    "application/json;charset=utf-8"
  );
}

function restore(file) {
  if (!file) return;

  if (file.size > 10 * 1024 * 1024) {
    alert("Arquivo muito grande. Máximo de 10 MB.");
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);

      if (
        data.app !== "gestao-financeira" ||
        data.version !== 1 ||
        !Array.isArray(data.entries) ||
        data.entries.length > 50000 ||
        !data.entries.every(validEntry) ||
        new Set(
          data.entries.map(e => e.id)
        ).size !== data.entries.length
      ) {
        throw Error("Backup inválido");
      }

      if (!confirm(
        `Restaurar ${data.entries.length} lançamentos? Os dados atuais serão substituídos.`
      )) {
        return;
      }

      if (persist(data.entries)) {
        resetForm();
        render();
        alert("Backup restaurado com sucesso.");
      }
    } catch {
      alert("Arquivo de backup inválido ou incompatível.");
    } finally {
      $("restore").value = "";
    }
  };

  reader.onerror = () =>
    alert("Não foi possível ler o arquivo.");

  reader.readAsText(file);
}

// CALCULADORA — PADRÃO BRASILEIRO

function initCalculator() {
  const root = $("calc-keys");
  root.replaceChildren();

  const keys = [
    "C", "⌫", "%", "÷",
    "7", "8", "9", "×",
    "4", "5", "6", "−",
    "1", "2", "3", "+",
    "0", ",", "="
  ];

  keys.forEach(key => {
    const b = element("button", "", key);
    b.type = "button";

    if (key === "0") {
      b.style.gridColumn = "span 2";
    }

    b.addEventListener(
      "click",
      () => calcPress(key)
    );

    root.append(b);
  });
}

// Converte 23.500,50 em 23500.50

function calcParse(text) {
  return Number(
    text
      .replace(/^−/, "-")
      .replace(/\./g, "")
      .replace(",", ".")
  );
}

// Formata o número digitado sem inserir vírgula

function calcFormatRaw(raw) {
  const negative =
    raw.startsWith("-") || raw.startsWith("−");

  const clean = negative ? raw.slice(1) : raw;
  const parts = clean.split(",");

  const integer =
    parts[0].replace(/^0+(?=\d)/, "") || "0";

  const grouped = integer.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    "."
  );

  return (negative ? "−" : "") +
    grouped +
    (parts.length > 1 ? "," + parts[1] : "");
}

// Formata resultados com ponto e vírgula

function calcFormatNumber(number) {
  if (!Number.isFinite(number)) return "Erro";

  const rounded = Number(number.toFixed(8));

  const raw = String(rounded);

  const decimal = raw.includes("e")
    ? rounded
        .toFixed(8)
        .replace(/0+$/, "")
        .replace(/\.$/, "")
    : raw;

  return calcFormatRaw(
    decimal.replace(".", ",")
  );
}

// Operações matemáticas

function calculate(a, b, op) {
  if (op === "+") return a + b;
  if (op === "−") return a - b;
  if (op === "×") return a * b;

  return b === 0 ? NaN : a / b;
}

// Botões e funcionamento

function calcPress(key) {
  const out = $("calc-display");
  const current = out.textContent;
  const operators = ["+", "−", "×", "÷"];

  if (key === "C") {
    out.textContent = "0";
    calcFirst = null;
    calcOp = null;
    calcFresh = false;
    return;
  }

  // Apagar um dígito de cada vez

  if (key === "⌫") {
    if (current === "Erro") {
      out.textContent = "0";
    } else if (calcFresh) {
      out.textContent = "0";
      calcFresh = false;
    } else {
      const raw = current.replace(/\./g, "");
      const shortened = raw.slice(0, -1);

      out.textContent =
        shortened &&
        shortened !== "−" &&
        shortened !== "-"
          ? calcFormatRaw(shortened)
          : "0";
    }
    return;
  }

  // Porcentagem

  if (key === "%") {
    if (current === "Erro") return;

    const value = calcParse(current);

    const result =
      calcOp !== null &&
      calcFirst !== null &&
      ["+", "−"].includes(calcOp)
        ? calcFirst * value / 100
        : value / 100;

    out.textContent = calcFormatNumber(result);
    calcFresh = false;
    return;
  }

  // Soma, subtração, multiplicação e divisão

  if (operators.includes(key)) {
    if (current === "Erro") return;

    const value = calcParse(current);

    if (
      calcOp !== null &&
      calcFirst !== null &&
      !calcFresh
    ) {
      const result = calculate(
        calcFirst,
        value,
        calcOp
      );

      out.textContent = calcFormatNumber(result);

      if (!Number.isFinite(result)) {
        calcFirst = null;
        calcOp = null;
        calcFresh = true;
        return;
      }

      calcFirst = result;
    } else if (
      calcFirst === null ||
      !calcFresh
    ) {
      calcFirst = value;
    }

    calcOp = key;
    calcFresh = true;
    return;
  }

  // Resultado

  if (key === "=") {
    if (current === "Erro") return;

    if (
      calcOp !== null &&
      calcFirst !== null &&
      !calcFresh
    ) {
      const result = calculate(
        calcFirst,
        calcParse(current),
        calcOp
      );

      out.textContent = calcFormatNumber(result);

      calcFirst = null;
      calcOp = null;
      calcFresh = true;
    }
    return;
  }

  // Vírgula digitada manualmente

  if (key === ",") {
    if (
      calcFresh ||
      current === "Erro"
    ) {
      out.textContent = "0,";
      calcFresh = false;
    } else if (!current.includes(",")) {
      out.textContent += ",";
    }
    return;
  }

  // Dígitos com ponto de milhar automático

  if (/^\d$/.test(key)) {
    const raw =
      calcFresh || current === "Erro"
        ? ""
        : current.replace(/\./g, "");

    if (
      raw.replace(/\D/g, "").length >= 15
    ) {
      return;
    }

    const next =
      raw === "0"
        ? key
        : raw + key;

    out.textContent = calcFormatRaw(next);
    calcFresh = false;
  }
}

// INICIALIZAÇÃO

function init() {
  entries = readData();

  $("mes").value = today().slice(0, 7);
  $("ano").value = today().slice(0, 4);
  $("data").value = today();

  $("formulario").addEventListener(
    "submit",
    event => {
      event.preventDefault();

      const e = {
        id: editingId || makeId(),
        descricao: $("descricao").value.trim(),
        valor: Number($("valor").value),
        data: $("data").value,
        tipo: $("tipo").value,
        categoria: $("categoria").value
      };

      if (!validEntry(e)) {
        alert("Confira descrição, valor, tipo e data.");
        return;
      }

      const next = editingId
        ? entries.map(x =>
            x.id === editingId ? e : x
          )
        : [...entries, e];

      if (persist(next)) {
        $("mes").value = e.data.slice(0, 7);
        $("ano").value = e.data.slice(0, 4);

        resetForm();
        render();
      }
    }
  );

  $("cancel-edit").addEventListener(
    "click",
    resetForm
  );

  $("mes").addEventListener(
    "change",
    () => {
      $("ano").value =
        selectedMonth().slice(0, 4);

      render();
    }
  );

  $("ano").addEventListener(
    "change",
    render
  );

  $("busca").addEventListener(
    "input",
    render
  );

  $("export-csv").addEventListener(
    "click",
    exportCsv
  );

  $("print").addEventListener(
    "click",
    () => window.print()
  );

  $("backup").addEventListener(
    "click",
    backup
  );

  $("restore").addEventListener(
    "change",
    event => restore(event.target.files[0])
  );

  $("clear").addEventListener(
    "click",
    () => {
      if (
        confirm(
          "ATENÇÃO: apagar TODOS os lançamentos? Faça backup antes."
        ) &&
        confirm(
          "Confirma a exclusão definitiva dos dados locais?"
        )
      ) {
        if (persist([])) {
          resetForm();
          render();
        }
      }
    }
  );

  $("calc-toggle").addEventListener(
    "click",
    () =>
      $("calculator").classList.toggle("hidden")
  );

  $("calc-close").addEventListener(
    "click",
    () =>
      $("calculator").classList.add("hidden")
  );

  initCalculator();
  render();

  window.addEventListener(
    "storage",
    event => {
      if (
        event.key === AGENDA_KEY ||
        event.key === KEY
      ) {
        if (event.key === KEY) {
          entries = readData();
        }

        render();
      }
    }
  );

  window.addEventListener("focus", () => {
    renderNextMonthForecast();
  });
}

document.addEventListener(
  "DOMContentLoaded",
  init
);
