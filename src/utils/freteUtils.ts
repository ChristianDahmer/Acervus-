let gmpLoadingPromise: Promise<any> | null = null;

export function loadGoogleMapsScript(apiKey: string): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject('SSR environment');
  if ((window as any).google?.maps) return Promise.resolve((window as any).google);
  
  if (gmpLoadingPromise) return gmpLoadingPromise;
  
  gmpLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      resolve((window as any).google);
    };
    script.onerror = (err) => {
      gmpLoadingPromise = null;
      reject(err);
    };
    document.head.appendChild(script);
  });
  
  return gmpLoadingPromise;
}

/**
 * Geocodifica uma string de endereço em coordenadas GPS { lat, lon } via OpenStreetMap Nominatim.
 * Suporta logradouros, CEPs (ex: 80000-000), bairros, cidades e estados do Brasil.
 */
async function geocodeAddressOSM(address: string): Promise<{ lat: number; lon: number } | null> {
  if (!address?.trim()) return null;
  
  try {
    const searchQuery = address.trim();
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=br&limit=1`;
    
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        if (!isNaN(lat) && !isNaN(lon)) {
          return { lat, lon };
        }
      }
    }
  } catch (err) {
    console.warn('[freteUtils] Geocodificação Nominatim indisponível:', err);
  }
  return null;
}

/**
 * Calcula a distância rodoviária real de percurso de condução (veículo) em Km via API OSRM.
 */
async function getDrivingDistanceOSRM(
  origin: { lat: number; lon: number },
  destination: { lat: number; lon: number }
): Promise<number | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=false`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.code === 'Ok' && Array.isArray(data.routes) && data.routes.length > 0) {
        const meters = data.routes[0].distance;
        if (typeof meters === 'number' && meters >= 0) {
          return parseFloat((meters / 1000).toFixed(1));
        }
      }
    }
  } catch (err) {
    console.warn('[freteUtils] Cálculo de rota OSRM indisponível:', err);
  }
  return null;
}

/**
 * Cálculo geodésico Haversine ajustado com fator de malha viária (1.25x) como fallback secundário.
 */
function calculateHaversineKm(
  origin: { lat: number; lon: number },
  destination: { lat: number; lon: number }
): number {
  const R = 6371; // Raio terrestre em Km
  const dLat = (destination.lat - origin.lat) * (Math.PI / 180);
  const dLon = (destination.lon - origin.lon) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(origin.lat * (Math.PI / 180)) *
      Math.cos(destination.lat * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const directKm = R * c;
  return parseFloat((directKm * 1.25).toFixed(1));
}

export async function calcularDistanciaRealOuSimulada(
  origem: string,
  destino: string,
  apiKey?: string
): Promise<{ distanciaKm: number; real: boolean; metodo?: string }> {
  if (!origem?.trim() || !destino?.trim()) {
    return { distanciaKm: 0, real: false, metodo: 'Endereço Ausente' };
  }

  const key = apiKey || process.env.GOOGLE_MAPS_PLATFORM_KEY || '';

  // 1. Tentar Google Maps Distance Matrix se houver chave configurada
  if (key && typeof window !== 'undefined') {
    try {
      await loadGoogleMapsScript(key);
      if ((window as any).google?.maps) {
        const service = new (window as any).google.maps.DistanceMatrixService();
        const googleResult = await new Promise<{ distanciaKm: number; real: boolean; metodo: string } | null>((resolve) => {
          service.getDistanceMatrix(
            {
              origins: [origem],
              destinations: [destino],
              travelMode: (window as any).google.maps.TravelMode.DRIVING,
            },
            (response: any, status: string) => {
              if (status === 'OK' && response) {
                const element = response.rows[0]?.elements[0];
                if (element && element.status === 'OK' && element.distance) {
                  const kms = parseFloat((element.distance.value / 1000).toFixed(1));
                  resolve({ distanciaKm: kms, real: true, metodo: 'Google Maps Distance Matrix' });
                  return;
                }
              }
              resolve(null);
            }
          );
        });

        if (googleResult) {
          return googleResult;
        }
      }
    } catch (e) {
      console.warn('[freteUtils] Google Maps Distance Matrix indisponível, usando OpenStreetMap/OSRM:', e);
    }
  }

  // 2. Usar OpenStreetMap Nominatim + OSRM Rota Rodoviária Real (Gratuito e Exato)
  try {
    const originCoords = await geocodeAddressOSM(origem);
    const destCoords = await geocodeAddressOSM(destino);

    if (originCoords && destCoords) {
      // Tentar rota rodoviária real OSRM
      const osrmDistance = await getDrivingDistanceOSRM(originCoords, destCoords);
      if (osrmDistance !== null && osrmDistance >= 0) {
        return { distanciaKm: osrmDistance, real: true, metodo: 'OpenStreetMap OSRM Routing' };
      }

      // Fallback Haversine com fator de malha urbana
      const haversineKm = calculateHaversineKm(originCoords, destCoords);
      return { distanciaKm: haversineKm, real: true, metodo: 'Geodésico Haversine' };
    }
  } catch (err) {
    console.warn('[freteUtils] Erro ao calcular distância OpenStreetMap:', err);
  }

  return { distanciaKm: 0, real: false, metodo: 'Não Identificado' };
}

export function calcularValorFrete(
  distanciaKm: number,
  valorFretePorKm: number,
  numeroDeslocamentos: number = 4
): number {
  if (!distanciaKm || !valorFretePorKm || distanciaKm <= 0 || valorFretePorKm <= 0) return 0;
  const numLegs = typeof numeroDeslocamentos === 'number' && numeroDeslocamentos > 0 ? numeroDeslocamentos : 4;
  return parseFloat((distanciaKm * valorFretePorKm * numLegs).toFixed(2));
}

