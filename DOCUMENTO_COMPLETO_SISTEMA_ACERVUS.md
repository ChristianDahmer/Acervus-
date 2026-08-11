# ESPECIFICAÇÃO TÉCNICA E DOCUMENTAÇÃO COMPLETA DO SISTEMA
## PLATAFORMA ACERVUS CORE (GGERE)
**Versão:** 2.5.0-ENTERPRISE (Audio & Voice Engine v2)  
**Arquitetura Base:** Clean Architecture + MVVM + Dagger Hilt + Jetpack Compose  
**Plataforma Alvo:** Android Native (Kotlin 2.0) & Web PWA (React + TypeScript)  
**Persistência:** Android Room ORM / SQLite (ACID Compliance) & Google Cloud Firestore (Local-First Offline Cache)  
**I.A. & Voz:** On-Device (Gemini Nano / ML Kit) + Remote Cloud API (Google AI SDK) + Full-Duplex WebSockets/gRPC Voice Engine  
**Segurança & Legal:** Assinatura Eletrônica Gov.br (Lei 14.063/2020) + BiometricPrompt + Hardware-Bind MDM  

---

## SUMÁRIO EXECUTIVO

O **Acervus Core (GGERE)** é uma plataforma enterprise integrada de alta disponibilidade para gestão de acervos, controle de estoque de decorações e eventos, inteligência logística, CRM preditivo, assinaturas contratuais com validade jurídica e interatividade por voz em tempo real.

O sistema foi arquitetado para operar em ambientes industriais, coletores de dados e dispositivos móveis corporativos sob regime **Offline-First**, garantindo que operações críticas de reserva, devolução, consulta de catálogo e conferência de itens funcionem perfeitamente mesmo sem conectividade com a internet.

---

## 1. VISÃO GERAL DO SISTEMA E OBJETIVOS DE NEGÓCIO

### 1.1. Propósito da Aplicação
Automatizar e blindar a cadeia operacional de locação de mobiliários, kits decorativos e artefatos de eventos, eliminando falhas de sobreposição de reservas (overbooking), agilizando o atendimento ao cliente por meio de IA preditiva e reduzindo o tempo de fechamento de contratos de horas para segundos.

### 1.2. Principais Pilares Tecnológicos
1. **Resiliência Offline-First:** Arquitetura de banco relacional local (Room ORM / SQLite) sincronizada em segundo plano com Google Cloud Firestore.
2. **Interatividade por Voz Inteligente (Audio Engine v2):** Suporte a conversação contínua com baixíssima latência (<280ms), interrupção imediata (Barge-In), cancelamento de ruído via hardware (DSP VAD) e respostas concisas e humanizadas em Português do Brasil.
3. **Assinatura Contratual com Validade Jurídica:** Integração oficial com a infraestrutura Gov.br (Lei Federal nº 14.063/2020), gerando envelopes PKCS#7 / CMS com hash SHA-256 e Carimbo do Tempo (ACT/ITI).
4. **Vínculo de Segurança MDM (Hardware-Bind):** Autenticação quádrupla atrelando o aplicativo ao dispositivo físico via IMEI, CNPJ da empresa, Telefone cadastrado e Usuário autorizado.
5. **Inteligência Preditiva no CRM:** Auto-completamento inteligente de formulários, predição de dados e validação de documentos (CPF, CNPJ, Telefone E.164, CEP) em tempo real sem chamadas desnecessárias de rede.

---

## 2. ARQUITETURA DE SOFTWARE NATIVA (CLEAN ARCHITECTURE + MVVM)

O aplicativo Android nativo segue rigorosamente os princípios de **Clean Architecture** alinhados às recomendações oficiais do Google (Android Architecture Guidelines):

```
+-------------------------------------------------------------------+
|                     PRESENTATION LAYER                            |
|    Jetpack Compose UI  <-->  StateFlow  <-->  MVVM ViewModels     |
+-------------------------------------------------------------------+
                                 |
                                 v
+-------------------------------------------------------------------+
|                        DOMAIN LAYER                               |
|   Use Cases (Pure Kotlin)  <-->  Domain Models & Repository Interfaces |
+-------------------------------------------------------------------+
                                 |
                                 v
+-------------------------------------------------------------------+
|                         DATA LAYER                                |
|   Room DAO (SQLite)  <-->  Firestore Sync  <-->  AI Voice DataSources |
+-------------------------------------------------------------------+
```

### 2.1. Camada de Apresentação (Presentation Layer)
- **Framework UI:** Jetpack Compose para componentes declarativos, performáticos e reativos.
- **Gerenciamento de Estado:** Pattern MVVM acoplado a `StateFlow` e `SharedFlow` imutáveis para garantir previsibilidade de estado e thread-safety.
- **Injeção de Dependência:** Dagger Hilt gerenciando o ciclo de vida dos ViewModels com `@HiltViewModel`.

### 2.2. Camada de Domínio (Domain Layer)
- **Isolamento:** Escrita em Kotlin puro, sem qualquer dependência do Android SDK ou de bibliotecas de terceiros.
- **Componentes:** Contém Use Cases puramente lógicos (`AnalyzeIntentUseCase`, `PredictAndValidateFormUseCase`, `ReservaUseCases`, `ProcessVoiceCommandUseCase`).

### 2.3. Camada de Dados (Data Layer)
- **Local Source:** Room ORM (SQLite) mapeando tabelas relacionais com suporte a transações ACID.
- **Remote Source:** Google Cloud Firestore para replicação em tempo real e fila de mutações offline.
- **AI Sources:** Abstração `VoiceAiRepository` unificando o modelo On-Device (`GeminiNanoDataSource`) com fallback para chamadas na nuvem (`RemoteGeminiDataSource`).

---

## 3. ARQUITETURA AVANÇADA DE VOZ, ÁUDIO E INTELIGÊNCIA ARTIFICIAL (AUDIO ENGINE V2)

A solução de voz foi projetada para oferecer uma experiência conversacional fluida, humanizada e de resposta instantânea, essencial para operadores usando coletor de dados em galpões de eventos.

### 3.1. Naturalidade e Expressividade no Módulo TTS
- **Ajuste Fine-Tuned de Prosódia:** Cadência configurável de fala (0.8x a 1.4x, padrão 1.05x) com ajuste fino de tom (*Pitch* 1.0st) e atributos de áudio configurados para `USAGE_ASSISTANT`.
- **Suporte a SSML & Pausas Humanizadas:** Injeção dinâmica de marcações SSML (`<break time="250ms"/>` e `<prosody rate="medium">`) em pontos de interrogação e frases de confirmação operacional.
- **Expansão Fonética PT-BR:** Algoritmo dedicado que transforma automaticamente caracteres especiais e siglas antes da síntese:
  - `R$ 150,00` -> *"150 reais"*
  - `CPF` -> *"C P F"*
  - `Gov.br` -> *"Gov ponto B R"*
  - `15%` -> *"15 por cento"*

### 3.2. Suporte a Interrupções em Tempo Real (Barge-In)
- **Cancelamento Atômico de Áudio:** Ao detectar o início do áudio do usuário, o sistema executa o flush imediato dos buffers de reprodução:
  ```kotlin
  audioTrack.stop()
  audioTrack.flush()
  textToSpeech.stop()
  ```
- **Interrupção de Stream na Nuvem:** Envio instantâneo da mensagem de controle `{"event": "cancel_stream"}` via WebSocket/gRPC para pausar a geração de novos tokens de texto e áudio no servidor.
- **Transição de Estado Sem Latência:** O estado da UI transiciona imediatamente de `VoiceInteractionState.Speaking` para `VoiceInteractionState.Interrupted` e em seguida `VoiceInteractionState.Listening`.

### 3.3. Detecção de Atividade de Voz (VAD) & Cancelamento de Ruído
- **Fonte de Áudio Especializada:** Captura realizada via `MediaRecorder.AudioSource.VOICE_COMMUNICATION`, acionando o DSP (Digital Signal Processor) de hardware do chip do celular.
- **Ativação de Efeitos Nativos:**
  - `AcousticEchoCanceler`: Elimina a realimentação (eco) do próprio alto-falante do dispositivo.
  - `NoiseSuppressor`: Filtra barulhos de fundo de máquinas, passos e ambientes ruidosos.
- **Silero VAD (Voice Activity Detection):** Análise em tempo real de quadros PCM de 16kHz (janelas de 30ms).
  - *Gatilho de Início:* Sinal contínuo de voz por mais de 150ms.
  - *Gatilho de Fim de Turno:* Silêncio contínuo por mais de 600ms, disparando o envio da requisição.

### 3.4. Respostas Curtas, Objetivas e Chunk Streaming
- **Instruções de Sistema (Prompt Engineering):** Diretrizes no modelo limitando respostas faladas a no máximo 1 ou 2 frases síntese (≤ 25 palavras).
- **Divisão de Sintagmas (Sentence Splitting):** O processador de texto quebra a resposta em delimitadores (`.`, `!`, `?`), enviando cada frase individualmente para a síntese TTS assim que gerada.
- **Tempo até o Primeiro Áudio (TTFA - Time to First Audio):** Início da reprodução de áudio em menos de 250ms após a identificação do fim da fala do usuário.

### 3.5. Comparativo Técnico de Arquiteturas de Áudio Android

| Abordagem Técnica | Latência Média | Suporte a Barge-In | Qualidade de Voz | Recomendação |
| :--- | :---: | :---: | :---: | :---: |
| **Full-Duplex WebSockets / gRPC (Streaming PCM)** | **< 280 ms** | **Excelente (Imediato)** | **Neural 24kHz HD** | **RECOMENDADO PARA PRODUÇÃO** |
| SpeechRecognizer + TextToSpeech Nativo | ~ 700 - 1200 ms | Moderado (Manual) | Voz Nativa do Android | Ideal para Fallback Offline |
| HTTP REST Polling + MP3 sintetizado em arquivo | > 2500 ms | Inexistente | Varia por Codec | Inadequado para conversação |

### 3.6. Gerenciamento de Estados Reativos em Kotlin & Jetpack Compose

```kotlin
// Sealed Interface para Representação Estrita do Estado de Voz
sealed interface VoiceInteractionState {
    object Idle : VoiceInteractionState
    data class Listening(val decibels: Float, val isUserSpeaking: Boolean) : VoiceInteractionState
    object Processing : VoiceInteractionState
    data class Speaking(val amplitude: Float, val currentSentence: String) : VoiceInteractionState
    object Interrupted : VoiceInteractionState
    data class Error(val message: String) : VoiceInteractionState
}
```

Na UI em Jetpack Compose, o componente `AudioWaveformVisualizer` reage ao `StateFlow<VoiceInteractionState>`, ajustando dinamicamente o tamanho e a cor da onda com interpolação de mola (`Spring.DampingRatioMediumBouncy`):
- **Verde Emerald (`#10B981`):** Escutando voz do usuário (`Listening`).
- **Dourado Acervus (`#D4AF37`):** IA Falando (`Speaking`).
- **Roxo (`#8B5CF6`):** Processando raciocínio/NLP (`Processing`).
- **Rosa Rose (`#F43F5E`):** Interrupção por Barge-In (`Interrupted`).

### 3.7. Privacidade, Segurança e Conformidade com a LGPD
- **Zero-Disk Retention:** NENHUM trecho de áudio em formato PCM ou WAV é salvo no armazenamento interno ou externo do celular. Todo o fluxo reside estritamente em memória RAM e é sobrescrito após o processamento.
- **Criptografia em Trânsito:** Comunicação com os servidores de voz realizada via TLS 1.3 sob protocolo `wss://` com Certificate Pinning.
- **Gestão Transparente de Permissões:** Tratamento de permissão `RECORD_AUDIO` com explicações em tela sobre o uso exclusivo no momento em que o assistente é ativado.

---

## 4. MODELAGEM DO BANCO DE DADOS RELACIONAL (ROOM ORM / SQLITE)

O banco de dados relacional local é gerido via **Android Room ORM**, oferecendo verificação em tempo de compilação de todas as queries SQL e transações ACID puras.

### 4.1. Esquema das Tabelas do Sistema

#### Tabela 1: `itens_acervo` (Entidade Base)
- `id` (INTEGER): `PRIMARY KEY AUTOINCREMENT`
- `nome` (TEXT): `NOT NULL`
- `quantidadeTotal` (INTEGER): `NOT NULL DEFAULT 0`
- `precoAluguel` (REAL): `NOT NULL`
- `categoria` (TEXT): `NOT NULL`
- `isKit` (INTEGER): `NOT NULL DEFAULT 0` (Boolean)

#### Tabela 2: `categorias` (Taxonomia do Acervo)
- `id` (TEXT): `PRIMARY KEY`
- `nome` (TEXT): `UNIQUE NOT NULL`
- `icone` (TEXT): `NULLABLE`

#### Tabela 3: `clientes` (CRM e Contatos)
- `id` (INTEGER): `PRIMARY KEY AUTOINCREMENT`
- `nome` (TEXT): `NOT NULL`
- `email` (TEXT): `NULLABLE`
- `telefone` (TEXT): `NOT NULL` (Formato E.164)
- `cpfCnpj` (TEXT): `NULLABLE`
- `ativo` (INTEGER): `NOT NULL DEFAULT 1`

#### Tabela 4: `reservas` (Contratos e Locações)
- `id` (INTEGER): `PRIMARY KEY AUTOINCREMENT`
- `clienteId` (INTEGER): `FOREIGN KEY (clientes.id) ON DELETE CASCADE`
- `dataRetirada` (INTEGER): `NOT NULL` (Epoch timestamp ms)
- `dataDevolucao` (INTEGER): `NOT NULL` (Epoch timestamp ms)
- `status` (TEXT): `NOT NULL` (`PENDENTE`, `CONFIRMADA`, `RETIRADA`, `DEVOLVIDA`, `CANCELADA`)
- `valorTotal` (REAL): `NOT NULL`

#### Tabela 5: `kit_componentes` (Tabela Pivot N:M para Kits Virtualizados)
- `kitId` (INTEGER): `PRIMARY KEY`, `FOREIGN KEY (itens_acervo.id) ON DELETE CASCADE`
- `componenteId` (INTEGER): `PRIMARY KEY`, `FOREIGN KEY (itens_acervo.id) ON DELETE CASCADE`
- `quantidade` (INTEGER): `NOT NULL DEFAULT 1`

#### Tabela 6: `transacoes_financeiras` (Livro Caixa)
- `id` (INTEGER): `PRIMARY KEY AUTOINCREMENT`
- `data` (INTEGER): `NOT NULL` (Epoch ms)
- `valor` (REAL): `NOT NULL`
- `tipo` (TEXT): `NOT NULL` (`RECEITA` / `DESPESA`)
- `categoria` (TEXT): `NOT NULL`
- `descricao` (TEXT): `NOT NULL`
- `reservaId` (INTEGER): `NULLABLE`, `FOREIGN KEY (reservas.id)`

#### Tabela 7: `dispositivos_autorizados` (Telemetria MDM Hardware-Bind)
- `id` (TEXT): `PRIMARY KEY` (UUID / Android ID)
- `imei` (TEXT): `UNIQUE NOT NULL`
- `nomeDispositivo` (TEXT): `NOT NULL`
- `cnpjEmpresa` (TEXT): `NOT NULL`
- `usuario` (TEXT): `NOT NULL`
- `telefone` (TEXT): `NOT NULL`
- `status` (TEXT): `NOT NULL` (`ATIVO` / `BLOQUEADO`)
- `ultimoAcesso` (INTEGER): `NOT NULL`

#### Tabela 8: `formularios_web` (Inbound Leads Webhook)
- `id` (TEXT): `PRIMARY KEY`
- `nomeCliente` (TEXT): `NOT NULL`
- `telefoneCliente` (TEXT): `NOT NULL`
- `jsonItensInteresse` (TEXT): `NOT NULL` (CLOB JSON)
- `status` (TEXT): `NOT NULL` (`INTEGRADO` / `PROCESSANDO`)
- `criadoEm` (INTEGER): `NOT NULL`

#### Tabela 9: `contrato_assinaturas_govbr` (Conformidade Assinatura Digital)
- `id` (TEXT): `PRIMARY KEY`
- `reservaId` (INTEGER): `FOREIGN KEY (reservas.id)`
- `cpfSignatario` (TEXT): `NOT NULL`
- `nomeSignatario` (TEXT): `NOT NULL`
- `nivelGovBr` (TEXT): `NOT NULL` (`PRATA` / `OURO`)
- `pkcs7Token` (TEXT): `NOT NULL` (CLOB BASE64 ICP-Brasil)
- `hashSha256` (TEXT): `NOT NULL`
- `carimboTempo` (INTEGER): `NOT NULL`
- `urlVerificacao` (TEXT): `NOT NULL`

#### Tabela 10: `ia_historico_interacoes` (Telemetria de Performance IA)
- `id` (INTEGER): `PRIMARY KEY AUTOINCREMENT`
- `tipoOperacao` (TEXT): `NOT NULL` (`PREDICAO`, `INTENCAO`, `VOZ`, `ONBOARDING`)
- `modeloUtilizado` (TEXT): `NOT NULL` (`GEMINI_NANO`, `GEMINI_REMOTE_API`, `LOCAL_FALLBACK`)
- `latenciaMs` (INTEGER): `NOT NULL`
- `sucesso` (INTEGER): `NOT NULL DEFAULT 1`
- `timestamp` (INTEGER): `NOT NULL`

---

## 5. REGRAS DE NEGÓCIO DA PLATAFORMA (RN-01 A RN-10)

### RN-01: Cálculo de Estoque Disponível de Kits Virtualizados
Kits decorativos não possuem estoque físico fixo individual. O estoque disponível de um Kit é calculado dinamicamente em tempo de execução:
$$\text{EstoqueKit} = \min_{i \in \text{Componentes}} \left( \left\lfloor \frac{\text{EstoqueFisico}[i]}{\text{QtdNecessaria}[i]} \right\rfloor \right)$$

### RN-02: Bloqueio Atômico de Overbooking Concorrente
Ao criar ou alterar uma reserva, o sistema executa uma consulta isolada e atômica dentro de uma transação Room:
```sql
SELECT SUM(ri.quantidade) FROM reserva_itens ri
JOIN reservas r ON r.id = ri.reservaId
WHERE ri.itemId = :itemId 
  AND r.status IN ('CONFIRMADA', 'RETIRADA')
  AND (:dataRetirada < r.dataDevolucao AND :dataDevolucao > r.dataRetirada)
```
Se a soma alocada mais a quantidade solicitada exceder `quantidadeTotal` do item, a transação é imediatamente abortada com erro.

### RN-03: Vínculo Quádruplo de Segurança de Dispositivo (Hardware-Bind)
Um dispositivo Android só pode operar se houver correspondência exata dos quatro parâmetros no cadastro do servidor MDM:
$$\text{Autorizado} \iff (\text{IMEI} \land \text{CNPJ} \land \text{Telefone} \land \text{Usuário}) \in \text{DispositivosHomologados}$$

### RN-04: Conciliação Automática de Livro Caixa, Reservas e Manutenção
Toda reserva alterada para o status `CONFIRMADA` ou `DEVOLVIDA` gera automaticamente lançamentos de receita e eventuais taxas no livro caixa (`transacoes_financeiras`) atrelados ao `reservaId`. Adicionalmente, registros de manutenção concluída com custo externo aprovado pelo operador podem disparar de forma automatizada lançamentos imediatos de despesa no livro caixa, mantendo a integridade do saldo operacional.

### RN-05: Validade Jurídica de Contratos via Assinatura Gov.br (Lei 14.063/2020)
Contratos de locação assinados digitalmente exigem autenticação do signatário em nível Prata ou Ouro na plataforma Gov.br, com geração de envelope PKCS#7 / CMS assinado com algoritmo SHA-256 e selo de tempestividade da Autoridade de Carimbo do Tempo (ACT/ITI).

### RN-06: Validação Preditiva e Higienização de Dados em Tempo Real
Entradas de formulário passam por higienização preditiva instantânea:
- CPFs e CNPJs são validados por algoritmo de dígitos verificadores e formatados com máscara automática.
- Números de telefone são convertidos obrigatoriamente para o padrão internacional E.164 (`+5511999999999`).

### RN-07: Resoluções de Conflito em Sincronização Local-First
Em cenários de reconexão à internet com dados alterados simultaneamente no servidor e no dispositivo local, prevalece a regra de **Last-Write-Wins (LWW)** orientada por timestamp com audit trail gravado na tabela local.

### RN-08: Gestão de Ciclo de Vida da Bateria e Frequência de Sync
Em dispositivos operando com nível de bateria inferior a 15%, o agente `WorkManager` pausa sincronizações periódicas em segundo plano, mantendo exclusivamente transações atômicas sob demanda direta do usuário.

### RN-09: Delegação Dinâmica de Níveis de Acesso por Usuário
Dispositivos homologados e operadores cadastrados possuem perfis específicos de privilégio (Administrador, Operador, Auditor) que segregam privilégios de acesso a módulos críticos (como faturamento financeiro, segurança MDM e alteração estrutural do estoque). O sistema realiza a validação de permissões diretamente em tempo de execução ao renderizar o painel ou carregar rotas locais.

### RN-10: Captação Atômica de Orçamentos via Formulários Google Forms
Formulários de captação gerados no catálogo ativo têm suas respostas coletadas periodicamente via pooling em segundo plano (`MonitorFormulariosWorker`) ou webhook de entrada. Respostas válidas são registradas de forma idempotente na tabela `formularios_web` por ID único do Forms, convertendo o interessado em lead de CRM e provisionando reservas no estado `PENDENTE` instantaneamente na base relacional do dispositivo.

---

## 6. MÓDULOS FUNCIONAIS DA APLICAÇÃO

1. **Inventário & Peças do Acervus:** Cadastro de itens, categorias, precificação diária, controle de estoque total/disponível e montagem de kits virtualizados através do cálculo sob demanda reativo.
2. **Reservas & Calendário de Locação:** Criação de orçamentos, checagem visual de disponibilidade no calendário, emissão de contratos e alteração de status (`PENDENTE` -> `CONFIRMADA` -> `RETIRADA` -> `DEVOLVIDA`).
3. **CRM de Clientes & Validades Preditivas:** Base de clientes com histórico de faturamento, canal de atendimento, máscara preditiva inteligente de documentos e score de fidelidade.
4. **Financeiro & Fluxo de Caixa:** Demonstrativo consolidado de receitas e despesas com conciliação automática com reservas convertidas e custos de manutenção preventivas aprovadas.
5. **Manutenção Preventiva de Equipamentos:** Painel para controle de ciclo de vida físico de itens de acervo baseado em limite crítico de aluguéis, contendo ordens de serviço (revisão concluída) com integração direta de custos ao livro caixa.
6. **Assinaturas Eletrônicas Gov.br & BiometricPrompt:** Assinatura digital de contratos via celular do cliente ou token corporativo com validação no portal do Governo Federal com envelope PKCS#7.
7. **Assistente de Voz & IA Conversacional (Audio Engine v2):** Painel retrátil (Drawer) com voz humanizada, ajuste fino de prosódia/pitch, interrupção imediata por fala (Barge-In) e navegação assistida.
8. **Segurança MDM & Delegação de Acessos:** Autenticação por hardware (IMEI/CNPJ) combinada a delegador central de níveis de acesso, permitindo conceder ou restringir permissões a módulos específicos para os usuários cadastrados.
9. **Formulários Web (Google Forms + WhatsApp Share):** Localizado no menu Empresa (Canais e Integrações). Permite criar formulários de orçamento vinculados às mobílias ativas do acervo, enviar links de captação formatados via WhatsApp para clientes selecionados do CRM (com edição manual de mensagens e número), e simular/capturar respostas de leads via sincronização WorkManager ou testes offline de inbound webhook.
10. **Sorteios de Instagram API:** Módulo nativo para processamento, filtragem e sorteio de ganhadores através de comentários coletados de posts ativos na API oficial do Instagram.
11. **Relatórios, BI & Exportação:** Gráficos de rotatividade do acervo, itens mais alugados e faturamento mensal exportáveis em PDF e Excel.

---

## 7. MANUAL DE COMPILAÇÃO, INSTALAÇÃO E DEPLOYMENT INDUSTRIAL

### 7.1. Requisitos do Ambiente de Desenvolvimento
- **JDK:** OpenJDK 17 ou superior
- **Android SDK:** API Level 34 (Android 14 / UpsideDownCake)
- **Min SDK:** API Level 24 (Android 7.0 - cobertura de 98% dos dispositivos no mercado)
- **Gradle:** 8.5+ com Plugin Android Gradle (AGP) 8.2+
- **Kotlin:** 2.0.0+

### 7.2. Variáveis de Ambiente e Propriedades (`local.properties`)
```properties
sdk.dir=/Users/developer/Library/Android/sdk
firestore.api.key=AIzaSyA_YOUR_FIRESTORE_KEY
govbr.client.id=acervus-app-prod-id
govbr.client.secret=YOUR_GOVBR_SECRET
whatsapp.cloud.token=EAAG_YOUR_WHATSAPP_TOKEN
```

### 7.3. Comandos de Compilação
- **Build de Debug:** `./gradlew assembleDebug`
- **Build de Produção (APK / AAB):** `./gradlew assembleRelease`
- **Execução de Suíte de Testes:** `./gradlew testDebugUnitTest`

### 7.4. Guia Completo de Publicação do Sistema

#### A. Publicação da Aplicação Web PWA (Google Cloud Run / AI Studio)
1. **Link de Compartilhamento Direto (Preview / Staging):**
   - Na barra superior do Google AI Studio Build, clique no botão **Share** (Compartilhar).
   - O sistema gera automaticamente uma URL otimizada (`https://ais-pre-*.run.app`) com HTTPS ativo, PWA e suporte total ao Audio Engine v2.
2. **Implantação em Produção (Google Cloud Run / Container Docker):**
   - No menu principal da plataforma, selecione **Deploy to Cloud Run**.
   - Defina as variáveis de ambiente em produção (`GEMINI_API_KEY`, `FIRESTORE_API_KEY`, etc.).
   - O container Express + React + Vite é compilado via `npm run build` e disponibilizado em porta 3000 sob ingress de alta disponibilidade com autoscaling.
3. **Exportação de Código Fonte:**
   - Acesse **Settings / Menus** e escolha **Export to GitHub** ou **Download ZIP** para obter a base de código integral para integração contínua (CI/CD GitHub Actions).

#### B. Publicação do Aplicativo Nativo Android (APK / AAB)
1. **Geração da Chave de Assinatura de Produção (Keystore JKS):**
   ```bash
   keytool -genkey -v -keystore acervus-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias acervus-key
   ```
2. **Geração do Pacote Otimizado para Google Play Store (.AAB):**
   ```bash
   ./gradlew bundleRelease
   ```
   *O arquivo gerado em `app/build/outputs/bundle/release/app-release.aab` deve ser enviado no Google Play Console.*
3. **Geração do Executável Direto para Coletores MDM Corporativos (.APK):**
   ```bash
   ./gradlew assembleRelease
   ```
   *O arquivo em `app/build/outputs/apk/release/app-release.apk` pode ser instalado diretamente nos coletores Zebra, Honeywell e celulares corporativos via MDM.*
4. **Publicação no Google Play Console:**
   - Acesse [play.google.com/console](https://play.google.com/console).
   - Crie a ficha do aplicativo (Ícones, Capturas de Tela, Categoria "Ferramentas/Produtividade").
   - Crie uma versão na faixa **Produção** ou **Testes Internos** e envie o pacote `.aab`.
   - Preencha a Declaração de Privacidade (Lei 14.063/2020 e LGPD) informando o uso de biometria e microfone para assistente de voz e submeta para análise do Google.

---

*Documento gerado e atualizado pela Engenharia de Software Acervus Core — Todos os direitos reservados.*
