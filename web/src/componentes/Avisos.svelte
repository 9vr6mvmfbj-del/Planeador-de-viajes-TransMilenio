<script>
  import { avisos } from '../lib/estado.svelte.js';
  import Icono from './Icono.svelte';
</script>

<div class="avisos" aria-live="polite">
  {#each avisos as a (a.id)}
    <div class="aviso vidrio vidrio-flotante" data-tipo={a.tipo}>
      <span class="punto"><Icono nombre={a.tipo === 'error' ? 'cerrar' : 'cheque'} tam={14} grosor={2.6} /></span>
      <span>{a.texto}</span>
    </div>
  {/each}
</div>

<style>
  .avisos {
    position: fixed;
    z-index: 60;
    left: 50%;
    bottom: calc(env(safe-area-inset-bottom, 0px) + var(--barra-alto) + 22px);
    transform: translateX(-50%);
    display: grid;
    gap: 8px;
    width: min(92vw, 420px);
    pointer-events: none;
  }
  .aviso {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    border-radius: 18px;
    font-size: 15px;
    font-weight: 500;
    transition: opacity 300ms ease, transform 300ms var(--salida);
    @starting-style { opacity: 0; transform: translateY(12px) scale(0.97); }
  }
  .punto {
    width: 22px; height: 22px; border-radius: 50%;
    display: grid; place-content: center; flex: none;
    background: var(--verde); color: #fff;
  }
  .aviso[data-tipo='error'] .punto { background: var(--naranja); }
  @media (min-width: 980px) { .avisos { bottom: 28px; left: auto; right: 28px; transform: none; } }
</style>
