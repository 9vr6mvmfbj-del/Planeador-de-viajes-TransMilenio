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
  import Operar from './vistas/Operar.svelte';
  import Fila from './vistas/Fila.svelte';
  import Rendimiento from './vistas/Rendimiento.svelte';

  onMount(iniciar);

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
        <div class="vista">
          {#if app.vista === 'viajar'}<Viajar />
          {:else if app.vista === 'estaciones'}<Estaciones />
          {:else if app.vista === 'operar'}<Operar />
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

  .vista { animation: entrar 260ms var(--salida) both; }
  @keyframes entrar { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

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
