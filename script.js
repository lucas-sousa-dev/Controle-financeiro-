
const formulario = document.getElementById("formulario");
const descricao = document.getElementById("descricao");
const valor = document.getElementById("valor");
const tipo = document.getElementById("tipo");
const lista = document.getElementById("lista-movimentacoes");
const receitas = document.getElementById("receitas");
const despesas = document.getElementById("despesas");
const saldo = document.getElementById("saldo");

let movimentacoes = JSON.parse(localStorage.getItem("movimentacoes") || "[]");

const formatar = numero => numero.toLocaleString("pt-BR", {
  style: "currency",
  currency: "BRL"
});

function atualizarTela() {
  lista.innerHTML = "";
  let totalReceitas = 0;
  let totalDespesas = 0;

  movimentacoes.forEach(mov => {
    if (mov.tipo === "receita") {
      totalReceitas += mov.valor;
    } else {
      totalDespesas += mov.valor;
    }

    const item = document.createElement("li");
    item.textContent = `${mov.descricao} - ${formatar(mov.valor)} (${mov.tipo})`;
    lista.appendChild(item);
  });

  receitas.textContent = formatar(totalReceitas);
  despesas.textContent = formatar(totalDespesas);
  saldo.textContent = formatar(totalReceitas - totalDespesas);
}

formulario.addEventListener("submit", function(evento) {
  evento.preventDefault();

  const numero = Number(valor.value);
  if (!descricao.value.trim() || !Number.isFinite(numero) || numero <= 0) {
    alert("Preencha a descrição e um valor maior que zero.");
    return;
  }

  movimentacoes.push({
    descricao: descricao.value.trim(),
    valor: numero,
    tipo: tipo.value
  });

  localStorage.setItem("movimentacoes", JSON.stringify(movimentacoes));
  atualizarTela();
  formulario.reset();
});

atualizarTela();
  
