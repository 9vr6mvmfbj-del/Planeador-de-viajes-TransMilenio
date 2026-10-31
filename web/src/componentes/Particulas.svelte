<script>
  // La fila como partículas. SOLO ILUSTRA: cada punto agrupa varios pasajeros y usa los mismos parámetros
  // que la simulación; las cifras de verdad (espera, buses, % llenos) las calcula el motor (R10), no esto.
  import { onMount } from 'svelte';
  import Numero from './Numero.svelte';
  let { llegadas, duracion, frecuencia, capacidad, pasajeros } = $props();

  let lienzo = $state(/** @type {HTMLCanvasElement | null} */ (null));
  let enFila = $state(0);
  let reloj = $state('05:00');
  const reducido = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SEG = 9; // la hora pico simulada dura ~9 s en pantalla

  // un bus se lleva ~3 puntos, pero nunca más de ~3.000 puntos en pantalla (tope para que 800.000 pasajeros no cueste más)
  let k = $derived(Math.max(1, Math.ceil(pasajeros / 3000), Math.min(Math.ceil(pasajeros / 700), Math.floor(capacidad / 3))));
  let porMinuto = $derived.by(() => { const c = new Float32Array(duracion + 1); for (let i = 0; i < llegadas.length; i++) c[llegadas[i]]++; return c; });

  let sim = null;
  function reiniciar() {
    sim = { t: 0, min: -1, fila: [], vuelo: [], resto: 0, salida: 0, cupoRes: 0 };
    enFila = 0;
  }
  $effect(() => { llegadas; duracion; frecuencia; capacidad; reiniciar(); });

  const FILAS = 22, SEPARA = 6.4;
  let ultimoConteo = 0;
  function color(espera, max) {
    const u = Math.min(1, espera / Math.max(6, max));
    // azul → violeta → rojo según cuánto lleva esperando
    const h = u < 0.5 ? 212 + u * 2 * 68 : 280 + (u - 0.5) * 2 * 80; // azul → violeta → rojo
    return `hsl(${h % 360} 82% ${58 - u * 6}%)`;
  }

  function paso(dt, w, h) {
    sim.t += dt;
    const objetivo = Math.min(duracion + 8, (sim.t / SEG) * duracion);
    while (sim.min < Math.floor(objetivo)) {
      sim.min++;
      const m = sim.min;
      if (m <= duracion) {
        sim.resto += (porMinuto[m] || 0) / k;
        while (sim.resto >= 1) { sim.resto -= 1; sim.fila.push({ x: -6, y: 18 + Math.random() * (h - 36), tx: 0, ty: 0, nace: m, s: 0 }); }
      }
      if (m % frecuencia === 0) {
        sim.cupoRes += capacidad / k;
        let n = Math.floor(sim.cupoRes); sim.cupoRes -= n;
        n = Math.min(n, sim.fila.length);
        const salen = sim.fila.splice(0, n);
        for (const p of salen) { p.sale = true; p.vx = 120 + Math.random() * 90; p.espera = m - p.nace; sim.vuelo.push(p); }
      }
    }
    // posiciones objetivo en la cuadrícula de la fila (orden de llegada: los primeros pegados al bus)
    const base = w * 0.74;
    const cols = Math.max(1, Math.ceil(sim.fila.length / FILAS));
    const sep = Math.min(SEPARA, (base - 14) / cols);
    for (let i = 0; i < sim.fila.length; i++) {
      const p = sim.fila[i];
      const col = Math.floor(i / FILAS), fil = i % FILAS;
      p.tx = base - col * sep;
      p.ty = 14 + fil * ((h - 28) / (FILAS - 1));
    }
    const a = 1 - Math.pow(0.0009, dt);
    for (const p of sim.fila) { p.x += (p.tx - p.x) * a; p.y += (p.ty - p.y) * a; }
    for (let i = sim.vuelo.length - 1; i >= 0; i--) {
      const p = sim.vuelo[i]; p.x += p.vx * dt; p.vx *= 1 + dt * 1.6;
      if (p.x > w + 10) sim.vuelo.splice(i, 1);
    }
    const mm = Math.min(duracion, Math.max(0, sim.min));
    const hh = 5 + Math.floor(mm / 60), mi = mm % 60;
    reloj = String(hh).padStart(2, '0') + ':' + String(mi).padStart(2, '0');
    const ahora = performance.now();
    if (ahora - ultimoConteo > 500) { ultimoConteo = ahora; enFila = Math.round(sim.fila.length * k); }
  }

  function dibujar(g, w, h) {
    g.clearRect(0, 0, w, h);
    // andén y puerta del bus
    const xb = w * 0.74 + 12;
    g.fillStyle = 'rgba(120,120,128,0.14)'; g.fillRect(xb, 8, 3, h - 16);
    const gl = g.createLinearGradient(xb, 0, w, 0); gl.addColorStop(0, 'rgba(227,0,27,0.14)'); gl.addColorStop(1, 'rgba(227,0,27,0)');
    g.fillStyle = gl; g.fillRect(xb, 8, w - xb, h - 16);
    const max = Math.max(8, frecuencia * 6);
    for (const p of sim.fila) {
      g.fillStyle = color(sim.min - p.nace, max);
      g.beginPath(); g.arc(p.x, p.y, 2.5, 0, 6.2832); g.fill();
    }
    for (const p of sim.vuelo) {
      g.globalAlpha = Math.max(0, 1 - (p.x - xb) / (w - xb + 20));
      g.fillStyle = color(p.espera, max);
      g.beginPath(); g.arc(p.x, p.y, 2.8, 0, 6.2832); g.fill();
      // estela
      g.globalAlpha *= 0.35; g.fillRect(p.x - 12, p.y - 1, 12, 2);
    }
    g.globalAlpha = 1;
  }

  onMount(() => {
    const g = lienzo.getContext('2d');
    let w = 0, h = 0, raf = 0, antes = performance.now(), vivo = true;
    const medir = () => {
      const r = lienzo.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1);
      w = r.width; h = r.height; lienzo.width = w * d; lienzo.height = h * d; g.setTransform(d, 0, 0, d, 0, 0);
    };
    medir();
    const ro = new ResizeObserver(medir); ro.observe(lienzo);
    const bucle = (t) => {
      if (!vivo) return;
      const dt = Math.min(0.05, (t - antes) / 1000); antes = t;
      if (!document.hidden) {
        if (reducido) { if (sim.t < SEG * 0.55) paso(SEG * 0.55, w, h); } else paso(dt, w, h);
        dibujar(g, w, h);
      }
      // al terminar la hora pico, vuelve a empezar tras una pausa
      if (!reducido && sim.t > SEG + 3.2) reiniciar();
      raf = requestAnimationFrame(bucle);
    };
    raf = requestAnimationFrame(bucle);
    return () => { vivo = false; cancelAnimationFrame(raf); ro.disconnect(); };
  });
</script>

<div class="cabeza-tarjeta">
  <p class="etiqueta">La fila, en vivo</p>
  <span class="chip num">{reloj}</span>
</div>
<div class="escena">
  <canvas bind:this={lienzo} aria-hidden="true"></canvas>
  <div class="contador"><span class="grande num"><Numero valor={enFila.toLocaleString('es-CO')} /></span><span class="mini tenue">esperando</span></div>
</div>
<p class="mini tenue pie">Ilustración: 1 punto ≈ {k.toLocaleString('es-CO')} pasajeros. Azul: llegó hace poco · rojo: lleva esperando. Las cifras de arriba las calcula el motor.</p>

<style>
  .escena { position: relative; height: 190px; border-radius: 16px; background: color-mix(in srgb, var(--relleno) 70%, transparent); overflow: hidden; }
  canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
  .contador { position: absolute; right: 10px; top: 8px; display: grid; justify-items: end; line-height: 1.15; pointer-events: none; text-align: right; padding: 6px 12px; border-radius: 12px; background: var(--vidrio-fuerte); box-shadow: 0 2px 8px rgba(0,0,0,.08); }
  .grande { font-size: 26px; font-weight: 700; letter-spacing: -0.02em; }
  .pie { margin-top: 10px; }
</style>
