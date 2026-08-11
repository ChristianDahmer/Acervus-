import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limits for base64 camera images
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize Google GenAI on the server
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Server-side API endpoint to parse a photo of a document into a template
app.post("/api/gemini/analyze-report", async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Nenhuma imagem foi recebida pelo servidor" });
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `Analise este documento de relatório, contrato, recibo ou vistoria capturado pela câmera do celular.
Você é um Engenheiro de Software Sênior especialista em OCR e modelagem de documentos para locadoras de decoração de festas (Acervus).
Sua tarefa é:
1. Ler e transcrever o conteúdo do documento.
2. Identificar qual a estrutura típica do documento (Contrato de Locação, Termo de Vistoria de Entrega/Devolução, Orçamento de Bens, Recibo de Pagamento, etc.).
3. Converter o texto estático em um "modelo de relatório dinâmico" (template), substituindo os dados reais e variáveis por chaves de interpolação padrão (tags).
As tags padrão que você deve utilizar quando apropriado são:
- {ID_RESERVA}: ID/Número identificador da reserva/locação
- {RAZAO_SOCIAL}: Razão Social do locador
- {CNPJ}: CNPJ do locador
- {ENDERECO_EMPRESA}: Endereço completo da empresa locadora
- {TELEFONE_EMPRESA}: Telefone de contato da empresa locadora
- {REPRESENTANTE_EMPRESA}: Nome do representante legal da empresa
- {NOME_CLIENTE}: Nome completo do cliente/locatário
- {TELEFONE_CLIENTE}: Telefone do cliente
- {EMAIL_CLIENTE}: E-mail de contato do cliente
- {CPF_CNPJ_CLIENTE}: CPF ou CNPJ do cliente/locatário
- {ENDERECO_CLIENTE}: Endereço completo do cliente
- {LISTA_ITENS}: Tabela/Lista detalhada de itens locados
- {VALOR_TOTAL}: Valor total do aluguel em formato de moeda (ex: R$ 150,00)
- {DATA_RETIRADA}: Data programada para retirada
- {DATA_DEVOLUCAO}: Data programada para devolução
- {DIAS_TOTAL}: Número total de dias do período do aluguel
- {DATA_HOJE}: Data de hoje formatada (dd/mm/aaaa)

Substitua de forma inteligente as partes variáveis do texto para criar um modelo genérico reutilizável e profissional. Preserve cláusulas de responsabilidade, assinaturas, quebras de linha e formatações elegantes.

Retorne sua resposta estritamente no formato JSON estruturado:
{
  "titulo": "Título sugerido para o modelo (ex: Contrato de Aluguel de Materiais Premium)",
  "categoria": "Categoria mais apropriada entre: CONTRATO, VISTORIA, ORCAMENTO, RECIBO, OUTROS",
  "descricao": "Uma descrição concisa indicando o propósito deste modelo gerado pela câmera",
  "conteudo": "O conteúdo textual do modelo reconstruído e formatado com as variáveis de interpolação apropriadas."
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Data
          }
        },
        { text: prompt }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            titulo: { type: Type.STRING },
            categoria: { type: Type.STRING },
            descricao: { type: Type.STRING },
            conteudo: { type: Type.STRING }
          },
          required: ["titulo", "categoria", "descricao", "conteudo"]
        }
      }
    });

    const textResult = response.text;
    if (!textResult) {
      throw new Error("Não foi possível obter uma resposta do modelo Gemini.");
    }

    const parsedResult = JSON.parse(textResult);
    res.json(parsedResult);
  } catch (error: any) {
    console.error("Erro no processamento da imagem pelo Gemini:", error);
    res.status(500).json({ error: error.message || "Falha ao processar a imagem do documento via Gemini AI" });
  }
});

// Setup Vite Dev server or Serve build assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server rodando com sucesso na porta ${PORT}`);
  });
}

startServer();
