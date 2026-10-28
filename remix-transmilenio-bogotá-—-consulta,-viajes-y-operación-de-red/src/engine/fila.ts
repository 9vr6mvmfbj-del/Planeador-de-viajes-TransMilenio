import { Cola } from './estructuras';

export interface CicloSimulacion {
  minuto: number;
  nuevosPasajeros: number;
  abordaron: number;
  enFila: number;
  pasoBus: boolean;
}

export interface ResultadoSimulacionFila {
  totalLlegadas: number;
  totalAbordados: number;
  enEsperaFinal: number;
  busesDespachados: number;
  esperaPromedioMinutos: number;
  esperaMaximaMinutos: number;
  ciclos: CicloSimulacion[];
}

/**
 * R10: Simulador de fila de abordaje en hora pico usando estrictamente una Cola FIFO O(1).
 */
export function simularFila(
  llegadas: number[],
  frecuencia: number,
  capacidad: number
): ResultadoSimulacionFila {
  const colaPasajeros = new Cola<number>();
  let totalLlegadas = 0;
  let totalAbordados = 0;
  let busesDespachados = 0;
  let esperaAcumulada = 0;
  let esperaMaximaMinutos = 0;
  const ciclos: CicloSimulacion[] = [];

  const freqSegura = frecuencia > 0 ? frecuencia : 1;
  const capSegura = capacidad > 0 ? capacidad : 1;

  for (let minuto = 0; minuto < llegadas.length; minuto++) {
    const nuevos = llegadas[minuto] > 0 ? Math.floor(llegadas[minuto]) : 0;
    totalLlegadas += nuevos;

    for (let p = 0; p < nuevos; p++) {
      colaPasajeros.encolar(minuto);
    }

    let abordaron = 0;
    const pasoBus = (minuto + 1) % freqSegura === 0 || minuto === 0;

    if (pasoBus) {
      busesDespachados++;
      let cupo = capSegura;
      while (cupo > 0 && !colaPasajeros.estaVacia()) {
        const minLlegada = colaPasajeros.desencolar()!;
        const espera = minuto - minLlegada;
        esperaAcumulada += espera;
        if (espera > esperaMaximaMinutos) {
          esperaMaximaMinutos = espera;
        }
        abordaron++;
        totalAbordados++;
        cupo--;
      }
    }

    ciclos.push({
      minuto: minuto + 1,
      nuevosPasajeros: nuevos,
      abordaron,
      enFila: colaPasajeros.tamano(),
      pasoBus,
    });
  }

  const esperaPromedioMinutos =
    totalAbordados > 0
      ? Math.round((esperaAcumulada / totalAbordados) * 10) / 10
      : 0;

  return {
    totalLlegadas,
    totalAbordados,
    enEsperaFinal: colaPasajeros.tamano(),
    busesDespachados,
    esperaPromedioMinutos,
    esperaMaximaMinutos,
    ciclos,
  };
}
