# GEMINI 3.7 FLASH — ESPECIFICAÇÃO DA INTELIGÊNCIA ARTIFICIAL (ACERVUS CORE)

Este documento descreve o funcionamento, capacidades e respostas estruturadas do modelo Google Gemini no sistema Acervus Core.

## 1. Modelo & Endpoints
- **Modelo**: `gemini-2.5-flash` / `gemini-3.7-flash` via `@google/genai` SDK.
- **Endpoint Principal**: `POST /api/gemini/assistant`
- **Capacidade Server-Side**: O servidor Express (`server.ts`) injeta as variáveis estáticas do sistema e o payload `systemStats` antes de chamar o Gemini.

## 2. Conhecimento de Todos os Módulos no System Prompt

O Gemini 3.7 Flash foi configurado com conhecimento integral sobre todos os 12 módulos e subsistemas do Acervus Core:

### A. Identidade Visual & Logotipo da Empresa (Perfil Empresa)
- Configurado na aba **Perfil Empresa** (`EmpresaConfigView.tsx`), na seção **Identidade Visual & Logotipo da Empresa**.
- Suporta envio de imagem nos formatos PNG, JPG, WebP e SVG com conversão base64 direta ou através de URL web.
- A logomarca configurada (`empresaConfig.logoUrl`) é renderizada automaticamente no cabeçalho de:
  - **Propostas de Orçamento Web** (`PropostaOrcamentoView.tsx`)
  - **Contratos e Minutas em PDF** (`ContratoPdfModal.tsx`)
  - **Relatórios Impressos e DRE** (`RelatoriosView.tsx`)
  - **Barra de Navegação Principal** (`Navbar.tsx`)

### B. Módulo de Frete por Quilometragem
- O valor por quilômetro é configurável pelo locador na aba **Perfil Empresa** (`valorFretePorKm`).
- O cálculo multiplica a distância (em Km) da sede até o local do evento pela tarifa configurada.
- Permite uso da Google Distance Matrix API para cálculo exato de rota ou simulação por faixa de distância.

### C. Coletor e Leitor QR Code (Acervo)
- Localizado na aba **Acervo** no botão **"Coletor QR Code"**.
- Permite bipar produtos via câmera ao vivo do smartphone ou webcam.
- Modos de operação: **Consulta**, **Entrada** (check-in) e **Saída** (expedição) com retorno sonoro e leitor manual.

### D. Visão Geral de Todos os Módulos do Sistema
1. **Acervo & Estoque (`inventario`)**: Peças, kits virtuais por menor gargalo, vistorias e QR Code.
2. **Reservas & Logística (`reservas`)**: Agendamentos, overbooking atômico, frete por Km, caução PIX e contrato PDF/Gov.br.
3. **CRM de Clientes (`clientes`)**: Base de clientes, WhatsApp Direct, histórico de consumo.
4. **Financeiro & DRE (`financeiro`)**: Livro caixa, fluxo de caixa, DRE sintético, conciliação de locações e fretes.
5. **Manutenção (`manutencao`)**: Controle de avarias, ordens de serviço (OS) e giros de acervo.
6. **Relatórios (`relatorios`)**: Relatórios sintéticos, DRE, modelos de contratos com marca/logo.
7. **Propostas Web (`formularios_web`)**: Links públicos com fotos, simulador de frete por CEP/distância, caução e aceite digital.
8. **Perfil Empresa (`empresa`)**: Dados cadastrais (Nome Fantasia, Razão Social, CNPJ, Telefones), Identidade Visual (Logo), Frete e Chaves PIX/Maps.
9. **Sorteios Instagram (`sorteios_instagram`)**: Campanhas de engajamento para noivas e debutantes, com cadastro do canal oficial do Instagram (`canalInstagram`), Meta Graph API e validação de engajamento.
10. **Plano & Licenciamento (`plano_assinatura`)**: Gestão de mensalidades e suporte técnico.
11. **Controle de Acesso (`controle_acesso`)**: Permissões RBAC e vinculação MDM de dispositivos.
12. **Database Explorer (`database_explorer`)**: Inspeção e auditoria Cloud SQL / Firestore.

## 3. Schema de Resposta Estruturada (JSON)
```json
{
  "intent": "EXPLAIN_FREIGHT | OPEN_QR_COLLECTOR | GENERAL_QUERY | ...",
  "targetTab": "EmpresaConfig | Inventario | Reservas | ...",
  "answer": "Texto explicativo detalhado em Português Brasileiro.",
  "actionSuggestions": [
    "Ir para Perfil Empresa",
    "Abrir Coletor QR Code",
    "Calcular Frete"
  ],
  "confidence": 0.95
}
```
