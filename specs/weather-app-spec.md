# Especificação de Produto — Aplicação de previsão do tempo

## Overview

Aplicação web em pt-BR para pesquisar uma cidade e consultar seu clima atual e a previsão diária. A v1 não exige conta nem localização do dispositivo.

- **Fonte:** Open-Meteo; sem API key para o uso previsto. A publicação depende da verificação de cobertura, termos, licença e limites aplicáveis.
- **Datas:** hoje e os quatro dias seguintes no fuso horário local da cidade.
- **Unidade:** Celsius por padrão; Fahrenheit selecionável. A escolha dura até recarregar ou reabrir a página e não é persistida.
- **Dados pessoais:** a busca e a localidade selecionada são enviadas ao provedor para obter dados; a aplicação não mantém histórico em servidor nem acessa GPS.
- **Público-alvo:** pessoas que querem consultar as condições de uma cidade em desktop ou dispositivo móvel.

## Functional Requirements

- **RF-01 — Pesquisar cidades:** aceitar texto de cidade; remover espaços no início e no fim sem alterar acentos ou caracteres do termo; ao enviar pesquisa não vazia, mostrar até cinco resultados na ordem recebida do serviço de geocoding.
- **RF-02 — Identificar e selecionar cidade:** cada resultado deve mostrar o nome da cidade e o país; a região administrativa deve aparecer quando fornecida. Selecionar um resultado deve associar todas as consultas subsequentes àquela localidade, inclusive quando houver cidades homônimas.
- **RF-03 — Consultar clima atual:** mostrar condição, temperatura, sensação térmica, umidade relativa, velocidade do vento, precipitação e pressão à superfície da cidade selecionada. Exibir temperatura na unidade ativa, umidade em porcentagem, vento em km/h, precipitação em mm, pressão em hPa e o horário de referência local quando fornecido pela fonte.
- **RF-04 — Consultar previsão diária:** mostrar cinco posições de data, hoje e os quatro dias seguintes no fuso local da cidade. Cada posição deve conter condição, temperaturas mínima e máxima e probabilidade máxima diária de chuva em porcentagem; não há previsão por hora.
- **RF-05 — Alternar unidade:** oferecer Celsius e Fahrenheit; aplicar a unidade a todas as temperaturas atuais e diárias. Exibir temperaturas arredondadas ao inteiro mais próximo, com empates afastados de zero. Iniciar em Celsius em cada nova carga da página.
- **RF-06 — Uso móvel:** permitir completar pesquisa, seleção, leitura do clima e previsão e alternância de unidade em viewports de 320 a 1920 CSS px, sem rolagem horizontal da página.
- **RF-07 — Estados e falhas:** comunicar carregamento, busca vazia, ausência de resultados, erro de serviço, timeout e dados parciais. Erros devem oferecer nova tentativa manual; resultados de consultas anteriores não podem ser apresentados como atuais para uma nova cidade.

## User Stories

- **US-01 (RF-01):** Como usuário, quero pesquisar cidades para encontrar a localidade cujo tempo desejo consultar.
- **US-02 (RF-02):** Como usuário, quero identificar e selecionar uma cidade nos resultados para consultar a localidade correta.
- **US-03 (RF-03):** Como usuário, quero ver o clima atual da cidade selecionada para entender as condições meteorológicas atuais.
- **US-04 (RF-04):** Como usuário, quero consultar a previsão de hoje e dos quatro dias seguintes para planejar os próximos dias.
- **US-05 (RF-05):** Como usuário, quero alternar entre Celsius e Fahrenheit para ler as temperaturas na unidade que prefiro.
- **US-06 (RF-06):** Como usuário, quero usar as funções principais em um dispositivo móvel para consultar o tempo onde estiver.
- **US-07 (RF-07):** Como usuário, quero receber uma mensagem quando a busca não encontrar cidades ou os dados meteorológicos não estiverem disponíveis para entender por que não consigo consultá-los.

## Acceptance Criteria

- **AC-01 — Pesquisa (RF-01 / US-01)**
  - **Given** o campo contém um termo não vazio, incluindo espaços externos ou acentos, e geocoding retorna resultados
  - **When** o usuário envia a pesquisa
  - **Then** são exibidos no máximo cinco resultados na ordem recebida, cada um com cidade e país e, quando fornecida, região.
  - **Given** o campo contém `  São Paulo  ` e geocoding retorna uma correspondência para `São Paulo`
  - **When** o usuário envia a pesquisa
  - **Then** o termo enviado à busca é `São Paulo` e a cidade retornada pode ser selecionada.
  - **Given** o campo está vazio ou contém apenas espaços
  - **When** o usuário tenta enviar a pesquisa
  - **Then** nenhuma solicitação de geocoding é feita e a mensagem `Digite uma cidade para pesquisar.` é exibida.
  - **Given** geocoding responde com lista vazia
  - **When** o usuário envia uma pesquisa não vazia
  - **Then** a mensagem `Nenhuma cidade encontrada.` é exibida, o termo permanece no campo e nenhuma consulta meteorológica é feita.
- **AC-02 — Identificação e seleção (RF-02 / US-02)**
  - **Given** os resultados incluem duas cidades homônimas de regiões diferentes e a resposta meteorológica da segunda cidade tem temperatura 23 °C
  - **When** a lista de resultados é exibida
  - **Then** cada resultado inclui a região e o país retornados para distingui-las.
  - **Given** esses resultados estão exibidos
  - **When** o usuário seleciona a segunda cidade
  - **Then** nome, região e país selecionados ficam visíveis e a temperatura exibida é 23 °C, correspondente à segunda cidade.
- **AC-03 — Clima atual (RF-03 / US-03)**
  - **Given** a cidade selecionada retorna condição `Céu limpo`, temperatura 20 °C, sensação térmica 19 °C, umidade 60%, vento 12 km/h, precipitação 0 mm, pressão à superfície 1015 hPa e horário local 15:00
  - **When** a consulta termina com sucesso e a unidade ativa é Celsius
  - **Then** todas as informações são exibidas com rótulos e unidades aplicáveis, associadas à cidade selecionada, e o horário de referência é mostrado como 15:00.
- **AC-04 — Previsão diária (RF-04 / US-04)**
  - **Given** o relógio de teste está fixado e a cidade selecionada tem fuso `America/Sao_Paulo`; a resposta contém datas desde ontem até cinco dias após hoje
  - **When** a previsão é exibida
  - **Then** são mostradas exatamente cinco posições, em ordem crescente, para hoje e os quatro dias seguintes; ontem e o quinto dia futuro não aparecem, e cada posição exibe data, condição, temperaturas mínima e máxima e probabilidade máxima diária de chuva.
- **AC-05 — Unidade de temperatura (RF-05 / US-05)**
  - **Given** clima atual e cada dia da previsão contêm temperaturas 0 °C e 20 °C
  - **When** a aplicação é carregada sem alteração da unidade
  - **Then** todas as temperaturas são exibidas em Celsius.
  - **Given** os mesmos dados estão visíveis
  - **When** o usuário seleciona Fahrenheit
  - **Then** todas as temperaturas são exibidas em Fahrenheit, com 0 °C mostrado como 32 °F e 20 °C como 68 °F.
  - **Given** a unidade está em Fahrenheit
  - **When** o usuário seleciona Celsius e depois recarrega a página
  - **Then** as temperaturas voltam a Celsius e a unidade inicial continua sendo Celsius.
- **AC-06 — Uso móvel (RF-06 / US-06)**
  - **Given** viewports de 320, 375 e 768 CSS px de largura e uma resposta meteorológica válida
  - **When** o usuário pesquisa, seleciona uma cidade, consulta clima e previsão e alterna unidade
  - **Then** o fluxo pode ser concluído sem rolagem horizontal e todos os controles continuam visíveis ou alcançáveis por rolagem vertical.
- **AC-07 — Erro de serviço e nova tentativa (RF-07 / US-07)**
  - **Given** geocoding ou a consulta meteorológica retorna erro
  - **When** a aplicação recebe a falha
  - **Then** o carregamento termina, a mensagem `Não foi possível carregar os dados. Tente novamente.` é exibida e há uma ação de nova tentativa; dados de outra cidade não são mostrados como atuais.
  - **Given** a mensagem de erro e a ação de nova tentativa estão visíveis
  - **When** o usuário solicita nova tentativa e a solicitação seguinte tem sucesso
  - **Then** a mensagem de erro é removida e os dados da solicitação repetida são exibidos.
- **AC-08 — Timeout (RF-07 / US-07)**
  - **Given** uma solicitação de geocoding ou meteorológica permanece sem resposta por 10 segundos
  - **When** o limite é atingido
  - **Then** o carregamento termina, a mensagem `A solicitação expirou. Tente novamente.` é exibida e a nova tentativa manual fica disponível; uma resposta tardia da solicitação expirada é ignorada.
- **AC-09 — Resposta parcial (RF-03 / RF-04 / RF-07)**
  - **Given** a resposta não contém uma métrica atual ou um ou mais dos cinco dias previstos
  - **When** os dados são exibidos
  - **Then** métricas ausentes são identificadas como `Indisponível`; as cinco datas continuam identificadas, dias sem dados mostram `Previsão indisponível` e nenhum valor é estimado ou inventado.
- **AC-10 — Desempenho (RNF-04)**
  - **Given** o ambiente de aceitação tem RTT de até 100 ms, banda de download de pelo menos 10 Mbps e o provedor responde com sucesso em até 1 segundo
  - **When** são medidas 30 pesquisas e 30 consultas meteorológicas completas
  - **Then** o percentil 95 do envio até a renderização dos resultados é de até 3 segundos para pesquisa e até 5 segundos para consulta meteorológica.
- **AC-11 — Acessibilidade (RNF-03)**
  - **Given** um usuário navega apenas por teclado
  - **When** executa pesquisa, seleção, consulta e troca de unidade
  - **Then** todas as ações são concluídas, o foco permanece visível e não há armadilha de teclado; estados de carregamento, vazio e erro são anunciados por tecnologia assistiva; contraste atende WCAG 2.2 AA e controles têm área mínima de 44 × 44 CSS px.
- **AC-12 — Compatibilidade e responsividade (RNF-01 / RNF-07)**
  - **Given** a aplicação é testada nos viewports de 320, 375, 768, 1024, 1440 e 1920 CSS px e nos navegadores e versões definidos em RNF-07
  - **When** o fluxo principal é executado
  - **Then** nenhum conteúdo essencial exige rolagem horizontal e a pesquisa, seleção, clima, previsão e unidade permanecem utilizáveis.

## Non-Functional Requirements

- **RNF-01 — Responsividade:** suportar larguras de 320 a 1920 CSS px sem rolagem horizontal para conteúdo essencial; fluxos devem funcionar nos viewports do AC-12.
- **RNF-02 — Usabilidade:** apresentar estados distintos de inicialização, carregamento, sucesso, vazio, erro, timeout e resposta parcial; não deixar carregamento indefinido.
- **RNF-03 — Acessibilidade:** conformidade WCAG 2.2 nível AA; operação completa por teclado, foco visível, nomes acessíveis, anúncio de estados dinâmicos e alvos interativos com pelo menos 44 × 44 CSS px.
- **RNF-04 — Desempenho:** sob as condições do AC-10, p95 de até 3 s para pesquisa e 5 s para consulta meteorológica. Cada solicitação sem resposta deve expirar em 10 s.
- **RNF-05 — Confiabilidade:** erro de provedor deve ser distinguido de busca bem-sucedida sem resultados; nenhuma falha pode ser apresentada como dado meteorológico válido. Não há SLA de disponibilidade para serviço externo.
- **RNF-06 — Atualidade e localização temporal:** datas usam o formato `dd/MM/aaaa`, horários usam o formato de 24 horas e ambos seguem pt-BR e o fuso local da cidade. Mostrar o horário de referência fornecido pelo provedor; se ausente, mostrar `Horário de referência indisponível`, sem substituí-lo pelo horário atual do dispositivo.
- **RNF-07 — Compatibilidade:** suportar as duas versões estáveis mais recentes de Chrome, Edge, Firefox e Safari; no celular, as duas versões principais mais recentes de Safari no iOS e Chrome no Android.
- **RNF-08 — Privacidade:** não solicitar GPS, autenticação ou dados pessoais. Enviar ao Open-Meteo somente o texto de pesquisa e a localidade selecionada necessários às consultas; não persistir histórico ou preferência de unidade.

## Traceability Matrix

| User Story | Resumo | Acceptance Criteria | Non-Functional Requirements |
| --- | --- | --- | --- |
| US-01 (RF-01) | Pesquisar uma cidade | AC-01, AC-07, AC-08, AC-10 | RNF-02, RNF-04, RNF-05, RNF-07, RNF-08 |
| US-02 (RF-02) | Distinguir e selecionar a cidade correta | AC-02, AC-07, AC-08, AC-09 | RNF-01, RNF-02, RNF-03, RNF-05, RNF-07, RNF-08 |
| US-03 (RF-03) | Consultar o clima atual | AC-03, AC-05, AC-07, AC-08, AC-09, AC-10, AC-11, AC-12 | RNF-01, RNF-02, RNF-03, RNF-04, RNF-05, RNF-06, RNF-07, RNF-08 |
| US-04 (RF-04) | Consultar a previsão diária de cinco dias | AC-04, AC-05, AC-07, AC-08, AC-09, AC-10, AC-11, AC-12 | RNF-01, RNF-02, RNF-03, RNF-04, RNF-05, RNF-06, RNF-07, RNF-08 |
| US-05 (RF-05) | Alternar Celsius e Fahrenheit | AC-05, AC-11, AC-12 | RNF-01, RNF-02, RNF-03, RNF-07 |
| US-06 (RF-06) | Usar as funções principais em dispositivo móvel | AC-06, AC-11, AC-12 | RNF-01, RNF-02, RNF-03, RNF-07 |
| US-07 (RF-07) | Entender busca vazia ou falha de dados | AC-01, AC-07, AC-08, AC-09 | RNF-02, RNF-03, RNF-04, RNF-05, RNF-07 |

## Edge Cases

- A busca retorna zero resultados: mostrar o estado sem resultados e manter o termo pesquisado para edição.
- O serviço falha: mostrar erro e oferecer nova tentativa manual; não reutilizar dados de outra cidade como se fossem atuais.
- A solicitação excede 10 segundos: encerrar o carregamento e mostrar o estado de timeout definido nos ACs.
- A resposta meteorológica é parcial: marcar cada métrica ausente e cada dia sem dados; não completar valores por estimativa.
- A resposta de uma pesquisa anterior chega após uma nova seleção: ignorar a resposta antiga e manter visíveis apenas dados associados à seleção mais recente.
- A data da cidade difere da data do dispositivo: calcular e rotular dias pelo fuso local da cidade, não pelo fuso do dispositivo.

## Assumptions

- A cidade é selecionada pelo usuário; localização automática não faz parte da v1.
- A janela diária usa o fuso horário local retornado para a cidade selecionada.
- Os cinco resultados de geocoding são os primeiros cinco retornados pelo provedor.
- A unidade permanece apenas durante a carga atual da página; nova carga inicia em Celsius.
- Termos, cobertura, licença e limites do Open-Meteo serão verificados antes do lançamento.

## Risks

- **Indisponibilidade, limites ou mudança do provedor:** verificar termos e cobertura antes do lançamento; manter estados de erro e nova tentativa.
- **Cidade homônima selecionada incorretamente:** exibir região e país e testar seleção entre resultados homônimos.
- **Dado antigo interpretado como atual:** mostrar horário de referência do provedor e não inventar timestamp quando ausente.
- **Resposta parcial ou atrasada:** testar campos/dias ausentes e timeout de 10 s; não fabricar valores.
- **Conversão de unidade confusa:** manter uma regra única de arredondamento e validar temperaturas atuais e diárias com valores conhecidos.

## Out of Scope

- Contas, autenticação, perfis, favoritos ou histórico de cidades.
- Localização automática por GPS ou endereço IP.
- Aplicativos nativos, previsão horária, alertas e recomendações.
- Persistência da unidade ou de dados de usuário entre cargas da página.
- Idiomas além de pt-BR.
- Garantias de disponibilidade ou atualização do provedor externo.

## Open Questions

1. Antes do lançamento, confirmar que os termos, licença, limites de uso e cobertura do Open-Meteo permitem o uso pretendido. Se não permitirem, o lançamento fica bloqueado até a escolha de uma fonte compatível.
