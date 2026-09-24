/**
 * Módulo de la Hoja Contable Diaria Minisúper Fénix
 * Réplica digital interactiva del formato físico en papel
 */

import { stateManager, NOMBRES_DIAS, NOMBRES_MESES } from '../state.js';

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
    const hoyISO = stateManager.getFechaHoy();
    const esHoy = stateManager.esHojaEditable();
    const tieneMontoInicial = stateManager.tieneCantidadInicial();
    const editableGeneral = esHoy;

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

            <!-- Indicador Verde de Guardado Automático (No editable) -->
            <div class="badge-guardado-verde" id="btnGuardadoIndicador" title="Sincronizado globalmente en la nube">
              <span class="punto-verde-guardado"></span>
              <span class="texto-guardado-label" id="textoGuardadoLabel">En Vivo (Global)</span>
            </div>
          </div>
        </div>

        ${!esHoy ? `
          <!-- BANNER DE AVISO: MODO HISTORIAL (SOLO LECTURA) -->
          <div class="banner-aviso-historial">
            <div class="banner-aviso-contenido">
              <span class="icono-candado-aviso" style="font-weight: 800; font-size: 0.8rem; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">HISTORIAL</span>
              <div>
                <div class="banner-titulo-historial">MODO HISTORIAL • CONSULTA DE DÍA PASADO</div>
                <div class="banner-sub-historial">
                  Estás revisando la hoja histórica del <strong>${d.dia || ''} ${d.diaNum || ''} de ${d.mes || ''} de ${d.ano || ''}</strong>.
                  Por integridad contable, solo se permite editar la hoja del <strong>día de hoy (${hoyISO})</strong>.
                  <em>(La sección de Corte y Arqueo se mantiene disponible para conteos físicos).</em>
                </div>
              </div>
            </div>
            <button type="button" class="btn-regresar-hoy" id="btnIrAHoy" title="Volver a la hoja editable del día de hoy">
              Ir a Hoja de Hoy (${hoyISO})
            </button>
          </div>
        ` : (!tieneMontoInicial ? `
          <!-- RECORDATORIO: CANTIDAD INICIAL (Clickeable) -->
          <div class="banner-aviso-monto-inicial" id="btnAvisoMontoInicial" style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 12px; cursor: pointer;" title="Clic aquí para ingresar la Cantidad Inicial">
            <div class="banner-aviso-contenido">
              <span class="icono-alerta-inicial" style="font-weight: 800; font-size: 0.74rem; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; color: #475569;">AVISO</span>
              <div>
                <div class="banner-titulo-inicial" style="color: #334155; font-size: 0.8rem; display: flex; align-items: center; gap: 6px;">
                  <span>CANTIDAD INICIAL DE CAJA</span>
                  <span style="font-size: 0.72rem; color: #0284c7; font-weight: 700;">(✎ Clic para ingresar)</span>
                </div>
                <div class="banner-sub-inicial" style="color: #64748b; font-size: 0.74rem;">
                  Haz clic aquí o en el campo superior <strong>CANTIDAD INICIAL</strong> para ingresar el fondo de apertura de hoy.
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

            <!-- Recuadro Táctil de Cantidad Inicial -->
            <div class="hoja-campo-inicial ${esHoy ? 'campo-inicial-clickeable' : ''}" id="btnAbrirModalCantidadInicial" 
              title="${esHoy ? 'Clic para capturar o editar la Cantidad Inicial de caja' : 'Cantidad inicial guardada'}"
              style="cursor: ${esHoy ? 'pointer' : 'default'}; user-select: none;">
              <label style="cursor: inherit;">CANTIDAD INICIAL:</label>
              <div class="input-money-wrap" style="cursor: inherit; display: flex; align-items: center; gap: 4px;">
                <span style="font-weight: 800; color: #0f172a;">$</span>
                <div class="hoja-valor-inicial-display ${esHoy && !tieneMontoInicial ? 'alerta-falta-inicial' : ''}" id="displayValorCantidadInicial"
                  style="min-width: 72px; padding: 2px 6px; font-weight: 800; font-size: 0.88rem; text-align: right; border-radius: 4px; background: #ffffff; border: 1.5px solid ${esHoy && !tieneMontoInicial ? '#f59e0b' : '#cbd5e1'}; color: #0f172a;">
                  ${tieneMontoInicial ? this.formatMoney(d.cantidadInicial).replace('$', '').trim() : '<span style="color: #94a3b8; font-weight: normal;">0.00</span>'}
                </div>
                ${esHoy ? '<span class="badge-lapiz-edit" style="font-size: 0.82rem; color: #0284c7; margin-left: 2px;" title="Editar">✎</span>' : ''}
              </div>
            </div>

            <div class="hoja-header-actions">
              <button class="btn-fenix-print" id="btnImprimirHoja" title="Imprimir hoja contable física">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                <span>Imprimir Hoja</span>
              </button>
              <button class="btn-fenix-email" id="btnEnviarCorteEmail" title="Enviar este corte contable a un correo electrónico">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <span>Enviar a Correo</span>
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
                <span class="badge-hint-click-info" title="Haz clic en cualquier renglón o en el botón de info para capturar cantidades y precio">Clic en renglón o botón (i) para capturar</span>
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
                        <tr class="fila-conteo-clickeable ${editableGeneral ? 'fila-activa' : ''}" data-fila-pan="${idx}" tabindex="0" role="button" title="${editableGeneral ? 'Clic o Enter para registrar bolillos, dulces, cambios y precio' : 'Consulta de conteo de pan'}">
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
                        <tr class="fila-conteo-clickeable ${editableGeneral ? 'fila-activa' : ''}" data-fila-tort="${idx}" tabindex="0" role="button" title="${editableGeneral ? 'Clic o Enter para registrar nuevas, cambios y precio' : 'Consulta de conteo de tortilla'}">
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
                  <span class="badge-item-pago" title="Total pagado en efectivo">Efectivo: <strong>${this.formatMoney(totales.totalEfectivoProveedores)}</strong></span>
                  <span class="badge-item-pago" title="Total pagado por transferencia">Transf: <strong>${this.formatMoney(totales.totalTransferenciaProveedores)}</strong></span>
                  <span class="badge-total-pagado">Total: ${this.formatMoney(totales.totalPagadoProveedores)}</span>
                </div>
              </div>

              <div class="tabla-scroll-proveedores">
                <table class="hoja-tabla-proveedores">
                  <thead>
                    <tr>
                      <th style="width: 38px; text-align: center;">NOTA</th>
                      <th>PROVEEDOR</th>
                      <th style="width: 44px; text-align: center;" title="Tipo de Pago: Efectivo (EF) o Transferencia (TR)">PAGO</th>
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
                          title="Clic para ver hora de registro (${row.hora || 'Registrado'}) y detalles">
                          <td class="text-center font-bold" style="color: #64748b;">${idx + 1}</td>
                          <td class="celda-bloqueada-prov">
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                              <span class="prov-texto-fijo font-bold">${row.proveedor}</span>
                              <span class="badge-hora-hint" title="Hora de registro: ${row.hora || 'Guardada'}" style="font-size: 0.72rem; color: #64748b; font-weight: 700;">(i)</span>
                            </div>
                          </td>
                          <td style="text-align: center; padding: 2px;">
                            <span class="btn-logo-pago ${(row.tipoPago || 'Efectivo') === 'Transferencia' ? 'es-transf' : 'es-efec'}" 
                              style="cursor: pointer; font-size: 0.7rem; font-weight: 800; padding: 2px 5px; border-radius: 4px;" 
                              title="${(row.tipoPago || 'Efectivo') === 'Transferencia' ? 'Transferencia Bancaria' : 'Efectivo de Caja'} (Clic para detalles)">
                              ${(row.tipoPago || 'Efectivo') === 'Transferencia' ? 'TR' : 'EF'}
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

            <!-- 2. CORTE Y ARQUEO (3 Columnas - Captura por Modal y Bloqueo Definitivo) -->
            <div class="hoja-subcuadro" style="margin-top: 14px;">
              <div class="subcuadro-titulo-flex">
                <span>CORTE Y ARQUEO</span>
                <span style="font-size: 0.72rem; color: #64748b; font-weight: normal;">* Da clic en la columna para capturar o revisar arqueo</span>
              </div>

              <div class="tabla-responsive-wrap">
                <table class="hoja-tabla-arqueo">
                  <thead>
                    <tr>
                      <th style="text-align: left;">CONCEPTO</th>
                      ${d.arqueoColumnas.map((col, idx) => `
                        <th style="width: 105px; text-align: center; cursor: pointer; user-select: none;" class="btn-abrir-arqueo-col" data-col-arq="${idx}" title="Clic para ${col.bloqueado ? 'ver arqueo guardado (protegido)' : 'capturar cantidades de esta columna'}">
                          <div style="font-size: 0.78rem; font-weight: 700;">CANTIDAD ${idx + 1}</div>
                          ${col.bloqueado ? `
                            <span style="display: inline-block; font-size: 0.65rem; background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 700; margin-top: 3px;">
                              Cerrado ${col.horaCierre || ''}
                            </span>
                          ` : `
                            <span style="display: inline-block; font-size: 0.65rem; background: #eff6ff; color: #1d4ed8; padding: 2px 6px; border-radius: 4px; font-weight: 700; margin-top: 3px;">
                              + Capturar
                            </span>
                          `}
                        </th>
                      `).join('')}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td class="font-bold">TARJETAS</td>
                      ${d.arqueoColumnas.map((col, idx) => `
                        <td class="text-right font-bold cell-clickable-arq ${col.bloqueado ? 'arq-bloqueado' : ''}" data-col-arq="${idx}" tabindex="0" role="button" style="cursor: pointer; padding: 6px 8px;" title="Clic o Enter para abrir captura">
                          ${parseFloat(col.tarjetas) > 0 ? this.formatMoney(col.tarjetas) : '<span style="color:#94a3b8; font-weight: normal;">$0.00</span>'}
                        </td>
                      `).join('')}
                    </tr>
                    <tr>
                      <td class="font-bold">TARJETA YOMP</td>
                      ${d.arqueoColumnas.map((col, idx) => `
                        <td class="text-right font-bold cell-clickable-arq ${col.bloqueado ? 'arq-bloqueado' : ''}" data-col-arq="${idx}" style="cursor: pointer; padding: 6px 8px;" title="Clic para abrir captura">
                          ${parseFloat(col.tarjetaYomp) > 0 ? this.formatMoney(col.tarjetaYomp) : '<span style="color:#94a3b8; font-weight: normal;">$0.00</span>'}
                        </td>
                      `).join('')}
                    </tr>
                    <tr>
                      <td class="font-bold">SISTEMA (POS)</td>
                      ${d.arqueoColumnas.map((col, idx) => `
                        <td class="text-right font-bold cell-clickable-arq ${col.bloqueado ? 'arq-bloqueado' : ''}" data-col-arq="${idx}" style="cursor: pointer; padding: 6px 8px;" title="Clic para abrir captura">
                          ${parseFloat(col.sistema) > 0 ? this.formatMoney(col.sistema) : '<span style="color:#94a3b8; font-weight: normal;">$0.00</span>'}
                        </td>
                      `).join('')}
                    </tr>
                    <tr>
                      <td class="font-bold">BILLETES</td>
                      ${d.arqueoColumnas.map((col, idx) => `
                        <td class="text-right font-bold cell-clickable-arq ${col.bloqueado ? 'arq-bloqueado' : ''}" data-col-arq="${idx}" style="cursor: pointer; padding: 6px 8px;" title="Clic para abrir captura">
                          ${parseFloat(col.billetes) > 0 ? this.formatMoney(col.billetes) : '<span style="color:#94a3b8; font-weight: normal;">$0.00</span>'}
                        </td>
                      `).join('')}
                    </tr>
                    <tr>
                      <td>MON. 1 ($ en monedas)</td>
                      ${d.arqueoColumnas.map((col, idx) => `
                        <td class="text-right cell-clickable-arq ${col.bloqueado ? 'arq-bloqueado' : ''}" data-col-arq="${idx}" style="cursor: pointer; padding: 5px 8px;" title="Clic para abrir captura">
                          ${parseFloat(col.mon1) > 0 ? this.formatMoney(col.mon1) : '<span style="color:#94a3b8;">$0.00</span>'}
                        </td>
                      `).join('')}
                    </tr>
                    <tr>
                      <td>MON. 2 ($ en monedas)</td>
                      ${d.arqueoColumnas.map((col, idx) => `
                        <td class="text-right cell-clickable-arq ${col.bloqueado ? 'arq-bloqueado' : ''}" data-col-arq="${idx}" style="cursor: pointer; padding: 5px 8px;" title="Clic para abrir captura">
                          ${parseFloat(col.mon2) > 0 ? this.formatMoney(col.mon2) : '<span style="color:#94a3b8;">$0.00</span>'}
                        </td>
                      `).join('')}
                    </tr>
                    <tr>
                      <td>MON. 5 ($ en monedas)</td>
                      ${d.arqueoColumnas.map((col, idx) => `
                        <td class="text-right cell-clickable-arq ${col.bloqueado ? 'arq-bloqueado' : ''}" data-col-arq="${idx}" style="cursor: pointer; padding: 5px 8px;" title="Clic para abrir captura">
                          ${parseFloat(col.mon5) > 0 ? this.formatMoney(col.mon5) : '<span style="color:#94a3b8;">$0.00</span>'}
                        </td>
                      `).join('')}
                    </tr>
                    <tr>
                      <td>MON. 10 ($ en monedas)</td>
                      ${d.arqueoColumnas.map((col, idx) => `
                        <td class="text-right cell-clickable-arq ${col.bloqueado ? 'arq-bloqueado' : ''}" data-col-arq="${idx}" style="cursor: pointer; padding: 5px 8px;" title="Clic para abrir captura">
                          ${parseFloat(col.mon10) > 0 ? this.formatMoney(col.mon10) : '<span style="color:#94a3b8;">$0.00</span>'}
                        </td>
                      `).join('')}
                    </tr>
                    <tr style="background: #f8fafc;">
                      <td class="font-bold">MORRALLA</td>
                      ${d.arqueoColumnas.map((col, idx) => `
                        <td class="text-right font-bold cell-clickable-arq ${col.bloqueado ? 'arq-bloqueado' : ''}" data-col-arq="${idx}" tabindex="0" role="button" style="cursor: pointer; color: #0284c7; padding: 7px 8px;" title="Clic o Enter para abrir captura">
                          ${this.formatMoney(col.morralla)}
                        </td>
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

            <!-- 4. MAQUINA MUÑECOS (Peluches - Clickeable para abrir modal) -->
            <div class="hoja-subcuadro subcuadro-clickeable ${editableGeneral ? 'subcuadro-activo' : ''}" id="btnAbrirModalMunecos" 
              style="margin-top: 14px; cursor: ${editableGeneral ? 'pointer' : 'default'}; user-select: none;" 
              tabindex="${editableGeneral ? '0' : '-1'}" role="button"
              title="${editableGeneral ? 'Clic o Enter para capturar monedas y corte de máquina de muñecos' : 'Corte de muñecos'}">
              <div class="subcuadro-titulo-flex">
                <span>MAQUINA MUÑECOS</span>
                ${editableGeneral ? '<span class="badge-hint-click-edit" style="font-size: 0.72rem; color: #0284c7; font-weight: 700;">✎ Capturar Corte</span>' : ''}
              </div>
              <div class="grid-dos-campos">
                <div>
                  <label>MONEDAS:</label>
                  <div class="field-static-val font-bold text-right" style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px 8px; font-size: 0.88rem; color: #1e3a8a;">
                    ${(parseFloat(d.maquinaMunecos.monedas) || 0) > 0 ? this.formatMoney(d.maquinaMunecos.monedas) : '$0.00'}
                  </div>
                </div>
                <div>
                  <label>TOTAL CORTE:</label>
                  <div class="field-static-val font-bold text-right" style="padding: 4px 8px; font-size: 0.88rem;">
                    ${this.formatMoney(d.maquinaMunecos.totalCorte)}
                  </div>
                </div>
              </div>
              <div class="corte-reparto-box" style="margin-top: 8px;">
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

            <!-- 6. MAQUINAS MONTO INDIVIDUAL (Clickeable para abrir modal) -->
            <div class="hoja-subcuadro subcuadro-clickeable ${editableGeneral ? 'subcuadro-activo' : ''}" id="btnAbrirModalMaquinasIndiv" 
              style="margin-top: 14px; cursor: ${editableGeneral ? 'pointer' : 'default'}; user-select: none;" 
              tabindex="${editableGeneral ? '0' : '-1'}" role="button"
              title="${editableGeneral ? 'Clic o Enter para capturar montos de máquinas individuales' : 'Corte de máquinas individuales'}">
              <div class="subcuadro-titulo-flex">
                <span>MAQUINAS INDIVIDUALES</span>
                ${editableGeneral ? '<span class="badge-hint-click-edit" style="font-size: 0.72rem; color: #0284c7; font-weight: 700;">✎ Capturar Corte</span>' : ''}
              </div>
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
                      <td class="font-bold">MAQUINA 1 $1</td>
                      <td class="text-right font-bold" style="color: #0f172a; padding: 5px 8px;">
                        ${(parseFloat(d.maquinasIndividuales.maq1_1) || 0) > 0 ? this.formatMoney(d.maquinasIndividuales.maq1_1) : '$0.00'}
                      </td>
                    </tr>
                    <tr>
                      <td class="font-bold">MAQUINA 2 $1</td>
                      <td class="text-right font-bold" style="color: #0f172a; padding: 5px 8px;">
                        ${(parseFloat(d.maquinasIndividuales.maq2_1) || 0) > 0 ? this.formatMoney(d.maquinasIndividuales.maq2_1) : '$0.00'}
                      </td>
                    </tr>
                    <tr>
                      <td class="font-bold">MAQUINA 3 $5</td>
                      <td class="text-right font-bold" style="color: #0f172a; padding: 5px 8px;">
                        ${(parseFloat(d.maquinasIndividuales.maq3_5) || 0) > 0 ? this.formatMoney(d.maquinasIndividuales.maq3_5) : '$0.00'}
                      </td>
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

              ${d.maquinasIndividuales.nota ? `
                <div style="margin-top: 6px; font-size: 0.74rem; color: #64748b; background: #f8fafc; padding: 4px 8px; border-radius: 4px; border: 1px solid #e2e8f0;">
                  <strong>Nota:</strong> ${d.maquinasIndividuales.nota}
                </div>
              ` : ''}
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



    // Encabezado: Apertura de Modal para Cantidad Inicial de Caja
    const abrirModalCantidadInicial = () => {
      if (!stateManager.esHojaEditable()) {
        alert('Solo se puede editar la cantidad inicial en la hoja del día de hoy.');
        return;
      }
      if (window.adminFenixApp?.modalManager) {
        window.adminFenixApp.modalManager.openCapturaCantidadInicialModal(() => {
          this.render();
          setTimeout(() => {
            const btnSiguiente = document.getElementById('btnPlusProveedor') || document.querySelector('[data-fila-pan]');
            btnSiguiente?.focus();
          }, 50);
        });
      }
    };

    const btnCantInicial = document.getElementById('btnAbrirModalCantidadInicial');
    btnCantInicial?.addEventListener('click', (e) => {
      e.preventDefault();
      abrirModalCantidadInicial();
    });
    btnCantInicial?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        abrirModalCantidadInicial();
      }
    });

    // Recordatorio en Banner: Clic para abrir modal
    document.getElementById('btnAvisoMontoInicial')?.addEventListener('click', (e) => {
      e.preventDefault();
      abrirModalCantidadInicial();
    });

    // Botón Imprimir
    document.getElementById('btnImprimirHoja')?.addEventListener('click', () => {
      window.print();
    });

    // Botón Enviar a Correo (debajo de Imprimir)
    document.getElementById('btnEnviarCorteEmail')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.adminFenixApp?.modalManager) {
        window.adminFenixApp.modalManager.openEnviarCorteEmailModal();
      }
    });

    // Panaderos: Abrir modal al dar clic en la fila o en el botón 'i' o pulsar Enter
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
      tr.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const idx = parseInt(tr.getAttribute('data-fila-pan'));
          abrirModalPan(idx);
        }
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
      tr.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const idx = parseInt(tr.getAttribute('data-fila-tort'));
          abrirModalTort(idx);
        }
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
      const abrirDetalle = () => {
        const idx = parseInt(rowEl.getAttribute('data-ver-detalle-prov'));
        const comprasReg = (stateManager.data.comprasProveedores || []).filter(r => (r.proveedor && r.proveedor.trim() !== '') || (parseFloat(r.pagado) > 0));
        const compra = comprasReg[idx];
        if (compra && window.adminFenixApp?.modalManager) {
          window.adminFenixApp.modalManager.openDetallesProveedorModal(compra, stateManager.data.fecha);
        }
      };
      rowEl.addEventListener('click', (e) => {
        e.preventDefault();
        abrirDetalle();
      });
      rowEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          abrirDetalle();
        }
      });
    });

    // 2. Botón + Proveedor en último renglón (Abre Modal de Captura Segura)
    document.getElementById('btnPlusProveedor')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (!stateManager.esHojaEditable()) {
        alert('Solo se pueden registrar nuevos proveedores en la hoja del día de hoy.');
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
      if (!stateManager.esHojaEditable()) {
        alert('Solo se pueden registrar préstamos en la hoja del día de hoy.');
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
      if (!stateManager.esHojaEditable()) {
        alert('Solo se pueden registrar retiros en la hoja del día de hoy.');
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

    // 6. Conteo y Arqueo por Columnas (Abre Modal de Captura Segura / Bloqueo con Clic o Enter)
    this.container.querySelectorAll('[data-col-arq]').forEach(el => {
      const abrirArqueo = () => {
        const colIdx = parseInt(el.getAttribute('data-col-arq'));
        if (window.adminFenixApp?.modalManager) {
          window.adminFenixApp.modalManager.openCapturaArqueoColumnaModal(colIdx, () => {
            this.render();
          });
        }
      };
      el.addEventListener('click', (e) => {
        e.preventDefault();
        abrirArqueo();
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          abrirArqueo();
        }
      });
    });

    // 7. Máquina de Muñecos (Peluches): Apertura de Modal de Captura Fácil
    const btnMunecos = document.getElementById('btnAbrirModalMunecos');
    const abrirModalMunecos = () => {
      if (!stateManager.esHojaEditable()) {
        alert('Solo se puede registrar corte de máquinas en la hoja del día de hoy.');
        return;
      }
      if (window.adminFenixApp?.modalManager) {
        window.adminFenixApp.modalManager.openCapturaMaquinaMunecosModal(() => {
          this.render();
        });
      }
    };
    btnMunecos?.addEventListener('click', (e) => {
      e.preventDefault();
      abrirModalMunecos();
    });
    btnMunecos?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        abrirModalMunecos();
      }
    });

    // 8. Máquinas Individuales: Apertura de Modal de Captura Fácil
    const btnMaqIndiv = document.getElementById('btnAbrirModalMaquinasIndiv');
    const abrirModalMaqIndiv = () => {
      if (!stateManager.esHojaEditable()) {
        alert('Solo se puede registrar corte de máquinas en la hoja del día de hoy.');
        return;
      }
      if (window.adminFenixApp?.modalManager) {
        window.adminFenixApp.modalManager.openCapturaMaquinasIndividualesModal(() => {
          this.render();
        });
      }
    };
    btnMaqIndiv?.addEventListener('click', (e) => {
      e.preventDefault();
      abrirModalMaqIndiv();
    });
    btnMaqIndiv?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        abrirModalMaqIndiv();
      }
    });
  }

  setupEventListeners() {
    stateManager.subscribe(() => {
      this.render();
    });
  }
}
