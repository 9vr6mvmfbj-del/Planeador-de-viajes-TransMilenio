import test from 'node:test';
import assert from 'node:assert/strict';
import { RedTransMilenio } from './red';
import { simularFila } from './fila';

test('R1, R2, R3: Consultar estaciones (estado, autocompletar, rango)', () => {
  const red = new RedTransMilenio();
  assert.equal(red.estado('PORTAL NORTE'), 'ABIERTA');
  assert.equal(red.estado('ESTACION FANTASMA'), 'NO EXISTE');

  const sugerencias = red.autocompletar('PORTAL', 5);
  assert.equal(sugerencias.length, 5);
  assert.equal(sugerencias[0], 'PORTAL 20 DE JULIO');

  const enRango = red.rango('CALLE 22', 'CALLE 57');
  assert.ok(enRango.includes('CALLE 26'));
  assert.ok(enRango.includes('CALLE 45'));
});

test('R4, R5, R6: Viajar (proximo_bus, viaje directo y transbordo, ranking)', () => {
  const red = new RedTransMilenio();
  const sigBus = red.proximoBus('HEROES', 'B12', '07:15');
  assert.ok(sigBus !== null);
  assert.ok(sigBus >= '07:15');

  // Viaje directo B12 (PORTAL AMERICAS -> RICAURTE en 4 paradas)
  const planDirecto = red.viaje('PORTAL AMERICAS', 'RICAURTE');
  assert.ok(planDirecto !== null);
  assert.equal(planDirecto.tipo, 'DIRECTO');
  assert.equal(planDirecto.rutas[0], 'B12');
  assert.equal(planDirecto.totalParadas, 4);


  // Viaje con 1 transbordo (PORTAL SUBA -> PORTAL SUR)
  const planTransbordo = red.viaje('PORTAL SUBA', 'PORTAL SUR');
  assert.ok(planTransbordo !== null);
  assert.equal(planTransbordo.tipo, 'TRANSBORDO');
  assert.equal(planTransbordo.transbordo, 'RICAURTE');

  // Ranking Top 5
  const top5 = red.ranking(5);
  assert.equal(top5.length, 5);
  assert.ok(top5[0].busesDia >= top5[1].busesDia);
});

test('R7, R8, R9: Operar la red (editar rutas, cerrar/reabrir, deshacer/rehacer)', () => {
  const red = new RedTransMilenio();

  // Cerrar RICAURTE y verificar que desaparece de autocompletar y cambia estado a CERRADA
  assert.equal(red.cerrar('RICAURTE'), true);
  assert.equal(red.estado('RICAURTE'), 'CERRADA');
  assert.ok(!red.autocompletar('RIC', 5).includes('RICAURTE'));

  // Deshacer cierre -> RICAURTE vuelve a estar ABIERTA
  red.deshacer();
  assert.equal(red.estado('RICAURTE'), 'ABIERTA');

  // Rehacer cierre -> RICAURTE vuelve a estar CERRADA
  red.rehacer();
  assert.equal(red.estado('RICAURTE'), 'CERRADA');
  red.deshacer();

  // R7: Agregar y quitar parada en B12
  const original = red.recorrido('B12', false);
  assert.equal(red.agregarParada('B12', 'CALLE 76', 'HEROES'), true);
  const actualizado = red.recorrido('B12', false);
  assert.equal(actualizado.length, original.length + 1);

  const invertido = red.recorrido('B12', true);
  assert.equal(invertido[0], actualizado[actualizado.length - 1]);

  red.deshacer();
  assert.equal(red.recorrido('B12', false).length, original.length);
});

test('R10: Simulador de fila de abordaje FIFO en hora pico', () => {
  const res = simularFila([40, 35, 50, 30, 45, 25], 2, 80);
  assert.equal(res.totalLlegadas, 225);
  assert.ok(res.totalAbordados > 0);
  assert.equal(res.totalAbordados + res.enEsperaFinal, 225);
});
