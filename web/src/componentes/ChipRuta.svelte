<script>
  import { colorRuta, tintaSobre } from '../lib/colores.js';
  let { ruta, grande = false } = $props();
  let color = $derived(colorRuta(ruta));
</script>

<span class="ruta" class:grande style="background:{color}; color:{tintaSobre(color)}">{ruta}</span>

<style>
  .ruta {
    display: inline-flex;
    align-items: center;
    height: 24px;
    padding: 0 8px;
    border-radius: 7px;
    font-size: 13px;
    font-weight: 750;
    letter-spacing: 0.01em;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    box-shadow: inset 0 0.5px 0 rgba(255, 255, 255, 0.35);
  }
  .grande { height: 30px; padding: 0 11px; font-size: 15px; border-radius: 9px; }
</style>
