<script>
  import { app, vibrar } from '../lib/estado.svelte.js';
  import Icono from './Icono.svelte';

  const pestanas = [
    { id: 'viajar', texto: 'Viajar', icono: 'viajar' },
    { id: 'estaciones', texto: 'Estaciones', icono: 'estaciones' },
    { id: 'operar', texto: 'Operar', icono: 'operar' },
    { id: 'fila', texto: 'Fila', icono: 'fila' },
    { id: 'rendimiento', texto: 'Rendimiento', icono: 'rendimiento' },
  ];
  let indice = $derived(pestanas.findIndex((p) => p.id === app.vista));

  function ir(id) {
    if (app.vista === id) return;
    vibrar();
    app.vista = id;
  }
</script>

<nav class="nav" aria-label="Secciones">
  <!-- escritorio: barra lateral -->
  <div class="lateral vidrio">
    <div class="marca">
      <span class="logo" aria-hidden="true">T</span>
      <div>
        <p class="subtitulo">TransMilenio</p>
        <p class="mini tenue">Planeador · motor_boff</p>
      </div>
    </div>
    <ul>
      {#each pestanas as p}
        <li>
          <button class="item" aria-current={app.vista === p.id ? 'page' : undefined} onclick={() => ir(p.id)}>
            <Icono nombre={p.icono} />
            <span>{p.texto}</span>
          </button>
        </li>
      {/each}
    </ul>
    {#if app.listo}
      <div class="datos mini tenue num">
        <span>{app.resumen.abiertas}/{app.resumen.estaciones} estaciones abiertas</span>
        <span>{app.resumen.rutas} rutas · {app.resumen.horarios.toLocaleString('es-CO')} horarios</span>
      </div>
    {/if}
  </div>

  <!-- celular: barra de pestañas flotante (estilo iOS 26) -->
  <div class="barra vidrio vidrio-flotante vidrio-nativo" style="--i:{indice}; --n:{pestanas.length}">
    <span class="lente" aria-hidden="true"></span>
    {#each pestanas as p}
      <button class="pestana" aria-current={app.vista === p.id ? 'page' : undefined} onclick={() => ir(p.id)}>
        <Icono nombre={p.icono} tam={24} />
        <span>{p.texto}</span>
      </button>
    {/each}
  </div>
</nav>

<style>
  .lateral { display: none; }

  .barra {
    position: fixed;
    z-index: 50;
    left: 12px;
    right: 12px;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 10px);
    height: var(--barra-alto);
    border-radius: 999px;
    display: grid;
    grid-template-columns: repeat(var(--n), 1fr);
    padding: 4px;
    max-width: 520px;
    margin: 0 auto;
  }
  /* la "lente" que marca la pestaña activa se desliza (transform, se puede interrumpir) */
  .lente {
    position: absolute;
    top: 4px;
    bottom: 4px;
    left: 4px;
    width: calc((100% - 8px) / var(--n));
    border-radius: 999px;
    background: var(--relleno);
    box-shadow: inset 0 0.5px 0 var(--vidrio-brillo);
    transform: translateX(calc(var(--i) * 100%));
    transition: transform 380ms var(--cajon);
  }
  .pestana {
    position: relative;
    z-index: 1;
    display: grid;
    justify-items: center;
    align-content: center;
    gap: 2px;
    color: var(--tenue);
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.01em;
    border-radius: 999px;
    transition: color 160ms ease, transform 160ms var(--salida);
  }
  .pestana:active { transform: scale(0.94); }
  .pestana[aria-current='page'] { color: var(--rojo); }

  @media (min-width: 980px) {
    .barra { display: none; }
    .lateral {
      display: flex;
      flex-direction: column;
      gap: 22px;
      position: sticky;
      top: 24px;
      height: calc(100dvh - 48px);
      border-radius: 26px;
      padding: 20px 14px;
    }
    .marca { display: flex; align-items: center; gap: 12px; padding: 4px 8px; }
    .logo {
      width: 40px; height: 40px; border-radius: 12px;
      display: grid; place-content: center;
      background: var(--rojo); color: #fff; font-weight: 800; font-size: 20px;
      box-shadow: 0 6px 16px rgba(227, 0, 27, 0.35);
    }
    ul { list-style: none; display: grid; gap: 4px; }
    .item {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 11px 12px;
      border-radius: 12px;
      font-weight: 500;
      color: var(--tinta-2);
      transition: background-color 160ms ease, transform 160ms var(--salida);
    }
    .item:active { transform: scale(0.98); }
    .item[aria-current='page'] { background: var(--rojo-suave); color: var(--rojo); font-weight: 600; }
    .datos { margin-top: auto; display: grid; gap: 4px; padding: 0 10px; }
  }
  @media (min-width: 980px) and (hover: hover) and (pointer: fine) {
    .item:hover:not([aria-current='page']) { background: var(--relleno); }
  }
</style>
