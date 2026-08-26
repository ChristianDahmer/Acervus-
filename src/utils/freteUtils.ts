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

export async function calcularDistanciaRealOuSimulada(
  origem: string,
  destino: string,
  apiKey?: string
): Promise<{ distanciaKm: number; real: boolean }> {
  if (!origem?.trim() || !destino?.trim()) {
    return { distanciaKm: 0, real: false };
  }
  
  const key = apiKey || process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
  
  if (key && typeof window !== 'undefined') {
    try {
      await loadGoogleMapsScript(key);
      if ((window as any).google?.maps) {
        const service = new (window as any).google.maps.DistanceMatrixService();
        return new Promise((resolve) => {
          service.getDistanceMatrix(
            {
              origins: [origem],
              destinations: [destino],
              travelMode: (window as any).google.maps.TravelMode.DRIVING,
            },
            (response, status) => {
              if (status === 'OK' && response) {
                const element = response.rows[0]?.elements[0];
                if (element && element.status === 'OK' && element.distance) {
                  const kms = parseFloat((element.distance.value / 1000).toFixed(1));
                  resolve({ distanciaKm: kms, real: true });
                  return;
                }
              }
              // If status is not OK or no distance returned, fallback
              resolve(getDeterministicFallback(origem, destino));
            }
          );
        });
      }
    } catch (e) {
      console.warn('Falha no cálculo do Google Maps, usando estimador determinístico:', e);
    }
  }

  return Promise.resolve(getDeterministicFallback(origem, destino));
}

function getDeterministicFallback(origem: string, destino: string): { distanciaKm: number; real: boolean } {
  // Deterministic fallback based on address strings so the same input always yields the same distance
  let hash = 0;
  const combined = (origem + destino).toLowerCase();
  for (let i = 0; i < combined.length; i++) {
    hash = combined.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Return a distance between 3.5 and 45.5 km
  const baseDistance = Math.abs(hash % 42) + 3.5;
  return { distanciaKm: parseFloat(baseDistance.toFixed(1)), real: false };
}

export function calcularValorFrete(distanciaKm: number, valorFretePorKm: number): number {
  if (!distanciaKm || !valorFretePorKm || distanciaKm <= 0 || valorFretePorKm <= 0) return 0;
  return parseFloat((distanciaKm * valorFretePorKm).toFixed(2));
}
