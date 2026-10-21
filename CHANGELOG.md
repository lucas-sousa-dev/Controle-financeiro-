
# CHANGELOG - Gestão Financeira

Histórico das principais etapas de desenvolvimento do sistema.

As versões abaixo organizam os marcos do projeto. As datas exatas de cada alteração podem ser consultadas nos commits do GitHub.

## Versão 1.3 - Outubro de 2026

### Aplicativo PWA

Implementado:

- Manifesto do aplicativo.
- Service Worker.
- Ícones personalizados GF.
- Configuração de instalação no Android.
- Abertura em janela independente.
- Cache de arquivos essenciais.

Testado:

- Instalação pelo Chrome no Android.
- Exibição correta do ícone GF.
- Abertura sem barra de endereço.
- Funcionamento das movimentações e da agenda.
- Acesso aos dados anteriormente salvos no Chrome.

Pendente:

- Teste completo de funcionamento offline.
- Validação das atualizações do cache.

## Versão 1.2 - Outubro de 2026

### Agenda Financeira

Implementado:

- Cadastro de provisões.
- Contas únicas.
- Compras parceladas.
- Contas recorrentes.
- Geração de vencimentos.
- Cálculo de parcelas.
- Informação de valor total ou por parcela.
- Registro de parcelas já pagas.
- Resumo de valores previstos, pagos e pendentes.
- Registro e reversão de pagamentos.
- Edição e exclusão de provisões.
- Previsão de pagamentos do próximo mês.
- Backup e restauração da agenda.

## Versão 1.1 - Outubro de 2026

### Controle financeiro

Implementado:

- Cadastro de receitas e despesas.
- Edição e exclusão de movimentações.
- Histórico mensal.
- Saldo acumulado.
- Resumo por categorias.
- Pesquisa de movimentações.
- Calculadora integrada.
- Exportação CSV.
- Impressão e PDF pelo navegador.
- Backup e restauração em JSON.

Melhorias:

- Organização da interface.
- Adaptação para dispositivos móveis.
- Validação de formulários.
- Persistência dos registros financeiros.

## Versão 1.0 - Versão inicial

### Estrutura do sistema

Implementado:

- Estrutura HTML.
- Identidade visual CSS.
- Programação JavaScript.
- Cadastro básico de movimentações.
- Cálculo de saldo.
- Armazenamento local.
- Publicação pelo GitHub Pages.
- Versionamento pelo GitHub.

## Próximas etapas

- Testar o PWA sem internet.
- Aperfeiçoar relatórios.
- Criar manual técnico de estudos.
- Documentar as funções JavaScript.
- Ampliar os testes.
- Estudar futuras funcionalidades de sincronização e notificações.

## Observações

- Os registros financeiros são armazenados localmente.
- Não existe banco de dados remoto nesta versão.
- O sistema não possui autenticação.
- Os backups da agenda e das movimentações são separados.
- O histórico de commits do GitHub registra as alterações técnicas.

## Desenvolvedor

Lucas Sousa

Repositório:
https://github.com/lucas-sousa-dev/Controle-financeiro-/
