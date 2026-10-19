
"use strict";

/* AGENDA FINANCEIRA — VERSÃO 1.1 */

(() => {
  const AGENDA_KEY = "gestao-financeira-agenda-v1";
function parseValorBR(texto) {
  const valor = String(texto).trim();

  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(valor)) {
    return NaN;
  }

  return Number(valor.replace(/\./g, "").replace(",", "."));
}
  const byId = id => document.getElementById(id);

  const currency = value =>
    Number(value).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });

  const uid = () =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const isoToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const formatDate = s => s.split("-").reverse().join("/");

  const validISO = s => {
    if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return false;
    }

    const [y, m, d] = s.split("-").map(Number);
    const date = new Date(y, m - 1, d);

    return date.getFullYear() === y &&
      date.getMonth() === m - 1 &&
      date.getDate() === d;
  };

  const addMonths = (start, offset) => {
    const [y, m, d] = start.split("-").map(Number);
    const first = new Date(y, m - 1 + offset, 1);
    const last = new Date(
      first.getFullYear(),
      first.getMonth() + 1,
      0
    ).getDate();

    return `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
  };

  const roundCents = value =>
    Math.round((value + Number.EPSILON) * 100);

  const validItem = x =>
    x &&
    typeof x.id === "string" &&
    x.id.length < 100 &&
    typeof x.descricao === "string" &&
    x.descricao.trim().length > 0 &&
    x.descricao.length <= 100 &&
    typeof x.categoria === "string" &&
    x.categoria.length <= 80 &&
    validISO(x.vencimento) &&
    Number.isInteger(x.centavos) &&
    x.centavos > 0 &&
    x.centavos <= 1e14 &&
    Number.isInteger(x.parcela) &&
    x.parcela >= 1 &&
    Number.isInteger(x.totalParcelas) &&
    x.totalParcelas >= x.parcela &&
    x.totalParcelas <= 120;

  let agenda = [];
  let editing = null;

  // ARMAZENAMENTO

  function save(next) {
    try {
      localStorage.setItem(AGENDA_KEY, JSON.stringify(next));
      agenda = next;
      return true;
    } catch {
      alert("Não foi possível salvar a agenda. Confira o armazenamento do navegador.");
      return false;
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(AGENDA_KEY);

      if (!raw) return [];

      const parsed = JSON.parse(raw);

      if (
        !Array.isArray(parsed) ||
        !parsed.every(validItem) ||
        new Set(parsed.map(x => x.id)).size !== parsed.length
      ) {
        throw Error("Formato inválido");
      }

      return parsed;
    } catch {
      alert("A agenda salva não pôde ser lida. Nenhum dado foi apagado. Faça uma cópia antes de continuar.");

      byId("agenda-form")
        .querySelector("button[type=submit]")
        .disabled = true;

      return [];
    }
  }

  // VÍNCULO COM MOVIMENTAÇÕES

  function linkedEntry(item) {
    return entries.find(e => e.id === `agenda-${item.id}`);
  }

  function status(item) {
    if (linkedEntry(item)) return "Pago";

    return item.vencimento < isoToday()
      ? "Atrasado"
      : "Pendente";
  }

  // FORMULÁRIO

  function reset() {
    editing = null;

    byId("agenda-form").reset();
    byId("agenda-vencimento").value = isoToday();
    byId("agenda-tipo").value = "unica";
    byId("agenda-quantidade").value = 1;

    byId("agenda-form-title").textContent = "Nova provisão";
    byId("agenda-save").textContent = "Cadastrar provisão";
    byId("agenda-cancel").classList.add("hidden");

    toggleQuantity();
  }

  
function toggleQuantity() {
  const tipo = byId("agenda-tipo").value;
  const editando = !!editing;

  const parcelada = tipo === "parcelada" && !editando;
  const multipla = tipo !== "unica" && !editando;

  byId("agenda-quantidade-label").classList.toggle(
    "hidden", !multipla
  );

  byId("agenda-pagas-label").classList.toggle(
    "hidden", !parcelada
  );

  byId("agenda-valor-modo-label").classList.toggle(
    "hidden", !parcelada
  );

  byId("agenda-calculo").classList.toggle(
    "hidden", !parcelada
  );

  byId("agenda-valor-label").firstChild.textContent =
    parcelada
      ? "Valor informado (R$) "
      : "Valor (R$) ";

  atualizarCalculoParcelas();
}

function atualizarCalculoParcelas() {
  const tipo = byId("agenda-tipo").value;

  if (tipo !== "parcelada" || editing) return;

  const valor = parseValorBR(byId("agenda-valor").value);
  const quantidade = Number(byId("agenda-quantidade").value);
  const pagas = Number(byId("agenda-pagas").value);
  const modo = byId("agenda-valor-modo").value;

  const valido =
    Number.isFinite(valor) &&
    valor > 0 &&
    Number.isInteger(quantidade) &&
    quantidade >= 1 &&
    quantidade <= 120 &&
    Number.isInteger(pagas) &&
    pagas >= 0 &&
    pagas <= quantidade;

  if (!valido) {
    byId("agenda-calculo-total").textContent =
      "Informe valores válidos para visualizar o cálculo.";

    byId("agenda-calculo-pago").textContent = "";
    byId("agenda-calculo-restante").textContent = "";
    return;
  }

  const totalCentavos = roundCents(
    modo === "parcela" ? valor * quantidade : valor
  );

  const base = Math.floor(totalCentavos / quantidade);
  const resto = totalCentavos % quantidade;

  const pagoCentavos =
    base * pagas + Math.min(pagas, resto);

  const restanteCentavos = totalCentavos - pagoCentavos;

  byId("agenda-calculo-total").textContent =
    `Valor total: ${currency(totalCentavos / 100)}`;

  byId("agenda-calculo-pago").textContent =
    `Já pago (${pagas} parcelas): ${currency(pagoCentavos / 100)}`;

  byId("agenda-calculo-restante").textContent =
    `Restante (${quantidade - pagas} parcelas): ${currency(restanteCentavos / 100)}`;
}


  function submit(ev) {
    ev.preventDefault();

    const descricao = byId("agenda-descricao").value.trim();
    const valor = parseValorBR(byId("agenda-valor").value);
    const centavos = roundCents(valor);
    const vencimento = byId("agenda-vencimento").value;
    const categoria = byId("agenda-categoria").value;
    const tipo = byId("agenda-tipo").value;

    const quantidade =
      tipo === "unica" || editing
        ? 1
        : Number(byId("agenda-quantidade").value);

    if (
      !descricao ||
      descricao.length > 100 ||
      !validISO(vencimento) ||
      !Number.isSafeInteger(centavos) ||
      centavos < 1 ||
      centavos > 1e14 ||
      !Number.isInteger(quantidade) ||
      quantidade < 1 ||
      quantidade > 120
    ) {
      alert("Confira descrição, valor, vencimento e quantidade (máximo 120).");
      return;
    }

    // EDIÇÃO DE UMA PROVISÃO

    if (editing) {
      const item = agenda.find(x => x.id === editing);

      if (!item) return;

      if (linkedEntry(item)) {
        alert("Desfaça o pagamento antes de editar esta provisão.");
        return;
      }

      const next = agenda.map(x =>
        x.id === editing
          ? { ...x, descricao, categoria, vencimento, centavos }
          : x
      );

      if (save(next)) {
        reset();
        renderAgenda();
      }

      return;
    }

    // CRIAÇÃO DE PROVISÕES E PARCELAS

    const group = uid();
    const count = tipo === "unica" ? 1 : quantidade;

    const base = Math.floor(centavos / quantidade);
    const remainder = centavos % quantidade;

    const items = Array.from({ length: count }, (_, i) => ({
      id: uid(),
      group,
      descricao,
      categoria,

      vencimento:
        tipo === "unica"
          ? vencimento
          : addMonths(vencimento, i),

      centavos:
        tipo === "parcelada"
          ? base + (i < remainder ? 1 : 0)
          : centavos,

      parcela: i + 1,
      totalParcelas: count,
      modalidade: tipo
    }));

    if (items.some(x => x.centavos < 1)) {
      alert("O valor total é insuficiente para essa quantidade de parcelas.");
      return;
    }

    if (save([...agenda, ...items])) {
      reset();
      renderAgenda();
    }
  }

  // CONFIRMAR PAGAMENTO

  function pay(item) {
    if (linkedEntry(item)) return;

    const data = prompt(
      `Data do pagamento de ${item.descricao} (AAAA-MM-DD):`,
      isoToday()
    );

    if (data === null) return;

    if (!validISO(data)) {
      alert("Data inválida. Use AAAA-MM-DD.");
      return;
    }

    const entry = {
      id: `agenda-${item.id}`,

      descricao:
        `${item.descricao}${
          item.totalParcelas > 1
            ? ` (${item.parcela}/${item.totalParcelas})`
            : ""
        }`,

      valor: item.centavos / 100,
      data,
      tipo: "despesa",
      categoria: item.categoria
    };

    if (!validEntry(entry)) {
      alert("Não foi possível validar o lançamento.");
      return;
    }

    if (persist([...entries, entry])) {
      render();
      renderAgenda();
    }
  }

  // DESFAZER PAGAMENTO

  function undo(item) {
    if (
      !linkedEntry(item) ||
      !confirm(
        `Desfazer pagamento de "${item.descricao}"? O lançamento correspondente será removido.`
      )
    ) {
      return;
    }

    if (
      persist(
        entries.filter(e => e.id !== `agenda-${item.id}`)
      )
    ) {
      render();
      renderAgenda();
    }
  }

  // EDITAR PROVISÃO

  function edit(item) {
    if (linkedEntry(item)) {
      alert("Desfaça o pagamento antes de editar.");
      return;
    }

    editing = item.id;

    byId("agenda-descricao").value = item.descricao;
    byId("agenda-valor").value = (item.centavos / 100).toLocaleString("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});
    byId("agenda-vencimento").value = item.vencimento;
    byId("agenda-categoria").value = item.categoria;
    byId("agenda-tipo").value = "unica";

    byId("agenda-form-title").textContent = "Editar provisão";
    byId("agenda-save").textContent = "Salvar alterações";
    byId("agenda-cancel").classList.remove("hidden");

    toggleQuantity();

    byId("agenda-form").scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }

  // EXCLUIR PROVISÃO

  function remove(item) {
    if (linkedEntry(item)) {
      alert("Desfaça o pagamento antes de excluir esta provisão.");
      return;
    }

    if (
      !confirm(
        `Excluir provisão "${item.descricao}" de ${formatDate(item.vencimento)}?`
      )
    ) {
      return;
    }

    if (save(agenda.filter(x => x.id !== item.id))) {
      if (editing === item.id) reset();
      renderAgenda();
    }
  }

  // BOTÕES DA AGENDA

  function button(label, action, className = "outline") {
    const el = document.createElement("button");

    el.type = "button";
    el.className = className;
    el.textContent = label;
    el.addEventListener("click", action);

    return el;
  }

  // EXIBIÇÃO DA AGENDA

  function renderAgenda() {
    const month =
      byId("agenda-mes").value || isoToday().slice(0, 7);

    const list = agenda
      .filter(x => x.vencimento.slice(0, 7) === month)
      .sort((a, b) =>
        a.vencimento.localeCompare(b.vencimento)
      );

    const paid = list
      .filter(x => status(x) === "Pago")
      .reduce((sum, x) => sum + x.centavos, 0);

    const pending = list
      .filter(x => status(x) !== "Pago")
      .reduce((sum, x) => sum + x.centavos, 0);

    byId("agenda-previsto").textContent =
      currency((paid + pending) / 100);

    byId("agenda-pago").textContent =
      currency(paid / 100);

    byId("agenda-pendente").textContent =
      currency(pending / 100);

    const root = byId("agenda-lista");
    root.replaceChildren();

    if (!list.length) {
      const p = document.createElement("p");

      p.className = "empty";
      p.textContent = "Nenhuma provisão neste mês.";

      root.append(p);
      return;
    }

    for (const item of list) {
      const state = status(item);

      const card = document.createElement("article");
      card.className = "agenda-item";

      const top = document.createElement("div");
      top.className = "agenda-item-top";

      const name = document.createElement("strong");

      name.textContent =
        `${item.descricao}${
          item.totalParcelas > 1
            ? ` — ${item.parcela}/${item.totalParcelas}`
            : ""
        }`;

      const badge = document.createElement("span");

      badge.className =
        `agenda-status ${state.toLowerCase()}`;

      badge.textContent = state;

      top.append(name, badge);

      const detail = document.createElement("p");

      detail.textContent =
        `Vence: ${formatDate(item.vencimento)} · ${item.categoria} · ${currency(item.centavos / 100)}`;

      const actions = document.createElement("div");
      actions.className = "agenda-actions";

      if (state === "Pago") {
        actions.append(
          button(
            "Desfazer pagamento",
            () => undo(item)
          )
        );
      } else {
        actions.append(
          button(
            "Marcar como pago",
            () => pay(item)
          ),
          button(
            "Editar",
            () => edit(item)
          ),
          button(
            "Excluir",
            () => remove(item),
            "danger-btn"
          )
        );
      }

      card.append(top, detail, actions);
      root.append(card);
    }
  }

  // BACKUP DA AGENDA

  function backupAgenda() {
    const payload = {
      app: "gestao-financeira-agenda",
      version: 1,
      exportedAt: new Date().toISOString(),
      items: agenda
    };

    const blob = new Blob(
      [JSON.stringify(payload, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `backup-agenda-${isoToday()}.json`;

    document.body.append(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // RESTAURAR BACKUP DA AGENDA

  function restoreAgenda(file) {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Arquivo muito grande.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);

        if (
          data.app !== "gestao-financeira-agenda" ||
          data.version !== 1 ||
          !Array.isArray(data.items) ||
          data.items.length > 50000 ||
          !data.items.every(validItem) ||
          new Set(data.items.map(x => x.id)).size !== data.items.length
        ) {
          throw Error("Arquivo inválido");
        }

        if (
          !confirm(
            "Substituir todas as provisões atuais pelas provisões do backup? As movimentações não serão alteradas."
          )
        ) {
          return;
        }

        if (save(data.items)) {
          reset();
          renderAgenda();
          alert("Agenda restaurada.");
        }
      } catch {
        alert("Backup da agenda inválido ou incompatível.");
      } finally {
        byId("agenda-restore").value = "";
      }
    };

    reader.onerror = () =>
      alert("Erro ao ler o arquivo.");

    reader.readAsText(file);
  }

  // INICIALIZAÇÃO DA AGENDA

  document.addEventListener("DOMContentLoaded", () => {
    if (!byId("agenda-form")) return;

    agenda = load();

    byId("agenda-mes").value = isoToday().slice(0, 7);

    byId("agenda-form").addEventListener(
      "submit",
      submit
    );

    byId("agenda-tipo").addEventListener(
      "change",
      toggleQuantity
    );


    
[
  "agenda-valor",
  "agenda-quantidade",
  "agenda-pagas",
  "agenda-valor-modo"
].forEach(id => {
  byId(id).addEventListener(
    "input",
    atualizarCalculoParcelas
  );

  byId(id).addEventListener(
    "change",
    atualizarCalculoParcelas
  );
});


    
    byId("agenda-cancel").addEventListener(
      "click",
      reset
    );

    byId("agenda-mes").addEventListener(
      "change",
      renderAgenda
    );

    byId("agenda-backup").addEventListener(
      "click",
      backupAgenda
    );

    byId("agenda-restore").addEventListener(
      "change",
      e => restoreAgenda(e.target.files[0])
    );

    byId("mes").addEventListener("change", () => {
      byId("agenda-mes").value = byId("mes").value;
      renderAgenda();
    });

    reset();
    renderAgenda();

    const observer = new MutationObserver(
      () => renderAgenda()
    );

    observer.observe(
      byId("lista-movimentacoes"),
      { childList: true }
    );
  });
})();

