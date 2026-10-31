<script>
  // Control segmentado "líquido": la píldora de vidrio se estira como una gota (el borde que lidera va
  // rápido, el que sigue se arrastra), rebota al llegar y se levanta al tocarla. Dos resortes, uno por borde.
  import { onMount } from 'svelte';
  let { opciones = [], valor = $bindable(), etiqueta = '', onelegir = (/** @type {any} */ _id) => {} } = $props();
  const PAD = 2;
  let raiz = $state(/** @type {HTMLElement | null} */ (null));
  let ancho = 0;
  const L = { v: 0, vel: 0, obj: 0 }, R = { v: 0, vel: 0, obj: 0 }, P = { v: 0, vel: 0, obj: 0 };
  const reducido = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let rL = { r: 0.34, z: reducido ? 1 : 0.7 }, rR = { r: 0.34, z: reducido ? 1 : 0.7 };
  const rP = { r: 0.28, z: reducido ? 1 : 0.6 };

  function paso(s, res, dt) {
    const k = (2 * Math.PI / res.r) ** 2, c = (4 * Math.PI * res.z) / res.r;
    s.vel += (-k * (s.v - s.obj) - c * s.vel) * dt;
    s.v += s.vel * dt;
  }
  const quieto = (s) => Math.abs(s.v - s.obj) < 0.02 && Math.abs(s.vel) < 0.02;
  let cuadro = 0, antes = 0;
  function animar() { if (!cuadro) { antes = performance.now(); cuadro = requestAnimationFrame(bucle); } }
  function bucle(t) {
    const dt = Math.min(0.032, Math.max(0, (t - antes) / 1000)); antes = t;
    for (let i = 0; i < 4; i++) { paso(L, rL, dt / 4); paso(R, rR, dt / 4); paso(P, rP, dt / 4); }
    pintar();
    if (quieto(L) && quieto(R) && quieto(P)) { cuadro = 0; pintar(); } else cuadro = requestAnimationFrame(bucle);
  }
  function pintar() {
    if (!raiz) return;
    const w = Math.max(8, R.v - L.v);
    // estirado: cuanto más larga de lo normal, más fina (conserva el "volumen" de la gota)
    const base = (ancho - PAD * 2) / opciones.length;
    const e = Math.max(0, w / base - 1);
    const p = Math.max(0, Math.min(1.15, P.v));
    const s = raiz.style;
    s.setProperty('--pl', L.v + 'px');
    s.setProperty('--pw', w + 'px');
    s.setProperty('--py', String(1 - Math.min(0.1, e * 0.12) + p * 0.07));
    s.setProperty('--px', String(1 + p * 0.04));
    s.setProperty('--p', String(p));
  }
  let indice = $derived(Math.max(0, opciones.findIndex((o) => o.id === valor)));
  function objetivos(i) { const w = (ancho - PAD * 2) / opciones.length; return [PAD + i * w, PAD + (i + 1) * w]; }
  function medir() {
    if (!raiz) return;
    ancho = raiz.clientWidth; if (!ancho) return;
    const [a, b] = objetivos(indice);
    L.v = L.obj = a; R.v = R.obj = b; L.vel = R.vel = 0; pintar();
  }
  onMount(() => { medir(); const ro = new ResizeObserver(medir); raiz && ro.observe(raiz); return () => { ro.disconnect(); cancelAnimationFrame(cuadro); }; });

  let ultimo = -1;
  $effect(() => {
    const i = indice;
    if (!ancho) return;
    if (ultimo < 0) { ultimo = i; return; }
    const [a, b] = objetivos(i);
    const derecha = i > ultimo; ultimo = i;
    // el borde que lidera es rápido, el que sigue es lento: la píldora se estira y luego se recoge
    rL = derecha ? { r: 0.46, z: 0.78 } : { r: 0.24, z: 0.7 };
    rR = derecha ? { r: 0.24, z: 0.7 } : { r: 0.46, z: 0.78 };
    if (reducido) { rL = rR = { r: 0.2, z: 1 }; }
    L.obj = a; R.obj = b; animar();
  });
  function abajo() { P.obj = 1; animar(); }
  function arriba() { P.obj = 0; animar(); }
  function elegir(id) { valor = id; onelegir(id); }
</script>

<div class="seg vidrio-seg" bind:this={raiz} role="group" aria-label={etiqueta} style="--n:{opciones.length}"
  onpointerdown={abajo} onpointerup={arriba} onpointercancel={arriba} onpointerleave={arriba}>
  <span class="pildora" aria-hidden="true"></span>
  {#each opciones as o}
    <button aria-pressed={valor === o.id} onclick={() => elegir(o.id)}>{o.texto}</button>
  {/each}
</div>

<style>
  .seg {
    --pl: 2px; --pw: 40px; --py: 1; --px: 1; --p: 0;
    display: inline-grid; grid-auto-flow: column; grid-auto-columns: 1fr;
    position: relative; padding: 2px; border-radius: 12px; background: var(--relleno);
  }
  .seg button { position: relative; z-index: 2; white-space: nowrap; min-height: 34px; padding: 0 14px; font-size: 14px; font-weight: 500; border-radius: 10px; transition: color 200ms ease, font-weight 200ms; }
  .seg button[aria-pressed='true'] { font-weight: 650; }
  .pildora {
    position: absolute; z-index: 1; top: 2px; bottom: 2px; left: var(--pl); width: var(--pw);
    border-radius: 10px; pointer-events: none;
    transform: scale(var(--px), var(--py));
    background: linear-gradient(180deg, color-mix(in srgb, var(--vidrio-fuerte) 100%, #fff 10%), var(--vidrio-fuerte));
    box-shadow:
      0 calc(2px + 6px * var(--p)) calc(6px + 12px * var(--p)) rgba(31, 38, 60, calc(0.12 + 0.1 * var(--p))),
      0 0 0 0.5px rgba(0, 0, 0, 0.05),
      inset 0 1px 0 rgba(255, 255, 255, 0.95),
      inset 0 -1px 1px rgba(255, 255, 255, 0.5);
  }
  /* hilo de luz con un toque de dispersión, como el borde de la lente de la barra */
  .pildora::before {
    content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1.2px;
    background: linear-gradient(125deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0) 38%, rgba(255, 255, 255, 0) 62%, rgba(120, 190, 255, 0.55));
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor;
    mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
  }
</style>
