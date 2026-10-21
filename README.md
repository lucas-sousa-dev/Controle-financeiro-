
# Gestão Financeira

Sistema de controle financeiro desenvolvido com HTML, CSS e JavaScript.

## Sobre o projeto

O Gestão Financeira é um projeto pessoal de desenvolvimento web criado para organizar receitas, despesas, pagamentos e compromissos financeiros.

Foi desenvolvido como ferramenta de aprendizado e portfólio profissional, com foco em pessoas físicas, autônomos, MEIs e pequenos negócios.

## Acessar o aplicativo

https://lucas-sousa-dev.github.io/Controle-financeiro-/

## Tecnologias utilizadas

- HTML5: estrutura da aplicação.
- CSS3: aparência e adaptação às telas.
- JavaScript: cálculos, funções e interatividade.
- localStorage: armazenamento local dos dados.
- JSON: backup e restauração.
- CSV: exportação de movimentações.
- Git e GitHub: versionamento do código.
- GitHub Pages: publicação do sistema.
- PWA: instalação como aplicativo.
- Service Worker: armazenamento em cache para suporte offline.

## Funcionalidades implementadas

### Controle financeiro

- Cadastro de receitas e despesas.
- Edição e exclusão de movimentações.
- Resumo mensal de receitas e despesas.
- Resultado financeiro e saldo acumulado.
- Histórico mensal.
- Pesquisa de movimentações.
- Resumo por categoria.
- Calculadora integrada.
- Exportação CSV.
- Impressão e PDF pelo navegador.

### Agenda Financeira

- Cadastro de contas únicas.
- Compras parceladas.
- Contas recorrentes.
- Cálculo de parcelas e valores restantes.
- Registro de parcelas já pagas.
- Organização por mês e vencimento.
- Registro e reversão de pagamentos.
- Edição e exclusão de provisões.
- Previsão de pagamentos do próximo mês.

### Armazenamento e backup

- Armazenamento local no navegador.
- Backup e restauração das movimentações em JSON.
- Backup e restauração da Agenda Financeira em JSON.

### Aplicativo PWA

- Instalação no Android.
- Ícone personalizado GF.
- Abertura sem barra do navegador.
- Manifesto de instalação.
- Service Worker para cache de arquivos.

A instalação no Android foi testada com sucesso. O funcionamento totalmente offline ainda precisa ser testado.

## Estrutura do projeto

- index.html: estrutura principal.
- style.css: aparência geral.
- agenda.css: aparência da agenda.
- script.js: movimentações, saldos, histórico e ferramentas.
- agenda.js: contas, parcelas e pagamentos.
- manifest.webmanifest: configuração do aplicativo.
- service-worker.js: cache e suporte offline.
- icon-192.png: ícone do aplicativo.
- icon-512.png: ícone do aplicativo.
- README.md: documentação geral.
- CHANGELOG.md: histórico de atualizações.

## Segurança dos dados

Os registros ficam armazenados localmente.

O GitHub Pages hospeda o código do sistema, mas não armazena os dados financeiros dos usuários.

Não existe sincronização automática entre navegadores ou dispositivos.

É importante realizar backups regularmente, pois a limpeza dos dados do navegador ou do aplicativo pode apagar os registros.

O sistema é uma ferramenta gerencial e não substitui serviços contábeis ou fiscais.

## Aprendizado

Este projeto permite estudar:

- HTML e CSS.
- Lógica de programação.
- Funções e eventos JavaScript.
- Manipulação do DOM.
- Arrays e objetos.
- Formulários e validações.
- Cálculos e tratamento de datas.
- Armazenamento local.
- Exportação e importação de dados.
- Desenvolvimento PWA.
- Git, GitHub e documentação.

## Próximas melhorias

- Testar o funcionamento offline.
- Aperfeiçoar relatórios financeiros.
- Melhorar os testes do sistema.
- Criar documentação técnica das funções.
- Avaliar futuras opções de sincronização e autenticação.
- Estudar notificações de vencimentos.

## Desenvolvedor

Lucas Sousa

Projeto pessoal de desenvolvimento e aprendizado em tecnologia.

Repositório:
https://github.com/lucas-sousa-dev/Controle-financeiro-/
