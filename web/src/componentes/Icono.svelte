<script>
  // Íconos de línea al estilo SF Symbols (trazos redondeados, 24×24).
  let { nombre, tam = 22, grosor = 1.9 } = $props();

  const trazos = {
    viajar: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12-10a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM6 15V9a4 4 0 0 1 4-4h2M18 9v6a4 4 0 0 1-4 4h-2',
    estaciones: 'M12 21s-7-5.6-7-11a7 7 0 1 1 14 0c0 5.4-7 11-7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
    operar: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M16 4v4M10 10v4M18 16v4',
    fila: 'M7 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM4 20v-5a3 3 0 0 1 6 0v5M14 20v-5a3 3 0 0 1 6 0v5',
    rendimiento: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
    intercambiar: 'M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3',
    buscar: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm9 2-4-4',
    reloj: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4.5l3 2',
    deshacer: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
    rehacer: 'm15 14 5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13',
    mas: 'M12 5v14M5 12h14',
    menos: 'M5 12h14',
    cerrar: 'M6 6l12 12M18 6 6 18',
    cheque: 'm5 12.5 4.5 4.5L19 7',
    flecha: 'm9 6 6 6-6 6',
    bus: 'M6 17V6a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v11M6 17h12M6 17v2M18 17v2M6 11h12M9 14h.01M15 14h.01',
    ranking: 'M8 21V11M12 21V5M16 21v-7M4 21h16',
    rango: 'M4 7h16M4 12h10M4 17h6',
    candado: 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z',
    ruta: 'M5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm14-10a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM7 17h7a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h7',
    rayo: 'M13 2 4 14h7l-1 8 9-12h-7l1-8Z',
    info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-5v-5m0-3h.01',
    basura: 'M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3',
    subir: 'm6 15 6-6 6 6',
    bajar: 'm6 9 6 6 6-6',
    abierto: 'M7 11V8a5 5 0 0 1 9.6-2M6 11h12v9H6z',
    borrar: 'M9 6h11v12H9l-6-6 6-6ZM13 10l4 4M17 10l-4 4',
    historial: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2',
    invertir: 'M4 8h13l-3-3M20 16H7l3 3',
  };
</script>

<svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={grosor}
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d={trazos[nombre] ?? ''} />
</svg>
