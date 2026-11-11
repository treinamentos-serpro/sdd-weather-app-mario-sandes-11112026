# Plano Técnico — Weather App

Este plano deriva de [weather-app-spec.md](../specs/weather-app-spec.md), que
permanece como fonte da verdade para os requisitos e critérios de aceite.
Define arquitetura, decisões técnicas e contratos para orientar a implementação;
não é a implementação final.

## Architecture

Aplicação cliente React, sem backend próprio, dividida em quatro camadas com
responsabilidades e dependências explícitas:

```text
App / components (apresentação)
           │ props, eventos e estados acessíveis
           ▼
hooks (orquestração e estado)
           │ chamadas tipadas
           ├────────────────────► services ──► Open-Meteo
           │                         │           resposta externa
           │                         ▼
           └────────────────────► lib ◄──── services
                           transformações puras
types (contratos compartilhados entre as camadas)
```

- **Apresentação (`App`, `components/`):** compõe a tela e renderiza valores,
  loading, vazio e erro. Componentes recebem dados/estado por props e emitem
  eventos por callbacks; não fazem `fetch`, não importam serviços e não
  transformam respostas da API. `App` também mantém a unidade escolhida.
- **Orquestração (`hooks/`):** `useWeather` coordena submissão da pesquisa,
  resultados, seleção, consulta do clima, retry e estados discriminados.
  Também cancela ou ignora respostas obsoletas. Não contém detalhes de URL nem
  regras de apresentação.
- **Acesso a dados (`services/`):** executa requisições HTTP, aplica timeout,
  valida a forma necessária da resposta e mapeia o formato Open-Meteo para os
  contratos de domínio. Erros de rede/HTTP/parsing são erros, não resultados
  vazios.
- **Funções puras (`lib/`):** recebe argumentos e retorna resultados sem I/O
  nem estado global: conversão e arredondamento de temperaturas, rótulos WMO,
  formatação pt-BR e seleção das cinco datas usando o fuso e a data de
  referência explicitamente fornecidos.
- **Contratos (`types/`):** define tipos de domínio compartilhados, evitando
  que a forma específica da resposta externa se propague à UI.

Direção permitida: a apresentação depende dos hooks e tipos; hooks dependem de
services, lib e tipos; services dependem de lib e tipos; lib não depende de
React, services ou componentes. Não há servidor, autenticação,
geolocalização automática ou persistência.

## Tech Stack

- **TypeScript strict, React e Vite:** aplicação web tipada e estrutura já
  adotada pelo repositório.
- **Tailwind CSS:** estilos responsivos e tema dark glassmorphism.
- **Open-Meteo Geocoding API e Forecast API:** fonte de dados sem API key para
  o uso previsto; uso em produção fica condicionado à verificação de termos,
  licença, cobertura e limites.
- **Vitest + Testing Library:** testes unitários e de componentes.
- **Playwright:** testes E2E dos fluxos, responsividade e acessibilidade
  observável.
- **Biome:** lint e formatação.
- **pnpm:** gerenciador de pacotes do projeto.

## Project Structure

Manter a estrutura existente, um componente React por arquivo, e deixar cada
camada com uma fronteira fácil de localizar e testar:

```text
src/
├── components/
│   ├── states/                 # apresentação de loading, vazio e erro
│   ├── SearchBar.tsx           # input e envio do termo
│   ├── CityResults.tsx         # escolha acessível de cidade
│   ├── CurrentWeather.tsx      # apresentação das condições atuais
│   ├── ForecastList.tsx        # composição da previsão
│   ├── ForecastCard.tsx        # apresentação de um dia
│   └── UnitToggle.tsx          # controle C/F
├── hooks/
│   └── useWeather.ts           # busca, seleção, retry e estado meteorológico
├── services/
│   └── weatherService.ts       # fetch, timeout e mapeamento da API
├── lib/
│   ├── temperature.ts          # conversão e arredondamento
│   ├── format.ts               # data, horário e unidades
│   ├── forecastDates.ts        # janela de cinco datas pelo fuso
│   └── weatherCodes.ts         # códigos WMO para rótulos pt-BR
├── types/
│   └── weather.ts              # contratos de domínio compartilhados
├── styles/
├── App.tsx                      # composição e unidade ativa
└── main.tsx                     # bootstrap React

tests/
├── unit/
│   ├── components/              # estados e interações da UI
│   ├── hooks/                   # transições, retry e respostas obsoletas
│   ├── services/                # fetch mockado, timeout e mapeamento
│   └── lib/                     # funções puras e casos de borda
└── e2e/                         # fluxos completos no navegador
```

`CityResults.tsx` é o componente previsto para a lista selecionável de cidades;
deve ser criado apenas na fase de implementação se ainda não existir. Testes
permanecem sob `tests/`, conforme a configuração atual.

### Fronteiras e estratégia de teste

- Componentes são testados com props e eventos simulados, sem rede; isso valida
  renderização, teclado, acessibilidade e estados sem depender do serviço.
- Hooks são testados com os serviços simulados para verificar transições de
  estado, retry, cancelamento e descarte de respostas atrasadas.
- Services são testados com `fetch` simulado, cobrindo URL/parâmetros,
  normalização, respostas incompletas e falhas de transporte/HTTP/timeout.
- Funções de `lib/` são testadas diretamente como funções determinísticas,
  incluindo conversão, arredondamento, códigos e limites de data/fuso.
- Testes E2E verificam o fluxo integrado; a rede externa é interceptada para
  que resultados sejam repetíveis. Essa separação localiza falhas por camada e
  reduz flakiness sem introduzir abstrações ou infraestrutura de teste extra.

## Data Model

Manter dados meteorológicos em Celsius e velocidades do vento em km/h. A
conversão para Fahrenheit ocorre somente na apresentação, sem nova requisição.
Campos opcionais da fonte viram `null` no domínio, em vez de valores estimados.

```ts
type TemperatureUnit = 'celsius' | 'fahrenheit';

interface City {
  id: number;
  name: string;
  country: string;
  region: string | null;
  latitude: number;
  longitude: number;
}

interface CurrentWeather {
  observedAt: string | null; // horário local retornado pela fonte
  weatherCode: number | null;
  temperatureC: number | null;
  apparentTemperatureC: number | null;
  relativeHumidity: number | null;
  windSpeedKmh: number | null;
  precipitationMm: number | null;
  surfacePressureHpa: number | null;
}

interface ForecastDay {
  date: string; // data local YYYY-MM-DD
  weatherCode: number | null;
  minTemperatureC: number | null;
  maxTemperatureC: number | null;
  precipitationProbability: number | null; // máxima diária, em porcentagem
}

interface WeatherData {
  city: City;
  timezone: string; // identificador IANA retornado pelo provedor
  current: CurrentWeather;
  forecast: ForecastDay[]; // exatamente cinco posições, da data local de hoje
}
```

- Geocoding `region` é opcional na resposta; normalizá-lo para `null` quando
  ausente. Preservar nome, país e identificador para distinguir homônimos.
- A ausência de `weatherCode` produz condição indisponível, não uma condição
  padrão.
- Mesmo quando um dia não tem dados, a posição e a data permanecem no array,
  com os campos meteorológicos como `null`.
- Contratos mínimos dos serviços:

```ts
searchCities(query: string, signal?: AbortSignal): Promise<City[]>;
getWeather(city: City, signal?: AbortSignal): Promise<WeatherData>;
```

O serviço rejeita a promessa para falhas de transporte, HTTP, JSON inválido ou
resposta estruturalmente inválida; valores meteorológicos ausentes em uma
resposta válida são normalizados como `null`.

## Data Flow

1. Usuário digita e envia a cidade. Remover apenas espaços externos (`trim`),
   preservando acentos e caracteres do termo.
2. Se o termo normalizado estiver vazio, não fazer chamada e anunciar
   `Digite uma cidade para pesquisar.`. Caso contrário, buscar até cinco
   correspondências e conservar a ordem recebida.
3. Exibir nome e país de cada resultado e a região quando disponível. Busca
   sem resultados conserva o termo no campo e não inicia consulta meteorológica.
4. Ao selecionar uma cidade, consultar por latitude/longitude dessa cidade.
   Limpar dados meteorológicos da seleção anterior enquanto a nova consulta
   carrega.
5. O serviço traduz os parâmetros e a resposta da API para `WeatherData`,
   normaliza campos ausentes e seleciona as cinco datas entre hoje e hoje + 4
   no fuso retornado para a cidade.
6. O hook só publica a resposta se ela ainda corresponder à pesquisa ou seleção
   mais recente. Uma troca de unidade só atualiza a apresentação local.
7. Formatar datas em `dd/MM/aaaa`, horários em 24 horas e textos em pt-BR; não
   interpretar uma data local sem fuso como data do dispositivo.

```mermaid
flowchart TD
    A[Usuário digita termo] --> B{Termo vazio?}
    B -- Sim --> C[Busca: empty/blank]
    C --> D[UI anuncia "Digite uma cidade para pesquisar."]
    B -- Não --> E[Hook chama serviço de geocoding]
    E --> F{Resultado da busca}
    F -- Erro de rede / API / timeout --> G[Busca: error]
    G --> H[UI mostra erro e ação de nova tentativa]
    F -- Lista vazia --> I[Busca: empty/no-results]
    I --> J[UI mostra "Nenhuma cidade encontrada."]
    F -- Cidades encontradas --> K[Hook: search success]
    K --> L[UI exibe resultados para seleção]
    L --> M[Usuário seleciona cidade]
    M --> N[Hook limpa dados anteriores e marca loading]
    N --> O[Hook chama serviço de forecast]
    O --> P{Resultado do forecast}
    P -- Erro de rede / API / timeout --> Q[Clima: error]
    Q --> R[UI mostra erro e ação de nova tentativa]
    P -- Resposta válida, inclusive parcial --> S[Serviço mapeia WeatherData]
    S --> T[Hook: weather success]
    T --> U[Componentes exibem clima e previsão]
    U --> V[Conversão C/F derivada na renderização]
```

## External APIs

Todas as chamadas são feitas do navegador por `fetch`; não enviar dados além
dos necessários à pesquisa e à localidade selecionada.

**Geocoding**

- `GET https://geocoding-api.open-meteo.com/v1/search`
- Parâmetros: `name=<termo codificado>`, `count=5`, `language=pt`,
  `format=json`.
- Exemplo de URL:
  `https://geocoding-api.open-meteo.com/v1/search?name=S%C3%A3o%20Paulo&count=5&language=pt&format=json`
- Exemplo resumido de resposta:

```json
{
  "results": [
    {
      "id": 3448439,
      "name": "São Paulo",
      "latitude": -23.5475,
      "longitude": -46.63611,
      "country": "Brasil",
      "admin1": "São Paulo"
    }
  ]
}
```

- Mapear `id`, `name`, `country`, `latitude` e `longitude` para os campos
  homônimos de `City`; mapear `admin1` para `City.region`. Se `admin1` não vier,
  usar `region: null`. A aplicação mantém a ordem recebida e limita a lista a
  cinco itens.
- Resposta sem resultados (por exemplo, `results: null` ou sem `results`) vira
  `[]` e estado vazio. Erro HTTP, falha de transporte ou JSON inválido é erro
  de serviço, não busca vazia.

**Previsão**

- `GET https://api.open-meteo.com/v1/forecast`
- Parâmetros: `latitude` e `longitude` da `City` selecionada; `current` com
  `temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,precipitation,surface_pressure`;
  `daily` com
  `weather_code,temperature_2m_min,temperature_2m_max,precipitation_probability_max`; `temperature_unit=celsius`,
  `wind_speed_unit=kmh`, `precipitation_unit=mm`, `timezone=auto` e `forecast_days=5`.
- Exemplo resumido de URL:
  `https://api.open-meteo.com/v1/forecast?latitude=-23.5475&longitude=-46.63611&current=temperature_2m%2Capparent_temperature%2Crelative_humidity_2m%2Cwind_speed_10m%2Cweather_code%2Cprecipitation%2Csurface_pressure&daily=weather_code%2Ctemperature_2m_min%2Ctemperature_2m_max%2Cprecipitation_probability_max&temperature_unit=celsius&wind_speed_unit=kmh&precipitation_unit=mm&timezone=auto&forecast_days=5`
- Exemplo resumido de resposta:

```json
{
  "timezone": "America/Sao_Paulo",
  "current": {
    "time": "2026-11-11T15:00",
    "temperature_2m": 20.0,
    "apparent_temperature": 19.0,
    "relative_humidity_2m": 60,
    "wind_speed_10m": 12.0,
    "precipitation": 0.0,
    "surface_pressure": 1015.0,
    "weather_code": 0
  },
  "daily": {
    "time": ["2026-11-11", "2026-11-12"],
    "weather_code": [0, 2],
    "temperature_2m_min": [14.0, 15.0],
    "temperature_2m_max": [24.0, 25.0],
    "precipitation_probability_max": [0, 30]
  }
}
```

- Mapear `current.time` para `CurrentWeather.observedAt`, `temperature_2m`
  para `temperatureC`, `apparent_temperature` para `apparentTemperatureC`,
  `relative_humidity_2m` para `relativeHumidity`, `wind_speed_10m` para
  `windSpeedKmh`, `weather_code` para `weatherCode`, `precipitation` para
  `precipitationMm` e `surface_pressure` para `surfacePressureHpa`. As unidades
  são Celsius, km/h, mm e hPa; métricas ausentes viram `null`.
- Mapear `daily.time[i]` para `ForecastDay.date` e os elementos no mesmo índice
  de `weather_code`, `temperature_2m_min` e `temperature_2m_max` para
  `weatherCode`, `minTemperatureC` e `maxTemperatureC`. Array ou valor ausente
  vira `null`; não preencher por estimativa.
- Mapear `daily.precipitation_probability_max[i]` para
  `ForecastDay.precipitationProbability`, em porcentagem; ausências viram `null`.
- Mapear `timezone` para `WeatherData.timezone` e associar o objeto final à
  `City` selecionada. A resposta resumida acima omite unidades e metadados
  adicionais que a API também pode retornar.
- Usar o fuso retornado como referência. A previsão exibida deve conter
  exatamente hoje e os quatro dias seguintes nesse fuso; se a resposta não
  tiver dados de uma dessas datas, preservar a data com os campos meteorológicos
  como `null`. Não substituir horário ausente pelo relógio do dispositivo.
- `getWeather` rejeita com `WeatherServiceError` quando os blocos `current`
  ou `daily`, o array `daily.time` ou o fuso válido estiverem ausentes.
  Um bloco `current` presente com métricas ausentes continua sendo uma
  resposta parcial: normalizar seus campos para `null`. Calcular as cinco
  datas pelo relógio no fuso retornado e localizar cada data em `daily.time`
  antes de ler o mesmo índice dos arrays de métricas.
- Não solicitar variáveis fora das necessárias aos requisitos atuais.
- Antes da publicação, validar termos, cobertura, licença e limites de uso do
  provedor; se incompatíveis, bloquear lançamento até selecionar fonte adequada.

## State Management

### Integração da tela

`App` usa `useWeather` para obter `status`, `data`, `error`, `query`,
`search` e `retry`. A busca aciona `search`, fica desabilitada durante loading
e `ErrorState` recebe a mensagem do hook e `retry`. O painel de demonstração
foi removido; o mock permanece disponível apenas para desenvolvimento e testes.
`unit` vive em `App`, começa em Celsius e é passada aos componentes de clima,
previsão e seleção de unidade; trocar C/F não chama os services.

O conteúdo principal expõe `aria-busy` enquanto carrega. Ao concluir uma busca
ou retry com sucesso, recebe foco programático, exceto quando o usuário já
moveu o foco para outro controle fora da busca/conteúdo. Alterar a unidade
não desloca o foco. O botão de busca só aplica hover quando habilitado; o
alternador mantém indicação de seleção e feedback de hover em ambas as opções.
Não adicionar memoização preventiva: a lista tem cinco itens e os cálculos
de apresentação são pequenos; otimizações futuras devem partir de profiling.

### Integração com a API

O contrato atual de `useWeather` expõe `status`
(`idle | loading | success | error | empty`), `data`, `cities`, `error`, `query`
e as ações assíncronas `search`, `selectCity` e `retry`. A busca seleciona
automaticamente a primeira correspondência e mantém as demais em `cities`
para troca explícita. `retry` repete a última etapa: geocoding se a pesquisa
falhou, forecast se o carregamento da cidade falhou. Nova operação limpa
dados/erro anteriores; termos em branco produzem `empty` sem rede.
Um identificador crescente invalida respostas anteriores e pendentes após
desmontagem, sem cancelar fisicamente o fetch. `App` já utiliza esse hook,
sem dados fictícios ou controles de demonstração em produção.

Manter o estado em React, sem biblioteca de estado ou cache global. `App` mantém
a unidade ativa; o texto editável da busca pode ficar em `SearchBar`, enquanto
`useWeather` concentra o termo enviado, resultados, cidade selecionada e dados
meteorológicos. Busca e clima têm estados independentes para representar, por
exemplo, resultados de cidades enquanto a consulta meteorológica selecionada
está carregando.

Usar uniões discriminadas, evitando booleanos independentes que permitam
combinações contraditórias:

```ts
type SearchState =
  | { status: 'idle' }
  | { status: 'loading'; query: string }
  | { status: 'success'; query: string; cities: City[] }
  | { status: 'empty'; query: string; reason: 'blank' | 'no-results' }
  | { status: 'error'; query: string; kind: RequestErrorKind };

type WeatherState =
  | { status: 'idle' }
  | { status: 'loading'; city: City }
  | { status: 'success'; data: WeatherData }
  | { status: 'error'; city: City; kind: RequestErrorKind };

type RequestErrorKind = 'network' | 'api' | 'timeout' | 'invalid-response';
```

Transições esperadas:

- Inicialização: ambos os fluxos começam em `idle`.
- Envio de termo válido: busca muda a `loading`; resposta não vazia vira
  `success`, lista sem cidades vira `empty/no-results`, e falha vira `error`.
- Envio de termo em branco: não chama a API; a busca vira `empty/blank`.
- Seleção de cidade: clima muda a `loading` para a cidade escolhida e limpa os
  dados da seleção anterior. Sucesso vira `success`; falha vira `error`.
- Nova tentativa: repete a operação correspondente e substitui o erro por
  `loading`, seguido pelo resultado.

Um sucesso meteorológico pode conter campos nulos e dias indisponíveis; isso é
resposta parcial, não erro nem estado `empty`. Não manter dados da cidade
anterior como se fossem atuais.

`Unit` fica em estado local de `App`, com valor inicial `celsius` a cada carga;
não usar storage nem enviar unidade na troca de seleção. Os dados armazenados
continuam em Celsius. A renderização deriva cada temperatura exibida para a
unidade ativa, tanto em `CurrentWeather` quanto em cada `ForecastDay`:

```ts
const displayValueC = temperatureC === null
  ? null
  : convertTemperature(temperatureC, unit);
const displayText = displayValueC === null
  ? 'Indisponível'
  : `${roundTiesAwayFromZero(displayValueC)}°${unit === 'celsius' ? 'C' : 'F'}`;
```

`convertTemperature` usa `F = C * 9 / 5 + 32` e retorna Celsius sem conversão
quando a unidade é `celsius`. `roundTiesAwayFromZero` arredonda para o inteiro
mais próximo com empates afastados de zero (incluindo valores negativos), como
exige a spec; não depender de `Math.round` para essa regra. Alterar a unidade
apenas recalcula a apresentação: não chama `searchCities` nem `getWeather`.

`AbortController` cancela solicitações substituídas ou expiradas; uma checagem
de identidade/geração da requisição impede também que respostas antigas já
resolvidas atualizem os estados.

## Error Handling

### Ausências nos campos consumidos da Open-Meteo

| Campos da resposta | Normalização e apresentação |
| --- | --- |
| Geocoding `results` omitido | `[]`; estado sem resultados. Tipo inválido é erro. |
| `country`, `admin1` nulos/omitidos/vazios | País vira `País indisponível`; região vira `null` e é omitida da localidade. |
| `id`, `name`, `latitude`, `longitude` | Obrigatórios; ausência/tipo inválido rejeita a resposta, sem inventar cidade ou coordenadas. |
| `current.time` | `observedAt: null` quando nulo/omitido/vazio; `Horário de referência indisponível`. |
| `current.temperature_2m`, `apparent_temperature` | `null` quando ausentes; `Indisponível`, sem conversão para C/F. |
| `current.relative_humidity_2m`, `wind_speed_10m`, `precipitation`, `surface_pressure` | `null` quando ausentes; `Indisponível`. Zero fornecido é preservado. |
| `current.weather_code`, `daily.weather_code[i]` | `null` quando ausentes; ícone neutro e `Condição desconhecida`. |
| `daily.temperature_2m_min[i]`, `temperature_2m_max[i]`, `precipitation_probability_max[i]` | Arrays nulos/omitidos, entradas nulas e índices faltantes viram `null`; `Indisponível`. |
| Dia ausente em `daily.time` | Manter a data calculada e métricas `null`; `Previsão indisponível`. |
| `current`, `daily`, `daily.time`, `timezone` | Estrutura obrigatória; ausência/null rejeita com erro tipado e retry, em vez de sucesso fictício. |

O inventário cobre os campos utilizados pelo app, não todos os campos opcionais
oferecidos pelo provedor. Métricas de tipo incorreto, `NaN` e infinitos são
rejeitados no service. Componentes recebem domínio normalizado, nunca JSON cru.

O helper compartilhado `fetchWithTimeout` usa `AbortController` com limite de
10 segundos incluindo leitura do corpo JSON, e `clearTimeout` no `finally`,
tanto em sucesso quanto em falha. HTTP não-2xx e JSON inválido rejeitam com
`WeatherServiceError`. O JSON é recebido como `unknown`; guards validam os
blocos obrigatórios, os resultados de cidades e os tipos das métricas antes
do mapeamento. Campos meteorológicos ausentes ou `null` permanecem indisponíveis;
tipos incorretos e números não finitos são erros, não respostas parciais válidas.
Na camada de serviço, `AbortError` vira `WeatherServiceError` com mensagem
`A requisição demorou demais.`; outras falhas de transporte usam
`Falha de rede.`. Essas mensagens do serviço são distintas dos textos de
apresentação definidos nos critérios de aceite.

`WeatherServiceError.kind` distingue `network`, `timeout`, `api` e
`invalid-response`, sem comparar textos para decidir comportamento.
O hook apresenta `A solicitação expirou. Tente novamente.` para timeout e
`Não foi possível carregar os dados. Tente novamente.` para as outras falhas.
O botão chama `retry`, repetindo geocoding com o último termo ou forecast com
a última cidade; não há retry automático. Testes simulam offline com rejeição
de `fetch` no Vitest e `route.abort('internetdisconnected')` no Playwright,
removendo somente o handler de falha para validar recuperação após reconexão.

- **Entrada vazia:** não chamar o geocoding; definir `SearchState` como
  `empty/blank` e apresentar `Digite uma cidade para pesquisar.`.
- **Busca sem resultados:** só uma resposta válida sem cidades vira
  `empty/no-results`; preservar o termo e apresentar `Nenhuma cidade encontrada.`.
- **Falha de rede:** rejeição de `fetch` vira `error/network`. Encerrar loading,
  não mascarar como lista vazia ou dados válidos e oferecer retry manual.
- **Falha da API:** HTTP não-2xx ou resposta inválida vira `error/api` ou
  `error/invalid-response`. Preservar a distinção tipada no serviço; para
  erro de serviço mostrar
  `Não foi possível carregar os dados. Tente novamente.`.
- **Timeout:** abortar a chamada após 10 segundos, marcar `error/timeout`,
  exibir `A solicitação expirou. Tente novamente.` e oferecer retry manual.
  Ignorar qualquer conclusão tardia da chamada expirada.
- **Resposta parcial válida:** manter `success`; valores ausentes são `null` e
  devem aparecer como `Indisponível`, horário ausente como
  `Horário de referência indisponível`, e um dia sem métricas como
  `Previsão indisponível`. Não estimar nem preencher com zeros.
- **Nova seleção/resposta obsoleta:** limpar o clima anterior ao iniciar a
  consulta da nova cidade; abortar ou ignorar respostas de seleções anteriores.
  Nunca apresentar dados de outra cidade como atuais.
- **Recuperação e acessibilidade:** retry refaz somente a operação que falhou;
  após sucesso, remover a mensagem de erro. Loading, vazio e erro devem ser
  anunciados por tecnologia assistiva; retry deve ser alcançável por teclado.

## Testing Strategy

**Vitest + Testing Library**

- **Funções puras de `lib/`:** conversão Celsius/Fahrenheit, arredondamento
  com empates afastados de zero (inclusive temperaturas negativas), unidade
  inicial, formatação pt-BR, rótulos WMO e seleção de cinco datas pelo fuso.
  Injetar uma data de referência nos cálculos de calendário em vez de depender
  do relógio real.
- **Services com `fetch` mockado:** verificar URL e parâmetros de geocoding e
  forecast, codificação de acentos, limite/ordem dos resultados e mapeamento
  para os tipos de domínio. Cobrir respostas completas e parciais, lista vazia,
  HTTP não-2xx, falha de rede, JSON inválido, timeout de 10 s e cancelamento.
- **Componentes:** renderizar e interagir com `SearchBar`, `CityResults`,
  `CurrentWeather`, `ForecastList` e estados de UI em `loading`, erro, vazio e
  sucesso. Verificar unidades/valores, mensagens para campos indisponíveis,
  labels/roles, foco e interação por teclado, sem chamadas reais de rede.
- **Hook/orquestração:** substituir services por mocks para testar transições
  de estado, retry da operação correta, seleção entre cidades homônimas,
  limpeza de clima anterior e descarte de resposta obsoleta. Manter esses
  testes focados na coordenação; não repetir os detalhes de parsing cobertos
  pelos testes do service.

**Playwright (E2E)**

- Interceptar os endpoints Open-Meteo e fornecer fixtures controladas. Cobrir
  o fluxo completo pesquisa → seleção → clima atual e cinco dias → alternância
  C/F, confirmando que a troca de unidade não dispara nova consulta.
- Cobrir campo vazio, sem resultados, loading, falha, nova tentativa, timeout,
  resposta parcial e escolha correta entre cidades homônimas.
- Em viewports de 320, 375 e 768 CSS px (e também nos tamanhos desktop da spec),
  executar o fluxo principal e verificar que `document.documentElement.scrollWidth`
  não excede `clientWidth`, que controles essenciais são alcançáveis e que a
  leitura funciona sem rolagem horizontal.
- Exercitar navegação por teclado, foco visível e anúncios dos estados
  dinâmicos. Verificar alvos mínimos de 44 × 44 CSS px; complementar a checagem
  automatizada de acessibilidade com verificação de contraste WCAG 2.2 AA.
- Rodar nos browsers disponíveis no CI e manter a matriz de compatibilidade da
  spec (duas versões estáveis mais recentes de Chrome, Edge, Firefox e Safari,
  incluindo Safari iOS e Chrome Android) como alvo de validação.
- Medir separadamente os critérios p95 do AC-10 em execução controlada de 30
  pesquisas e 30 consultas completas; não usar a latência do provedor ao vivo
  como medida isolada de desempenho da UI.

Mocks/fixtures são padrão nos testes automatizados para garantir determinismo;
uma verificação manual ou smoke test contra a API real pode complementar, mas
não deve ser pré-requisito para a suíte unitária/E2E.

## Risks & Trade-offs

- **Open-Meteo direto do navegador (escolhido):** mantém a arquitetura pequena
  e dispensa chave para o uso previsto. Alternativa: backend/proxy próprio para
  cache, controle de tráfego ou troca de provedor; rejeitada na v1 por exigir
  infraestrutura e operação sem requisito que as justifique. Termos, cobertura,
  licença e limites continuam condição de lançamento.
- **Estado React local (escolhido):** `useWeather` e `App` bastam para uma tela
  e fluxos simples. Alternativas: Redux/Zustand ou React Query para estado global,
  cache e deduplicação; rejeitadas por acrescentarem dependência e conceitos sem
  múltiplas telas ou cache requerido.
- **Celsius como unidade interna (escolhido):** conversão derivada na renderização
  evita requisição e mantém uma fonte coerente para atuais e previsão.
  Alternativa: pedir Fahrenheit ao provedor ao alternar; rejeitada por acoplar
  UI à rede e permitir arredondamento/dados divergentes.
- **Cancelamento e identidade de requisição (escolhidos):** `AbortController`
  poupa trabalho e uma checagem de geração evita race conditions mesmo quando
  o cancelamento não impede uma resposta tardia. Alternativa: deixar todas as
  solicitações terminarem; rejeitada por risco de exibir cidade errada.
- **Janela calculada no fuso da cidade (escolhida):** garante hoje + quatro dias
  independente do fuso do dispositivo. Alternativa: usar a data local do
  navegador ou assumir as primeiras cinco entradas; ambas falham quando a data
  da cidade difere ou a resposta começa em outra posição.
- **`null` para métricas ausentes (escolhido):** permite declarar dados parciais
  sem fabricar valores e exige renderização explícita de indisponibilidade.
  Alternativa: rejeitar qualquer resposta incompleta; rejeitada porque ocultaria
  métricas válidas e contrariaria o critério de resposta parcial.
- **Fixtures em E2E; serviço real apenas como smoke test (escolhido):** torna a
  suíte repetível e independente da rede. Alternativa: E2E sempre contra API ao
  vivo; rejeitada por flakiness, limites externos e dificuldade de simular
  timeout/ausência de campos.
- **Testes por camada mais E2E (escolhidos):** unitários localizam falhas e E2E
  valida integração e responsividade. Alternativa: depender apenas de E2E, que
  seriam mais lentos e menos precisos para testar parsing, arredondamento e
  limites de datas.
- **Sem GPS, histórico ou persistência (escopo escolhido):** respeita a v1 e
  reduz dados coletados. Alternativas ficam para uma revisão de requisitos,
  pois adicionam consentimento, privacidade e comportamento não solicitado.
- **Matriz ampla de browser/desempenho:** os resultados dependem dos browsers e
  condições de CI; registrar o ambiente e não confundir indisponibilidade do
  runner ou do provedor com regressão funcional.
