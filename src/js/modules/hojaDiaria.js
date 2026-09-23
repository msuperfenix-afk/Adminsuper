/**
 * Módulo de la Hoja Contable Diaria Minisúper Fénix
 * Réplica digital interactiva del formato físico en papel
 */

import { stateManager, NOMBRES_DIAS, NOMBRES_MESES } from '../state.js';
import { isFirebaseConectado, getFirebaseConfigActual } from '../firebaseClient.js';

export class HojaDiariaModule {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.init();
  }

  init() {
    this.render();
    this.setupEventListeners();
  }

  formatMoney(val) {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val || 0);
  }

  render() {
    if (!this.container) return;
    const d = stateManager.data;
    const totales = stateManager.getTotalesHoja();
    const conectadoFirebase = isFirebaseConectado();
    const configFirebase = getFirebaseConfigActual();
    const hoyISO = stateManager.getFechaHoy();
    const esHoy = stateManager.esHojaEditable();
    const tieneMontoInicial = stateManager.tieneCantidadInicial();
    const editableGeneral = esHoy && tieneMontoInicial;

    // Obtener los días de la semana actual (Lunes a Domingo) para la barra rápida
    const hoy = new Date(d.fecha ? d.fecha + 'T12:00:00' : Date.now());
    const diaSemanaIndex = hoy.getDay(); // 0 es Domingo, 1 es Lunes...
    // Calcular lunes de esta semana
    const diffAlLunes = (diaSemanaIndex === 0 ? -6 : 1) - diaSemanaIndex;
    const lunesSemana = new Date(hoy);
    lunesSemana.setDate(hoy.getDate() + diffAlLunes);

    const diasSemanaBarra = [];
    const letrasCortas = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
    for (let i = 0; i < 7; i++) {
      const fechaDia = new Date(lunesSemana);
      fechaDia.setDate(lunesSemana.getDate() + i);
      const isoStr = fechaDia.toISOString().split('T')[0];
      diasSemanaBarra.push({
        iso: isoStr,
        corto: letrasCortas[i],
        numero: fechaDia.getDate(),
        activo: isoStr === d.fecha,
        esHoy: isoStr === hoyISO
      });
    }

    let html = `
      <div class="hoja-papel-container">
        
        <!-- BARRA RÁPIDA DE DÍAS (LUNES A DOMINGO), CALENDARIO DE HISTORIAL Y FECHA -->
        <div class="barra-navegacion-dias">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span style="font-size: 0.74rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.3px;">Día:</span>
            <div style="display: flex; gap: 4px;">
              ${diasSemanaBarra.map(dia => `
                <button class="btn-dia-selector ${dia.activo ? 'activo' : ''} ${dia.esHoy ? 'es-dia-hoy' : ''}" data-fecha-iso="${dia.iso}" title="${dia.esHoy ? 'HOY (Editable)' : `Cargar hoja del ${dia.corto} ${dia.numero}`}">
                  <strong>${dia.corto}</strong>
                  <span>${dia.numero}</span>
                  ${dia.esHoy ? '<span class="punto-hoy-badge">•</span>' : ''}
                </button>
              `).join('')}
            </div>

            <!-- Botón Formal con Solo el Logo de Calendario -->
            <button class="btn-abrir-calendario-icono" id="btnAbrirCalendarioHistorial" title="Calendario e Historial Contable">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
                <circle cx="8" cy="14" r="1.1" fill="currentColor"></circle>
                <circle cx="12" cy="14" r="1.1" fill="currentColor"></circle>
                <circle cx="16" cy="14" r="1.1" fill="currentColor"></circle>
                <circle cx="8" cy="18" r="1.1" fill="currentColor"></circle>
                <circle cx="12" cy="18" r="1.1" fill="currentColor"></circle>
                <circle cx="16" cy="18" r="1.1" fill="currentColor"></circle>
              </svg>
            </button>
          </div>

          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 0.74rem; color: #64748b; font-weight: 700;">Fecha:</span>
              <input type="date" class="input-fecha-picker" id="inputFechaSelector" value="${d.fecha || ''}">
            </div>

            <!-- Botón de Conexión a Firebase -->
            <button class="btn-firebase-badge ${conectadoFirebase ? 'conectado' : 'desconectado'}" id="btnFirebaseConfig" title="Configurar conexión con Firebase Firestore">
              ${conectadoFirebase ? `🟢 Firebase: ${configFirebase.projectId || 'conectado'}` : '🔥 Conectar Firebase'}
            </button>
          </div>
        </div>

        ${!esHoy ? `
          <!-- BANNER DE AVISO: MODO HISTORIAL (SOLO LECTURA) -->
          <div class="banner-aviso-historial">
            <div class="banner-aviso-contenido">
              <span class="icono-candado-aviso">🔒</span>
              <div>
                <div class="banner-titulo-historial">MODO HISTORIAL • CONSULTA DE DÍA PASADO</div>
                <div class="banner-sub-historial">
                  Estás revisando la hoja histórica del <strong>${d.dia || ''} ${d.diaNum || ''} de ${d.mes || ''} de ${d.ano || ''}</strong>.
                  Por integridad contable, solo se permite editar la hoja del <strong>día de hoy (${hoyISO})</strong>.
                  <em>(La sección de Corte y Arqueo se mantiene siempre desbloqueada para conteos físicos).</em>
                </div>
              </div>
            </div>
            <button type="button" class="btn-regresar-hoy" id="btnIrAHoy" title="Volver a la hoja editable del día de hoy">
              📅 Ir a Hoja de Hoy (${hoyISO})
            </button>
          </div>
        ` : (!tieneMontoInicial ? `
          <!-- BANNER DE AVISO: FALTA MONTO INICIAL -->
          <div class="banner-aviso-monto-inicial">
            <div class="banner-aviso-contenido">
              <span class="icono-alerta-inicial">⚠️</span>
              <div>
                <div class="banner-titulo-inicial">PASO REQUERIDO: INGRESA LA CANTIDAD INICIAL DE CAJA</div>
                <div class="banner-sub-inicial">
                  Para comenzar a registrar proveedores, préstamos, retiros y conteos del día, ingresa el monto en el campo <strong>CANTIDAD INICIAL</strong>.
                  <em>(La sección de Corte y Arqueo está siempre disponible).</em>
                </div>
              </div>
            </div>
          </div>
        ` : '')}

        <!-- ENCABEZADO DE LA HOJA (Idéntico al membrete físico) -->
        <header class="hoja-header">
          <div class="hoja-header-brand">
            <img src="./logo-fenix.png" alt="Logo Fénix" class="hoja-logo-img">
            <div>
              <h1 class="hoja-titulo-principal">MINISUPER FENIX</h1>
              <span class="hoja-subtitulo">CONTROL DIARIO DE COMPRAS, PROVEEDORES Y ARQUEOS</span>
            </div>
          </div>

          <div class="hoja-header-datos">
            <div class="hoja-campo-linea">
              <span class="header-dato-label">DIA:</span>
              <span class="hoja-texto-fijo-dia" id="displayDia">${(d.dia || 'LUNES').toUpperCase()}</span>
            </div>

            <div class="hoja-campo-fecha">
              <span class="header-dato-label">FECHA:</span>
              <span class="hoja-texto-fijo-fecha" id="displayFecha">${d.diaNum || ''} / ${d.mes || ''} / ${d.ano || ''}</span>
            </div>

            <div class="hoja-campo-inicial">
              <label>CANTIDAD INICIAL:</label>
              <div class="input-money-wrap">
                <span>$</span>
                <input type="number" step="10" min="0" class="hoja-input-money ${esHoy && !tieneMontoInicial ? 'alerta-falta-inicial' : ''}" id="inputCantidadInicial" value="${d.cantidadInicial || ''}" placeholder="0.00" ${esHoy ? '' : 'disabled'}>
              </div>
            </div>

            <div class="hoja-header-actions">
              <button class="btn-fenix-print" id="btnImprimirHoja">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                <span>Imprimir Hoja</span>
              </button>
            </div>
          </div>
        </header>

        <!-- CUERPO PRINCIPAL EN 2 COLUMNAS (COMPRAS/PROVEEDORES Y CAJA/ARQUEO) -->
        <div class="hoja-grid-layout">

          <!-- COLUMNA IZQUIERDA: COMPRAS Y PROVEEDORES -->
          <div class="hoja-col-izquierda">
            <div class="hoja-seccion-header">COMPRAS Y PROVEEDORES</div>

            <!-- 1. CONTEO PAN Y TORTILLA -->
            <div class="hoja-subcuadro">
              <div class="subcuadro-titulo-flex">
                <span>CONTEO PAN Y TORTILLA</span>
                <span class="badge-hint-click-info" title="Haz clic en cualquier renglón o en el botón de info para capturar cantidades y precio">💡 Clic en renglón o (i) para capturar</span>
              </div>
              
              <div class="tabla-responsive-wrap">
                <!-- Panaderos -->
                <table class="hoja-tabla-conteo">
                  <thead>
                    <tr>
                      <th>PROVEEDOR PAN</th>
                      <th style="width: 44px;" title="Bolillos recibidos">BOL</th>
                      <th style="width: 44px;" title="Dulces recibidos">DUL</th>
                      <th style="width: 48px;" title="Cambios o devoluciones">CAMB</th>
                      <th style="width: 52px;" title="Total Piezas (Bolillos + Dulces - Cambios)">TOTAL</th>
                      <th style="width: 78px;" title="Costo calculado (Piezas × Precio por pieza)">COSTO</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${d.conteoPan.map((p, idx) => {
                      const bolVal = (parseFloat(p.bol) || 0) > 0 ? p.bol : '';
                      const dulVal = (parseFloat(p.dul) || 0) > 0 ? p.dul : '';
                      const cambVal = (parseFloat(p.camb) || 0) > 0 ? p.camb : '';
                      const totVal = (parseFloat(p.total) || 0) > 0 ? p.total : '';
                      const costoVal = (parseFloat(p.costo) || 0) > 0 
                        ? this.formatMoney(p.costo) 
                        : ((parseFloat(p.precioPieza) || 0) > 0 ? '$0.00' : '-');
                      return `
                        <tr class="fila-conteo-clickeable ${editableGeneral ? 'fila-activa' : ''}" data-fila-pan="${idx}" title="${editableGeneral ? 'Clic para registrar bolillos, dulces, cambios y precio' : 'Consulta de conteo de pan'}">
                          <td>
                            <div class="prov-celda-fija">
                              <span class="prov-nombre-fijo">${p.proveedor}</span>
                              <button type="button" class="btn-info-costo" data-info-pan="${idx}" title="Abrir recuadro de captura y precio">
                                <span class="icono-i-circulo">i</span>
                              </button>
                            </div>
                          </td>
                          <td class="text-center font-bold celda-conteo-val">${bolVal || '-'}</td>
                          <td class="text-center font-bold celda-conteo-val">${dulVal || '-'}</td>
                          <td class="text-center font-bold celda-conteo-val text-red">${cambVal || '-'}</td>
                          <td class="cell-total font-bold text-center">${totVal || '-'}</td>
                          <td class="cell-costo font-bold text-right">${costoVal}</td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>

              <div class="divider-subcuadro"></div>

              <div class="tabla-responsive-wrap">
                <!-- Tortillerías -->
                <table class="hoja-tabla-conteo">
                  <thead>
                    <tr>
                      <th>PROVEEDOR TORTILLA</th>
                      <th style="width: 58px;" title="Cambios o merma">CAMB</th>
                      <th style="width: 58px;" title="Kilos nuevos recibidos">NUEV</th>
                      <th style="width: 58px;" title="Total Kilos a pagar (Nuevas - Cambios)">TOTAL</th>
                      <th style="width: 78px;" title="Costo calculado (Kilos × Precio por kilo)">COSTO</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${d.conteoTortilla.map((t, idx) => {
                      const cambVal = (parseFloat(t.camb) || 0) > 0 ? t.camb : '';
                      const nuevVal = (parseFloat(t.nuev) || 0) > 0 ? t.nuev : '';
                      const totVal = (parseFloat(t.total) || 0) > 0 ? t.total : '';
                      const costoVal = (parseFloat(t.costo) || 0) > 0 
                        ? this.formatMoney(t.costo) 
                        : ((parseFloat(t.precioKilo) || 0) > 0 ? '$0.00' : '-');
                      return `
                        <tr class="fila-conteo-clickeable ${editableGeneral ? 'fila-activa' : ''}" data-fila-tort="${idx}" title="${editableGeneral ? 'Clic para registrar nuevas, cambios y precio' : 'Consulta de conteo de tortilla'}">
                          <td>
                            <div class="prov-celda-fija">
                              <span class="prov-nombre-fijo">${t.proveedor}</span>
                              <button type="button" class="btn-info-costo" data-info-tort="${idx}" title="Abrir recuadro de captura y precio">
                                <span class="icono-i-circulo">i</span>
                              </button>
                            </div>
                          </td>
                          <td class="text-center font-bold celda-conteo-val text-red">${cambVal || '-'}</td>
                          <td class="text-center font-bold celda-conteo-val">${nuevVal || '-'}</td>
                          <td class="cell-total font-bold text-center">${totVal || '-'}</td>
                          <td class="cell-costo font-bold text-right">${costoVal}</td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 2. TABLA DE COMPRAS / PROVEEDORES (Con scroll y botón + en último renglón) -->
            <div class="hoja-subcuadro" style="margin-top: 14px;">
              <div class="subcuadro-titulo-flex">
                <span>RELACIÓN DE PROVEEDORES PAGADOS</span>
                <div class="badge-desglose-pagos">
                  <span class="badge-item-pago" title="Total pagado en efectivo">💵 Efec: <strong>${this.formatMoney(totales.totalEfectivoProveedores)}</strong></span>
                  <span class="badge-item-pago" title="Total pagado por transferencia">🏦 Transf: <strong>${this.formatMoney(totales.totalTransferenciaProveedores)}</strong></span>
                  <span class="badge-total-pagado">Total: ${this.formatMoney(totales.totalPagadoProveedores)}</span>
                </div>
              </div>

              <div class="tabla-scroll-proveedores">
                <table class="hoja-tabla-proveedores">
                  <thead>
                    <tr>
                      <th style="width: 38px; text-align: center;">NOTA</th>
                      <th>PROVEEDOR</th>
                      <th style="width: 44px; text-align: center;" title="Tipo de Pago: Efectivo o Transferencia">PAGO</th>
                      <th style="width: 120px; text-align: right;">PAGADO ($)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${(() => {
                      const comprasReg = (d.comprasProveedores || []).filter(r => (r.proveedor && r.proveedor.trim() !== '') || (parseFloat(r.pagado) > 0));
                      if (comprasReg.length === 0) {
                        return `
                          <tr class="fila-sin-registros">
                            <td colspan="4" class="texto-sin-registros">
                              Sin proveedores registrados. Pulsa el botón <strong>+</strong> para añadir el primer registro.
                            </td>
                          </tr>
                        `;
                      }
                      return comprasReg.map((row, idx) => `
                        <tr class="fila-bloqueada ${row.pagado > 0 ? 'fila-con-pago' : ''}" 
                          data-ver-detalle-prov="${idx}" 
                          style="cursor: pointer;" 
                          title="Clic para ver hora de registro (⏰ ${row.hora || 'Registrado'}) y detalles">
                          <td class="text-center font-bold" style="color: #64748b;">${idx + 1}</td>
                          <td class="celda-bloqueada-prov">
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                              <span class="prov-texto-fijo font-bold">${row.proveedor}</span>
                              <span class="badge-hora-hint" title="Hora de registro: ${row.hora || 'Guardada'}">ℹ️</span>
                            </div>
                          </td>
                          <td style="text-align: center; padding: 2px;">
                            <span class="btn-logo-pago ${(row.tipoPago || 'Efectivo') === 'Transferencia' ? 'es-transf' : 'es-efec'}" 
                              style="cursor: pointer;" 
                              title="${(row.tipoPago || 'Efectivo') === 'Transferencia' ? 'Transferencia Bancaria' : 'Efectivo de Caja'} (Clic para detalles)">
                              ${(row.tipoPago || 'Efectivo') === 'Transferencia' ? '🏦' : '💵'}
                            </span>
                          </td>
                          <td style="text-align: right;">
                            <span class="font-bold" style="font-size: 0.84rem; padding-right: 4px; color: #0f172a;">
                              ${this.formatMoney(row.pagado)}
                            </span>
                          </td>
                        </tr>
                      `).join('');
                    })()}

                    ${esHoy ? `
                      <!-- ÚLTIMO RENGLÓN CON SOLO EL SIGNO + -->
                      <tr class="fila-agregar-mas">
                        <td colspan="4" class="celda-agregar-mas">
                          <button type="button" class="btn-solo-plus" id="btnPlusProveedor" ${editableGeneral ? '' : 'disabled'} title="${editableGeneral ? 'Registrar proveedor (+)' : 'Ingresa primero la cantidad inicial de caja'}">+</button>
                        </td>
                      </tr>
                    ` : ''}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          <!-- COLUMNA DERECHA: CAJA, ARQUEO, RETIROS Y MÁQUINAS -->
          <div class="hoja-col-derecha">

            <!-- 1. PRESTAMOS O PENDIENTES DE PAGO (Con scroll y botón + en último renglón) -->
            <div class="hoja-subcuadro">
              <div class="subcuadro-titulo-flex">
                <span>PRESTAMOS O PENDIENTES DE PAGO</span>
                <span style="font-weight: 700; color: #b91c1c; font-size: 0.78rem;">Total: ${this.formatMoney(totales.totalPendientes)}</span>
              </div>
              <div class="tabla-scroll-pendientes">
                <table class="hoja-tabla-pendientes">
                  <thead>
                    <tr>
                      <th style="width: 48px; text-align: center;" title="Casilla de Pagado: marca como pagado y tacha/subraya">PAGADO</th>
                      <th>PROVEEDOR / CONCEPTO</th>
                      <th style="width: 115px; text-al                  <tbody>
                    ${(() => {
                      const prestamosReg = (d.prestamosPendientes || []).filter(p => (p.proveedor && p.proveedor.trim() !== '') || (parseFloat(p.pendiente) > 0));
                      if (prestamosReg.length === 0) {
                        return `
                          <tr class="fila-sin-registros">
                            <td colspan="3" class="texto-sin-registros">
                              Sin préstamos o pendientes registrados.
                            </td>
                          </tr>
                        `;
                      }
                      return prestamosReg.map((pres, idx) => `
                        <tr class="fila-bloqueada ${pres.liquidado ? 'prestamo-liquidado' : ''}">
                          <td style="text-align: center; vertical-align: middle; padding: 2px;">
                            <input type="checkbox" 
                              class="check-prestamo-pagado" 
                              data-check-liquidado="${idx}" 
                              ${pres.liquidado ? 'checked' : ''} 
                              ${editableGeneral ? '' : 'disabled'}
                              title="${pres.liquidado ? 'Pagado (Clic para desmarcar)' : 'Pendiente (Clic para marcar como pagado)'}">
                          </td>
                          <td>
                            <div class="prestamo-desc">
                              <strong class="prestamo-prov">${pres.proveedor}</strong>
                              ${pres.nota ? `<span class="prestamo-nota">${pres.nota}</span>` : ''}
                            </div>
                          </td>
                          <td class="text-right font-bold ${pres.liquidado ? 'prestamo-monto-liquidado' : ''}" style="color: #0f172a;">
                            ${this.formatMoney(pres.pendiente)}
                          </td>
                        </tr>
                      `).join('');
                    })()}

                    ${esHoy ? `
                      <!-- ÚLTIMO RENGLÓN CON SOLO EL SIGNO + -->
                      <tr class="fila-agregar-mas">
                        <td colspan="3" class="celda-agregar-mas">
                          <button type="button" class="btn-solo-plus" id="btnPlusPrestamo" ${editableGeneral ? '' : 'disabled'} title="${editableGeneral ? 'Registrar préstamo (+)' : 'Ingresa primero la cantidad inicial de caja'}">+</button>
                        </td>
                      </tr>
                    ` : ''}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 2. CORTE Y ARQUEO (3 Columnas - SIEMPRE DESBLOQUEADO) -->
            <div class="hoja-subcuadro" style="margin-top: 14px;">
              <div class="subcuadro-titulo-flex">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span>CORTE Y ARQUEO</span>
                  <span class="badge-arqueo-libre" title="Esta sección siempre se mantiene desbloqueada para registrar conteos físicos y arqueos de turno">🔓 Desbloqueado</span>
                </div>
                <span style="font-size: 0.72rem; color: #64748b; font-weight: normal;">* Monedas en cantidad total ($)</span>
              </div>

              <div class="tabla-responsive-wrap">
                <table class="hoja-tabla-arqueo">
                  <thead>
                    <tr>
                      <th style="text-align: left;">CONCEPTO</th>
                      <th style="width: 95px; text-align: center;">CANTIDAD 1</th>
                      <th style="width: 95px; text-align: center;">CANTIDAD 2</th>
                      <th style="width: 95px; text-align: center;">CANTIDAD 3</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td class="font-bold">TARJETAS</td>
                      ${d.arqueoColumnas.map((col, idx) => `
                        <td><input type="number" step="0.5" class="cell-input text-right font-bold" data-arq-col="${idx}" data-field="tarjetas" value="${col.tarjetas || ''}"></td>
                      `).join('')}
                    </tr>
                    <tr>
                      <td class="font-bold">SISTEMA (POS)</td>
                      ${d.arqueoColumnas.map((col, idx) => `
                        <td><input type="number" step="0.5" class="cell-input text-right font-bold" data-arq-col="${idx}" data-field="sistema" value="${col.sistema || ''}"></td>
                      `).join('')}
                    </tr>
                    <tr>
                      <td class="font-bold">BILLETES</td>
                      ${d.arqueoColumnas.map((col, idx) => `
                        <td><input type="number" step="10" class="cell-input text-right font-bold" data-arq-col="${idx}" data-field="billetes" value="${col.billetes || ''}"></td>
                      `).join('')}
                    </tr>
                    <tr>
                      <td>MON. 1 ($ en monedas)</td>
                      ${d.arqueoColumnas.map((col, idx) => `
                        <td><input type="number" step="1" class="cell-input text-right" data-arq-col="${idx}" data-field="mon1" value="${col.mon1 || ''}"></td>
                      `).join('')}
                    </tr>
                    <tr>
                      <td>MON. 2 ($ en monedas)</td>
                      ${d.arqueoColumnas.map((col, idx) => `
                        <td><input type="number" step="1" class="cell-input text-right" data-arq-col="${idx}" data-field="mon2" value="${col.mon2 || ''}"></td>
                      `).join('')}
                    </tr>
                    <tr>
                      <td>MON. 5 ($ en monedas)</td>
                      ${d.arqueoColumnas.map((col, idx) => `
                        <td><input type="number" step="1" class="cell-input text-right" data-arq-col="${idx}" data-field="mon5" value="${col.mon5 || ''}"></td>
                      `).join('')}
                    </tr>
                    <tr>
                      <td>MON. 10 ($ en monedas)</td>
                      ${d.arqueoColumnas.map((col, idx) => `
                        <td><input type="number" step="1" class="cell-input text-right" data-arq-col="${idx}" data-field="mon10" value="${col.mon10 || ''}"></td>
                      `).join('')}
                    </tr>
                    <tr>
                      <td class="font-bold">MORRALLA (Suma)</td>
                      ${d.arqueoColumnas.map(col => `
                        <td class="text-right font-bold" style="color: #0f172a; padding: 6px;">${this.formatMoney(col.morralla)}</td>
                      `).join('')}
                    </tr>
                    <tr class="fila-gran-total">
                      <td class="font-bold">TOTAL EFECTIVO</td>
                      ${d.arqueoColumnas.map(col => `
                        <td class="text-right font-bold" style="color: #0f172a; padding: 6px;">${this.formatMoney((col.billetes || 0) + (col.morralla || 0))}</td>
                      `).join('')}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 3. RETIROS (Con scroll y botón + en último renglón) -->
            <div class="hoja-subcuadro" style="margin-top: 14px;">
              <div class="subcuadro-titulo-flex">
                <span>RETIROS</span>
                <span style="font-weight: 700; color: #334155; font-size: 0.78rem;">Total Retiros: ${this.formatMoney(totales.totalRetiros)}</span>
              </div>
              <div class="tabla-scroll-retiros">
                <table class="hoja-tabla-retiros">
                  <thead>
                    <tr>
                      <th style="width: 48px; text-align: center;">NO.</th>
                      <th style="width: 110px; text-align: right;">MONTO ($)</th>
                      <th>RESPONSABLE / CONCEPTO</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${(() => {
                      const retirosReg = (d.retiros || []).filter(r => (parseFloat(r.monto) > 0) || (r.nombre && r.nombre.trim() !== '') || (r.concepto && r.concepto.trim() !== ''));
                      if (retirosReg.length === 0) {
                        return `
                          <tr class="fila-sin-registros">
                            <td colspan="3" class="texto-sin-registros">
                              Sin retiros registrados en esta hoja.
                            </td>
                          </tr>
                        `;
                      }
                      return retirosReg.map((ret, idx) => `
                        <tr class="fila-bloqueada" title="Retiro registrado (Protegido contra cambios)">
                          <td class="font-bold text-center" style="color: #64748b;">#${idx + 1}</td>
                          <td class="text-right font-bold" style="font-size: 0.84rem; color: #0f172a;">${this.formatMoney(ret.monto)}</td>
                          <td>
                            <div style="display: flex; align-items: baseline; gap: 6px;">
                              <strong style="color: #0f172a;">${ret.nombre || ret.responsable || 'Encargado'}</strong>
                              ${ret.concepto || ret.motivo ? `<span style="color: #64748b; font-size: 0.74rem;">(${ret.concepto || ret.motivo})</span>` : ''}
                            </div>
                          </td>
                        </tr>
                      `).join('');
                    })()}

                    ${esHoy ? `
                      <!-- ÚLTIMO RENGLÓN CON SOLO EL SIGNO + -->
                      <tr class="fila-agregar-mas">
                        <td colspan="3" class="celda-agregar-mas">
                          <button type="button" class="btn-solo-plus" id="btnPlusRetiro" ${editableGeneral ? '' : 'disabled'} title="${editableGeneral ? 'Registrar retiro (+)' : 'Ingresa primero la cantidad inicial de caja'}">+</button>
                        </td>
                      </tr>
                    ` : ''}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 4. MAQUINA MUÑECOS (Peluches) -->
            <div class="hoja-subcuadro" style="margin-top: 14px;">
              <div class="subcuadro-titulo">MAQUINA MUÑECOS</div>
              <div class="grid-dos-campos">
                <div>
                  <label>MONEDAS:</label>
                  <input type="number" class="cell-input text-right font-bold" id="munecosMonedas" value="${d.maquinaMunecos.monedas}" ${editableGeneral ? '' : 'disabled'}>
                </div>
                <div>
                  <label>TOTAL CORTE:</label>
                  <div class="field-static-val">${this.formatMoney(d.maquinaMunecos.totalCorte)}</div>
                </div>
              </div>
              <div class="corte-reparto-box">
                <div class="reparto-item">
                  <span>ELLOS (${d.maquinaMunecos.porcentajeEllos}%):</span>
                  <strong>${this.formatMoney(d.maquinaMunecos.ellosTotal)}</strong>
                </div>
                <div class="reparto-item item-nosotros">
                  <span>NOSOTROS (${d.maquinaMunecos.porcentajeNosotros}%):</span>
                  <strong>${this.formatMoney(d.maquinaMunecos.nosotrosTotal)}</strong>
                </div>
              </div>
            </div>

            <!-- 6. MAQUINAS MONTO INDIVIDUAL -->
            <div class="hoja-subcuadro" style="margin-top: 14px;">
              <div class="subcuadro-titulo">MAQUINAS INDIVIDUALES</div>
              <div class="tabla-responsive-wrap">
                <table class="hoja-tabla-conteo">
                  <thead>
                    <tr>
                      <th>MAQUINA</th>
                      <th style="width: 110px; text-align: right;">MONTO ($)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>MAQUINA 1 $1</td>
                      <td><input type="number" class="cell-input text-right font-bold" id="indivMaq1" value="${d.maquinasIndividuales.maq1_1}" ${editableGeneral ? '' : 'disabled'}></td>
                    </tr>
                    <tr>
                      <td>MAQUINA 2 $1</td>
                      <td><input type="number" class="cell-input text-right font-bold" id="indivMaq2" value="${d.maquinasIndividuales.maq2_1}" ${editableGeneral ? '' : 'disabled'}></td>
                    </tr>
                    <tr>
                      <td>MAQUINA 3 $5</td>
                      <td><input type="number" class="cell-input text-right font-bold" id="indivMaq3" value="${d.maquinasIndividuales.maq3_5}" ${editableGeneral ? '' : 'disabled'}></td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr class="fila-gran-total">
                      <td style="font-weight: 800;">TOTAL:</td>
                      <td style="text-align: right; font-weight: 800;">${this.formatMoney(d.maquinasIndividuales.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div class="corte-reparto-box" style="margin-top: 8px;">
                <div class="reparto-item">
                  <span>PROVEEDOR (60%):</span>
                  <strong>${this.formatMoney(d.maquinasIndividuales.proveedorTotal)}</strong>
                </div>
                <div class="reparto-item item-nosotros">
                  <span>NOSOTROS (40%):</span>
                  <strong>${this.formatMoney(d.maquinasIndividuales.nosotrosTotal)}</strong>
                </div>
              </div>

              <div style="margin-top: 8px;">
                <label style="font-size: 0.72rem; font-weight: 700; color: #475569;">NOTA:</label>
                <input type="text" class="cell-input" id="indivNota" value="${d.maquinasIndividuales.nota || ''}" placeholder="Anotaciones..." ${editableGeneral ? '' : 'disabled'}>
              </div>
            </div>

          </div>

        </div>

      </div>
    `;

    this.container.innerHTML = html;
    this.bindInputs();
  }

  bindInputs() {
    // 1. Selector rápido de días de la semana (LUN a DOM)
    this.container.querySelectorAll('.btn-dia-selector').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const fecha = btn.getAttribute('data-fecha-iso');
        if (fecha) {
          stateManager.cambiarFechaHoja(fecha);
        }
      });
    });

    // 2. Selector de fecha calendario
    document.getElementById('inputFechaSelector')?.addEventListener('change', (e) => {
      const fecha = e.target.value;
      if (fecha) {
        stateManager.cambiarFechaHoja(fecha);
      }
    });

    // 2.1 Botón de Apertura de Calendario e Historial
    document.getElementById('btnAbrirCalendarioHistorial')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.adminFenixApp?.modalManager) {
        window.adminFenixApp.modalManager.openCalendarioHistorialModal(stateManager.data.fecha, (fechaSel) => {
          stateManager.cambiarFechaHoja(fechaSel);
        });
      }
    });

    // 2.2 Botón de Regresar a Hoja de Hoy en el Banner
    document.getElementById('btnIrAHoy')?.addEventListener('click', (e) => {
      e.preventDefault();
      stateManager.cambiarFechaHoja(stateManager.getFechaHoy());
    });

    // 3. Botón de Conexión a Firebase
    document.getElementById('btnFirebaseConfig')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.adminFenixApp?.modalManager) {
        window.adminFenixApp.modalManager.openFirebaseConfigModal(() => {
          this.render();
        });
      }
    });

    // Encabezado: Cantidad inicial de caja
    const inputCant = document.getElementById('inputCantidadInicial');
    const guardarCantidadInicial = () => {
      if (!inputCant) return;
      stateManager.updateCantidadInicial(inputCant.value);
      this.render();
    };
    inputCant?.addEventListener('change', guardarCantidadInicial);
    inputCant?.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') guardarCantidadInicial();
    });

    // Botón Imprimir
    document.getElementById('btnImprimirHoja')?.addEventListener('click', () => {
      window.print();
    });

    // Panaderos: Abrir modal al dar clic en la fila o en el botón 'i'
    const abrirModalPan = (idx) => {
      if (window.adminFenixApp?.modalManager) {
        window.adminFenixApp.modalManager.openCostoPanaderoModal(idx, () => {
          this.render();
          setTimeout(() => {
            const container = this.container.querySelector('.tabla-scroll-proveedores');
            if (container) container.scrollTop = container.scrollHeight;
          }, 60);
        });
      }
    };

    this.container.querySelectorAll('[data-fila-pan]').forEach(tr => {
      tr.addEventListener('click', (e) => {
        e.preventDefault();
        const idx = parseInt(tr.getAttribute('data-fila-pan'));
        abrirModalPan(idx);
      });
    });

    this.container.querySelectorAll('[data-info-pan]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-info-pan'));
        abrirModalPan(idx);
      });
    });

    // Tortillerías: Abrir modal al dar clic en la fila o en el botón 'i'
    const abrirModalTort = (idx) => {
      if (window.adminFenixApp?.modalManager) {
        window.adminFenixApp.modalManager.openCostoTortilleriaModal(idx, () => {
          this.render();
          setTimeout(() => {
            const container = this.container.querySelector('.tabla-scroll-proveedores');
            if (container) container.scrollTop = container.scrollHeight;
          }, 60);
        });
      }
    };

    this.container.querySelectorAll('[data-fila-tort]').forEach(tr => {
      tr.addEventListener('click', (e) => {
        e.preventDefault();
        const idx = parseInt(tr.getAttribute('data-fila-tort'));
        abrirModalTort(idx);
      });
    });

    this.container.querySelectorAll('[data-info-tort]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-info-tort'));
        abrirModalTort(idx);
      });
    });

    // 1. Clic en Renglón Guardado de Proveedores (Abre Modal de Detalles con Hora, Tipo de Pago, etc.)
    this.container.querySelectorAll('[data-ver-detalle-prov]').forEach(rowEl => {
      rowEl.addEventListener('click', (e) => {
        e.preventDefault();
        const idx = parseInt(rowEl.getAttribute('data-ver-detalle-prov'));
        const comprasReg = (stateManager.data.comprasProveedores || []).filter(r => (r.proveedor && r.proveedor.trim() !== '') || (parseFloat(r.pagado) > 0));
        const compra = comprasReg[idx];
        if (compra && window.adminFenixApp?.modalManager) {
          window.adminFenixApp.modalManager.openDetallesProveedorModal(compra, stateManager.data.fecha);
        }
      });
    });

    // 2. Botón + Proveedor en último renglón (Abre Modal de Captura Segura)
    document.getElementById('btnPlusProveedor')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (!stateManager.puedeEditarCamposGenerales()) {
        alert('Por favor ingresa primero la Cantidad Inicial de caja en el encabezado.');
        document.getElementById('inputCantidadInicial')?.focus();
        return;
      }
      const provs = (stateManager.data.comprasProveedores || []).filter(p => (p.proveedor && p.proveedor.trim() !== '') || (parseFloat(p.pagado) > 0));
      const siguienteNota = provs.length + 1;
      if (window.adminFenixApp?.modalManager) {
        window.adminFenixApp.modalManager.openCapturaProveedorModal({
          nota: siguienteNota,
          proveedor: '',
          pagado: 0,
          tipoPago: 'Efectivo'
        }, () => {
          this.render();
          setTimeout(() => {
            const container = this.container.querySelector('.tabla-scroll-proveedores');
            if (container) container.scrollTop = container.scrollHeight;
          }, 50);
        });
      }
    });

    // 3. Casilla de Pagado en Préstamos / Pendientes (Marca como liquidado y subraya/tacha)
    this.container.querySelectorAll('[data-check-liquidado]').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-check-liquidado'));
        stateManager.togglePrestamoLiquidado(idx);
        this.render();
      });
    });

    // 4. Botón + Préstamo / Pendiente en último renglón (Abre Modal de Captura Segura)
    document.getElementById('btnPlusPrestamo')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (!stateManager.puedeEditarCamposGenerales()) {
        alert('Por favor ingresa primero la Cantidad Inicial de caja en el encabezado.');
        document.getElementById('inputCantidadInicial')?.focus();
        return;
      }
      const prestamosReg = (stateManager.data.prestamosPendientes || []).filter(p => (p.proveedor && p.proveedor.trim() !== '') || (parseFloat(p.pendiente) > 0));
      if (window.adminFenixApp?.modalManager) {
        window.adminFenixApp.modalManager.openCapturaPrestamoModal({
          index: prestamosReg.length,
          proveedor: '',
          pendiente: 0,
          nota: ''
        }, () => {
          this.render();
          setTimeout(() => {
            const container = this.container.querySelector('.tabla-scroll-pendientes');
            if (container) container.scrollTop = container.scrollHeight;
          }, 50);
        });
      }
    });

    // 5. Botón + Retiro en último renglón (Abre Modal de Captura Segura)
    document.getElementById('btnPlusRetiro')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (!stateManager.puedeEditarCamposGenerales()) {
        alert('Por favor ingresa primero la Cantidad Inicial de caja en el encabezado.');
        document.getElementById('inputCantidadInicial')?.focus();
        return;
      }
      const retirosReg = (stateManager.data.retiros || []).filter(r => (parseFloat(r.monto) > 0) || (r.nombre && r.nombre.trim() !== ''));
      if (window.adminFenixApp?.modalManager) {
        window.adminFenixApp.modalManager.openCapturaRetiroModal({
          index: retirosReg.length,
          monto: 0,
          nombre: stateManager.data.cajeroActual || 'Don Manuel',
          concepto: 'Caja Fuerte'
        }, () => {
          this.render();
          setTimeout(() => {
            const container = this.container.querySelector('.tabla-scroll-retiros');
            if (container) container.scrollTop = container.scrollHeight;
          }, 50);
        });
      }
    });

    // 6. Conteo y Arqueo por Columnas
    this.container.querySelectorAll('[data-arq-col]').forEach(input => {
      input.addEventListener('change', (e) => {
        const colIdx = parseInt(e.target.getAttribute('data-arq-col'));
        const field = e.target.getAttribute('data-field');
        stateManager.updateArqueoColumna(colIdx, { [field]: e.target.value });
      });
    });


    // Muñecos
    document.getElementById('munecosMonedas')?.addEventListener('change', (e) => {
      stateManager.updateMaquinaMunecos({ monedas: e.target.value });
    });

    // Máquinas individuales
    const saveIndiv = () => {
      const q1 = document.getElementById('indivMaq1')?.value;
      const q2 = document.getElementById('indivMaq2')?.value;
      const q3 = document.getElementById('indivMaq3')?.value;
      const nota = document.getElementById('indivNota')?.value;
      stateManager.updateMaquinasIndividuales({ maq1_1: q1, maq2_1: q2, maq3_5: q3, nota });
    };
    ['indivMaq1', 'indivMaq2', 'indivMaq3', 'indivNota'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', saveIndiv);
    });
  }

  setupEventListeners() {
    stateManager.subscribe(() => {
      this.render();
    });
  }
}
