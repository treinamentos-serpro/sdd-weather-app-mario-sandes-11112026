# Backlog Técnico — Weather App

Backlog derivado de [weather-app-plan.md](../plans/weather-app-plan.md), que
consome [weather-app-spec.md](../specs/weather-app-spec.md). As tarefas estão
ordenadas por fase de implementação e cada dependência registra um
pré-requisito necessário.

**Prioridade:** P0 = essencial para a primeira entrega funcional ou gate de
lançamento; P1 = qualidade importante, pode vir após a primeira fatia funcional.
**Tamanho relativo:** P = pequeno (até meio dia), M = médio (cerca de 1 dia),
G = grande (mais de 1 dia ou múltiplas superfícies).
Como todas as tarefas do backlog atendem requisito de produto ou gate de
lançamento, nenhuma foi classificada como P2; não há item opcional sem
rastreabilidade a deferir.

## Rastreabilidade dos requisitos funcionais

| Requisito | Tarefas de implementação | Tarefas de verificação | Cobertura |
|---|---|---|---|
| RF-01 — Pesquisar cidades | T-03, T-05, T-06, T-09 | T-11, T-12, T-13, T-14 | Coberto |
| RF-02 — Identificar e selecionar cidade | T-01, T-04, T-05, T-06, T-09 | T-11, T-12, T-13, T-14 | Coberto |
| RF-03 — Consultar clima atual | T-01, T-02, T-04, T-07, T-09 | T-11, T-12, T-14 | Coberto |
| RF-04 — Consultar previsão diária | T-01, T-02, T-04, T-07, T-09 | T-11, T-12, T-14 | Coberto |
| RF-05 — Alternar unidade | T-01, T-02, T-07, T-09 | T-10, T-12, T-14 | Coberto |
| RF-06 — Uso móvel | T-06, T-07, T-09 | T-14, T-15 | Coberto |
| RF-07 — Estados e falhas | T-03, T-04, T-05, T-08, T-09 | T-11, T-12, T-13, T-14 | Coberto |

## Entrega 1 — Tipos

### T-01 — Definir contratos de domínio

- **Descrição:** Consolidar os tipos compartilhados usados pela UI, hook e
  serviços, incluindo valores ausentes e unidade de apresentação.
- **Critérios de aceite:**
  - O TypeScript strict compila os contratos sem casts que removam a checagem
    dos campos de domínio.
  - `Unit` aceita exatamente `'celsius' | 'fahrenheit'`.
  - `City` contém `id`, `name`, `country`, `latitude`, `longitude` e
    `region: string | null`; ausência de `admin1` é normalizada para `null`
    (RF-02).
  - `CurrentWeather` contém horário e código meteorológico, temperatura,
    sensação térmica, umidade, vento, precipitação em mm e pressão à superfície
    em hPa; valores ausentes aceitam `null`
    (RF-03, AC-09).
  - `ForecastDay` contém data local, código, mínima, máxima e probabilidade
    máxima diária de chuva em porcentagem; métricas ausentes
    aceitam `null` (RF-04, AC-09).
  - `WeatherData` associa cidade, fuso, clima atual e previsão para cinco dias
    (RF-02–RF-04).
- **Rastreabilidade:** RF-02–RF-05; AC-02–AC-05, AC-09.
- **Dependências:** Nenhuma.
- **Arquivos prováveis:** `src/types/weather.ts`
- **Tipo:** Data
- **Prioridade:** P0
- **Tamanho:** P

## Entrega 2 — Funções puras

### T-02 — Implementar funções puras de clima e data

- **Descrição:** Implementar conversão/formatação de temperatura, rótulos WMO,
  formatação pt-BR e seleção da janela diária pelo fuso local.
- **Critérios de aceite:**
  - Testes verificam `0 °C → 32 °F`, `20 °C → 68 °F` e Celsius inalterado
    (AC-05).
  - Empates positivos e negativos arredondam para longe de zero; valores fora
    do empate arredondam ao inteiro mais próximo (RF-05).
  - Com referência temporal fixa e `America/Sao_Paulo`, retorna exatamente
    hoje e os quatro dias seguintes em ordem; exclui ontem e o quinto dia futuro
    e mantém slots sem dados como `null` (AC-04, AC-09).
  - Formata datas como `dd/MM/aaaa` e horários em 24 horas, sem fallback ao
    relógio do dispositivo (RNF-06).
  - Código WMO ausente não é apresentado como uma condição inventada (AC-09).
- **Rastreabilidade:** RF-03–RF-05; AC-04, AC-05, AC-09; RNF-06.
- **Dependências:** T-01.
- **Arquivos prováveis:** `src/lib/temperature.ts`, `src/lib/format.ts`,
  `src/lib/weatherCodes.ts`, `src/lib/forecastDates.ts`
- **Tipo:** Data
- **Prioridade:** P0
- **Tamanho:** G

## Entrega 3 — Services

### T-03 — Implementar serviço de geocoding

- **Descrição:** Consultar cidades na Open-Meteo e normalizar a resposta para
  `City`, distinguindo ausência válida de resultados de falhas de serviço.
- **Critérios de aceite:**
  - Teste com espaços externos e `São Paulo` confirma `trim`, preservação do
    acento e parâmetros `count=5`, `language=pt`, `format=json` (AC-01).
  - Fixture com mais de cinco resultados retorna os cinco primeiros na ordem
    recebida e mapeia `admin1` para região (AC-01, AC-02).
  - Resposta válida sem resultados retorna `[]`; HTTP não-2xx, erro de rede,
    JSON inválido ou `results` de tipo inválido rejeita com erro tipado
    (AC-01, RNF-05).
  - Aceita `AbortSignal`; teste com relógio/fetch controlados confirma timeout
    em 10 segundos (AC-08, RNF-04).
- **Rastreabilidade:** RF-01, RF-02, RF-07; AC-01, AC-02, AC-08; RNF-04, RNF-05.
- **Dependências:** T-01.
- **Arquivos prováveis:** `src/services/weatherService.ts`,
  `src/types/weather.ts`
- **Tipo:** Data
- **Prioridade:** P0
- **Tamanho:** M

### T-04 — Implementar serviço de forecast

- **Descrição:** Buscar clima atual e previsão diária para a cidade escolhida e
  mapear a resposta para `WeatherData`.
- **Critérios de aceite:**
  - Testes confirmam coordenadas selecionadas, variáveis `current`/`daily` do
    plano, Celsius, km/h, `timezone=auto` e `forecast_days=5`, sem variáveis
    adicionais (RF-03, RF-04).
  - Fixture valida o mapeamento de horário, código WMO, temperatura, sensação
    térmica, umidade, vento e mínimas/máximas para os campos correspondentes
    (RF-03, RF-04).
  - Com data/fuso controlados, retorna cinco datas de hoje a hoje + 4 em ordem;
    uma resposta de ontem até o quinto dia futuro exclui ambas as datas fora da
    janela (AC-04).
  - Campo ou dia sem dados permanece `null`, sem estimativas; falhas de rede,
    HTTP, timeout, parsing ou estrutura rejeitam em vez de criar dados válidos
    (AC-07–AC-09).
  - Aceita `AbortSignal`; teste com relógio/fetch controlados confirma timeout
    em 10 segundos e descarte de resposta tardia (AC-08, RNF-04).
- **Rastreabilidade:** RF-02–RF-04, RF-07; AC-02–AC-04, AC-07–AC-09;
  RNF-04–RNF-06.
- **Dependências:** T-01, T-02.
- **Arquivos prováveis:** `src/services/weatherService.ts`,
  `src/lib/forecastDates.ts`, `src/types/weather.ts`
- **Tipo:** Data
- **Prioridade:** P0
- **Tamanho:** G

## Entrega 4 — Hook

### T-05 — Orquestrar busca e clima no hook

- **Descrição:** Coordenar chamadas de serviço, estados explícitos, seleção,
  retry e descarte de respostas obsoletas.
- **Critérios de aceite:**
  - Testes verificam busca em `idle`, `loading`, `success`, `empty` e `error`;
    clima em `idle`, `loading`, `success` e `error` (RNF-02).
  - Termo em branco produz `empty/blank` sem chamada; resposta válida sem
    resultados produz `empty/no-results`; rejeição produz `error` (AC-01,
    RNF-05).
  - Seleção usa as coordenadas/ID da cidade ativada e limpa o clima anterior
    durante o loading (AC-02, AC-07).
  - Retry refaz a operação que falhou; num cenário de falha seguido de sucesso,
    remove o erro e publica os dados novos (AC-07).
  - Em duas respostas resolvidas fora de ordem, somente a solicitação mais
    recente atualiza o estado; timeout aborta ou ignora resposta tardia (AC-08).
  - Resposta parcial continua em sucesso e preserva ausências como `null`
    (AC-09).
- **Rastreabilidade:** RF-01, RF-02, RF-07; AC-01, AC-02, AC-07–AC-09;
  RNF-02, RNF-05.
- **Dependências:** T-01, T-03, T-04.
- **Arquivos prováveis:** `src/hooks/useWeather.ts`
- **Tipo:** Data
- **Prioridade:** P0
- **Tamanho:** G

## Entrega 5 — Componentes

### T-06 — Criar busca e seleção de cidades

- **Descrição:** Implementar controles acessíveis para pesquisar e escolher
  resultados de geocoding.
- **Critérios de aceite:**
  - Enviar por Enter ou pelo botão chama o callback uma vez com o termo
    normalizado (AC-01, AC-11).
  - Campo vazio/só espaços mostra `Digite uma cidade para pesquisar.` como
    descrição acessível do input e não chama o callback (AC-01).
  - Fixture de seis resultados mostra cinco na mesma ordem, cada um com cidade,
    país e região quando disponível (AC-01).
  - Duas cidades homônimas mostram região/país; ativar a segunda emite o objeto
    da segunda cidade (AC-02).
  - Lista vazia mantém o termo, mostra `Nenhuma cidade encontrada.` e não inicia
    forecast (AC-01).
  - Teste por teclado confirma nome acessível, foco visível, ausência de
    armadilha e alvos de pelo menos 44 × 44 CSS px (AC-11).
  - Busca, resultados e seleção funcionam nos viewports de 320, 375, 768,
    1024, 1440 e 1920 CSS px sem rolagem horizontal (RF-06, AC-06, AC-12).
- **Rastreabilidade:** RF-01, RF-02, RF-07; AC-01, AC-02, AC-11.
- **Dependências:** T-01, T-05.
- **Arquivos prováveis:** `src/components/SearchBar.tsx`,
  `src/components/CityResults.tsx`
- **Tipo:** UI
- **Prioridade:** P0
- **Tamanho:** M

### T-07 — Criar apresentação de clima, previsão e unidade

- **Descrição:** Apresentar condições atuais e cinco dias, derivando Celsius ou
  Fahrenheit durante a renderização.
- **Critérios de aceite:**
  - Fixture atual exibe condição, `20 °C`, sensação `19 °C`, umidade `60%`,
    vento `12 km/h`, precipitação `0 mm`, pressão `1015 hPa` e horário `15:00`,
    cada valor com seu rótulo (AC-03).
  - Fixture com cinco dias exibe exatamente cinco posições, cada uma com data,
    condição, temperaturas mínima/máxima e probabilidade de chuva; o grid usa
    duas colunas na base, três em `sm` e cinco em `lg` (AC-04, RF-06).
  - Com `0 °C` e `20 °C` em clima atual e previsão, alternar para Fahrenheit
    mostra `32 °F` e `68 °F` em todos os campos e não chama services novamente
    (AC-05).
  - Ausências mostram `Indisponível`, horário ausente mostra
    `Horário de referência indisponível` e dia sem dados mostra
    `Previsão indisponível`, mantendo a data (AC-09, RNF-06).
  - Datas aparecem como `dd/MM/aaaa`, horários em 24 horas e no fuso local
    (RNF-06); controle de unidade tem nome acessível e funciona por teclado
    (AC-11).
  - Clima, previsão e alternância de unidade são utilizáveis nos viewports de
    320, 375, 768, 1024, 1440 e 1920 CSS px sem rolagem horizontal (RF-06,
    AC-06, AC-12).
- **Rastreabilidade:** RF-03–RF-05; AC-03–AC-05, AC-09, AC-11; RNF-06.
- **Dependências:** T-01, T-02, T-05.
- **Arquivos prováveis:** `src/components/CurrentWeather.tsx`,
  `src/components/ForecastList.tsx`, `src/components/ForecastCard.tsx`,
  `src/components/UnitToggle.tsx`
- **Tipo:** UI
- **Prioridade:** P0
- **Tamanho:** G

### T-08 — Criar componentes de estado

- **Descrição:** Implementar apresentação acessível de loading, erro com ação
  de nova tentativa e estado vazio com título e dica.
- **Critérios de aceite:**
  - Loading expõe indicador com nome acessível e região viva apropriada
    (RNF-02, AC-11).
  - Erro de serviço mostra exatamente
    `Não foi possível carregar os dados. Tente novamente.` (AC-07).
  - Timeout mostra exatamente `A solicitação expirou. Tente novamente.`
    (AC-08).
  - A ação de retry tem nome acessível, recebe foco e ativa o callback uma vez
    ao ser acionada por teclado (AC-07, AC-11).
  - Estado vazio mostra o título recebido e a dica quando fornecida, anunciando
    a mensagem em uma região viva educada (RF-07, AC-11).
- **Rastreabilidade:** RF-07; AC-07, AC-08, AC-11; RNF-02, RNF-05.
- **Dependências:** T-05, T-06.
- **Arquivos prováveis:** `src/components/states/LoadingState.tsx`,
  `src/components/states/ErrorState.tsx`, `src/components/states/EmptyState.tsx`
- **Tipo:** UI
- **Prioridade:** P0
- **Tamanho:** M

## Entrega 6 — Integração

### T-09 — Compor a tela Weather App

- **Descrição:** Integrar hook, busca, seleção, estados, clima, previsão e
  unidade na tela principal.
- **Critérios de aceite:**
  - A tela liga callbacks dos componentes à orquestração; componentes de
    apresentação não chamam `fetch` (separação de camadas do plano).
  - A integração real usa `useWeather`, remove o painel de demonstração e o
    import do mock em `App`; erro apresenta a mensagem do hook e chama `retry`.
    Testes de integração mockam services, não os componentes de apresentação.
  - Unidade começa em Celsius em cada carga; após selecionar Fahrenheit,
    recarregar restaura Celsius e não grava preferência em storage (AC-05,
    RNF-08).
  - Depois de selecionar cidade homônima, nome/localidade, clima e previsão
    correspondem à mesma cidade (AC-02).
  - Estados inicial, loading, vazio, sucesso, erro, timeout e parcial são
    renderizados; loading termina em sucesso, erro ou timeout (RNF-02,
    AC-07–AC-09).
  - Conteúdo principal sinaliza loading com `aria-busy`; após sucesso de
    busca/retry, recebe foco sem roubar foco movido para outro controle.
    Conversão preserva foco no alternador; botões desabilitados não aplicam
    hover de ação habilitada (AC-11).
  - App não solicita GPS nem autenticação e envia ao provedor somente termo e
    localidade necessários às consultas (RNF-08).
- **Rastreabilidade:** RF-01–RF-07; AC-01–AC-09; RNF-02, RNF-08.
- **Dependências:** T-05, T-06, T-07, T-08.
- **Arquivos prováveis:** `src/App.tsx`, `src/main.tsx`
- **Tipo:** UI
- **Prioridade:** P0
- **Tamanho:** M

## Entrega 7 — Testes

### T-10 — Testar conversão de unidade

- **Descrição:** Cobrir conversão e arredondamento de temperaturas com testes
  unitários Vitest isolados.
- **Critérios de aceite:**
  - `pnpm test -- tests/unit/temperature.test.ts` termina com código 0.
  - Testes verificam `0 °C → 32 °F`, `20 °C → 68 °F` e Celsius inalterado
    (AC-05).
  - Testes verificam valores abaixo/acima de meio grau e empates positivos e
    negativos arredondados para longe de zero (RF-05).
  - Testes verificam que valor ausente não é convertido em zero nem formatado
    como temperatura válida (AC-09).
- **Rastreabilidade:** RF-05, RF-07; AC-05, AC-09.
- **Dependências:** T-09.
- **Arquivos prováveis:** `tests/unit/temperature.test.ts`,
  `src/lib/temperature.ts`
- **Tipo:** Test
- **Prioridade:** P0
- **Tamanho:** P

### T-11 — Testar services com mock de fetch

- **Descrição:** Testar geocoding e forecast com `fetch` mockado, cobrindo
  parâmetros, normalização e falhas sem rede externa.
- **Regressões de maior risco adicionadas:** JSON e estruturas malformadas
  rejeitam com erro tipado; timeout inclui o corpo JSON e limpa timers;
  janela de cinco dias cobre mudança de ano/fuso e 29 de fevereiro. As
  regressões exigiram guards na entrada do service e extensão do timeout
  até a leitura do JSON.
- **Critérios de aceite:**
  - `pnpm test -- tests/unit/weatherService.test.ts` termina com código 0.
  - Mock confirma URL e parâmetros: termo acentuado, count 5, language pt,
    coordenadas selecionadas, variáveis current/daily, Celsius, km/h,
    timezone auto e forecast_days 5 (AC-01, RF-03, RF-04).
  - Fixtures verificam ordem/limite de resultados, `admin1` para região,
    campos atuais e arrays diários mapeados aos tipos corretos (AC-01–AC-04).
  - Cenários cobrem resultados vazios válidos, campos meteorológicos parciais,
    JSON inválido, estrutura inválida, HTTP não-2xx e erro de rede; falha não
    retorna lista vazia ou dados meteorológicos válidos (AC-07, AC-09, RNF-05).
  - Fake timers confirmam timeout em 10 segundos; teste confirma suporte a
    cancelamento por `AbortSignal` e descarte da resposta tardia (AC-08).
- **Rastreabilidade:** RF-01–RF-04, RF-07; AC-01–AC-04, AC-07–AC-09;
  RNF-04, RNF-05.
- **Dependências:** T-03, T-04.
- **Arquivos prováveis:** `tests/unit/weatherService.test.ts`,
  `src/services/weatherService.ts`
- **Tipo:** Test
- **Prioridade:** P0
- **Tamanho:** M

### T-12 — Testar componentes nos estados da UI

- **Descrição:** Verificar com Testing Library componentes em loading, erro,
  vazio e sucesso, incluindo interações acessíveis.
- **Critérios de aceite:**
  - `pnpm test -- tests/unit/App.test.tsx tests/unit/SearchBar.test.tsx tests/unit/UnitToggle.test.tsx tests/unit/CurrentWeather.test.tsx tests/unit/ForecastList.test.tsx` termina com código 0.
  - Testes renderizam loading, erro, vazio e sucesso e verificam mensagem ou
    conteúdo esperado em cada estado (AC-01, AC-07, AC-09).
  - Estado de erro expõe ação retry; estado vazio distingue busca em branco de
    busca sem resultados; sucesso exibe dados rotulados e valores parciais
    indisponíveis (AC-01, AC-07, AC-09).
  - Testes por teclado confirmam nomes acessíveis e foco visível; troca de
    unidade atualiza as temperaturas atuais e diárias sem chamadas de serviço
    adicionais (AC-05, AC-11).
- **Rastreabilidade:** RF-01–RF-05, RF-07; AC-01, AC-03–AC-05, AC-07,
  AC-09, AC-11.
- **Dependências:** T-06, T-07, T-08.
- **Arquivos prováveis:** `tests/unit/App.test.tsx`,
  `tests/unit/SearchBar.test.tsx`, `tests/unit/UnitToggle.test.tsx`,
  `tests/unit/CurrentWeather.test.tsx`, `tests/unit/ForecastList.test.tsx`
- **Tipo:** Test
- **Prioridade:** P1
- **Tamanho:** M

### T-13 — Testar orquestração do hook

- **Descrição:** Verificar estados e coordenação assíncrona de `useWeather` com
  services substituídos por mocks.
- **Critérios de aceite:**
  - `pnpm test -- tests/unit/useWeather.test.ts` termina com código 0.
  - Testes verificam busca/clima em seus estados definidos e classificam vazio,
    erro e sucesso parcial separadamente (RNF-02, RNF-05).
  - Cenário com cidades homônimas confirma que a seleção chama forecast com as
    coordenadas da cidade escolhida (AC-02).
  - Retry repete a operação falha e, após sucesso, limpa erro e publica novos
    dados (AC-07).
  - Duas promessas resolvidas fora de ordem deixam no estado apenas o resultado
    da solicitação mais recente; timeout não permite atualização tardia
    (AC-08).
- **Rastreabilidade:** RF-01, RF-02, RF-07; AC-01, AC-02, AC-07–AC-09; RNF-02,
  RNF-05.
- **Dependências:** T-05.
- **Arquivos prováveis:** `tests/unit/useWeather.test.ts`,
  `src/hooks/useWeather.ts`
- **Tipo:** Test
- **Prioridade:** P1
- **Tamanho:** M

### T-14 — Testar fluxo E2E principal e viewport mobile

- **Descrição:** Validar o fluxo integrado em Playwright com respostas
  interceptadas e tamanhos móveis/desktop.
- **Regressões de maior risco adicionadas:** falha HTTP em cada endpoint com
  ocultação do clima anterior e retry; resposta parcial com cinco dias e
  aviso de previsão indisponível; C/F/C para temperaturas negativas/extremas,
  sem novo request, e retorno a Celsius após reload.
- **Cobertura adicional:** busca vazia/só espaços sem rede e com orientação;
  caracteres especiais preservados sem parâmetros extras; geocoding `{}` e
  `results: []`; forecast sem `current`/`daily` ou com esses blocos nulos
  apresenta erro e recupera após retry.
- **Lacunas ainda abertas:** seleção de cidades homônimas na UI e limite de
  cinco resultados; timeout/retry ponta a ponta; datas em `dd/MM/aaaa`;
  medição p95, auditoria com leitor de tela e matriz de navegadores.
- **Critérios de aceite:**
  - `pnpm test:e2e` termina com código 0 usando fixtures interceptadas e
    executa pesquisa → seleção → clima atual + cinco dias → alternância C/F
    (AC-01–AC-05).
  - E2E cobre campo vazio, sem resultados, erro e retry bem-sucedido, timeout,
    resposta parcial e escolha da cidade homônima correta (AC-01, AC-02,
    AC-07–AC-09).
  - O fluxo principal é executado em viewports de 320, 375 e 768 CSS px; em cada
    um, `scrollWidth <= clientWidth` e os controles são alcançáveis por rolagem
    vertical (AC-06).
  - Também verifica 1024, 1440 e 1920 CSS px sem rolagem horizontal (AC-12).
  - Navegação completa por teclado não cria armadilha e mantém foco visível;
    checagem confirma alvos >= 44 × 44 CSS px e auditoria WCAG 2.2 AA sem
    violações pendentes (AC-11).
  - Execuções registram browser/versão na matriz definida em RNF-07.
- **Rastreabilidade:** RF-01–RF-07; AC-01–AC-09, AC-11, AC-12; RNF-01–RNF-03,
  RNF-07.
- **Dependências:** T-09.
- **Arquivos prováveis:** `tests/e2e/weather.spec.ts`,
  `tests/e2e/accessibility.spec.ts`, `playwright.config.ts`
- **Verificação da integração:** `pnpm exec playwright test
  tests/e2e/accessibility.spec.ts --project=chromium --workers=2` cobre os cinco
  estados com rede interceptada, larguras de 320, 375, 768, 1024, 1440 e
  1920 px, grade 2/3/5, busca longa,
  botões de pelo menos 44 × 44 px, atalho ao conteúdo, foco por teclado e
  movimento reduzido. Não substitui auditoria com leitor de tela nem a matriz
  de navegadores da integração real. Botões ativos usam `night-900` sobre
  `accent-500` (contraste 5,39:1); textos secundários usam branco a 70%.
- **Tipo:** Test
- **Prioridade:** P0
- **Tamanho:** G

### Verificação dos gates e aceite — 11/11/2026

- `pnpm lint`: passou.
- `pnpm build`: passou.
- `pnpm test`: passou, 139 testes em 11 arquivos.
- `pnpm test:e2e`: passou, 54 testes (27 Chromium e 27 WebKit com
  emulação de iPhone 13), sem testes ignorados.
- Falhas iniciais: WebKit ausente no ambiente e dois testes que presumiam
  navegação completa com `Tab` nesse navegador. Instalados WebKit e suas
  dependências; testes usam `Alt+Tab`/`Alt+Shift+Tab` no WebKit para percorrer
  links e botões, mantendo as mesmas verificações de foco e ativação.

Suíte verde não significa aceite integral:

| Critério | Evidência / pendência |
| --- | --- |
| AC-01 | Parcial: trim, acentos, entrada em branco e geocoding vazio testados; falta lista selecionável de até cinco resultados e a mensagem vazia literal é diferente da spec. |
| AC-02 | Não atendido na UI: hook permite seleção, mas App carrega apenas a primeira cidade e não expõe os resultados. |
| AC-03 | Métricas, rótulos, unidades e horário cobertos por testes de componente; não há fixture única com todos os valores exatos do cenário da spec. |
| AC-04 | Janela de cinco datas locais, exclusão de datas externas e dados parciais cobertos no service; cenário exato em America/Sao_Paulo ainda precisa ser exercitado. |
| AC-05 | Conversão, arredondamento, C/F/C e retorno a Celsius no reload cobertos. |
| AC-06 | Parcial: layout e fluxo automatizados em tamanhos móveis; seleção de cidade permanece ausente. |
| AC-07 | Erros HTTP/rede, ocultação de dados anteriores e retry cobertos em ambos endpoints. |
| AC-08 | Timeout de 10 s e mensagem cobertos em unitários; falta cenário integrado de expiração, resposta tardia e retry. |
| AC-09 | Métricas ausentes, cinco posições e indicação de previsão indisponível cobertos. |
| AC-10 | Não verificado: faltam 30 pesquisas e 30 consultas com p95 sob as condições de rede definidas. |
| AC-11 | Parcial: teclado, foco e alvos testados; falta seleção e auditoria integral de contraste/anúncios com tecnologia assistiva. |
| AC-12 | Parcial: seis larguras em Chromium/WebKit; falta seleção e matriz das versões de Chrome, Edge, Firefox, Safari, iOS e Android exigidas por RNF-07. |

Também permanece divergência de RNF-06: datas aparecem como `16 Jun`, não
`dd/MM/aaaa`. A publicação continua bloqueada até fechar essas pendências e
verificar os termos/licença, cobertura e limites do provedor em T-15.

## Entrega 8 — Hardening

### T-15 — Validar prontidão de lançamento

- **Descrição:** Confirmar a conformidade do provedor e os gates finais de
  qualidade antes da publicação.
- **Critérios de aceite:**
  - Registro identifica URL e data da consulta aos termos/licença, cobertura,
    localidades avaliadas e limites de uso do provedor.
  - Resultado declara compatibilidade com o uso previsto e registra as
    condições/atribuições necessárias; se incompatível ou inconclusivo, o
    lançamento fica bloqueado até decisão sobre fonte compatível.
  - `pnpm lint`, `pnpm build`, `pnpm test` e `pnpm test:e2e` terminam com
    código 0 antes da publicação.
  - Relatório de 30 pesquisas e 30 consultas meteorológicas completas, sob RTT
    <= 100 ms, download >= 10 Mbps e provedor <= 1 s, mostra p95 <= 3 s para
    pesquisa e <= 5 s para clima (AC-10).
  - Resultado da matriz de browsers de T-14 e avaliação WCAG 2.2 AA ficam
    registrados; gaps bloqueadores de compatibilidade, acessibilidade ou
    desempenho impedem o lançamento até serem resolvidos (AC-10–AC-12).
- **Rastreabilidade:** Open Question 1, Assumptions; AC-10–AC-12; RNF-03,
  RNF-04, RNF-07.
- **Dependências:** T-14.
- **Arquivos prováveis:** `.github/workflows/`, `README.md` (somente se gates
  ou condições de publicação precisarem ser registrados)
- **Tipo:** Infra
- **Prioridade:** P0
- **Tamanho:** M

## Sequência sugerida de entrega — fatias verticais

O backlog acima mantém IDs e dependências de implementação. Para antecipar
feedback visual, executar as tarefas em fatias demonstráveis, não esperar que
toda a arquitetura esteja pronta antes de integrar a UI:

1. **Busca visível:** T-01 → T-03 → fatia de busca do T-05 → busca/resultados
   de T-06 → primeira integração do T-09. Demonstrável: submeter uma cidade,
   ver até cinco resultados ordenados e selecionar uma localidade. Use fixture
   de geocoding no primeiro protótipo, substituindo-a pelo T-03 real.
2. **Clima atual:** T-02 → T-04 → fatia de forecast do T-05 → condições atuais
   de T-07 e estados de T-08 → ampliar T-09. Demonstrável: clima da localidade
   selecionada, loading, erro e retry.
3. **Previsão e unidades:** completar T-02/T-04/T-07 e T-09. Demonstrável:
   cinco dias no fuso da cidade e alternância °C/°F sem nova chamada.
4. **Mobile:** completar o layout responsivo de T-06/T-07/T-09 e executar
   imediatamente o fluxo em 320, 375 e 768 CSS px. Demonstrável: jornada sem
   rolagem horizontal e controles alcançáveis.
5. **Qualidade e lançamento:** T-10 e T-11 podem rodar em paralelo após
   funções/services; T-12 e T-13 podem rodar em paralelo quando suas unidades
   estiverem prontas. T-14 valida o E2E integrado; T-15 fecha os gates.

Para tornar as fatias executáveis, decompor T-05 em duas subtarefas durante o
refinamento: busca depende de T-01/T-03 e consulta meteorológica depende de
T-04. Integrar T-09 incrementalmente em vez de aguardar todos os componentes.
As prioridades e tamanhos atuais são estimativas para as tarefas completas;
reestimá-los se essa decomposição for adotada.
