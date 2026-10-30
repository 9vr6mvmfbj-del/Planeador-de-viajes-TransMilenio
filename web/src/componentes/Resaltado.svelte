<script>
  // Muestra un nombre con lo que la persona escribió resaltado: CALLE <b>100</b>
  import { marcar } from '../lib/busqueda.js';
  let { texto, consulta = '', sobreColor = false } = $props();
  let partes = $derived(marcar(texto, consulta));
</script>

{#each partes as p}{#if p.m}<mark class:sobreColor>{p.t}</mark>{:else}{p.t}{/if}{/each}

<style>
  mark {
    background: var(--rojo-suave);
    color: var(--rojo);
    font-weight: 700;
    border-radius: 4px;
    padding: 0 2px;
    margin: 0 -2px;
  }
  /* dentro de un chip de color (rutas): fondo claro y texto heredado */
  mark.sobreColor { background: rgba(255, 255, 255, 0.42); color: inherit; text-decoration: underline; text-underline-offset: 2px; }
</style>
