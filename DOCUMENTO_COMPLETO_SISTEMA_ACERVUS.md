# ESPECIFICAÇÃO TÉCNICA E ANÁLISE DE ENGENHARIA DE SOFTWARE
## PLATAFORMA ACERVUS CORE (GGERE) — ENTERPRISE EDITION
**Versão do Sistema:** 2.8.0-ENTERPRISE  
**Especialidade:** Engenharia de Software Android Nativo (Kotlin 2.0+) & Microsserviços Nuvem / PWA  
**Arquitetura:** Clean Architecture + MVVM + Dagger Hilt + Jetpack Compose + Local-First Sync Engine  
**Plataforma Alvo:** Android Nativo (Kotlin 2.0+, API 26 a 35) & Web PWA / Google Cloud Run (Node.js + TypeScript + Express)  
**Bancos de Dados:** Room ORM / SQLite (SQLCipher 256-bit AES) + Google Cloud Firestore + Cloud SQL PostgreSQL (Drizzle ORM)  
**Inteligência Artificial:** Google Gemini 3.7 Flash (Server-Side @google/genai SDK) + Context-Aware BI Engine + Audio Engine v2 (Barge-In, Silero VAD)  
**Segurança & Conformidade:** Assinatura Gov.br (Lei Federal nº 14.063/2020) + Hardware-Bind MDM + NFS-e SEFIN + LGPD  

---

## 1. IDENTIDADE VISUAL E ESPECIFICAÇÃO DO BRASÃO OFICIAL (ACERVUS CORE)

Nas telas nativas Android (Splash Screen, Headers, Diálogos de Confirmação, Impressos PDF e Área do Cliente), aplica-se a seguinte especificação visual heráldica e tecnológica padronizada:

```
                  /\
                 /AC\           <-- Sigla AC chanfrada em prateado metálico
                /====\
               /  ||  \         <-- Brasão com borda metálica prateada e fundo azul profundo (#0A1128)
              / [Cubo] \        <-- Esquerda: Cubo Hexagonal 3D Ciano (Acervo / Dados)
             /   /||\   \       <-- Direita: Escudo sobreposto com Batimento/Frequência & Trilhas IA
            /    \||/    \
            \    (@@)    /      <-- Base: Círculo com Impressão Digital Biométrica Azul
             \          /
              \   \/   /
               \      /
                \____/
             ACERVUS CORE
                GGERE
 GERENCIAMENTO DE ACERVO, CRM, IA E LOGÍSTICA
```

### 1.1. Especificação de Cores e Vetores
- **Fundo do Brasão:** Azul-escuro profundo (`#0A1128` / `#0E131F`).
- **Borda Externa:** Prata metálico polido com chanfro de 45º (`#E2E8F0` / `#94A3B8`).
- **Topo:** Sigla **"AC"** centralizada em tipografia sem serifa pesada em prata reluzente.
- **Elementos Internos:**
  - *Esquerda:* Cubo hexagonal 3D ciano luminescente (`#06B6D4` / `#00F5D4`), representando volumetria de estoque e dados do acervo.
  - *Direita:* Escudo sobreposto contendo pulso senoidal de frequência cardíaca e nós de rede neural/circuitos de IA.
  - *Base:* Círculo azul ciano com ícone de impressão digital biométrica (`#38BDF8`), representando autenticação e conformidade jurídica.
- **Tipografia Institucional (Centralizada):**
  - Título Principal: **`ACERVUS CORE`** (Caixa alta, fonte pesada/bold, acabamento dourado/prateado).
  - Subtítulo: **`GGERE`** (Caixa alta, peso médio, tracking expandido).
  - Descritivo da Base: **`GERENCIAMENTO DE ACERVO, CRM, IA E LOGÍSTICA`** (Caixa alta, corpo menor, alta legibilidade).
- **Ativo de Imagem:** Localizado em `/public/logo.png` e `/src/assets/images/logo_acervus_core_1786370908594.jpg`.

---

## 2. ANÁLISE DE ENGENHARIA DE SOFTWARE ANDROID NATIVO

### 2.1. Arquitetura em Camadas (Clean Architecture + MVVM)
O sistema foi estruturado seguindo rigorosamente os princípios de separação de responsabilidades e inversão de controle:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                              │
│  - Jetpack Compose UI Declarativa (Material 3 + Acervus Dark Theme)     │
│  - ViewModels injetados com @HiltViewModel                             │
│  - UI State encapsulado em StateFlow<UiState> imutável                 │
│  - Trilha de Navegação baseada em Navigation Compose / Deep Links      │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          DOMAIN LAYER                                  │
│  - Use Cases Puros (Kotlin Coroutines / Flow)                          │
│  - CalculateKitStockUseCase (Cálculo de gargalo de kits virtuais)      │
│  - CheckOverbookingConflictUseCase (Validação atômica de reservas)     │
│  - ProcessVoiceCommandUseCase (Classificação e execução de voz)        │
│  - GenerateGovBrSignatureEnvelopeUseCase (Criptografia PKCS#7)         │
│  - EmitirNfseSefinUseCase (Comunicação SOAP/REST com SEFIN Nacional)   │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          DATA LAYER                                    │
│  - Repositórios Unificados (Local-First Synchronization Strategy)       │
│  - Room Database com SQLCipher (AES-256 no armazenamento local)        │
│  - Google Cloud Firestore (Sincronização em tempo real via WebSockets) │
│  - Cloud SQL PostgreSQL com Drizzle ORM (Relatórios de BI e BI SQL)   │
│  - Gemini AI Remote Data Source (SDK @google/genai via Express Proxy)  │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.2. Injeção de Dependências com Dagger Hilt
- `@Singleton DatabaseModule`: Fornece a instância do banco `AcervusDatabase` protegido com chave de criptografia derivada do `Android Keystore`.
- `@Singleton NetworkModule`: Configura clientes `OkHttpClient` com interceptadores de telemetria `User-Agent: aistudio-build`, pinning de certificado SSL para Gov.br e SEFIN, e gerenciamento de tokens OAuth2.
- `@ViewModelScoped UseCases`: Injeta casos de uso independentes em ViewModels específicos para garantir isolamento de testes de unidade e UI.

### 2.3. Resiliência Offline-First & Sincronização Local-First
1. **Gravação Local Imediata:** Toda operação iniciada pelo usuário (criação de reserva, cadastro de cliente, vistoria com foto, recebimento de calção) é gravada primeiramente no SQLite/Room local com status `SYNC_PENDING` em menos de 15ms.
2. **Fila de Sincronização via WorkManager:** O `SyncWorkManager` do Android observa o estado de conectividade (`NetworkType.CONNECTED`) e nível de bateria (`BatteryNotLow`), efetuando o push idempotente dos dados para o Firestore e PostgreSQL.
3. **Resolução de Conflitos (Last-Write-Wins com Auditoria):** Divergências de versão entre dispositivos utilizam resolução por timestamp de hardware sincronizado com Network Time Protocol (NTP).

---

## 3. ARQUITETURA MULTI-TENANT E SEPARAÇÃO DE ATORES

O Acervus Core opera sob regime **Multi-Tenant Estrito**, onde múltiplos locadores compartilham a infraestrutura sem qualquer possibilidade de vazamento de dados:

```
                           [ ACERVUS CORE CLOUD ]
                                     │
          ┌──────────────────────────┴──────────────────────────┐
          ▼                                                     ▼
 [ TENANT A: Festas & Cia ]                            [ TENANT B: Requinte Eventos ]
 (tenantId = "tenant_festas_01")                       (tenantId = "tenant_requinte_02")
   ├─ Usuários (Operadores/Admins)                       ├─ Usuários (Operadores/Admins)
   ├─ Acervo / Estoque Exclusivo                         ├─ Acervo / Estoque Exclusivo
   ├─ Clientes Cadastrados                               ├─ Clientes Cadastrados
   ├─ Livro Caixa & Chave PIX                            ├─ Livro Caixa & Chave PIX
   └─ Reservas & Propostas Web                           └─ Reservas & Propostas Web
```

### 3.1. Definição Rigorosa dos Atores
1. **Tenant (Empresa Locadora):**
   - Pessoa jurídica ou física proprietária do acervo de mobílias.
   - Possui chave `tenantId` mandatória em todas as entidades.
   - Configura seus dados fiscais, chave PIX para calção, percentual de garantia e logotipo.
2. **Usuário (Operador / Colaborador):**
   - Atendente, estoquista, motorista de entrega ou gerente financeiro com credenciais de login.
   - Autenticado via Firebase Auth e vinculado ao hardware corporativo homologado (MDM).
3. **Cliente (Cliente Final / Locatário):**
   - Contratante da locação (noiva, decorador, aniversariante).
   - **NÃO possui login no painel de gestão**; interage por links públicos de proposta (`#form-id`), WhatsApp e assinatura Gov.br.

---

## 4. MODELAGEM DO BANCO DE DADOS (ROOM ORM & CLOUD SQL SCHEMA)

### 4.1. Esquema Completo das Entidades

```
 ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
 │     tenants     │       │     clients     │       │   stock_items   │
 ├─────────────────┤       ├─────────────────┤       ├─────────────────┤
 │ PK id           │◄──┐   │ PK tenantId     │◄──┐   │ PK tenantId     │
 │    nomeFantasia │   └───│ PK id           │   └───│ PK id           │
 │    cnpj         │       │    nome         │       │    nome         │
 │    chavePix     │       │    telefone     │       │    quantidade   │
 └─────────────────┘       │    cpfCnpj      │       │    precoAluguel │
                           │    endereco     │       │    isKit        │
                           └────────┬────────┘       │    statusManut  │
                                    │                └────────┬────────┘
                                    ▼                         │
                           ┌─────────────────┐                │
                           │    bookings     │                │
                           ├─────────────────┤                │
                           │ PK tenantId     │                │
                           │ PK id           │◄────────┐      │
                           │ FK clienteId    │         │      │
                           │    dataRetirada │         │      │
                           │    dataDevolucao│         │      │
                           │    status       │         │      │
                           │    valorCalcao  │         │      │
                           │    endereco     │         │      │
                           └────────┬────────┘         │      │
                                    │                  │      │
                                    ▼                  │      │
                           ┌─────────────────┐         │      │
                           │  booking_items  │         │      │
                           ├─────────────────┤         │      │
                           │ PK tenantId     │         │      │
                           │ PK bookingId    │─────────┘      │
                           │ PK stockItemId  │────────────────┘
                           │    quantidade   │
                           └─────────────────┘
```

#### Tabela 1: `tenants` (Empresas Usuárias)
- `id` (TEXT, PK): Identificador único do locador (ex: `tenant_acervus_01`).
- `nomeFantasia` (TEXT, NOT NULL): Nome comercial (exibido em linha única na edição cadastral).
- `razaoSocial` (TEXT, NULLABLE): Razão social registrada na RFB (exibida em linha única na edição cadastral).
- `cnpj` (TEXT, NULLABLE): Cadastro Nacional da Pessoa Jurídica (exibido em linha única).
- `telefoneWhatsapp` (TEXT, NULLABLE): Telefone comercial principal E.164.
- `telefonesAdicionais` (JSONB / ARRAY, NULLABLE): Lista dinâmica de telefones secundários da empresa e contatos do responsável.
- `logoUrl` (TEXT, NULLABLE): URL ou imagem base64 do logotipo/identidade visual do tenant, aplicada nos relatórios e propostas.
- `valorFretePorKm` (DECIMAL(10,2), NULLABLE): Tarifa padrão de frete por quilômetro rodado.
- `googleMapsApiKey` (TEXT, NULLABLE): Chave da Google Distance Matrix API para cálculo de rotas.
- `createdAt` (TIMESTAMP, NOT NULL): Data de ativação do tenant.

#### Tabela 2: `stock_items` (Itens do Acervo & Kits)
- `tenantId` (TEXT, PK): Empresa proprietária.
- `id` (INTEGER, PK): Código sequencial do item no tenant.
- `nome` (TEXT, NOT NULL): Nome da peça (ex: `Mesa Imperial Rústica`).
- `descricao` (TEXT, NULLABLE): Detalhes de acabamento, dimensões e cores.
- `quantidadeTotal` (INTEGER, NOT NULL DEFAULT 1): Quantidade física total.
- `quantidadeManutencao` (INTEGER, NOT NULL DEFAULT 0): Peças em reparo/oficina.
- `precoAluguel` (DECIMAL(12,2), NOT NULL): Valor da diária de locação.
- `imageUrl` (TEXT, NOT NULL): Fotografia do produto em alta resolução.
- `categoria` (TEXT, NOT NULL): Categoria taxonômica.
- `isKit` (BOOLEAN, NOT NULL DEFAULT FALSE): Indica se o item é um kit virtual.
- `kitComponentes` (JSONB, NULLABLE): Array `[{ "itemId": 10, "quantidade": 4 }]`.
- `ultimaManutencao` (BIGINT, NULLABLE): Timestamp da última revisão.
- `frequenciaAlugueisManutencao` (INTEGER, DEFAULT 5): Ciclo de locações para alerta.
- `alugueisDesdeManutencao` (INTEGER, DEFAULT 0): Contador de giros desde a última OS.
- `statusManutencao` (TEXT, DEFAULT 'EM_DIA'): `EM_DIA`, `ALERTA`, `EM_MANUTENCAO`.
- `proximaRevisaoData` (BIGINT, NULLABLE): Previsão de vistoria técnica.

#### Tabela 3: `clients` (Clientes Finais / Locatários)
- `tenantId` (TEXT, PK): Empresa locadora.
- `id` (INTEGER, PK): Código do cliente no tenant.
- `nome` (TEXT, NOT NULL): Nome completo ou Razão Social.
- `telefone` (TEXT, NOT NULL): Telefone/WhatsApp E.164 (`+55...`).
- `email` (TEXT, NULLABLE): E-mail de envio de contratos.
- `cpfCnpj` (TEXT, NULLABLE): Documento validado com dígitos verificadores.
- `endereco` (TEXT, NULLABLE): Endereço residencial ou de faturamento.
- `observacoes` (TEXT, NULLABLE): Anotações de relacionamento / CRM.
- `ativo` (BOOLEAN, NOT NULL DEFAULT TRUE): Soft delete.

#### Tabela 4: `bookings` (Reservas & Locações)
- `tenantId` (TEXT, PK): Empresa locadora.
- `id` (INTEGER, PK): Número identificador da reserva.
- `clienteId` (INTEGER, NOT NULL): Vínculo com `clients.id`.
- `dataRetirada` (BIGINT, NOT NULL): Início da locação (timestamp ms).
- `dataDevolucao` (BIGINT, NOT NULL): Término da locação (timestamp ms).
- `status` (TEXT, NOT NULL): `PENDENTE`, `CONFIRMADA`, `EM_ANDAMENTO`, `CONCLUIDA`, `CANCELADA`.
- `origemPropostaId` (TEXT, NULLABLE): Hash da proposta web originária.
- `propostaAprovada` (BOOLEAN, DEFAULT FALSE): Status de aprovação pelo cliente.
- `contratoAssinadoText` (TEXT, NULLABLE): Conteúdo textual integral do contrato.
- `hashAssinaturaDigital` (TEXT, NULLABLE): Hash criptográfico SHA-256 / Gov.br.
- `dataAssinatura` (BIGINT, NULLABLE): Timestamp da formalização jurídica.
- `percentualCalcao` (DECIMAL(5,2), DEFAULT 30.00): Percentual de caução de garantia.
- `valorCalcao` (DECIMAL(12,2), DEFAULT 0.00): Valor em reais do calção.
- `endereco` (TEXT, NULLABLE): **Local do Evento / Endereço de Entrega** logístico.
- `nfseChaveAcesso` (TEXT, NULLABLE): Chave de 50 dígitos da NFS-e.
- `nfseProtocolo` (TEXT, NULLABLE): Protocolo de autorização SEFIN.
- `nfseDataEmissao` (BIGINT, NULLABLE): Timestamp de emissão da nota fiscal.

#### Tabela 5: `web_forms` (Propostas Web Interativas)
- `tenantId` (TEXT, PK): Empresa locadora.
- `id` (TEXT, PK): Hash público da proposta (ex: `orc_981273`).
- `titulo` (TEXT, NOT NULL): Nome do orçamento.
- `clienteId` (INTEGER, NULLABLE): Cliente vinculado.
- `clienteNome` (TEXT, NULLABLE): Nome do cliente.
- `clienteTelefone` (TEXT, NULLABLE): Telefone do cliente.
- `itens` (JSONB, NOT NULL): Lista de itens e diárias disponíveis.
- `criadoEm` (BIGINT, NOT NULL): Timestamp de criação.
- `respondido` (BOOLEAN, NOT NULL DEFAULT FALSE): Indicador de aprovação.
- `textoIntroducao` (TEXT, NULLABLE): Mensagem de apresentação do locador.
- `percentualCalcao` (DECIMAL(5,2), DEFAULT 30.00): Calção configurado para a proposta.
- `validadeDias` (INTEGER, NOT NULL DEFAULT 7): Prazo em dias para expiração.
- `recusado` (BOOLEAN, DEFAULT FALSE): Indica se o cliente declinou.
- `motivoRecusa` (TEXT, NULLABLE): Justificativa informada pelo cliente.
- `dataRecusa` (BIGINT, NULLABLE): Timestamp da recusa.
- `resposta` (JSONB, NULLABLE): Payload com itens escolhidos, datas, local, distância em km, frete e assinatura.

#### Tabela 6: `financial_transactions` (Livro Caixa & Conciliação)
- `tenantId` (TEXT, PK): Empresa locadora.
- `id` (TEXT, PK): Identificador da transação.
- `tipo` (TEXT, NOT NULL): `RECEITA` ou `DESPESA`.
- `categoria` (TEXT, NOT NULL): `Locação`, `Caução de Garantia`, `Manutenção`, `Logística/Frete`.
- `valor` (DECIMAL(12,2), NOT NULL): Valor monetário.
- `data` (BIGINT, NOT NULL): Timestamp da movimentação.
- `descricao` (TEXT, NOT NULL): Histórico detalhado.
- `referenciaId` (TEXT, NULLABLE): Vínculo com ID da reserva ou OS.
- `status` (TEXT, NOT NULL DEFAULT 'PENDENTE'): `PAGO` ou `PENDENTE`.

#### Tabela 7: `dispositivos_autorizados` (Telemetria MDM Hardware-Bind)
- `id` (TEXT, PK): Identificador do registro.
- `tenantId` (TEXT, NOT NULL): Empresa proprietária.
- `imei` (TEXT, NOT NULL UNIQUE): IMEI de hardware do smartphone/coletor.
- `nomeDispositivo` (TEXT, NOT NULL): Identificação amigável do terminal.
- `cnpjEmpresa` (TEXT, NOT NULL): CNPJ correspondente.
- `usuario` (TEXT, NOT NULL): Nome do operador homologado.
- `telefone` (TEXT, NOT NULL): Linha telefônica autorizada.
- `status` (TEXT, NOT NULL): `ATIVO` ou `BLOQUEADO`.
- `ultimoAcesso` (BIGINT, NOT NULL): Timestamp da última comunicação com o MDM.

---

## 5. INTELIGÊNCIA ARTIFICIAL POTENCIALIZADA (GOOGLE GEMINI 3.7 FLASH)

O sistema conta com uma arquitetura de IA integrada em dois níveis: **Nuvem com Gemini 3.7 Flash** e **Motor Heurístico Local**.

```
[ Usuário / Operador ] ─── (Voz / Texto) ───► [ Acervus UI / Drawer ]
                                                     │
                             ┌───────────────────────┴───────────────────────┐
                             │                                               │
                             ▼ (Online)                                      ▼ (Offline / Contingência)
              [ Express Server: server.ts ]                     [ aiEngine.ts: Heurística Local ]
                             │                                               │
               [ @google/genai SDK (v3.7) ]                                  │
                             │                                               │
               [ Google Gemini 3.7 Flash ]                                   │
              - Context-Aware System Stats                                   │
              - Classificação de Intenção JSON                               │
              - OCR Multimodal de Documentos                                 │
              - BI & Insights de Giro de Estoque                             │
                             │                                               │
                             └───────────────────────┬───────────────────────┘
                                                     ▼
                                      [ Resposta Estruturada ]
                                      - answer (Explicação técnica)
                                      - targetTab (Navegação imediata)
                                      - actionSuggestions (Chips rápidos)
                                      - extractedReservation (Pré-preenchimento)
```

### 5.1. Endpoints de Inteligência Artificial Server-Side
1. **`POST /api/gemini/assistant` (Copiloto Estratégico & Assistente de Voz):**
   - Processa mensagens em linguagem natural utilizando a API do **Gemini 3.7 Flash**.
   - Recebe em tempo real o payload `systemStats` contendo estatísticas operacionais do tenant, métricas de giro de estoque, valores configurados de frete por quilômetro (`valorFretePorKm`), status de leitura de QR Code e reservas pendentes.
   - Fornece respostas técnicas e instrui o operador sobre rotas de navegação direta (`targetTab`), como localização do Coletor de QR Code em "Acervo", simulação/cálculo de frete em "Perfil Empresa", contratos e reservas.
   - Retorna schema estrito JSON: `intent`, `targetTab`, `answer`, `extractedReservation`, `actionSuggestions`, `confidence` e `explanation`.
2. **`POST /api/gemini/business-insights` (BI Preditivo & Consultor Executivo):**
   - Analisa o histórico de locações, curva de faturamento, impacto da taxa de frete no ticket médio e custos de manutenção.
   - Emite relatórios estruturados com itens de maior giro, gargalos em kits decorativos, otimização logística e projeções financeiras.
3. **`POST /api/gemini/analyze-report` (OCR Multimodal de Documentos e Vistorias):**
   - Digitaliza fotos de contratos físicos, folhas de vistoria com avarias assinadas, etiquetas de QR Code danificadas e comprovantes fiscais, convertendo em modelos com tags dinâmicas (`{{CLIENTE_NOME}}`, `{{DATA_RETIRADA}}`, `{{VALOR_TOTAL}}`, `{{VALOR_FRETE}}`).

### 5.2. Contexto Operacional Extensível da IA (Módulos de Frete e Coletor)
- **Consultas sobre Frete e Logística:** O assistente orienta a configuração da taxa de frete por quilômetro em **Perfil Empresa**, explica o cálculo automático com base na distância da sede até o local do evento e orienta sobre o uso da chave do Google Maps API.
- **Consultas sobre Bipagem e Estoque via QR Code:** O assistente direciona o operador para o **Coletor e Leitor QR Code** na aba de Acervo, explicando o uso da câmera integrada, os modos de operação (Consulta, Entrada e Saída) e o leitor manual de bip.

### 5.3. Audio Engine v2 & Interatividade por Voz
- **Interrupção por Voz (Barge-In):** Cancelamento atômico de áudio (`stopSpeech()`, `audioTrack.flush()`) em menos de 50ms quando o usuário começa a falar.
- **Detecção de Atividade de Voz (Silero VAD):** Filtro de hardware (`MediaRecorder.AudioSource.VOICE_COMMUNICATION`) com cancelamento acústico de eco (`AcousticEchoCanceler`) e supressão de ruído (`NoiseSuppressor`).
- **Prosódia Humanizada:** Síntese em Português do Brasil com velocidade 1.05x e pausas naturais em quebras de frase.

---

## 6. REGRAS DE NEGÓCIO DA PLATAFORMA (RN-01 A RN-18)

- **RN-01 (Estoque de Kits Virtuais):** O saldo de kits é calculado dinamicamente pelo componente limitante: $\min_i \lfloor \text{EstoqueFisico}[i] / \text{QtdNecessaria}[i] \rfloor$.
- **RN-02 (Bloqueio Atômico de Overbooking):** Checagem de interseção temporal de reservas em transação serializada. Locações com status `CONFIRMADA` ou `EM_ANDAMENTO` bloqueiam o saldo para novas solicitações no período.
- **RN-03 (Vínculo Quádruplo MDM Hardware-Bind):** Acesso operacional ao app nativo exige validação simultânea de $\text{IMEI} \land \text{CNPJ} \land \text{Telefone} \land \text{Usuário}$.
- **RN-04 (Conciliação de Caução de Garantia):** O valor de caução retido é lançado no livro caixa como passivo circulante e liberado/estornado automaticamente após a vistoria de devolução sem avarias.
- **RN-05 (Assinatura com Validade Jurídica Gov.br):** Contratos digitais possuem hash SHA-256 com carimbo de tempo ICP-Brasil em conformidade com a Lei Federal nº 14.063/2020.
- **RN-06 (Padronização E.164 e Validação de Documentos):** Todos os telefones são higienizados no formato internacional `+55DD9XXXXXXXX` e CPFs/CNPJs são validados pelos algoritmos dos dígitos verificadores.
- **RN-07 (Local-First Conflict Resolution):** Conflitos de edição concorrente são resolvidos pela estratégia Last-Write-Wins orientada por timestamps sincronizados via NTP.
- **RN-08 (Gestão Inteligente de Bateria):** Sincronizações pesadas e compressão de imagens em segundo plano são suspensas quando o nível de bateria é inferior a 15%.
- **RN-09 (Controle de Acesso Baseado em Perfis - RBAC):** Restrição de telas e ações no sistema com base no perfil do operador (`ADMIN`, `ATENDIMENTO`, `LOGISTICA`, `FINANCEIRO`).
- **RN-10 (Captação Idempotente via Propostas Web):** Links públicos de orçamento geram leads no CRM e provisionam reservas automaticamente após a assinatura do cliente.
- **RN-11 (PIX Dinâmico com QR Code de Caução):** A tela da proposta calcula o sinal/calção configurado pelo locador e gera o código PIX Copia e Cola e o QR Code dinâmico com chave e valor exatos.
- **RN-12 (Local do Evento & Apoio Logístico):** O endereço do evento informado pelo cliente na proposta ou reserva é salvo e integrado à ficha do cliente, ao cálculo de distância e à rota de entrega.
- **RN-13 (Emissão Fiscal SEFIN / NFS-e Nacional):** Transmissão de notas fiscais eletrônicas de serviço com certificado digital A1 para a SEFIN com guarda de chave e protocolo.
- **RN-14 (Rastreabilidade de Recusa de Proposta):** Registro do motivo de recusa e data no formulário para alimentar o painel de conversão do CRM.
- **RN-15 (Manutenção Preventiva por Ciclo de Aluguéis):** Cada item possui um limite de locações (ex: 5 giros); ao atingir o limite, o item entra em status `ALERTA` e sugere abertura de OS de revisão.
- **RN-16 (Privacidade e Zero-Disk Audio Retention):** Nenhuma gravação de áudio do operador é salva no disco local ou em servidores permanentes, garantindo conformidade total com a LGPD.
- **RN-17 (Cálculo Automático de Frete por Quilometragem):** O valor do frete é calculado dinamicamente multiplicando a distância real/estimada (via Google Distance Matrix API ou fallback de simulação) pela tarifa por quilômetro configurada pelo tenant. O frete compõe o valor total da locação e atualiza proporcionalmente a parcela de caução/sinal e o saldo restante.
- **RN-18 (Leitura Óptica e Coleta QR Code Nativa):** O escaneamento de QR Code via câmera ativa em modal responsivo sincroniza a consulta, entrada e saída de peças no acervo físico. Permite fallback com simulador manual de bip, controle de feedback sonoro e geração de histórico de auditoria em tempo real.
- **RN-19 (Identidade Visual & Logotipo nos Documentos):** O tenant pode cadastrar a imagem do seu logotipo na aba Perfil Empresa (upload de arquivo de imagem PNG/JPG ou inserção de URL web). O logotipo configurado (`empresaConfig.logoUrl`) é automaticamente injetado e normalizado no cabeçalho das Propostas de Orçamento Web, Contratos de Locação em PDF e Relatórios Impressos do sistema.

---

## 7. MÓDULOS DO SISTEMA (MAPA FUNCIONAL)

1. **Acervo & Estoque (com Coletor QR Code Modal):** Catálogo com fotos, controle de quantidade física/manutenção, precificação, montagem de Kits Decorativos e Terminal Coletor Modal de QR Code integrado (com câmera ao vivo, busca de peças, bip de confirmação sonoro, modos de Consulta/Entrada/Saída e histórico de movimentações em tempo real).
2. **Reservas & Calendário:** Linha do tempo de locações, visualização em calendário, conferência de datas, status de entrega/devolução e detalhamento financeiro com discriminativo de frete.
3. **Propostas Web & Área do Cliente:** Link interativo público com catálogo de fotos, seleção de datas, simulador e estimador de frete por CEP/endereço em tempo real, cálculo de caução PIX, inserção do local do evento e assinatura digital de contrato com termos de entrega integrados.
4. **Logística, Roteirização & Cálculo de Frete:** Painel de configuração de tarifa por quilômetro (`valorFretePorKm`) e chave de API do Google Maps no perfil da empresa; cálculo automático de distância (`distanciaKm`) e frete (`valorFrete`), integração de rota com Waze/Google Maps e apoio à equipe de transporte.
5. **CRM & Clientes:** Gestão de contatos, histórico de locações por cliente, WhatsApp Direct com templates dinâmicos.
6. **Financeiro & Livro Caixa:** Fluxo de caixa diário/mensal, conciliação de receitas de locação (itens + frete), cauções de garantia e despesas de oficina.
7. **Manutenção & Vistorias:** Controle de avarias na devolução, abertura de Ordens de Serviço (OS) e alerta preventivo por ciclo de giros.
8. **Assistente IA Conversacional & Voz (Gemini 3.7 Flash):** Drawer retrátil com voz humanizada, respostas contextuais, execução de comandos e chips de ação rápida.
9. **Emissão de NFS-e (SEFIN Nacional):** Emissão e cancelamento de notas fiscais com certificado A1 e protocolo oficial.
10. **Assinatura Gov.br:** Integração com o portal Gov.br para formalização de contratos de locação com nível Prata/Ouro.
11. **Segurança MDM & Terminais:** Gestão de dispositivos móveis autorizados por autenticação quádrupla.
12. **Formulários de Captação & Sincronização:** Criação de orçamentos e compartilhamento de links rastreáveis.
13. **Sorteios de Instagram:** Integração com publicações para campanhas promocionais de captação de noivas e debutantes.
14. **Relatórios, BI & Exportação:** Gráficos de faturamento, peças mais alugadas, taxa de ocupação do galpão e exportação de backups em JSON/Planilhas.
15. **Explorador de Banco de Dados Admin:** Painel de auditoria das tabelas relacionais do Cloud SQL / Drizzle com telemetria de conexões.

---

## 8. MANUAL DE COMPILAÇÃO, DEPLOY E PUBLICAÇÃO

### 8.1. Deploy da Aplicação Web PWA (Google Cloud Run / AI Studio Build)
1. **Compartilhamento Rápido (Preview/Staging):**
   - Clique no botão **Share** no topo do Google AI Studio para obter a URL HTTPS com suporte completo a PWA e Web Speech API.
2. **Deploy em Produção (Google Cloud Run):**
   - Clique em **Deploy to Cloud Run**.
   - O pipeline executa `npm run build`, empacota o servidor Express em `dist/server.cjs` com esbuild e inicia o container na porta 3000.
3. **Exportação do Código:**
   - Em **Settings**, selecione **Export to GitHub** ou **Download ZIP**.

### 8.2. Compilação do Aplicativo Android Nativo (APK / AAB)
1. **Chave Criptográfica Release (Keystore):**
   ```bash
   keytool -genkey -v -keystore acervus-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias acervus-key
   ```
2. **Geração de Pacote para Google Play Store (.AAB):**
   ```bash
   ./gradlew bundleRelease
   ```
3. **Geração de Executável Direto para Coletores MDM (.APK):**
   ```bash
   ./gradlew assembleRelease
   ```
4. **Distribuição via Google Play Console:**
   - Acesse [play.google.com/console](https://play.google.com/console), preencha a ficha do app com as especificações visuais do Acervus Core e publique a versão de produção.

---

*Acervus Core — Documentação Técnica e Arquitetural Oficial. Desenvolvido para máxima robustez, segurança e escala industrial.*
