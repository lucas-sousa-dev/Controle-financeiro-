
"use strict";

const $ = id => document.getElementById(id);
const KEY = "gestao-financeira-v1";
const OLD_KEY = "movimentacoes";

const money = value => Number(value).toLocaleString("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

const makeId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const validDate = value =>
  /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value) &&
  !Number.isNaN(new Date(`${value}T12:00:00`).getTime()) &&
  new Date(`${value}T12:00:00`).toISOString().slice(0,10) === value;

const validEntry = e =>
  e &&
  typeof e.id === "string" &&
  typeof e.descricao === "string" &&
  e.descricao.trim().length > 0 &&
  e.descricao.length <= 100 &&
  typeof e.categoria === "string" &&
  e.categoria.length <= 80 &&
  ["receita","despesa"].includes(e.tipo) &&
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
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (Array.isArray(saved)) return saved.filter(validEntry);
  } catch (e) {
    console.warn("Dados locais inválidos", e);
  }

  try {
    const old = JSON.parse(localStorage.getItem(OLD_KEY) || "null");

    if (Array.isArray(old)) {
      const converted = old
        .filter(x => x && Number(x.valor) > 0 &&
          ["receita","despesa"].includes(x.tipo))
        .map(x => ({
          id: makeId(),
          descricao: String(x.descricao || "Lançamento").slice(0,100),
          valor: Number(x.valor),
          tipo: x.tipo,
          categoria: "Outros",
          data: today()
        }))
        .filter(validEntry);

      if (converted.length) {
        localStorage.setItem(KEY, JSON.stringify(converted));
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
  } catch (e) {
    alert("Não foi possível salvar. Verifique o armazenamento e faça backup.");
    return false;
  }
}

// CÁLCULOS FINANCEIROS

function setColor(el, value) {
  el.classList.remove("positivo","negativo","zerado");
  el.classList.add(
    value > 0 ? "positivo" :
    value < 0 ? "negativo" : "zerado"
  );
}

function selectedMonth() {
  return $("mes").value || today().slice(0,7);
}

function monthEntries() {
  return entries.filter(e => e.data.slice(0,7) === selectedMonth());
}

function total(list, tipo) {
  return list
    .filter(e => e.tipo === tipo)
    .reduce((sum,e) => sum + e.valor, 0);
}

function element(tag, className, content) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (content !== undefined) el.textContent = content;
  return el;
}

// ATUALIZAÇÃO DO PAINEL

function render() {
  const month = selectedMonth();
  const list = monthEntries();

  const revenue = total(list,"receita");
  const expense = total(list,"despesa");
  const result = revenue - expense;

  const through = entries.filter(e => e.data.slice(0,7) <= month);
  const balance = total(through,"receita") - total(through,"despesa");

  $("receitas").textContent = money(revenue);
  $("despesas").textContent = money(expense);
  $("resultado").textContent = money(result);
  $("saldo").textContent = money(balance);

  setColor($("resultado"), result);
  setColor($("saldo"), balance);

  const [year,mon] = month.split("-").map(Number);

  $("periodo-label").textContent =
    new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric"
    }).format(new Date(year,mon-1,1));

  renderCategories(list);
  renderHistory();
  renderEntries(list);
}

// RESUMO POR CATEGORIA

function renderCategories(list) {
  const root = $("categorias-resumo");
  root.replaceChildren();

  const sums = new Map();

  list.filter(e => e.tipo === "despesa").forEach(e => {
    sums.set(e.categoria, (sums.get(e.categoria) || 0) + e.valor);
  });

  const items = [...sums.entries()].sort((a,b) => b[1]-a[1]);

  if (!items.length) {
    root.append(element("p","empty","Nenhuma despesa neste mês."));
    return;
  }

  const max = items[0][1];

  items.forEach(([name,value]) => {
    const wrapper = element("div");
    const line = element("div","category-row");

    line.append(
      element("span","",name),
      element("strong","",money(value))
    );

    const bar = element("div","category-bar");
    const fill = element("div","category-fill");

    fill.style.width = `${Math.min(100,value/max*100)}%`;
    bar.append(fill);
    wrapper.append(line,bar);
    root.append(wrapper);
  });
}

// HISTÓRICO MENSAL

function renderHistory() {

function renderHistory() {
  const root = $("historico");
  root.replaceChildren();

  const year = Number($("ano").value) ||
    new Date().getFullYear();

  const months = [...new Set(
    entries
      .filter(e => Number(e.data.slice(0,4)) === year)
      .map(e => e.data.slice(0,7))
  )].sort().reverse();

  if (months.length === 0) {
    root.append(
      element(
        "p",
        "empty",
        "Nenhuma movimentação registrada neste ano."
      )
    );
    return;
  }

  months.forEach(key => {
    const list = entries.filter(
      e => e.data.slice(0,7) === key
    );

    const result =
      total(list,"receita") -
      total(list,"despesa");

    const [y,m] = key.split("-").map(Number);

    const name = new Intl.DateTimeFormat("pt-BR", {
      month:"long"
    }).format(new Date(y,m-1,1));

    const btn = element("button","month-card");
    btn.type = "button";

    if (key === selectedMonth()) {
      btn.classList.add("active");
    }

    btn.classList.add(
      result < 0 ? "negative" : "positive"
    );

    btn.append(
      element("span","",name),
      element(
        "strong",
        result < 0 ? "negativo" :
        result > 0 ? "positivo" : "zerado",
        money(result)
      ),
      element(
        "small",
        "",
        `${list.length} lançamento(s)`
      )
    );

    btn.addEventListener("click",() => {
      $("mes").value = key;
      $("busca").value = "";
      render();

      $("lista-movimentacoes").scrollIntoView({
        behavior:"smooth",
        block:"nearest"
      });
    });

    root.append(btn);
  });
}


// LISTA DE MOVIMENTAÇÕES

function renderEntries(list) {
  const root = $("lista-movimentacoes");
  root.replaceChildren();

  const q = $("busca").value.trim().toLocaleLowerCase("pt-BR");

  const filtered = list
    .filter(e => `${e.descricao} ${e.categoria}`
      .toLocaleLowerCase("pt-BR").includes(q))
    .sort((a,b) => b.data.localeCompare(a.data));

  if (!filtered.length) {
    root.append(element("p","empty","Nenhuma movimentação encontrada."));
    return;
  }

  filtered.forEach(e => {
    const row = element("div","entry");
    const info = element("div","entry-info");
    const right = element("div","entry-right");

    const date = e.data.split("-").reverse().join("/");

    info.append(
      element("strong","",e.descricao),
      element("small","",`${date} · ${e.categoria} · ${e.tipo}`)
    );

    const amount = element(
      "strong",
      e.tipo === "receita" ? "positivo" : "negativo",
      `${e.tipo === "receita" ? "+" : "−"} ${money(e.valor)}`
    );

    const edit = element("button","outline","Editar");
    edit.type = "button";
    edit.addEventListener("click",() => editEntry(e.id));

    const remove = element("button","danger-btn","Excluir");
    remove.type = "button";
    remove.addEventListener("click",() => deleteEntry(e.id));

    right.append(amount,edit,remove);
    row.append(info,right);
    root.append(row);
  });
}

// EDITAR E EXCLUIR

function resetForm() {
  editingId = null;
  $("formulario").reset();
  $("data").value = today();
  $("form-title").textContent = "Nova movimentação";
  $("save").textContent = "Adicionar movimentação";
  $("cancel-edit").classList.add("hidden");
}

function editEntry(id) {
  const e = entries.find(x => x.id === id);
  if (!e) return;

  editingId = id;
  $("descricao").value = e.descricao;
  $("valor").value = e.valor;
  $("data").value = e.data;
  $("tipo").value = e.tipo;
  $("categoria").value = e.categoria;

  $("form-title").textContent = "Editar movimentação";
  $("save").textContent = "Salvar alterações";
  $("cancel-edit").classList.remove("hidden");

  $("formulario").scrollIntoView({
    behavior:"smooth",
    block:"center"
  });

  $("descricao").focus();
}

function deleteEntry(id) {
  const e = entries.find(x => x.id === id);

  if (!e || !confirm(`Excluir a movimentação "${e.descricao}"?`)) {
    return;
  }

  if (persist(entries.filter(x => x.id !== id))) {
    if (editingId === id) resetForm();
    render();
  }
}

// EXPORTAÇÃO DE ARQUIVOS

function download(content,filename,type) {
  const blob = new Blob([content],{type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url),1000);
}

function exportCsv() {
  const list = [...monthEntries()].sort((a,b) =>
    a.data.localeCompare(b.data));

  const rows = [
    ["Data","Descrição","Categoria","Tipo","Valor (R$)"],
    ...list.map(e => [
      e.data.split("-").reverse().join("/"),
      e.descricao,
      e.categoria,
      e.tipo,
      e.tipo === "despesa" ? -e.valor : e.valor
    ])
  ];

  const csv = "\uFEFF" + rows.map(r =>
    r.map(v =>
      `"${String(typeof v === "number"
        ? v.toFixed(2).replace(".",",")
        : v).replace(/"/g,'""')}"`
    ).join(";")
  ).join("\r\n");

  download(csv,`financeiro-${selectedMonth()}.csv`,
    "text/csv;charset=utf-8");
}

// BACKUP E RESTAURAÇÃO

function backup() {
  download(
    JSON.stringify({
      app:"gestao-financeira",
      version:1,
      exportedAt:new Date().toISOString(),
      entries
    },null,2),
    `backup-financeiro-${today()}.json`,
    "application/json;charset=utf-8"
  );
}

function restore(file) {
  if (!file) return;

  if (file.size > 10*1024*1024) {
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
        new Set(data.entries.map(e => e.id)).size !== data.entries.length
      ) {
        throw Error("Backup inválido");
      }

      if (!confirm(
        `Restaurar ${data.entries.length} lançamentos? Os dados atuais serão substituídos.`
      )) return;

      if (persist(data.entries)) {
        resetForm();
        render();
        alert("Backup restaurado com sucesso.");
      }
    } catch (e) {
      alert("Arquivo de backup inválido ou incompatível.");
    } finally {
      $("restore").value = "";
    }
  };

  reader.onerror = () => alert("Não foi possível ler o arquivo.");
  reader.readAsText(file);
}

// CALCULADORA

function initCalculator() {
  const root = $("calc-keys");
  const keys = [
    "7","8","9","÷",
    "4","5","6","×",
    "1","2","3","−",
    "C","0",".","+","="
  ];

  keys.forEach(key => {
    const b = element("button","",key);
    b.type = "button";

    if (key === "=") b.style.gridColumn = "span 4";

    b.addEventListener("click",() => calcPress(key));
    root.append(b);
  });
}

function calculate(a,b,op) {
  if (op === "+") return a+b;
  if (op === "−") return a-b;
  if (op === "×") return a*b;
  return b === 0 ? NaN : a/b;
}

function calcPress(key) {
  const out = $("calc-display");
  let display = out.textContent;

  if (key === "C") {
    out.textContent = "0";
    calcFirst = null;
    calcOp = null;
    calcFresh = false;
    return;
  }

  if (["+","−","×","÷"].includes(key)) {
    if (calcOp !== null && calcFirst !== null && !calcFresh) {
      const v = calculate(calcFirst,Number(display),calcOp);

      if (!Number.isFinite(v)) {
        out.textContent = "Erro";
        calcFirst = null;
        calcOp = null;
        return;
      }

      calcFirst = v;
      out.textContent = String(Number(v.toFixed(8)));
    } else {
      calcFirst = Number(display);
    }

    calcOp = key;
    calcFresh = true;
    return;
  }

  if (key === "=") {
    if (calcOp !== null && calcFirst !== null) {
      const v = calculate(calcFirst,Number(display),calcOp);

      out.textContent = Number.isFinite(v)
        ? String(Number(v.toFixed(8)))
        : "Erro";

      calcFirst = null;
      calcOp = null;
      calcFresh = true;
    }
    return;
  }

  if (key === ".") {
    if (calcFresh || display === "Erro") {
      out.textContent = "0.";
      calcFresh = false;
    } else if (!display.includes(".")) {
      out.textContent += ".";
    }
    return;
  }

  out.textContent =
    calcFresh || display === "0" || display === "Erro"
      ? key
      : display.length < 15 ? display+key : display;

  calcFresh = false;
}

// INICIALIZAÇÃO DO SISTEMA

function init() {
  entries = readData();

  $("mes").value = today().slice(0,7);
  $("ano").value = today().slice(0,4);
  $("data").value = today();

  $("formulario").addEventListener("submit",event => {
    event.preventDefault();

    const e = {
      id:editingId || makeId(),
      descricao:$("descricao").value.trim(),
      valor:Number($("valor").value),
      data:$("data").value,
      tipo:$("tipo").value,
      categoria:$("categoria").value
    };

    if (!validEntry(e)) {
      alert("Confira descrição, valor, tipo e data.");
      return;
    }

    const next = editingId
      ? entries.map(x => x.id === editingId ? e : x)
      : [...entries,e];

    if (persist(next)) {
      $("mes").value = e.data.slice(0,7);
      $("ano").value = e.data.slice(0,4);
      resetForm();
      render();
    }
  });

  $("cancel-edit").addEventListener("click",resetForm);

  $("mes").addEventListener("change",() => {
    $("ano").value = selectedMonth().slice(0,4);
    render();
  });

  $("ano").addEventListener("change",render);
  $("busca").addEventListener("input",render);

  $("export-csv").addEventListener("click",exportCsv);
  $("print").addEventListener("click",() => window.print());

  $("backup").addEventListener("click",backup);

  $("restore").addEventListener("change",event =>
    restore(event.target.files[0]));

  $("clear").addEventListener("click",() => {
    if (
      confirm("ATENÇÃO: apagar TODOS os lançamentos? Faça backup antes.") &&
      confirm("Confirma a exclusão definitiva dos dados locais?")
    ) {
      if (persist([])) {
        resetForm();
        render();
      }
    }
  });

  $("calc-toggle").addEventListener("click",() =>
    $("calculator").classList.toggle("hidden"));

  $("calc-close").addEventListener("click",() =>
    $("calculator").classList.add("hidden"));

  initCalculator();
  render();
}

document.addEventListener("DOMContentLoaded",init);
