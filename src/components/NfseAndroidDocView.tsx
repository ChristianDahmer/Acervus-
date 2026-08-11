import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Key, 
  Cpu, 
  Layers, 
  Lock, 
  Code2, 
  Download, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Database, 
  Activity, 
  Send, 
  Trash2, 
  Check, 
  X, 
  Play, 
  Layers as LayersIcon,
  BookOpen,
  Clipboard,
  ShieldCheck,
  Eye,
  EyeOff,
  Server,
  Search,
  Printer,
} from 'lucide-react';
import { saveDocument, fetchCollection } from '../lib/firebaseSync';
import { printHtmlContent } from '../utils/printUtils';

interface AuditLog {
  id: string;
  timestamp: number;
  operacao: string;
  requestXml?: string;
  responseBody: string;
  statusHttp: number;
  statusFiscal: 'AUTORIZADA' | 'PENDENTE_SINCRONIZACAO' | 'CANCELADA' | 'FALHA_CONEXAO';
  protocolo?: string;
  chaveAcesso?: string;
}

interface DpsTemplate {
  id: string;
  name: string;
  desc: string;
  xml: string;
}

const DPS_TEMPLATES: DpsTemplate[] = [
  {
    id: 'locacao_simples',
    name: 'DPS Standard - Locadora Acervus',
    desc: 'Prestação standard de locação de equipamentos audiovisuais sem retenções na fonte.',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<DPS xmlns="http://www.nfse.gov.br/DPSEnvio" versao="1.00">
  <infDPS Id="DPS10394829381">
    <tpAmb>2</tpAmb> <!-- Homologação -->
    <dhEmi>2026-08-05T10:00:00-03:00</dhEmi>
    <verAplic>AcervusCore_v2.0.0</verAplic>
    <prestador>
      <CNPJ>12345678000199</CNPJ>
      <IM>827394</IM>
    </prestador>
    <tomador>
      <CNPJ>98765432000100</CNPJ>
      <xNome>ESTÚDIO CINEMATOGRÁFICO SÃO PAULO LTDA</xNome>
      <end>
        <xLgr>Avenida Paulista</xLgr>
        <nro>1000</nro>
        <xBairro>Bela Vista</xBairro>
        <cMun>3550308</cMun>
        <UF>SP</UF>
        <CEP>01310100</CEP>
      </end>
    </tomador>
    <serv>
      <cServ>03.02</cServ> <!-- Locação de bens móveis -->
      <xDescServ>Locação de Câmeras Cinema Red V-Raptor e Lentes Anamórficas por 5 dias</xDescServ>
      <vServ>8500.00</vServ>
    </serv>
    <valores>
      <vBc>8500.00</vBc>
      <pAliq>0.00</pAliq> <!-- Isento/Imune de ISSQN sobre locações puras -->
      <vIssqn>0.00</vIssqn>
    </valores>
  </infDPS>
</DPS>`
  },
  {
    id: 'servico_retencoes',
    name: 'DPS Completa - Com Retenções de Impostos',
    desc: 'Prestação de serviços de produção técnica e logística com retenções federais (PIS, COFINS, INSS).',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<DPS xmlns="http://www.nfse.gov.br/DPSEnvio" versao="1.00">
  <infDPS Id="DPS10394829382">
    <tpAmb>2</tpAmb>
    <dhEmi>2026-08-05T10:15:00-03:00</dhEmi>
    <verAplic>AcervusCore_v2.0.0</verAplic>
    <prestador>
      <CNPJ>12345678000199</CNPJ>
      <IM>827394</IM>
    </prestador>
    <tomador>
      <CNPJ>11222333000144</CNPJ>
      <xNome>PRODUTORA MULTIMÍDIA BRASIL S/A</xNome>
      <end>
        <xLgr>Rua Funchal</xLgr>
        <nro>450</nro>
        <xBairro>Vila Olímpia</xBairro>
        <cMun>3550308</cMun>
        <UF>SP</UF>
        <CEP>04551060</CEP>
      </end>
    </tomador>
    <serv>
      <cServ>13.02</cServ> <!-- Fonografia, fotografia cinematografia -->
      <xDescServ>Serviço de Direção de Fotografia e Operação Técnica Estabilizada</xDescServ>
      <vServ>12000.00</vServ>
    </serv>
    <valores>
      <vBc>12000.00</vBc>
      <pAliq>5.00</pAliq>
      <vIssqn>600.00</vIssqn>
      <retencoes>
        <vPis>78.00</vPis> <!-- 0.65% -->
        <vCofins>360.00</vCofins> <!-- 3.00% -->
        <vCsll>120.00</vCsll> <!-- 1.00% -->
        <vIrRF>180.00</vIrRF> <!-- 1.50% -->
        <vInss>1320.00</vInss> <!-- 11.00% -->
      </retencoes>
    </valores>
  </infDPS>
</DPS>`
  }
];

export const NfseAndroidDocView: React.FC = () => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'interactive' | 'code'>('interactive');
  const [activeCodeFile, setActiveCodeFile] = useState<'cert' | 'signer' | 'api' | 'repo' | 'compose'>('cert');
  const [activeSimTab, setActiveSimTab] = useState<'cert' | 'dps' | 'network' | 'offline' | 'audit'>('cert');

  // Certificate State
  const [certFileName, setCertFileName] = useState<string>('');
  const [certPassword, setCertPassword] = useState<string>('');
  const [isCertLoaded, setIsCertLoaded] = useState<boolean>(false);
  const [certMeta, setCertMeta] = useState<{ alias: string; expDate: string; issuer: string } | null>(null);

  // DPS & XML Signing State
  const [selectedTemplate, setSelectedTemplate] = useState<string>('locacao_simples');
  const [rawXml, setRawXml] = useState<string>(DPS_TEMPLATES[0].xml);
  const [signedXml, setSignedXml] = useState<string>('');
  const [isXmlSigned, setIsXmlSigned] = useState<boolean>(false);
  const [xmlDigest, setXmlDigest] = useState<string>('');
  const [xmlSignatureValue, setXmlSignatureValue] = useState<string>('');

  // Network State Simulator
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [netResponseCode, setNetResponseCode] = useState<number | null>(null);
  const [netResponseBody, setNetResponseBody] = useState<string>('');
  const [isNetRequestPending, setIsNetRequestPending] = useState<boolean>(false);

  // Local SQLite Room DB Sync Queue State (Simulated Local Storage)
  const [localRoomQueue, setLocalRoomQueue] = useState<any[]>([]);
  const [isSyncingQueue, setIsSyncingQueue] = useState<boolean>(false);

  // Firestore Audit Log State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isAuditLoading, setIsAuditLoading] = useState<boolean>(false);

  // Feedbacks
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Load audit history from Firebase on mount
  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    setIsAuditLoading(true);
    try {
      const docs = await fetchCollection('ia_historico_interacoes');
      const sorted = (docs || []).sort((a: any, b: any) => b.timestamp - a.timestamp) as AuditLog[];
      setAuditLogs(sorted);
    } catch (err) {
      console.error("Erro ao carregar logs de auditoria:", err);
    } finally {
      setIsAuditLoading(false);
    }
  };

  const handleCopyCode = (codeText: string, fileKey: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedText(fileKey);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const triggerFeedback = (message: string, isError: boolean = false) => {
    if (isError) {
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(null), 4000);
    } else {
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  // Step 1: Simulator - Load PFX / Certificate
  const handleLoadCertificate = () => {
    if (!certFileName) {
      triggerFeedback('Selecione ou insira o nome de um certificado digital fictício.', true);
      return;
    }
    if (!certPassword) {
      triggerFeedback('Digite a senha para descriptografar o contêiner PKCS#12 (.pfx).', true);
      return;
    }

    setIsCertLoaded(true);
    setCertMeta({
      alias: certFileName.replace(/\.[^/.]+$/, ""),
      expDate: '05/08/2027 (Válido por 12 meses)',
      issuer: 'Autoridade Certificadora do Governo Federal (ICP-Brasil v5)'
    });
    triggerFeedback('Certificado ICP-Brasil carregado no Keystore local e mTLS SocketFactory inicializado com sucesso.');
  };

  const handleClearCertificate = () => {
    setIsCertLoaded(false);
    setCertMeta(null);
    setCertFileName('');
    setCertPassword('');
    triggerFeedback('Certificado removido do ambiente de memória segura do Android.');
  };

  // Step 2: Simulator - Select template & Sign XML
  const handleTemplateChange = (id: string) => {
    setSelectedTemplate(id);
    const tmpl = DPS_TEMPLATES.find(t => t.id === id);
    if (tmpl) {
      setRawXml(tmpl.xml);
      setSignedXml('');
      setIsXmlSigned(false);
    }
  };

  const handleSignXml = () => {
    if (!isCertLoaded) {
      triggerFeedback('Assinatura indisponível: Carregue o certificado digital A1 primeiro.', true);
      return;
    }

    // Cryptographic Sign Simulation
    const digest = Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('');
    const signatureVal = Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('');

    const signed = rawXml.replace(
      '</infDPS>',
      `</infDPS>
  <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
    <SignedInfo>
      <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315" />
      <SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256" />
      <Reference URI="">
        <Transforms>
          <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature" />
        </Transforms>
        <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256" />
        <DigestValue>${digest}</DigestValue>
      </Reference>
    </SignedInfo>
    <SignatureValue>
      ${signatureVal.slice(0, 32)}
      ${signatureVal.slice(32)}
    </SignatureValue>
    <KeyInfo>
      <X509Data>
        <X509Certificate>MIIFuzCCA6OgAwIBAgIQDND938ASDFJLASJDKA...</X509Certificate>
      </X509Data>
    </KeyInfo>
  </Signature>`
    );

    setSignedXml(signed);
    setXmlDigest(digest);
    setXmlSignatureValue(signatureVal);
    setIsXmlSigned(true);
    triggerFeedback('DPS assinada digitalmente com sucesso via RSA com SHA-256 e envelopamento XMLDSig.');
  };

  // Step 3: Simulator - Network transmission
  const handleTransmitDps = async () => {
    if (!isXmlSigned) {
      triggerFeedback('Erro de validação local: Assine a DPS digitalmente antes de transmitir.', true);
      return;
    }

    setIsNetRequestPending(true);
    setNetResponseCode(null);
    setNetResponseBody('');

    setTimeout(async () => {
      let logObj: AuditLog;
      const docId = `NFSE_${Date.now()}`;

      if (!isOnline) {
        // Queue local fallback on offline mode
        const queueItem = {
          id: `RPS_${Date.now()}`,
          xml: signedXml,
          timestamp: Date.now(),
          status: 'PENDENTE_SINCRONIZACAO'
        };
        setLocalRoomQueue(prev => [...prev, queueItem]);
        setNetResponseCode(503);
        setNetResponseBody('Falha de Rede: Gateway temporariamente inacessível. Salvando na fila SQLite local (Room DB).');
        setIsNetRequestPending(false);

        // Save failure to Firestore for audit records
        logObj = {
          id: docId,
          timestamp: Date.now(),
          operacao: 'Transmissão de DPS (POST /dps)',
          requestXml: signedXml,
          responseBody: 'Network unreachable. Saved into local Room sqlite db for retry background WorkManager job.',
          statusHttp: 503,
          statusFiscal: 'PENDENTE_SINCRONIZACAO',
        };
        await saveDocument('ia_historico_interacoes', docId, logObj);
        loadAuditLogs();
        triggerFeedback('Servidor governamental inacessível. Documento salvo localmente na fila do SQLite Room para retentativa em background.', true);
        return;
      }

      // Success online flow
      const mockChave = '352608' + '12345678000199' + '0302' + Array.from({length: 22}, () => Math.floor(Math.random()*10)).join('');
      const mockProtocolo = 'SEFIN_' + Math.floor(Math.random() * 900000 + 100000);

      setNetResponseCode(200);
      setNetResponseBody(JSON.stringify({
        sucesso: true,
        protocoloAutorizacao: mockProtocolo,
        chaveAcessoNfse: mockChave,
        timestampProcessamento: new Date().toISOString(),
        nfseXml: `<NFe><chave>${mockChave}</chave><prot>${mockProtocolo}</prot></NFe>`
      }, null, 2));
      setIsNetRequestPending(false);

      // Save audit record to cloud storage
      logObj = {
        id: docId,
        timestamp: Date.now(),
        operacao: 'Transmissão de DPS (POST /dps)',
        requestXml: signedXml,
        responseBody: `Autorizada com Sucesso! Protocolo: ${mockProtocolo}. Chave: ${mockChave}`,
        statusHttp: 200,
        statusFiscal: 'AUTORIZADA',
        protocolo: mockProtocolo,
        chaveAcesso: mockChave
      };
      await saveDocument('ia_historico_interacoes', docId, logObj);
      loadAuditLogs();
      triggerFeedback('Nota Fiscal emitida e autorizada com sucesso na SEFIN Nacional.');
    }, 1500);
  };

  const handleClearLogs = async () => {
    triggerFeedback('Os logs de auditoria estão mantidos em nuvem para conformidade.');
  };

  // Step 4: Simulator - Trigger WorkManager Background Sync
  const handleTriggerWorkManager = () => {
    if (localRoomQueue.length === 0) {
      triggerFeedback('Fila local SQLite está vazia. Altere para modo Offline e tente enviar uma DPS para enfileirar.', true);
      return;
    }

    setIsSyncingQueue(true);
    triggerFeedback('Trabalhador assíncrono (SyncWorker) despertado por conectividade restabelecida. Sincronizando com SEFIN...');

    setTimeout(async () => {
      // Process all items in queue
      for (const item of localRoomQueue) {
        const mockChave = '352608' + '12345678000199' + '0302' + Array.from({length: 22}, () => Math.floor(Math.random()*10)).join('');
        const mockProtocolo = 'SEFIN_WM_' + Math.floor(Math.random() * 900000 + 100000);
        const docId = `NFSE_WM_${Date.now()}`;

        const logObj: AuditLog = {
          id: docId,
          timestamp: Date.now(),
          operacao: `Sincronização WorkManager: Reenvio DPS (RPS #${item.id})`,
          requestXml: item.xml,
          responseBody: `Sincronizado via Background Worker. Autorizado sob Protocolo: ${mockProtocolo}. Chave: ${mockChave}`,
          statusHttp: 200,
          statusFiscal: 'AUTORIZADA',
          protocolo: mockProtocolo,
          chaveAcesso: mockChave
        };
        await saveDocument('ia_historico_interacoes', docId, logObj);
      }

      setLocalRoomQueue([]);
      setIsSyncingQueue(false);
      loadAuditLogs();
      triggerFeedback('WorkManager: Sincronização executada com sucesso. Todos os registros da fila local foram transmitidos e autorizados.');
    }, 2000);
  };

  // Simulated REST Endpoints actions
  const handleConsultNfse = () => {
    setIsNetRequestPending(true);
    setTimeout(() => {
      setIsNetRequestPending(false);
      setNetResponseCode(200);
      setNetResponseBody(JSON.stringify({
        status: "AUTORIZADA",
        chaveAcesso: "352608123456780001990302" + Math.floor(Math.random() * 90000 + 10000),
        dataHoraEmissao: new Date().toISOString(),
        prestador: { cnpj: "12345678000199" },
        tomador: { cnpj: "98765432000100", razaoSocial: "ESTÚDIO CINEMATOGRÁFICO SÃO PAULO LTDA" },
        valores: { valorServicos: 8500.00, ISSQNDevido: 0.00 }
      }, null, 2));
      triggerFeedback('Consulta retornada com sucesso da SEFIN.');
    }, 800);
  };

  const handleCancelNfse = () => {
    setIsNetRequestPending(true);
    setTimeout(() => {
      setIsNetRequestPending(false);
      setNetResponseCode(200);
      setNetResponseBody(JSON.stringify({
        sucesso: true,
        protocoloCancelamento: "CAN_" + Math.floor(Math.random() * 900000 + 100000),
        status: "CANCELADA",
        motivo: "Erro de digitação nos valores de dedução do imposto"
      }, null, 2));
      triggerFeedback('NFS-e cancelada e homologada via evento oficial.');
    }, 1000);
  };

  const handleDownloadDanfse = () => {
    setIsNetRequestPending(true);
    setTimeout(() => {
      setIsNetRequestPending(false);
      setNetResponseCode(200);
      setNetResponseBody("[REQUISIÇÃO STREAMING DE PDF]\nBaixando DANFSE_352608123456780001990302.pdf...\nBuffer binário retornado com sucesso (mTLS Handshake completo).");
      triggerFeedback('DANFSE em PDF obtido e salvo no diretório seguro do aplicativo.');
    }, 600);
  };

  const handlePrintDanfse = () => {
    printHtmlContent(
      `
      <div style="font-family: Arial, sans-serif; border: 2px solid #000; padding: 16px; border-radius: 4px; max-width: 800px; margin: 0 auto; color: #000;">
        <div style="border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h2 style="margin:0; font-size: 16px; font-weight: bold; text-transform: uppercase;">DANFSE - Documento Auxiliar da NFS-e</h2>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #444;">Nota Fiscal de Serviços Eletrônica Padrão Nacional (SEFIN)</p>
          </div>
          <div style="text-align: right; font-size: 11px;">
            <strong>Chave de Acesso:</strong><br/>
            <span style="font-family: monospace;">3526 0812 3456 7800 0199 0302 0000 0012 3456</span>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px;">
          <tr style="background: #f0f0f0;">
            <th style="border: 1px solid #000; padding: 6px; text-align: left;" colspan="2">EMISSOR / PRESTADOR DE SERVIÇOS</th>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 6px; width: 50%;">
              <strong>Razão Social:</strong> ACERVUS LOCACOES & EVENTOS LTDA<br/>
              <strong>CNPJ:</strong> 12.345.678/0001-99 | <strong>IM:</strong> 987654-0
            </td>
            <td style="border: 1px solid #000; padding: 6px; width: 50%;">
              <strong>Município de Emissão:</strong> São Paulo / SP<br/>
              <strong>Ambiente:</strong> Produção SEFIN Nacional
            </td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px;">
          <tr style="background: #f0f0f0;">
            <th style="border: 1px solid #000; padding: 6px; text-align: left;" colspan="2">TOMADOR DO SERVIÇO</th>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 6px;" colspan="2">
              <strong>Nome / Razão Social:</strong> Cliente Exemplo Ltda<br/>
              <strong>CPF/CNPJ:</strong> 98.765.432/0001-10 | <strong>E-mail:</strong> financeiro@cliente.com.br
            </td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px;">
          <tr style="background: #f0f0f0;">
            <th style="border: 1px solid #000; padding: 6px; text-align: left;">CÓD. SERVIÇO</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: left;">DESCRIÇÃO DOS SERVIÇOS</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: right;">VALOR BRUTO</th>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 6px; font-family: monospace;">12.01</td>
            <td style="border: 1px solid #000; padding: 6px;">Serviços de locação de móveis e equipamentos para eventos com suporte técnico integrado.</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: right;">R$ 2.500,00</td>
          </tr>
        </table>

        <div style="border: 1px solid #000; padding: 8px; font-size: 11px; background: #fafafa;">
          <strong>Deduções ISS:</strong> R$ 0,00 | <strong>Base de Cálculo:</strong> R$ 2.500,00 | <strong>Alíquota ISS:</strong> 2,00% | <strong>ISS Devido:</strong> R$ 50,00
        </div>
      </div>
      `,
      {
        title: 'DANFSE - Documento Auxiliar da NFS-e Nacional',
        subtitle: 'Chave: 352608123456780001990302000000123456',
      }
    );
  };

  // Kotlin Code Snippets
  const KOTLIN_CODE = {
    cert: `package com.example.acervus.core.security

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import java.io.ByteArrayInputStream
import java.security.KeyStore
import java.security.PrivateKey
import java.security.cert.X509Certificate
import javax.net.ssl.KeyManagerFactory
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManagerFactory
import javax.net.ssl.X509TrustManager

/**
 * CertificateManager: Gerenciamento do Certificado Digital A1 (ICP-Brasil).
 * Armazena com segurança os bytes binários do PFX no EncryptedSharedPreferences (AES-256)
 * e expõe o SSLContext necessário para autenticação mTLS nas APIs governamentais.
 */
class CertificateManager(private val context: Context) {

    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val securePrefs = EncryptedSharedPreferences.create(
        context,
        "secure_cert_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    private val keyStoreInstance = KeyStore.getInstance("PKCS12")

    fun saveCertificate(pfxBytes: ByteArray, password: String) {
        val encodedCert = android.util.Base64.encodeToString(pfxBytes, android.util.Base64.DEFAULT)
        securePrefs.edit()
            .putString("pfx_data", encodedCert)
            .putString("pfx_password", password)
            .apply()
    }

    fun isCertificateConfigured(): Boolean {
        return securePrefs.contains("pfx_data")
    }

    fun loadKeyStore(): KeyStore {
        val encodedCert = securePrefs.getString("pfx_data", null) 
            ?: throw IllegalStateException("Certificado A1 não cadastrado!")
        val password = securePrefs.getString("pfx_password", "") ?: ""
        val bytes = android.util.Base64.decode(encodedCert, android.util.Base64.DEFAULT)
        
        keyStoreInstance.load(ByteArrayInputStream(bytes), password.toCharArray())
        return keyStoreInstance
    }

    fun getPrivateKey(): PrivateKey {
        val ks = loadKeyStore()
        val alias = ks.aliases().nextElement()
        val password = securePrefs.getString("pfx_password", "") ?: ""
        return ks.getKey(alias, password.toCharArray()) as PrivateKey
    }

    fun getCertificateChain(): Array<X509Certificate> {
        val ks = loadKeyStore()
        val alias = ks.aliases().nextElement()
        val chain = ks.getCertificateChain(alias)
        return chain.map { it as X509Certificate }.toTypedArray()
    }

    fun createSSLContext(): SSLContext {
        val password = securePrefs.getString("pfx_password", "") ?: ""
        val ks = loadKeyStore()

        val kmf = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm())
        kmf.init(ks, password.toCharArray())

        val tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm())
        tmf.init(null as KeyStore?) // Configura com as CAs confiáveis de fábrica do SO

        val sslContext = SSLContext.getInstance("TLSv1.2")
        sslContext.init(kmf.keyManagers, tmf.trustManagers, null)
        return sslContext
    }

    fun getTrustManager(): X509TrustManager {
        val tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm())
        tmf.init(null as KeyStore?)
        return tmf.trustManagers.first { it is X509TrustManager } as X509TrustManager
    }
}`,
    signer: `package com.example.acervus.core.security

import org.w3c.dom.Document
import java.io.StringWriter
import javax.xml.crypto.dsig.*
import javax.xml.crypto.dsig.dom.DOMSignContext
import javax.xml.crypto.dsig.keyinfo.KeyInfoFactory
import javax.xml.crypto.dsig.spec.C14NMethodParameterSpec
import javax.xml.crypto.dsig.spec.TransformParameterSpec
import javax.xml.parsers.DocumentBuilderFactory
import javax.xml.transform.TransformerFactory
import javax.xml.transform.dom.DOMSource
import javax.xml.transform.stream.StreamResult

/**
 * XmlSigner: Responsável pelo algoritmo de assinatura digital da DPS
 * utilizando XMLDSig com assinatura envelopada (Enveloped Signature)
 * e o algoritmo de criptografia RSA com hash SHA-256 (ICP-Brasil).
 */
class XmlSigner(private val certificateManager: CertificateManager) {

    fun signXml(xmlString: String): String {
        // Parse de documento XML para árvore DOM
        val dbf = DocumentBuilderFactory.newInstance().apply { isNamespaceAware = true }
        val doc: Document = dbf.newDocumentBuilder().parse(xmlString.byteInputStream())

        // Recupera credenciais privadas
        val privateKey = certificateManager.getPrivateKey()
        val certChain = certificateManager.getCertificateChain()

        // Configura o ponto do DOM onde a assinatura será anexada
        val parentNode = doc.documentElement
        val dsc = DOMSignContext(privateKey, parentNode)

        // Inicializa a fábrica de criptografia XMLDSig
        val fac = XMLSignatureFactory.getInstance("DOM")

        // Cria transformações padrão (Enveloped e Canonicalização C14N)
        val transformEnveloped = fac.newTransform(Transform.ENVELOPED, null as TransformParameterSpec?)
        val transformC14N = fac.newTransform("http://www.w3.org/TR/2001/REC-xml-c14n-20010315", null as C14NMethodParameterSpec?)
        
        // Define a Referência do Documento (calcula SHA-256 do corpo)
        val ref = fac.newReference(
            "", 
            fac.newDigestMethod(DigestMethod.SHA256, null),
            listOf(transformEnveloped, transformC14N),
            null, 
            null
        )

        // Define a tag de metadados da Assinatura (SignedInfo)
        val si = fac.newSignedInfo(
            fac.newCanonicalizationMethod(CanonicalizationMethod.INCLUSIVE, null as C14NMethodParameterSpec?),
            fac.newSignatureMethod("http://www.w3.org/2001/04/xmldsig-more#rsa-sha256", null),
            listOf(ref)
        )

        // Anexa o Certificado Público na tag de auditoria (KeyInfo)
        val kif = KeyInfoFactory.getInstance("DOM")
        val x509Data = kif.newX509Data(certChain.toList())
        val ki = kif.newKeyInfo(listOf(x509Data))

        // Executa a assinatura criptográfica final
        val signature = fac.newXMLSignature(si, ki)
        signature.sign(dsc)

        // Serializa a árvore DOM de volta para uma string XML
        val tf = TransformerFactory.newInstance()
        val trans = tf.newTransformer()
        val sw = StringWriter()
        trans.transform(DOMSource(doc), StreamResult(sw))
        
        return sw.toString()
    }
}`,
    api: `package com.example.acervus.core.network

import com.example.acervus.core.security.CertificateManager
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*
import okhttp3.ResponseBody
import java.util.concurrent.TimeUnit

/**
 * NfseApiService: Interface Retrofit para endpoints governamentais da SEFIN Nacional.
 * Utiliza o OkHttpClient customizado com mTLS de 2 vias.
 */
interface NfseApiService {

    @POST("dps")
    @Headers("Content-Type: application/xml", "Accept: application/xml")
    suspend fun enviarDps(@Body xmlDps: String): ResponseBody

    @GET("nfse/{chaveAcesso}")
    suspend fun consultarNfse(@Path("chaveAcesso") chave: String): ResponseBody

    @POST("nfse/cancelar")
    @Headers("Content-Type: application/json")
    suspend fun cancelarNfse(@Body payloadCancelamento: String): ResponseBody

    @GET("danfse/{chaveAcesso}")
    @Streaming
    suspend fun baixarDanfse(@Path("chaveAcesso") chave: String): ResponseBody

    companion object {
        private const val BASE_URL = "https://sefin.nfse.gov.br/api/v1/"

        fun create(certificateManager: CertificateManager): NfseApiService {
            val logging = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }

            // Inicializa segurança mutual TLS de 2 vias (mTLS)
            val sslContext = certificateManager.createSSLContext()
            val trustManager = certificateManager.getTrustManager()

            val client = OkHttpClient.Builder()
                .sslSocketFactory(sslContext.socketFactory, trustManager)
                .addInterceptor(logging)
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .build()

            return Retrofit.Builder()
                .baseUrl(BASE_URL)
                .client(client)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
                .create(NfseApiService::class.java)
        }
    }
}`,
    repo: `package com.example.acervus.core.repository

import android.content.Context
import androidx.work.*
import com.example.acervus.core.network.NfseApiService
import com.example.acervus.core.security.XmlSigner
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import java.util.concurrent.TimeUnit

sealed class NfseResult {
    data class Success(val chaveAcesso: String, val protocolo: String, val xmlResponse: String) : NfseResult()
    data class QueuedOffline(val rpsId: String) : NfseResult()
    data class Error(val code: Int, val message: String) : NfseResult()
}

/**
 * NfseRepository: Orquestrador da lógica de envio e contingência.
 * Assina as requisições e lida com falhas físicas de rede, alternando
 * para armazenamento na tabela local Room e agendando reenvio via WorkManager.
 */
class NfseRepository(
    private val context: Context,
    private val apiService: NfseApiService,
    private val xmlSigner: XmlSigner,
    private val nfseDao: NfseDao // Room DB DAO
) {

    fun emitirNfse(dpsRawXml: String, rpsId: String): Flow<NfseResult> = flow {
        // 1. Assina digitalmente o payload XML
        val signedXml = try {
            xmlSigner.signXml(dpsRawXml)
        } catch (e: Exception) {
            emit(NfseResult.Error(0, "Erro ao assinar DPS digitalmente: \${e.message}"))
            return@flow
        }

        // 2. Transmite ou salva localmente (Contingência)
        try {
            val response = apiService.enviarDps(signedXml)
            val responseString = response.string()
            
            // Parse simplificado dos nós de autorização
            val chave = parseXmlNode(responseString, "chNfse")
            val prot = parseXmlNode(responseString, "nProt")
            
            val entity = NfseEntity(
                id = rpsId,
                xmlSigned = signedXml,
                chaveAcesso = chave,
                protocolo = prot,
                status = "AUTORIZADA",
                dataEmissao = System.currentTimeMillis()
            )
            nfseDao.insert(entity)
            
            emit(NfseResult.Success(chave, prot, responseString))
        } catch (e: Exception) {
            // Em caso de instabilidade (Timeout/Conexão), salva na fila local Room e agenda WorkManager
            val entity = NfseEntity(
                id = rpsId,
                xmlSigned = signedXml,
                status = "PENDENTE_SINCRONIZACAO",
                dataEmissao = System.currentTimeMillis(),
                tentativas = 0
            )
            nfseDao.insert(entity)
            
            // Agenda Worker assíncrono respeitando restrições de rede
            scheduleWorkSync()
            
            emit(NfseResult.QueuedOffline(rpsId))
        }
    }

    private fun scheduleWorkSync() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val syncWorkRequest = OneTimeWorkRequestBuilder<NfseSyncWorker>()
            .setConstraints(constraints)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 10, TimeUnit.MINUTES)
            .build()

        WorkManager.getInstance(context).enqueueUniqueWork(
            "NfseSyncJob",
            ExistingWorkPolicy.KEEP,
            syncWorkRequest
        )
    }

    private fun parseXmlNode(xml: String, nodeName: String): String {
        val pattern = "<$nodeName>(.*?)</$nodeName>".toRegex()
        return pattern.find(xml)?.groupValues?.get(1) ?: "352608123456780001990302"
    }
}`,
    compose: `package com.example.acervus.core.presentation

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Campo de Senha Reutilizável com Ícone de Visibilidade em Jetpack Compose.
 * Garanta alinhamento perfeito de altura e ícones dentro do OutlinedTextField.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AcervusPasswordField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String = "Senha de Acesso",
    modifier: Modifier = Modifier
) {
    var passwordVisible by remember { mutableStateOf(false) }

    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label, fontSize = 12.sp) },
        singleLine = true,
        modifier = modifier.fillMaxWidth(),
        visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
        leadingIcon = {
            Icon(
                imageVector = Icons.Default.Key,
                contentDescription = null,
                tint = Color(0xFF71717A),
                modifier = Modifier.size(18.dp)
            )
        },
        trailingIcon = {
            IconButton(
                onClick = { passwordVisible = !passwordVisible },
                modifier = Modifier.size(24.dp)
            ) {
                Icon(
                    imageVector = if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                    contentDescription = if (passwordVisible) "Ocultar Senha" else "Visualizar Senha",
                    tint = Color(0xFF71717A),
                    modifier = Modifier.size(18.dp)
                )
            }
        },
        shape = RoundedCornerShape(12.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = Color(0xFFD4AF37),
            unfocusedBorderColor = Color(0xFF27272A),
            focusedContainerColor = Color(0xFF18181B),
            unfocusedContainerColor = Color(0xFF18181B),
            focusedLabelColor = Color(0xFFD4AF37),
            unfocusedLabelColor = Color(0xFFA1A1AA),
            focusedTextColor = Color.White,
            unfocusedTextColor = Color.White
        )
    )
}

/**
 * NfseDashboardScreen: Interface reativa em Jetpack Compose.
 * Exibe status do certificado, fila local de contingência e lista de notas.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NfseDashboardScreen(
    viewModel: NfseViewModel,
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Nota Fiscal Padrão Nacional", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF111113),
                    titleContentColor = Color.White
                )
            )
        },
        containerColor = Color(0xFF0A0A0B)
    ) { paddingValues ->
        Column(
            modifier = modifier
                .padding(paddingValues)
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Card de Certificado Digital A1
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF18181B)),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.border(1.dp, Color(0xFF27272A), RoundedCornerShape(16.dp))
            ) {
                Row(
                    modifier = Modifier.padding(16.dp).fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Certificado ICP-Brasil A1", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                        Text(
                            text = if (state.isCertConfigured) "Cadastrado: \${state.certAlias}" else "Sem Certificado Configurado",
                            color = if (state.isCertConfigured) Color(0xFFD4AF37) else Color(0xFF71717A),
                            fontSize = 12.sp,
                            modifier = Modifier.padding(top = 2.dp)
                        )
                    }
                    Button(
                        onClick = { viewModel.showCertificateUploadDialog() },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD4AF37), contentColor = Color.Black)
                    ) {
                        Text("Configurar", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            // Seção de Contingência do WorkManager
            AnimatedVisibility(
                visible = state.pendingSyncCount > 0,
                enter = fadeIn() + expandVertically(),
                exit = fadeOut() + shrinkVertically()
            ) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0x1AF44336)),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.border(1.dp, Color(0x33F44336), RoundedCornerShape(16.dp))
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp).fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Fila de Contingência Ativa", color = Color(0xFFF44336), fontSize = 13.sp, fontWeight = FontWeight.Bold)
                            Text("\${state.pendingSyncCount} DPS salvas localmente prontas para sincronizar.", color = Color(0xFFA1A1AA), fontSize = 11.sp)
                        }
                        Button(
                            onClick = { viewModel.forceWorkManagerSync() },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF44336), contentColor = Color.White)
                        ) {
                            Icon(Icons.Default.Refresh, contentDescription = "Sync", modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Sincronizar", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            // Título Listagem
            Text("Declarações de Serviço (DPS)", color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.Bold)

            // Listagem de Notas Fiscais Emitidas
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxWidth().weight(1f)
            ) {
                items(state.nfseList) { nfse ->
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color(0xFF111113), RoundedCornerShape(14.dp))
                            .border(1.dp, Color(0xFF27272A), RoundedCornerShape(14.dp))
                            .padding(16.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text("RPS ID: \${nfse.id}", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                Text("Chave: \${nfse.chaveAcesso ?: "Enfileirando..."}", color = Color(0xFFA1A1AA), fontSize = 11.sp, fontFamily = FontFamily.Monospace)
                            }
                            
                            val statusColor = when (nfse.status) {
                                "AUTORIZADA" -> Color(0xFF4CAF50)
                                "PENDENTE_SINCRONIZACAO" -> Color(0xFFFFA000)
                                else -> Color(0xFFF44336)
                            }

                            Box(
                                modifier = Modifier
                                    .background(statusColor.copy(alpha = 0.15f), RoundedCornerShape(6.dp))
                                    .border(1.dp, statusColor.copy(alpha = 0.35f), RoundedCornerShape(6.dp))
                                    .padding(horizontal = 8.dp, py = 4.dp)
                            ) {
                                Text(nfse.status, color = statusColor, fontSize = 9.sp, fontWeight = FontWeight.ExtraBold)
                            }
                        }
                    }
                }
            }
        }
    }
}`
  };

  return (
    <div id="nfse-integration-suite" className="text-left bg-[#0D0D0F] border border-[#27272A] rounded-3xl overflow-hidden shadow-2xl relative">
      {/* Interactive Top Banner */}
      <div className="p-6 md:p-8 bg-gradient-to-br from-[#18181C] via-[#111113] to-[#0D0D0F] border-b border-[#27272A] flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] text-[10px] font-bold rounded-full uppercase tracking-wider font-mono">
              Empresarial • SEFIN Padrão Nacional
            </span>
            <span className="px-2.5 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded-full uppercase tracking-wider font-mono">
              Kotlin 2.0
            </span>
          </div>
          <h2 className="font-serif italic text-white text-2xl tracking-wide flex items-center gap-2.5">
            <ShieldCheck size={28} className="text-[#D4AF37]" />
            NFS-e Gov.br Integration Suite
          </h2>
          <p className="text-[#A1A1AA] text-xs max-w-3xl leading-relaxed">
            Módulo avançado para autenticação mTLS de 2 vias, assinatura digital XML-DSig, retentativas em segundo plano pelo <strong>WorkManager</strong> e auditoria interna do <strong>Acervus Core</strong>.
          </p>
        </div>

        {/* Global States */}
        <div className="flex flex-wrap items-center gap-3 bg-[#111113] border border-[#27272A] p-3 rounded-2xl">
          {/* Network Switcher */}
          <button
            onClick={() => {
              setIsOnline(!isOnline);
              triggerFeedback(`Modo de rede alterado para: ${!isOnline ? 'ONLINE' : 'OFFLINE (Contingência)'}`);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold tracking-wide transition-all cursor-pointer ${
              isOnline 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}
            title="Clique para alternar conectividade de rede"
          >
            {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
            <span>{isOnline ? 'REDE: ONLINE' : 'REDE: OFFLINE'}</span>
          </button>

          {/* Certificate State */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold tracking-wide ${
            isCertLoaded 
              ? 'bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]' 
              : 'bg-[#27272A] border-transparent text-[#71717A]'
          }`}>
            <Key size={13} />
            <span>{isCertLoaded ? 'CERTIFICADO A1' : 'SEM CERTIFICADO'}</span>
          </div>

          {/* Queue Counter */}
          {localRoomQueue.length > 0 && (
            <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/30 text-red-400 px-2.5 py-1.5 rounded-xl text-[10px] font-extrabold uppercase font-mono animate-pulse">
              <Database size={12} />
              <span>{localRoomQueue.length} RPS na fila</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Mode Toggle Buttons */}
      <div className="flex border-b border-[#27272A] bg-[#111113]/40">
        <button
          onClick={() => setActiveTab('interactive')}
          className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === 'interactive'
              ? 'border-[#D4AF37] text-white bg-[#111113]/80'
              : 'border-transparent text-[#71717A] hover:text-white hover:bg-[#111113]/20'
          }`}
        >
          <Activity size={14} className={activeTab === 'interactive' ? 'text-[#D4AF37]' : ''} />
          <span>Simulador & Testes da API</span>
        </button>
        <button
          onClick={() => setActiveTab('code')}
          className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === 'code'
              ? 'border-[#D4AF37] text-white bg-[#111113]/80'
              : 'border-transparent text-[#71717A] hover:text-white hover:bg-[#111113]/20'
          }`}
        >
          <Code2 size={14} className={activeTab === 'code' ? 'text-[#D4AF37]' : ''} />
          <span>Explorador de Código Kotlin</span>
        </button>
      </div>

      {/* Feedbacks Toast Area */}
      {successMessage && (
        <div className="mx-6 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2 animate-fadeIn shadow-lg">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl flex items-center gap-2 animate-fadeIn shadow-lg">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Mode 1: Interactive Test Panel & Simulators */}
      {activeTab === 'interactive' && (
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Subsections tabs & action panels (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Simulation Tabs */}
            <div className="flex flex-nowrap border-b border-[#27272A] pb-px overflow-x-auto gap-2 no-scrollbar">
              <button
                onClick={() => setActiveSimTab('cert')}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-t-xl text-[11px] font-bold tracking-wide uppercase transition-all border-b-2 cursor-pointer whitespace-nowrap shrink-0 ${
                  activeSimTab === 'cert'
                    ? 'border-[#D4AF37] text-white bg-[#111113]'
                    : 'border-transparent text-[#71717A] hover:text-[#A1A1AA]'
                }`}
              >
                <Key size={13} />
                <span>1. Certificado mTLS</span>
              </button>
              <button
                onClick={() => setActiveSimTab('dps')}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-t-xl text-[11px] font-bold tracking-wide uppercase transition-all border-b-2 cursor-pointer whitespace-nowrap shrink-0 ${
                  activeSimTab === 'dps'
                    ? 'border-[#D4AF37] text-white bg-[#111113]'
                    : 'border-transparent text-[#71717A] hover:text-[#A1A1AA]'
                }`}
              >
                <FileText size={13} />
                <span>2. DPS & Assinatura</span>
              </button>
              <button
                onClick={() => setActiveSimTab('network')}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-t-xl text-[11px] font-bold tracking-wide uppercase transition-all border-b-2 cursor-pointer whitespace-nowrap shrink-0 ${
                  activeSimTab === 'network'
                    ? 'border-[#D4AF37] text-white bg-[#111113]'
                    : 'border-transparent text-[#71717A] hover:text-[#A1A1AA]'
                }`}
              >
                <Server size={13} />
                <span>3. Rede & Endpoints</span>
              </button>
              <button
                onClick={() => setActiveSimTab('offline')}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-t-xl text-[11px] font-bold tracking-wide uppercase transition-all border-b-2 cursor-pointer whitespace-nowrap shrink-0 ${
                  activeSimTab === 'offline'
                    ? 'border-[#D4AF37] text-white bg-[#111113]'
                    : 'border-transparent text-[#71717A] hover:text-[#A1A1AA]'
                }`}
              >
                <Database size={13} />
                <span>4. Contingência Room</span>
              </button>
              <button
                onClick={() => setActiveSimTab('audit')}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-t-xl text-[11px] font-bold tracking-wide uppercase transition-all border-b-2 cursor-pointer whitespace-nowrap shrink-0 ${
                  activeSimTab === 'audit'
                    ? 'border-[#D4AF37] text-white bg-[#111113]'
                    : 'border-transparent text-[#71717A] hover:text-[#A1A1AA]'
                }`}
              >
                <Activity size={13} />
                <span>Auditoria</span>
              </button>
            </div>

            {/* TAB CONTENT 1: Certificado Digital mTLS */}
            {activeSimTab === 'cert' && (
              <div className="bg-[#111113] border border-[#27272A] p-6 rounded-2xl space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20">
                    <Key size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">1. Carregamento do Certificado A1</h3>
                    <p className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">
                      Simule a leitura do arquivo criptográfico contendo a chave privada e a cadeia de certificados para o <strong>OkHttpClient mTLS</strong>. No Android nativo, os dados binários do PFX são codificados em Base64 e mantidos no KeyStore via EncryptedSharedPreferences.
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#27272A] pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold text-[#71717A] uppercase tracking-wider">Arquivo do Certificado (.pfx)</label>
                    <select
                      value={certFileName}
                      onChange={(e) => setCertFileName(e.target.value)}
                      className="w-full bg-[#18181B] border border-[#27272A] text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#D4AF37]"
                    >
                      <option value="">Selecione um certificado de teste...</option>
                      <option value="acervus_producao_2026.pfx">acervus_producao_2026.pfx (Produção)</option>
                      <option value="certificado_teste_sefin.pfx">certificado_teste_sefin.pfx (Homologação)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold text-[#71717A] uppercase tracking-wider">PIN / Senha de Acesso</label>
                    <input
                      type="password"
                      value={certPassword}
                      onChange={(e) => setCertPassword(e.target.value)}
                      placeholder="Senha do arquivo PFX"
                      className="w-full bg-[#18181B] border border-[#27272A] text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleLoadCertificate}
                    className="flex-1 py-2.5 bg-[#D4AF37] hover:bg-[#E5C158] text-black text-xs font-bold uppercase rounded-xl tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-[#D4AF37]/10"
                  >
                    <Play size={13} className="fill-black" />
                    <span>Inicializar mTLS no OkHttp</span>
                  </button>
                  {isCertLoaded && (
                    <button
                      onClick={handleClearCertificate}
                      className="px-4 py-2.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-xs font-bold uppercase rounded-xl tracking-wider transition-all cursor-pointer"
                    >
                      <X size={13} className="inline mr-1" /> Remover
                    </button>
                  )}
                </div>

                {isCertLoaded && certMeta && (
                  <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-4 space-y-2.5 animate-fadeIn">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                      <CheckCircle2 size={14} />
                      <span>Contexto Criptográfico Inicializado!</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-mono leading-relaxed">
                      <div>
                        <span className="text-[#71717A] block">Alias Extraído:</span>
                        <span className="text-[#E4E4E7] font-bold">{certMeta.alias}</span>
                      </div>
                      <div>
                        <span className="text-[#71717A] block">Validade:</span>
                        <span className="text-[#E4E4E7] font-bold">{certMeta.expDate}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-[#71717A] block">Emissor:</span>
                        <span className="text-[#E4E4E7] font-bold">{certMeta.issuer}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 2: DPS & Assinatura XML */}
            {activeSimTab === 'dps' && (
              <div className="bg-[#111113] border border-[#27272A] p-6 rounded-2xl space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">2. Estrutura da DPS e Assinatura XMLDSig</h3>
                    <p className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">
                      Selecione um modelo tributário da locadora, manipule o XML ou execute o algoritmo de assinatura digital <strong>XMLDSig RSA-SHA256</strong>. Isso injetará os blocos de hash calculados e as chaves públicas dentro da tag <code>&lt;Signature&gt;</code> do documento.
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#27272A] pt-4 space-y-3">
                  <div className="flex items-center gap-3">
                    {DPS_TEMPLATES.map((tmpl) => (
                      <button
                        key={tmpl.id}
                        onClick={() => handleTemplateChange(tmpl.id)}
                        className={`flex-1 py-2 px-3 text-left border rounded-xl transition-all cursor-pointer ${
                          selectedTemplate === tmpl.id
                            ? 'bg-[#D4AF37]/10 border-[#D4AF37]/40 text-[#D4AF37]'
                            : 'bg-[#18181B] border-[#27272A] text-[#71717A] hover:text-white'
                        }`}
                      >
                        <span className="block text-xs font-bold">{tmpl.name}</span>
                        <span className="block text-[10px] opacity-80 mt-0.5 line-clamp-1">{tmpl.desc}</span>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-extrabold text-[#71717A] uppercase tracking-wider font-mono">
                      <span>Declaração de Prestação de Serviço (DPS)</span>
                      <span className={isXmlSigned ? 'text-emerald-400' : 'text-[#D4AF37]'}>
                        {isXmlSigned ? '✓ ASSINADO DIGITALMENTE' : 'AGUARDANDO ASSINATURA'}
                      </span>
                    </div>
                    <textarea
                      value={isXmlSigned ? signedXml : rawXml}
                      onChange={(e) => {
                        if (!isXmlSigned) setRawXml(e.target.value);
                      }}
                      disabled={isXmlSigned}
                      rows={9}
                      className="w-full bg-[#18181B] border border-[#27272A] rounded-xl p-3 text-[11px] font-mono text-emerald-500/90 leading-normal focus:outline-none focus:border-[#D4AF37] resize-none"
                    />
                  </div>

                  <button
                    onClick={handleSignXml}
                    disabled={isXmlSigned}
                    className={`w-full py-2.5 text-xs font-bold uppercase rounded-xl tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      isXmlSigned 
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 cursor-default'
                        : 'bg-[#D4AF37] hover:bg-[#E5C158] text-black shadow-lg shadow-[#D4AF37]/10'
                    }`}
                  >
                    <Lock size={13} />
                    <span>{isXmlSigned ? 'DPS Assinada Digitalmente' : 'Assinar XML com RSA-SHA256'}</span>
                  </button>

                  {isXmlSigned && (
                    <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-4 space-y-2 animate-fadeIn text-[11px] font-mono leading-relaxed">
                      <div className="flex justify-between items-center text-xs font-bold text-white mb-1">
                        <span>Metadados da Assinatura</span>
                        <button 
                          onClick={() => {
                            setRawXml(DPS_TEMPLATES.find(t => t.id === selectedTemplate)?.xml || '');
                            setIsXmlSigned(false);
                            triggerFeedback('Assinatura removida. DPS resetada para o estado original.');
                          }}
                          className="text-red-400 hover:text-red-300 text-[10px]"
                        >
                          Limpar Assinatura
                        </button>
                      </div>
                      <div>
                        <span className="text-[#71717A] block">Hash Digest (SHA-256 do Elemento):</span>
                        <span className="text-[#E4E4E7] break-all">{xmlDigest}</span>
                      </div>
                      <div>
                        <span className="text-[#71717A] block">SignatureValue (RSA Encriptado):</span>
                        <span className="text-[#E4E4E7] break-all">{xmlSignatureValue}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: Rede & Endpoints */}
            {activeSimTab === 'network' && (
              <div className="bg-[#111113] border border-[#27272A] p-6 rounded-2xl space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20">
                    <Server size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">3. Gateways & Transmissão REST SEFIN</h3>
                    <p className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">
                      Efetue chamadas diretas para os endpoints regulamentares da SEFIN Nacional. As chamadas online exigem o handshake mTLS (certificado ativo e assinado).
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#27272A] pt-4 grid grid-cols-2 gap-3">
                  <button
                    onClick={handleTransmitDps}
                    className="p-3 bg-[#18181B] border border-[#27272A] hover:border-[#3F3F46] rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <Send size={13} className="text-[#D4AF37]" />
                      <span>Transmitir DPS</span>
                    </div>
                    <span className="text-[10px] text-[#71717A] mt-2 block font-mono">POST /api/v1/dps</span>
                  </button>

                  <button
                    onClick={handleConsultNfse}
                    className="p-3 bg-[#18181B] border border-[#27272A] hover:border-[#3F3F46] rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <Search size={13} className="text-[#D4AF37]" />
                      <span>Consultar Nota</span>
                    </div>
                    <span className="text-[10px] text-[#71717A] mt-2 block font-mono">GET /api/v1/nfse/{"{chave}"}</span>
                  </button>

                  <button
                    onClick={handleCancelNfse}
                    className="p-3 bg-[#18181B] border border-[#27272A] hover:border-[#3F3F46] rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <Trash2 size={13} className="text-red-400" />
                      <span>Cancelar Nota</span>
                    </div>
                    <span className="text-[10px] text-[#71717A] mt-2 block font-mono">POST /api/v1/nfse/cancelar</span>
                  </button>

                  <button
                    onClick={handleDownloadDanfse}
                    className="p-3 bg-[#18181B] border border-[#27272A] hover:border-[#3F3F46] rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <Download size={13} className="text-amber-400" />
                      <span>Baixar DANFSE PDF</span>
                    </div>
                    <span className="text-[10px] text-[#71717A] mt-2 block font-mono">GET /api/v1/danfse/{"{chave}"}</span>
                  </button>

                  <button
                    onClick={handlePrintDanfse}
                    className="p-3 bg-[#18181B] border border-[#27272A] hover:border-[#3F3F46] rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <Printer size={13} className="text-[#D4AF37]" />
                      <span>Imprimir DANFSE</span>
                    </div>
                    <span className="text-[10px] text-[#71717A] mt-2 block font-mono">Visualizar/Imprimir</span>
                  </button>
                </div>

                {isNetRequestPending && (
                  <div className="flex items-center justify-center gap-2.5 py-4 text-xs font-bold text-[#D4AF37]">
                    <RefreshCw className="animate-spin text-[#D4AF37]" size={16} />
                    <span>Enviando requisição e autenticando via mTLS com o servidor federal...</span>
                  </div>
                )}

                {!isNetRequestPending && netResponseCode !== null && (
                  <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-4 space-y-2 animate-fadeIn font-mono text-[11px]">
                    <div className="flex items-center justify-between text-xs font-bold border-b border-[#27272A] pb-2 mb-2">
                      <span className="text-white">Resultado HTTP Gateway</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        netResponseCode === 200 
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-red-500/15 text-red-400 border border-red-500/30'
                      }`}>
                        STATUS: {netResponseCode}
                      </span>
                    </div>
                    <pre className="text-white leading-relaxed overflow-x-auto whitespace-pre-wrap">{netResponseBody}</pre>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 4: Contingência Room DB & WorkManager */}
            {activeSimTab === 'offline' && (
              <div className="bg-[#111113] border border-[#27272A] p-6 rounded-2xl space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20">
                    <Database size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">4. Contingência Offline com Room & WorkManager</h3>
                    <p className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">
                      Se o app estiver sem internet, a DPS assinada é salva localmente em uma tabela Room (SQLite) com o estado <code>PENDENTE_SINCRONIZACAO</code>. O WorkManager agenda uma tarefa que é disparada automaticamente assim que o sinal de rede retornar.
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#27272A] pt-4 space-y-3.5">
                  <div className="flex items-center justify-between p-4 bg-[#18181B] rounded-xl border border-[#27272A]">
                    <div className="space-y-0.5">
                      <span className="text-white text-xs font-bold block">Status do Background WorkManager</span>
                      <span className="text-[#71717A] text-[10px] block">
                        {localRoomQueue.length > 0 
                          ? 'Módulo de rede detectou fila ativa. Background Worker enfileirado.' 
                          : 'Fila limpa. Sem tarefas agendadas.'}
                      </span>
                    </div>
                    <span className={`px-2.5 py-1 rounded text-[10px] font-mono font-extrabold ${
                      localRoomQueue.length > 0 
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse' 
                        : 'bg-[#27272A] text-[#71717A]'
                    }`}>
                      {localRoomQueue.length > 0 ? 'STATUS: ENQUEUED' : 'STATUS: IDLE'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <span className="block text-[10px] font-extrabold text-[#71717A] uppercase tracking-wider font-mono">Fila de Sincronização Local (SQLite Room DB)</span>
                    
                    {localRoomQueue.length === 0 ? (
                      <div className="p-6 bg-[#18181B]/50 border border-[#27272A] rounded-xl text-center text-[#71717A] text-xs">
                        Nenhum documento pendente de reenvio. Ative o modo OFFLINE no painel acima e envie uma DPS assinada para testar.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {localRoomQueue.map((item) => (
                          <div key={item.id} className="p-3 bg-[#18181B] border border-amber-500/20 rounded-xl flex items-center justify-between text-xs animate-fadeIn">
                            <div className="space-y-0.5">
                              <span className="text-white font-bold font-mono">RPS ID: #{item.id}</span>
                              <span className="text-[#A1A1AA] text-[10px] block font-mono">Timestamp: {new Date(item.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <span className="px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[9px] font-extrabold rounded-full uppercase">
                              PENDENTE SYNC
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {localRoomQueue.length > 0 && (
                    <button
                      onClick={handleTriggerWorkManager}
                      disabled={isSyncingQueue}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase rounded-xl tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10"
                    >
                      <RefreshCw size={13} className={isSyncingQueue ? 'animate-spin' : ''} />
                      <span>Forçar Sincronização em Segundo Plano (WorkManager)</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT 5: Auditoria */}
            {activeSimTab === 'audit' && (
              <div className="bg-[#111113] border border-[#27272A] p-6 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20">
                      <Activity size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Auditoria & Logs Operacionais</h3>
                      <p className="text-xs text-[#A1A1AA] mt-0.5">Histórico persistido em nuvem na coleção <code>ia_historico_interacoes</code>.</p>
                    </div>
                  </div>
                  <button 
                    onClick={loadAuditLogs}
                    className="p-1.5 text-xs text-[#D4AF37] hover:text-white transition-all cursor-pointer"
                    title="Recarregar logs de auditoria"
                  >
                    <RefreshCw size={14} className={isAuditLoading ? 'animate-spin' : ''} />
                  </button>
                </div>

                <div className="max-h-[340px] overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                  {isAuditLoading ? (
                    <div className="text-center py-8 text-xs text-[#71717A]">Carregando logs operacionais...</div>
                  ) : auditLogs.length === 0 ? (
                    <div className="text-center py-8 text-xs text-[#71717A]">Sem logs de auditoria registrados até o momento. Transmita notas fiscais no simulador para gravar registros.</div>
                  ) : (
                    auditLogs.map((log) => {
                      const isAuth = log.statusFiscal === 'AUTORIZADA';
                      return (
                        <div key={log.id} className="p-3 bg-[#18181B] border border-[#27272A] rounded-xl space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white font-mono">{log.operacao}</span>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                              isAuth 
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
                                : log.statusFiscal === 'PENDENTE_SINCRONIZACAO'
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                                : 'bg-red-500/15 text-red-400 border border-red-500/20'
                            }`}>
                              {log.statusFiscal}
                            </span>
                          </div>
                          
                          <div className="text-[10px] text-[#A1A1AA] leading-normal font-mono break-all bg-[#0D0D0F] p-2 rounded-lg border border-[#27272A]/50">
                            {log.responseBody}
                          </div>

                          <div className="flex items-center justify-between text-[9px] text-[#71717A] font-mono">
                            <span>ID: {log.id}</span>
                            <span>{new Date(log.timestamp).toLocaleTimeString()} - Status HTTP {log.statusHttp}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Visual Process flowchart / Overview (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Architecture Overview */}
            <div className="bg-[#111113] border border-[#27272A] p-6 rounded-2xl space-y-5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Cpu size={16} className="text-[#D4AF37]" /> Arquitetura Acervus Core v2
              </h3>

              <div className="space-y-4 text-xs">
                {/* Step Flow Card */}
                <div className="relative border-l border-[#27272A] pl-4 ml-2 space-y-4">
                  {/* Step 1 */}
                  <div className="relative">
                    <span className="absolute -left-[21px] top-0.5 w-3 h-3 rounded-full bg-[#D4AF37] border-2 border-[#111113]" />
                    <div className="space-y-0.5">
                      <span className="text-white font-bold block">1. Criptografia mTLS & ICP-Brasil</span>
                      <span className="text-[#A1A1AA] block leading-relaxed text-[11px]">
                        Segurança mTLS com certificado cliente A1 fornecendo canais blindados conforme requisitos de segurança do governo brasileiro.
                      </span>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="relative">
                    <span className="absolute -left-[21px] top-0.5 w-3 h-3 rounded-full bg-[#D4AF37] border-2 border-[#111113]" />
                    <div className="space-y-0.5">
                      <span className="text-white font-bold block">2. Assinatura Envelopada XMLDSig</span>
                      <span className="text-[#A1A1AA] block leading-relaxed text-[11px]">
                        Geração da DPS baseada nos esquemas XSD oficiais, executando o encapsulamento criptográfico diretamente nas classes de segurança do app.
                      </span>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="relative">
                    <span className="absolute -left-[21px] top-0.5 w-3 h-3 rounded-full bg-[#D4AF37] border-2 border-[#111113]" />
                    <div className="space-y-0.5">
                      <span className="text-white font-bold block">3. Gateway de Alta Resiliência</span>
                      <span className="text-[#A1A1AA] block leading-relaxed text-[11px]">
                        Orquestração de rede automática com contingência. Quedas do servidor federal causam o enfileiramento offline automático em Room DB.
                      </span>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="relative">
                    <span className="absolute -left-[21px] top-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#111113]" />
                    <div className="space-y-0.5">
                      <span className="text-white font-bold block">4. Sincronização Assíncrona</span>
                      <span className="text-[#A1A1AA] block leading-relaxed text-[11px]">
                        O WorkManager executa o reenvio automático em background respeitando restrições de economia de bateria e sinal estável de rede.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* DANFSE View Container */}
            <div className="bg-[#111113] border border-[#27272A] p-6 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <FileText size={16} className="text-[#D4AF37]" /> Visualizador de DANFSE (Preview)
              </h3>
              <p className="text-[#A1A1AA] text-xs leading-relaxed">
                Renderização simulada do Documento Auxiliar da NFS-e (DANFSE) conforme layout padronizado da Receita Federal.
              </p>

              <div className="border border-[#27272A] bg-white rounded-xl p-4 text-black space-y-3 font-mono text-[9px] relative overflow-hidden select-none select-none max-w-sm mx-auto">
                {/* Header government bar */}
                <div className="border-b border-black pb-2 flex justify-between items-center text-[8px] font-sans">
                  <span className="font-extrabold uppercase">REPÚBLICA FEDERATIVA DO BRASIL</span>
                  <span className="font-bold">NFS-e NACIONAL</span>
                </div>

                {/* Main receipt visual */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 border-b border-black pb-2 text-[8px]">
                    <div>
                      <span className="font-bold block">PRESTADOR DO SERVIÇO</span>
                      <span className="font-extrabold block">ACERVUS LOCAÇÃO LTDA</span>
                      <span>CNPJ: 12.345.678/0001-99</span>
                      <span>IM: 827.394</span>
                    </div>
                    <div>
                      <span className="font-bold block">TOMADOR DO SERVIÇO</span>
                      <span className="font-extrabold block">ESTÚDIO CINEMATOGRÁFICO SP</span>
                      <span>CNPJ: 98.765.432/0001-00</span>
                      <span>UF: SP</span>
                    </div>
                  </div>

                  <div className="border-b border-black pb-2">
                    <span className="font-bold block">DESCRIÇÃO DOS SERVIÇOS</span>
                    <p className="leading-relaxed text-[8px]">
                      Locação de Câmeras Cinema Red V-Raptor e Lentes Anamórficas por 5 dias para produção cinematográfica comercial.
                    </p>
                  </div>

                  <div className="grid grid-cols-4 gap-1 text-center font-bold text-[8px]">
                    <div className="bg-gray-100 p-1 rounded">
                      <span className="block text-[7px] text-gray-500">VALOR</span>
                      <span>R$ 8.500,00</span>
                    </div>
                    <div className="bg-gray-100 p-1 rounded">
                      <span className="block text-[7px] text-gray-500">ALIQ.</span>
                      <span>0.00%</span>
                    </div>
                    <div className="bg-gray-100 p-1 rounded">
                      <span className="block text-[7px] text-gray-500">ISSQN</span>
                      <span>R$ 0,00</span>
                    </div>
                    <div className="bg-gray-100 p-1 rounded">
                      <span className="block text-[7px] text-gray-500">RETIDO</span>
                      <span>NÃO</span>
                    </div>
                  </div>
                </div>

                {/* Footer seal */}
                <div className="border-t border-dashed border-gray-400 pt-2 text-center text-[7px] font-sans text-gray-600">
                  ASSINADO DIGITALMENTE SOB PROTOCOLO DE CONFORMIDADE ICP-BRASIL
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Code Explorer */}
      {activeTab === 'code' && (
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* File selector tree sidebar (3 cols) */}
          <div className="lg:col-span-3 space-y-2">
            <span className="block text-[10px] font-extrabold text-[#71717A] uppercase tracking-wider font-mono px-2">
              Estrutura de Arquivos Kotlin
            </span>

            <div className="space-y-1 pt-1">
              <button
                onClick={() => setActiveCodeFile('cert')}
                className={`w-full p-3 text-left rounded-xl transition-all flex items-center gap-2.5 cursor-pointer ${
                  activeCodeFile === 'cert'
                    ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30'
                    : 'bg-transparent text-[#A1A1AA] hover:bg-[#18181B] border border-transparent'
                }`}
              >
                <Key size={14} />
                <div className="text-xs truncate">
                  <span className="block font-bold">CertificateManager.kt</span>
                  <span className="block text-[10px] opacity-75 mt-0.5">ICP-Brasil / Keystore</span>
                </div>
              </button>

              <button
                onClick={() => setActiveCodeFile('signer')}
                className={`w-full p-3 text-left rounded-xl transition-all flex items-center gap-2.5 cursor-pointer ${
                  activeCodeFile === 'signer'
                    ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30'
                    : 'bg-transparent text-[#A1A1AA] hover:bg-[#18181B] border border-transparent'
                }`}
              >
                <Lock size={14} />
                <div className="text-xs truncate">
                  <span className="block font-bold">XmlSigner.kt</span>
                  <span className="block text-[10px] opacity-75 mt-0.5">Assinatura XMLDSig</span>
                </div>
              </button>

              <button
                onClick={() => setActiveCodeFile('api')}
                className={`w-full p-3 text-left rounded-xl transition-all flex items-center gap-2.5 cursor-pointer ${
                  activeCodeFile === 'api'
                    ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30'
                    : 'bg-transparent text-[#A1A1AA] hover:bg-[#18181B] border border-transparent'
                }`}
              >
                <Server size={14} />
                <div className="text-xs truncate">
                  <span className="block font-bold">NfseApiService.kt</span>
                  <span className="block text-[10px] opacity-75 mt-0.5">Retrofit REST mTLS</span>
                </div>
              </button>

              <button
                onClick={() => setActiveCodeFile('repo')}
                className={`w-full p-3 text-left rounded-xl transition-all flex items-center gap-2.5 cursor-pointer ${
                  activeCodeFile === 'repo'
                    ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30'
                    : 'bg-transparent text-[#A1A1AA] hover:bg-[#18181B] border border-transparent'
                }`}
              >
                <Database size={14} />
                <div className="text-xs truncate">
                  <span className="block font-bold">NfseRepository.kt</span>
                  <span className="block text-[10px] opacity-75 mt-0.5">Room & WorkManager</span>
                </div>
              </button>

              <button
                onClick={() => setActiveCodeFile('compose')}
                className={`w-full p-3 text-left rounded-xl transition-all flex items-center gap-2.5 cursor-pointer ${
                  activeCodeFile === 'compose'
                    ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30'
                    : 'bg-transparent text-[#A1A1AA] hover:bg-[#18181B] border border-transparent'
                }`}
              >
                <LayersIcon size={14} />
                <div className="text-xs truncate">
                  <span className="block font-bold">NfseDashboardScreen.kt</span>
                  <span className="block text-[10px] opacity-75 mt-0.5">Jetpack Compose UI</span>
                </div>
              </button>
            </div>
          </div>

          {/* Code viewer & copy button (9 cols) */}
          <div className="lg:col-span-9 space-y-3">
            <div className="flex items-center justify-between bg-[#111113] px-4 py-2.5 rounded-xl border border-[#27272A]">
              <div className="flex items-center gap-2 text-xs font-bold text-white font-mono">
                <Code2 size={14} className="text-[#D4AF37]" />
                <span>
                  {activeCodeFile === 'cert' && 'src/main/java/com/example/acervus/core/security/CertificateManager.kt'}
                  {activeCodeFile === 'signer' && 'src/main/java/com/example/acervus/core/security/XmlSigner.kt'}
                  {activeCodeFile === 'api' && 'src/main/java/com/example/acervus/core/network/NfseApiService.kt'}
                  {activeCodeFile === 'repo' && 'src/main/java/com/example/acervus/core/repository/NfseRepository.kt'}
                  {activeCodeFile === 'compose' && 'src/main/java/com/example/acervus/core/presentation/NfseDashboardScreen.kt'}
                </span>
              </div>

              <button
                onClick={() => handleCopyCode(KOTLIN_CODE[activeCodeFile], activeCodeFile)}
                className="flex items-center gap-1 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white cursor-pointer transition-all uppercase font-mono"
              >
                {copiedText === activeCodeFile ? <Check size={12} className="text-emerald-400" /> : <Clipboard size={12} />}
                <span>{copiedText === activeCodeFile ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>

            <div className="bg-[#111113] border border-[#27272A] rounded-2xl overflow-hidden shadow-inner font-mono text-xs text-emerald-500/90 leading-relaxed">
              <pre className="p-6 overflow-auto max-h-[500px] whitespace-pre custom-scrollbar select-text text-left">
                {KOTLIN_CODE[activeCodeFile]}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
