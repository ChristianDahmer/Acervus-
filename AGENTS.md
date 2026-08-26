# ACERVUS CORE (GGERE) — REGRAS E DIRETRIZES TÉCNICAS PARA AGENTES E DESENVOLVEDORES

Este documento estabelece as diretrizes de desenvolvimento, arquitetura e convenções do projeto **Acervus Core**.

## 1. Referência Visual da Logomarca Oficial do Sistema (Acervus Core)
A logomarca oficial do sistema é composta por:
- **Símbolo Principal**: Letra 'A' estilizada e tridimensional com o pilar esquerdo em azul-marinho profundo e o pilar direito em dourado metálico.
- **Elemento Esquerdo**: Estrutura geométrica de estantes/prédios em azul (simbolizando o acervo, estoque e galpão de móveis).
- **Elemento Sobreposto**: Onda de frequência/frequência senoidal em tom azul ciano brilhante atravessando a letra 'A' com pontos de pulso elétrico (simbolizando a inteligência artificial, sinal e tecnologia de voz).
- **Tipografia Inferior**:
  - Título Principal: **ACERVUS** em azul ciano + **(GGERE)** em dourado/amarelo.
  - Subtítulo: **GESTÃO INTELIGENTE DE ACERVOS E RESERVAS** em caixa alta azul ciano.

---

## 2. Visão Geral da Arquitetura
- **Stack Principal**: React 18+ + TypeScript + Tailwind CSS + Vite (PWA) e Backend Node.js / Express em `server.ts`.
- **Arquitetura Android / Mobile**: Padrão nativo Clean Architecture + MVVM + Jetpack Compose + Dagger Hilt + Room.
- **Multitenancy**: Todas as operações de banco de dados (Cloud SQL / Drizzle e Local) devem obrigatoriamente incluir e filtrar pelo atributo `tenantId`.

---

## 3. Diretrizes dos Módulos Funcionais

### A. Módulo de Frete & Logística
- **Configuração**: Parâmetros `valorFretePorKm` (número, tarifa por quilômetro) e `googleMapsApiKey` (chave da Google Distance Matrix API) em `EmpresaConfig`.
- **Localização de Configuração**: Painel "Perfil Empresa" (`EmpresaConfigView.tsx`), na seção "Cálculo de Frete & Logística".
- **Cálculo Dinâmico**: A distância em Km multiplicada por `valorFretePorKm` gera o `valorFrete`. Integrado nas Propostas Web e no modal de reservas.

### B. Coletor e Leitor QR Code (Acervo)
- **Componente**: `InventarioView.tsx` (botão "Coletor QR Code" que aciona o modal unificado).
- **Modos de Operação**: `CONSULTA`, `ENTRADA` (check-in de devolução) e `SAIDA` (check-out de expedição).
- **Câmera**: Inicialização resiliente com fallback inteligente de câmera traseira (`facingMode: 'environment'`) para webcam padrão.
- **Simulador Manual**: Suporte a seleção de peça e gatilho do botão "Bipar" para testes em dispositivos sem câmera ativa.
- **Feedback Sonoro**: Sons diferenciados para leitura bem-sucedida, aviso e erro via Web Audio API.

---

## 4. Diretrizes de Edição de Código
- **Edição Cirúrgica**: Alterar apenas as partes especificamente solicitadas pelo usuário. Não refatorar ou renomear componentes que já estão funcionando.
- **Preservação de Comportamento**: Manter 100% das assinaturas e funcionalidades existentes.
- **Compilação**: Sempre validar com `compile_applet` antes de finalizar.
