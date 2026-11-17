<script>
  import { onMount } from 'svelte';
  import { app, iniciar } from './lib/estado.svelte.js';
  import Navegacion from './componentes/Navegacion.svelte';
  import Avisos from './componentes/Avisos.svelte';
  import Intro from './componentes/Intro.svelte';
  import Malla from './componentes/Malla.svelte';
  import { acento } from './lib/acento.svelte.js';
  import Viajar from './vistas/Viajar.svelte';
  import Estaciones from './vistas/Estaciones.svelte';
  import Admin from './vistas/Admin.svelte';
  import Fila from './vistas/Fila.svelte';
  import Rendimiento from './vistas/Rendimiento.svelte';

  onMount(iniciar);

  // Cambio de pestaña con fundido cruzado (como iOS): la vista que sale se desvanece encima mientras la
  // nueva aparece y sube un poco. Solo opacidad y transform: corre en la GPU aunque la vista nueva tarde.
  const reducido = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const curva = (t) => 1 - Math.pow(1 - t, 4); // salida rápida y llegada suave
  function entrar(_n) {
    return { duration: reducido ? 120 : 340, easing: curva, css: (t) => reducido ? `opacity:${t}` : `opacity:${t};transform:translate3d(0,${(1 - t) * 10}px,0) scale(${0.985 + 0.015 * t})` };
  }
  function salir(_n) {
    return { duration: reducido ? 100 : 180, css: (t) => `opacity:${t}` };
  }

  // Mientras se escribe en un campo (teclado abierto) el menú de abajo se esconde: no tapa las sugerencias.
  const escribe = (el) => el instanceof HTMLInputElement && ['text', 'search', 'number', 'time', 'password', 'tel'].includes(el.type);
  function alEnfocar(e) { if (escribe(e.target)) document.body.classList.add('tecleando'); }
  function alDesenfocar() { setTimeout(() => { if (!escribe(document.activeElement)) document.body.classList.remove('tecleando'); }, 60); }

  // Pantalla de entrada: se muestra al abrir la app (el motor carga mientras tanto).
  let intro = $state(true);

  // Al cambiar de pestaña se vuelve arriba, como en una app nativa.
  let anterior = app.vista;
  $effect(() => {
    if (app.vista !== anterior) {
      anterior = app.vista;
      window.scrollTo({ top: 0 });
    }
  });
</script>

<svelte:document onfocusin={alEnfocar} onfocusout={alDesenfocar} />

<Malla acento={acento.color} />

{#if intro}<Intro onentrar={() => (intro = false)} />{/if}

<div class="borde-superior" aria-hidden="true"></div>

<div class="app">
  <Navegacion />

  <main>
    {#if app.error}
      <div class="carga vidrio tarjeta">
        <p class="subtitulo">No se pudo cargar el motor</p>
        <p class="tenue pequeno">{app.error}</p>
      </div>
    {:else if !app.listo}
      <div class="carga" aria-live="polite">
        <div class="anillo" aria-hidden="true"></div>
        <p class="tenue pequeno">Cargando motor_boff y la red…</p>
      </div>
    {:else}
      {#key app.vista}
        <div class="vista" in:entrar out:salir onoutrostart={(e) => e.currentTarget.classList.add('saliendo')}>
          {#if app.vista === 'viajar'}<Viajar />
          {:else if app.vista === 'estaciones'}<Estaciones />
          {:else if app.vista === 'admin'}<Admin />
          {:else if app.vista === 'fila'}<Fila />
          {:else}<Rendimiento />{/if}
        </div>
      {/key}
    {/if}
  </main>

  <Avisos />
</div>

<style>
  .app {
    min-height: 100dvh;
    padding: calc(env(safe-area-inset-top, 0px) + 12px) 16px
      calc(var(--barra-alto) + env(safe-area-inset-bottom, 0px) + 36px);
  }
  main { max-width: 1120px; margin: 0 auto; }

  /* desenfoque bajo la barra de estado: el contenido pasa por debajo sin cortarse en seco */
  .borde-superior {
    position: fixed;
    inset: 0 0 auto 0;
    height: calc(env(safe-area-inset-top, 0px) + 10px);
    z-index: 40;
    pointer-events: none;
    -webkit-backdrop-filter: blur(14px);
    backdrop-filter: blur(14px);
    background: color-mix(in srgb, var(--fondo) 55%, transparent);
    -webkit-mask-image: linear-gradient(#000 60%, transparent);
    mask-image: linear-gradient(#000 60%, transparent);
  }

  main { position: relative; }
  /* la que sale queda encima, quieta, mientras se desvanece */
  .vista:global(.saliendo) { position: absolute; inset: 0 0 auto 0; pointer-events: none; z-index: 1; }

  .carga { min-height: 60dvh; display: grid; place-content: center; justify-items: center; gap: 14px; text-align: center; }
  .anillo {
    width: 28px; height: 28px; border-radius: 50%;
    border: 3px solid var(--relleno-2); border-top-color: var(--rojo);
    animation: girar 600ms linear infinite; /* giro rápido: la carga se siente más corta */
  }
  @keyframes girar { to { transform: rotate(360deg); } }

  @media (min-width: 980px) {
    .app {
      display: grid;
      grid-template-columns: 248px minmax(0, 1fr);
      gap: 28px;
      padding: 24px 28px 40px;
    }
  }
</style>
