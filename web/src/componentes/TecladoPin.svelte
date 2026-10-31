<script>
  // Hoja con teclado de PIN (estilo iOS). Se abre para cada cambio del admin.
  // 'accion(pin)' hace el cambio y devuelve { ok, pin?: false, error? }:
  //   ok → se cierra · pin === false → tiembla y se borra · otro error → se muestra aquí.
  import { onMount } from 'svelte';
  import Icono from './Icono.svelte';
  import { vibrar } from '../lib/estado.svelte.js';

  let {
    titulo = 'Confirma con el PIN',
    detalle = '',
    peligro = false,
    accion = async (/** @type {string} */ _pin) => ({ ok: true }),
    oncerrar = () => {},
  } = $props();

  let pin = $state('');
  let ocupado = $state(false);
  let error = $state('');
  let tiembla = $state(false);
  /** @type {HTMLDivElement | undefined} */
  let hoja = $state();

  async function tecla(d) {
    if (ocupado || pin.length >= 4) return;
    error = '';
    pin += d;
    vibrar(5);
    if (pin.length === 4) await enviar();
  }
  function borrar() { if (!ocupado) pin = pin.slice(0, -1); }

  async function enviar() {
    ocupado = true;
    let r;
    try { r = await accion(pin); } catch (e) { r = { ok: false, error: String(e) }; }
    ocupado = false;
    if (r.ok) { oncerrar(); return; }
    if (r.pin === false) {
      tiembla = true;
      vibrar(30);
      setTimeout(() => { tiembla = false; pin = ''; }, 420);
      error = 'PIN incorrecto';
    } else {
      pin = '';
      error = r.error || 'No se pudo hacer el cambio';
    }
  }

  function teclado(e) {
    if (/^\d$/.test(e.key)) { e.preventDefault(); tecla(e.key); }
    else if (e.key === 'Backspace') { e.preventDefault(); borrar(); }
    else if (e.key === 'Escape') { e.preventDefault(); oncerrar(); }
  }
  onMount(() => { hoja?.focus(); });

  // La hoja se monta directo en <body>: dentro de la vista (que tiene animación) 'position: fixed'
  // quedaría atrapada en esa capa, detrás de la barra inferior.
  function alCuerpo(nodo) {
    document.body.appendChild(nodo);
    return { destroy() { nodo.remove(); } };
  }
</script>

<svelte:window onkeydown={teclado} />

<div class="capa-pin" use:alCuerpo>
<div class="fondo" role="presentation" onclick={() => !ocupado && oncerrar()}></div>
<div class="hoja vidrio vidrio-flotante" role="dialog" aria-modal="true" aria-labelledby="pin-titulo" tabindex="-1" bind:this={hoja}>
  <span class="agarre" aria-hidden="true"></span>
  <span class="candado" class:peligro aria-hidden="true"><Icono nombre={peligro ? 'basura' : 'candado'} tam={22} /></span>
  <h2 id="pin-titulo" class="subtitulo">{titulo}</h2>
  {#if detalle}<p class="pequeno tenue detalle">{detalle}</p>{/if}

  <div class="puntos" class:tiembla aria-live="polite" aria-label="{pin.length} de 4 dígitos">
    {#each [0, 1, 2, 3] as i}<span class:lleno={i < pin.length}></span>{/each}
  </div>
  <p class="mensaje pequeno" class:error={!!error}>{ocupado ? 'Verificando…' : error || 'Escribe el PIN de administrador'}</p>

  <div class="teclas">
    {#each ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as d}
      <button class="tecla num" onclick={() => tecla(d)} disabled={ocupado}>{d}</button>
    {/each}
    <button class="tecla texto" onclick={oncerrar} disabled={ocupado}>Cancelar</button>
    <button class="tecla num" onclick={() => tecla('0')} disabled={ocupado}>0</button>
    <button class="tecla texto" onclick={borrar} disabled={ocupado || !pin} aria-label="Borrar"><Icono nombre="borrar" tam={24} /></button>
  </div>
</div>
</div>

<style>
  .capa-pin { position: fixed; inset: 0; z-index: 80; }
  .fondo {
    position: fixed; inset: 0; z-index: 80;
    background: rgba(0, 0, 0, 0.32);
    animation: aparecer 200ms ease both;
  }
  .hoja {
    position: fixed; z-index: 81;
    left: 0; right: 0; bottom: 0;
    margin: 0 auto;
    max-width: 420px;
    border-radius: 28px 28px 0 0;
    padding: 10px 22px calc(env(safe-area-inset-bottom, 0px) + 18px);
    display: grid; justify-items: center; gap: 8px;
    background: var(--vidrio-fuerte);
    outline: none;
    animation: subir 340ms cubic-bezier(0.32, 0.72, 0, 1) both;
  }
  .agarre { width: 36px; height: 5px; border-radius: 3px; background: var(--relleno-2); margin-bottom: 6px; }
  .candado { width: 46px; height: 46px; border-radius: 50%; display: grid; place-content: center; background: var(--relleno); color: var(--tinta); }
  .candado.peligro { background: var(--rojo-suave); color: var(--rojo); }
  h2 { text-align: center; margin-top: 2px; }
  .detalle { text-align: center; max-width: 34ch; }
  .puntos { display: flex; gap: 18px; margin: 14px 0 2px; }
  .puntos span { width: 14px; height: 14px; border-radius: 50%; border: 1.5px solid var(--tinta); transition: background-color 120ms ease, transform 160ms var(--salida); }
  .puntos span.lleno { background: var(--tinta); transform: scale(1.06); }
  .tiembla { animation: temblar 380ms cubic-bezier(0.36, 0.07, 0.19, 0.97) both; }
  .mensaje { min-height: 20px; color: var(--tenue); }
  .mensaje.error { color: var(--rojo); font-weight: 600; }
  .teclas { display: grid; grid-template-columns: repeat(3, 78px); gap: 12px 22px; margin-top: 6px; }
  .tecla {
    width: 78px; height: 78px; border-radius: 50%;
    font-size: 30px; font-weight: 400;
    background: var(--relleno);
    color: var(--tinta);
    display: grid; place-content: center;
    transition: background-color 120ms ease, transform 120ms var(--salida);
    -webkit-tap-highlight-color: transparent;
  }
  .tecla:active:not(:disabled) { background: var(--relleno-2); transform: scale(0.94); }
  .tecla.texto { background: transparent; font-size: 16px; font-weight: 500; }
  .tecla:disabled { opacity: 0.45; }
  @media (max-height: 700px) { .teclas { grid-template-columns: repeat(3, 66px); gap: 8px 22px; } .tecla { width: 66px; height: 66px; font-size: 26px; } }
  @media (min-width: 980px) {
    .hoja { bottom: auto; top: 50%; border-radius: 28px; padding-bottom: 22px; animation-name: entrarCentro; transform: translateY(-50%); }
  }
  @keyframes aparecer { from { opacity: 0; } }
  @keyframes subir { from { transform: translateY(100%); } }
  @keyframes entrarCentro { from { opacity: 0; transform: translateY(-46%) scale(0.97); } to { opacity: 1; transform: translateY(-50%); } }
  @keyframes temblar { 10%, 90% { transform: translateX(-2px); } 20%, 80% { transform: translateX(5px); } 30%, 50%, 70% { transform: translateX(-9px); } 40%, 60% { transform: translateX(9px); } }
  @media (prefers-reduced-motion: reduce) { .hoja, .fondo { animation: none; } .tiembla { animation: none; } }
</style>
