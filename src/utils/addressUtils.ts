export interface AddressData {
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  endereco?: string;
}

/**
 * Normaliza e formata os campos individuais de endereço em uma string única coesa.
 * Exemplo: "Rua das Flores, 123 - Centro - São Paulo - SP"
 */
export function formatEnderecoCompleto(data?: AddressData | string | null): string {
  if (!data) return '';
  if (typeof data === 'string') return data.trim();

  const { logradouro, numero, bairro, cidade, estado, cep, endereco } = data;

  const parts: string[] = [];

  // Se houver logradouro
  if (logradouro?.trim()) {
    let ruaNum = logradouro.trim();
    if (numero?.trim()) {
      ruaNum += `, ${numero.trim()}`;
    }
    parts.push(ruaNum);
  } else if (numero?.trim()) {
    parts.push(`Nº ${numero.trim()}`);
  }

  // Se houver bairro
  if (bairro?.trim()) {
    parts.push(bairro.trim());
  }

  // Se houver cidade/estado
  if (cidade?.trim()) {
    let cidUf = cidade.trim();
    if (estado?.trim()) {
      cidUf += ` - ${estado.trim().toUpperCase()}`;
    }
    parts.push(cidUf);
  } else if (estado?.trim()) {
    parts.push(estado.trim().toUpperCase());
  }

  // Se houver CEP
  if (cep?.trim()) {
    parts.push(`CEP ${cep.trim()}`);
  }

  if (parts.length > 0) {
    return parts.join(' - ');
  }

  // Fallback para campo string unico legado
  return endereco?.trim() || '';
}

/**
 * Tenta decompor uma string única de endereço nos campos separados (útil para migração/preenchimento prévio)
 */
export function parseEnderecoCompleto(enderecoStr?: string | null): AddressData {
  if (!enderecoStr || !enderecoStr.trim()) {
    return { logradouro: '', numero: '', bairro: '', cidade: '', estado: '', cep: '', endereco: '' };
  }

  const str = enderecoStr.trim();
  const parts = str.split('-').map(p => p.trim());

  let logradouro = '';
  let numero = '';
  let bairro = '';
  let cidade = '';
  let estado = '';

  if (parts.length >= 1) {
    // Ex: "Rua das Flores, 123" ou "Rua das Flores"
    const firstPart = parts[0];
    const subParts = firstPart.split(',').map(s => s.trim());
    logradouro = subParts[0] || '';
    if (subParts.length > 1) {
      numero = subParts[1] || '';
    }
  }

  if (parts.length >= 2) {
    bairro = parts[1];
  }

  if (parts.length >= 3) {
    const cityPart = parts[2];
    const ufParts = cityPart.split('/').map(s => s.trim());
    cidade = ufParts[0] || '';
    if (ufParts.length > 1) {
      estado = ufParts[1] || '';
    }
  }

  return {
    logradouro,
    numero,
    bairro,
    cidade,
    estado,
    endereco: str,
  };
}

/**
 * Consulta ViaCEP para buscar dados de endereço a partir do CEP informado.
 */
export async function buscarEnderecoPorCep(cepInput: string): Promise<AddressData | null> {
  const cleanCep = (cepInput || '').replace(/\D/g, '');
  if (cleanCep.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.erro) return null;

    const address: AddressData = {
      logradouro: data.logradouro || '',
      bairro: data.bairro || '',
      cidade: data.localidade || '',
      estado: data.uf || '',
      cep: data.cep || cleanCep.replace(/^(\d{5})(\d{3})$/, '$1-$2'),
    };

    address.endereco = formatEnderecoCompleto(address);
    return address;
  } catch (err) {
    console.error('Erro ao buscar CEP no ViaCEP:', err);
    return null;
  }
}

/**
 * Obtém a localização GPS atual do navegador e realiza Geocodificação Reversa para obter o endereço
 */
export async function obterLocalizacaoEEnderecoGPS(): Promise<{
  lat: number;
  lng: number;
  address: AddressData;
}> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalização não é suportada por este navegador ou dispositivo.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        try {
          // Reversão via Nominatim OpenStreetMap em Português
          const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
          const response = await fetch(url, {
            headers: {
              'Accept-Language': 'pt-BR,pt;q=0.9',
            },
          });

          if (!response.ok) {
            throw new Error('Falha ao obter endereço reverso por GPS');
          }

          const data = await response.json();
          const details = data.address || {};

          const logradouro = details.road || details.street || details.pedestrian || details.suburb || '';
          const numero = details.house_number || details.building || '';
          const bairro = details.suburb || details.neighbourhood || details.residential || details.quarter || '';
          const cidade = details.city || details.town || details.municipality || details.village || details.county || '';
          const estadoRaw = details.state_code || details.state || '';
          const estado = estadoRaw.length === 2 ? estadoRaw.toUpperCase() : estadoRaw;
          const cep = details.postcode || '';

          const addressObj: AddressData = {
            logradouro,
            numero,
            bairro,
            cidade,
            estado,
            cep,
          };

          const formattedStr = formatEnderecoCompleto(addressObj) || data.display_name || `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          addressObj.endereco = formattedStr;

          resolve({
            lat,
            lng,
            address: addressObj,
          });
        } catch (err) {
          // Fallback em caso de erro na rede ou limite de requisição da geocodificação
          const fallbackAddress: AddressData = {
            logradouro: '',
            numero: '',
            bairro: '',
            cidade: '',
            estado: '',
            cep: '',
            endereco: `GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          };

          resolve({
            lat,
            lng,
            address: fallbackAddress,
          });
        }
      },
      (error) => {
        let msg = 'Erro ao obter localização GPS.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Permissão de localização negada no seu navegador. Ative a permissão de GPS para permitir o preenchimento automático.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Sinal de GPS indetectável no momento.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Tempo esgotado para obter coordenadas de localização GPS.';
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  });
}

