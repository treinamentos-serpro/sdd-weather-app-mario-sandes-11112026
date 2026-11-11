# Discovery — Aplicação de previsão do tempo

## Contexto

A empresa solicitou uma aplicação de previsão do tempo para que usuários
possam consultar condições meteorológicas de cidades. O briefing identifica
cinco capacidades principais: buscar cidades, ver o clima atual, consultar a
previsão de cinco dias, alternar entre Celsius e Fahrenheit e usar a aplicação
em dispositivos móveis.

Esta análise organiza os requisitos de negócio e explicita os pontos que
precisam de decisão antes de uma especificação detalhada. As decisões já
tomadas estão registradas na seção **Decisões**; os demais pontos permanecem
em aberto.

## Requisitos Funcionais

- **RF-01 — Buscar cidades:** permitir que o usuário pesquise cidades.
- **RF-02 — Identificar a cidade selecionada:** permitir que o usuário
  selecione a cidade desejada nos resultados da busca. A forma de distinguir
  cidades com nomes iguais ainda precisa ser definida.
- **RF-03 — Consultar clima atual:** exibir o clima atual da cidade
  selecionada. As métricas e o momento de referência ainda precisam ser
  definidos.
- **RF-04 — Consultar previsão de cinco dias:** exibir a previsão para cinco
  dias da cidade selecionada, considerando hoje e os quatro dias seguintes.
  O nível de detalhe ainda precisa ser definido.
- **RF-05 — Alternar unidade de temperatura:** permitir alternar entre graus
  Celsius e Fahrenheit e apresentar as temperaturas na unidade escolhida.
- **RF-06 — Usar a aplicação em dispositivos móveis:** permitir que usuários
  acessem e utilizem as funcionalidades principais em dispositivos móveis.

## Requisitos Não-Funcionais

- **RNF-01 — Responsividade:** a interface deve se adaptar a diferentes
  tamanhos de tela, incluindo dispositivos móveis.
- **RNF-02 — Usabilidade:** busca, seleção de cidade, consulta das condições e
  alternância de unidade devem ser compreensíveis e fáceis de usar.
- **RNF-03 — Acessibilidade:** a aplicação deve considerar navegação por
  teclado, leitores de tela, contraste e controles com nomes acessíveis.
- **RNF-04 — Desempenho:** busca e consulta meteorológica devem responder em
  tempo aceitável; metas mensuráveis ainda precisam ser definidas.
- **RNF-05 — Confiabilidade:** a aplicação deve comunicar quando não for
  possível obter os dados, quando a busca não retornar resultados ou quando
  ocorrer uma falha de conexão.
- **RNF-06 — Atualidade e clareza dos dados:** as informações devem indicar,
  quando aplicável, o período ou horário a que se referem e quando foram
  atualizadas.
- **RNF-07 — Compatibilidade:** navegadores, sistemas operacionais e versões
  suportados ainda precisam ser definidos.
- **RNF-08 — Privacidade:** qualquer uso de localização do usuário deve ser
  explicitado e depender de consentimento, caso esse recurso faça parte do
  escopo.

## Riscos

- **Resultados de busca ambíguos:** cidades homônimas ou com nomes semelhantes
  podem levar à consulta da localidade errada. Os resultados podem precisar
  incluir país, estado ou região para diferenciá-las.
- **Indefinição do conteúdo meteorológico:** não especificar quais métricas
  devem ser exibidas pode resultar em uma experiência que não atende às
  expectativas dos usuários.
- **Ambiguidade na previsão de cinco dias:** diferentes interpretações do
  fuso horário e do conteúdo de cada dia podem gerar resultados divergentes.
- **Dependência da disponibilidade e cobertura dos dados:** a fonte
  meteorológica escolhida pode estar indisponível, ter cobertura insuficiente,
  impor limites de uso ou alterar seus dados e serviços.
- **Exibição incorreta de datas e horários:** ignorar o fuso horário da cidade
  pode fazer com que a previsão diária seja apresentada para o dia errado.
- **Conversão ou apresentação inconsistente de unidades:** valores de
  temperatura podem não acompanhar a unidade selecionada ou podem ser
  arredondados de forma confusa.
- **Experiência móvel inadequada:** previsões detalhadas ou controles podem
  ficar difíceis de ler e operar em telas pequenas.
- **Expectativas não definidas para falhas:** sem decidir como tratar erros ou
  ausência de dados, a aplicação pode deixar o usuário sem orientação.

## Perguntas em Aberto

1. A busca deve pesquisar apenas cidades por nome? Deve aceitar acentos,
   nomes alternativos ou pesquisas em mais de um idioma?
2. Quais informações devem identificar cada resultado da busca (por exemplo,
   país, estado/província ou região)?
3. Quais métricas compõem o clima atual (por exemplo, condição, temperatura,
   sensação térmica, umidade e vento)?
4. Quais informações e granularidade devem compor a previsão de cada dia?
   Devem ser exibidas temperaturas mínima e máxima ou também previsões por
   hora?
5. Em que fuso horário os dias da previsão são determinados?
6. A unidade escolhida deve afetar apenas a temperatura ou também outras
   medidas meteorológicas? A preferência deve ser preservada no dispositivo?
7. A aplicação deve oferecer localização automática ou permitir salvar
    cidades favoritas?
8. Quais navegadores, sistemas operacionais e tamanhos de tela devem ser
    suportados?
9. Quais são as metas de desempenho, disponibilidade e frequência de
    atualização dos dados?
10. O que deve ser apresentado quando não houver conexão, a busca não retornar
    resultados ou os dados meteorológicos estiverem indisponíveis?
11. Existem requisitos específicos de acessibilidade ou privacidade além dos
    mencionados nesta análise?

## Decisões

- **Fonte de dados — Open-Meteo, sem API key.** Resolve a escolha inicial do
  provedor e a necessidade de credenciais para acessar os dados. Cobertura,
  disponibilidade, licenças e limites aplicáveis ainda devem ser verificados.
- **Período da previsão — hoje mais os quatro dias seguintes.** Resolve a
  ambiguidade sobre quais cinco dias devem ser exibidos. O fuso horário usado
  para determinar a data local ainda precisa ser definido.
- **Unidade padrão — Celsius.** Resolve qual unidade apresentar inicialmente.
  O usuário ainda poderá alternar para Fahrenheit, conforme o requisito
  funcional; persistir essa preferência no dispositivo continua em aberto.
- **Sem autenticação e sem persistência de servidor.** Resolve que a primeira
  versão não terá contas de usuário nem armazenamento de dados associado a
  usuários no servidor. Persistência local no dispositivo não está definida.
- **Idioma da interface — pt-BR.** Resolve o idioma inicial da UI. Não define,
  por si só, formatos de data, convenções regionais ou suporte a outros
  idiomas.

## Suposições

- A cidade deve ser escolhida pelo usuário antes da consulta meteorológica;
  o briefing não exige localização automática.
- “Celsius e Fahrenheit” refere-se à unidade usada para exibir temperaturas.
- A previsão de cinco dias é referente à cidade selecionada pelo usuário e
  inclui hoje mais os quatro dias seguintes.
- A aplicação deve ser utilizável em dispositivos móveis, mas o briefing não
  determina se haverá aplicativo nativo ou uma experiência móvel via navegador.
- As métricas meteorológicas, o fuso horário da previsão, a persistência local
  de preferências e o comportamento em condições de erro permanecem decisões
  em aberto; esta análise não assume valores ou soluções para esses pontos.
