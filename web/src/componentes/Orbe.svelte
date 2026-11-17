<script>
  // Orbe digital de carga: una esfera de puntos de luz que gira en 3D, respira y cambia de color con la
  // paleta de TransMilenio, con dos anillos que la orbitan y un núcleo brillante. Se dibuja en un canvas
  // con mezcla aditiva (los puntos que se cruzan suman luz). Solo se usa en esperas poco frecuentes
  // (medir el rendimiento, abrir el Admin), así que puede darse el lujo de ser vistosa.
  import { onMount } from 'svelte';
  let { tam = 200 } = $props();
  let lienzo = $state(/** @type {HTMLCanvasElement | null} */ (null));
  const reducido = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  onMount(() => {
    const g = lienzo.getContext('2d');
    const d = Math.min(2, devicePixelRatio || 1);
    lienzo.width = lienzo.height = Math.round(tam * d);
    g.scale(d, d);
    const N = 340, R = tam * 0.29, c = tam / 2;
    // puntos repartidos parejo sobre la esfera (espiral de Fibonacci)
    const pts = Array.from({ length: N }, (_, i) => {
      const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), a = i * 2.39996323;
      return { x: Math.cos(a) * r, y, z: Math.sin(a) * r, f: (i * 0.618) % 1 };
    });
    const TONOS = [352, 28, 44, 172, 214, 268, 330]; // rojo, naranja, ámbar, turquesa, azul, violeta, magenta
    const tono = (u) => { const p = (((u % 1) + 1) % 1) * TONOS.length, i = Math.floor(p), k = p - i; const a = TONOS[i], b = TONOS[(i + 1) % TONOS.length]; let dif = b - a; if (dif > 180) dif -= 360; if (dif < -180) dif += 360; return a + dif * k; };
    let raf = 0, t0 = performance.now();
    const cuadro = (ahora) => {
      raf = requestAnimationFrame(cuadro);
      const t = ((ahora - t0) / 1000) * (reducido ? 0.15 : 1);
      g.clearRect(0, 0, tam, tam);
      g.globalCompositeOperation = 'lighter';
      // halo que respira
      const pulso = 1 + Math.sin(t * 2.1) * 0.06;
      const halo = g.createRadialGradient(c, c, R * 0.2, c, c, R * 1.7 * pulso);
      halo.addColorStop(0, `hsla(${tono(t * 0.08)} 100% 62% / 0.42)`);
      halo.addColorStop(0.5, `hsla(${tono(t * 0.08 + 0.3)} 100% 55% / 0.14)`);
      halo.addColorStop(1, 'hsla(0 0% 0% / 0)');
      g.fillStyle = halo; g.fillRect(0, 0, tam, tam);
      // esfera: gira en dos ejes y su superficie ondula
      const ay = t * 0.9, ax = Math.sin(t * 0.5) * 0.5 + 0.35;
      const cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
      for (const p of pts) {
        const onda = 1 + 0.085 * Math.sin(p.y * 5 + t * 2.6) + 0.05 * Math.sin(p.x * 7 - t * 1.9);
        let x = p.x * cy + p.z * sy, z = -p.x * sy + p.z * cy, y = p.y;
        const y2 = y * cx - z * sx; z = y * sx + z * cx; y = y2;
        const prof = (z + 1) / 2; // 0 atrás · 1 adelante
        const esc = 0.78 + prof * 0.34;
        const px = c + x * R * onda * pulso * esc, py = c + y * R * onda * pulso * esc;
        g.fillStyle = `hsla(${tono(p.f * 0.35 + t * 0.08 + p.y * 0.12)} 100% ${58 + prof * 22}% / ${0.16 + prof * 0.8})`;
        g.beginPath(); g.arc(px, py, (0.7 + prof * 1.9) * (tam / 200), 0, 6.2832); g.fill();
      }
      // dos anillos de luz que la orbitan, con un cometa cada uno
      for (let k = 0; k < 2; k++) {
        const giro = t * (k ? -1.25 : 0.95) + k * 1.3, incl = k ? -0.55 : 0.5, rr = R * (1.38 + k * 0.2);
        g.save(); g.translate(c, c); g.rotate(incl + Math.sin(t * 0.4 + k) * 0.25); g.scale(1, 0.34);
        g.strokeStyle = `hsla(${tono(t * 0.08 + 0.5 + k * 0.2)} 100% 68% / 0.22)`; g.lineWidth = 1.2;
        g.beginPath(); g.arc(0, 0, rr, 0, 6.2832); g.stroke();
        for (let j = 0; j < 22; j++) {
          const a = giro - j * 0.055;
          g.fillStyle = `hsla(${tono(t * 0.08 + 0.5 + k * 0.2)} 100% 78% / ${(1 - j / 22) * 0.9})`;
          g.beginPath(); g.arc(Math.cos(a) * rr, Math.sin(a) * rr, (3.2 - j * 0.12) * (tam / 200), 0, 6.2832); g.fill();
        }
        g.restore();
      }
      // núcleo
      const nuc = g.createRadialGradient(c, c, 0, c, c, R * 0.62 * pulso);
      nuc.addColorStop(0, 'hsla(0 0% 100% / 0.85)');
      nuc.addColorStop(0.35, `hsla(${tono(t * 0.08 + 0.05)} 100% 66% / 0.5)`);
      nuc.addColorStop(1, 'hsla(0 0% 0% / 0)');
      g.fillStyle = nuc; g.beginPath(); g.arc(c, c, R * 0.62 * pulso, 0, 6.2832); g.fill();
      g.globalCompositeOperation = 'source-over';
    };
    raf = requestAnimationFrame(cuadro);
    return () => cancelAnimationFrame(raf);
  });
</script>

<span class="orbe-caja" style="--tam:{tam}px" role="progressbar" aria-label="Cargando">
  <canvas bind:this={lienzo} aria-hidden="true"></canvas>
</span>

<style>
  .orbe-caja { display: inline-block; width: var(--tam); height: var(--tam); animation: orbe-entra 520ms cubic-bezier(0.23, 1, 0.32, 1) both; }
  canvas { width: 100%; height: 100%; display: block; }
  @keyframes orbe-entra { from { opacity: 0; transform: scale(0.82); } }
  @media (prefers-reduced-motion: reduce) { .orbe-caja { animation: none; } }
</style>
