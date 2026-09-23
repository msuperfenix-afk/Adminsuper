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
    const editable = stateManager.esHojaEditable();

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
            <span style="font-size: 0.76rem; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Día:</span>
            <div style="display: flex; gap: 4px;">
              ${diasSemanaBarra.map(dia => `
                <button class="btn-dia-selector ${dia.activo ? 'activo' : ''} ${dia.esHoy ? 'es-dia-hoy' : ''}" data-fecha-iso="${dia.iso}" title="${dia.esHoy ? 'HOY (Editable)' : `Cargar hoja del ${dia.corto} ${dia.numero}`}">
                  <strong>${dia.corto}</strong>
                  <span>${dia.numero}</span>
                  ${dia.esHoy ? '<span class="punto-hoy-badge">•</span>' : ''}
                </button>
              `).join('')}
            </div>

            <!-- Botón de Apertura de Calendario Completo de Historial -->
            <button class="btn-abrir-calendario" id="btnAbrirCalendarioHistorial" title="Abrir Calendario de Historial Contable">
              📅 Calendario & Historial
            </button>
          </div>

          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 0.74rem; color: #94a3b8; font-weight: 700;">Fecha:</span>
              <input type="date" class="input-fecha-picker" id="inputFechaSelector" value="${d.fecha || ''}">
            </div>

            <!-- Botón de Conexión a Firebase -->
            <button class="btn-firebase-badge ${conectadoFirebase ? 'conectado' : 'desconectado'}" id="btnFirebaseConfig" title="Configurar conexión con Firebase Firestore">
              ${conectadoFirebase ? `🟢 Firebase: ${configFirebase.projectId || 'conectado'}` : '🔥 Conectar Firebase'}
            </button>
          </div>
        </div>

        ${!editable ? `
          <!-- BANNER DE AVISO: MODO HISTORIAL (SOLO LECTURA) -->
          <div class="banner-aviso-historial">
            <div class="banner-aviso-contenido">
              <span class="icono-candado-aviso">🔒</span>
              <div>
                <div class="banner-titulo-historial">MODO HISTORIAL • CONSULTA DE DÍA PASADO</div>
                <div class="banner-sub-historial">
                  Estás revisando la hoja histórica del <strong>${d.dia || ''} ${d.diaNum || ''} de ${d.mes || ''} de ${d.ano || ''}</strong>.
                  Por integridad contable, solo se permite editar la hoja del <strong>día de hoy (${hoyISO})</strong>.
                </div>
              </div>
            </div>
            <button type="button" class="btn-regresar-hoy" id="btnIrAHoy" title="Volver a la hoja editable del día de hoy">
              📅 Ir a Hoja de Hoy (${hoyISO})
            </button>
          </div>
        ` : ''}

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
              <label>DIA:</label>
              <span class="hoja-texto-fijo-dia" id="displayDia">${(d.dia || 'LUNES').toUpperCase()}</span>
            </div>

            <div class="hoja-campo-fecha">
              <span class="fecha-label">FECHA:</span>
              <div class="fecha-cajas">
                <div>
                  <span class="sub-label">DIA</span>
                  <div class="hoja-box-fijo" id="displayDiaNum">${d.diaNum || ''}</div>
                </div>
                <div>
                  <span class="sub-label">MES</span>
                  <div class="hoja-box-fijo" id="displayMes">${d.mes || ''}</div>
                </div>
                <div>
                  <span class="sub-label">AÑO</span>
                  <div class="hoja-box-fijo" id="displayAno">${d.ano || ''}</div>
                </div>
              </div>
            </div>

            <div class="hoja-campo-inicial">
              <label>CANTIDAD INICIAL:</label>
              <div class="input-money-wrap">
                <span>$</span>
                <input type="number" step="10" class="hoja-input-money" id="inputCantidadInicial" value="${d.cantidadInicial}" ${editable ? '' : 'disabled'}>
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
              <div class="subcuadro-titulo">CONTEO PAN Y TORTILLA</div>
              
              <div class="tabla-responsive-wrap">
                <!-- Panaderos -->
                <table class="hoja-tabla-conteo">
                  <thead>
                    <tr>
                      <th>PROVEEDOR PAN</th>
                      <th style="width: 50px;">BOL</th>
                      <th style="width: 50px;">DUL</th>
                      <th style="width: 55px;">CAMB</th>
                      <th style="width: 60px;">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${d.conteoPan.map((p, idx) => `
                      <tr>
                        <td><input type="text" class="cell-input" data-pan="${idx}" data-field="proveedor" value="${p.proveedor}" ${editable ? '' : 'disabled'}></td>
                        <td><input type="number" class="cell-input text-center" data-pan="${idx}" data-field="bol" value="${p.bol}" ${editable ? '' : 'disabled'}></td>
                        <td><input type="number" class="cell-input text-center" data-pan="${idx}" data-field="dul" value="${p.dul}" ${editable ? '' : 'disabled'}></td>
                        <td><input type="number" class="cell-input text-center text-red" data-pan="${idx}" data-field="camb" value="${p.camb}" ${editable ? '' : 'disabled'}></td>
                        <td class="cell-total font-bold">${p.total}</td>
                      </tr>
                    `).join('')}
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
                      <th style="width: 65px;">CAMB</th>
                      <th style="width: 65px;">NUEV</th>
                      <th style="width: 65px;">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${d.conteoTortilla.map((t, idx) => `
                      <tr>
                        <td><input type="text" class="cell-input" data-tort="${idx}" data-field="proveedor" value="${t.proveedor}" ${editable ? '' : 'disabled'}></td>
                        <td><input type="number" step="0.5" class="cell-input text-center text-red" data-tort="${idx}" data-field="camb" value="${t.camb}" ${editable ? '' : 'disabled'}></td>
                        <td><input type="number" step="0.5" class="cell-input text-center" data-tort="${idx}" data-field="nuev" value="${t.nuev}" ${editable ? '' : 'disabled'}></td>
                        <td class="cell-total font-bold">${t.total}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 2. TABLA DE COMPRAS / PROVEEDORES (Renglones 1 al 30) -->
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
                    ${d.comprasProveedores.map((row, idx) => {
                      const estaBloqueado = row.bloqueado || (row.proveedor && (row.pagado > 0 || row.pagado));
                      if (estaBloqueado) {
                        return `
                          <tr class="fila-bloqueada ${row.pagado > 0 ? 'fila-con-pago' : ''}" 
                            data-ver-detalle-prov="${idx}" 
                            style="cursor: pointer;" 
                            title="Clic para ver hora de registro (⏰ ${row.hora || 'Registrado'}) y detalles">
                            <td class="text-center font-bold" style="color: #64748b;">${row.nota}</td>
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
                        `;
                      } else {
                        if (editable) {
                          return `
                            <tr class="fila-disponible-captura" data-captura-prov="${idx}" title="Clic aquí para añadir registro seguro">
                              <td class="text-center font-bold" style="color: #94a3b8;">${row.nota}</td>
                              <td class="celda-placeholder-clic">
                                <span class="placeholder-clic">+ Clic para registrar proveedor...</span>
                              </td>
                              <td style="text-align: center; color: #cbd5e1; font-size: 0.8rem;">-</td>
                              <td style="text-align: right; color: #cbd5e1; font-size: 0.82rem; padding-right: 6px;">$ 0.00</td>
                            </tr>
                          `;
                        } else {
                          return `
                            <tr class="fila-vacia-historico">
                              <td class="text-center font-bold" style="color: #cbd5e1;">${row.nota}</td>
                              <td style="color: #94a3b8; font-size: 0.8rem; padding: 4px 6px; font-style: italic;">Renglón sin registro</td>
                              <td style="text-align: center; color: #cbd5e1; font-size: 0.8rem;">-</td>
                              <td style="text-align: right; color: #cbd5e1; font-size: 0.82rem; padding-right: 6px;">-</td>
                            </tr>
                          `;
                        }
                      }
                    }).join('')}

                    ${editable ? `
                      <!-- ÚLTIMO RENGLÓN CON SOLO EL SIGNO + -->
                      <tr class="fila-agregar-mas">
                        <td colspan="4" class="celda-agregar-mas">
                          <button type="button" class="btn-solo-plus" id="btnPlusProveedor" title="Agregar">+</button>
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
                      <th style="width: 115px; text-align: right;">PENDIENTE ($)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${d.prestamosPendientes.map((pres, idx) => `
                      <tr class="fila-bloqueada ${pres.liquidado ? 'prestamo-liquidado' : ''}">
                        <td style="text-align: center; vertical-align: middle; padding: 2px;">
                          <input type="checkbox" 
                            class="check-prestamo-pagado" 
                            data-check-liquidado="${idx}" 
                            ${pres.liquidado ? 'checked' : ''} 
                            ${editable ? '' : 'disabled'}
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
                    `).join('')}

                    ${editable ? `
                      <!-- ÚLTIMO RENGLÓN CON SOLO EL SIGNO + -->
                      <tr class="fila-agregar-mas">
                        <td colspan="3" class="celda-agregar-mas">
                          <button type="button" class="btn-solo-plus" id="btnPlusPrestamo" title="Agregar">+</button>
                        </td>
                      </tr>
                    ` : ''}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 2. CORTE Y ARQUEO (3 Columnas) -->
            <div class="hoja-subcuadro" style="margin-top: 14px;">
              <div class="subcuadro-titulo-flex">
                <span>CORTE Y ARQUEO</span>
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
                        <td><input type="number" step="0.5" class="cell-input text-right font-bold" data-arq-col="${idx}" data-field="tarjetas" value="${col.tarjetas || ''}" ${editable ? '' : 'disabled'}></td>
                      `).join('')}
                    </tr>
                    <tr>
                      <td class="font-bold">SISTEMA (POS)</td>
                      ${d.arqueoColumnas.map((col, idx) => `
                        <td><input type="number" step="0.5" class="cell-input text-right font-bold" data-arq-col="${idx}" data-field="sistema" value="${col.sistema || ''}" ${editable ? '' : 'disabled'}></td>
                      `).join('')}
                    </tr>
                    <tr>
                      <td class="font-bold">BILLETES</td>
                      ${d.arqueoColumnas.map((col, idx) => `
                        <td><input type="number" step="10" class="cell-input text-right font-bold" data-arq-col="${idx}" data-field="billetes" value="${col.billetes || ''}" ${editable ? '' : 'disabled'}></td>
                      `).join('')}
                    </tr>
                    <tr>
                      <td>MON. 1 ($ en monedas)</td>
                      ${d.arqueoColumnas.map((col, idx) => `
                        <td><input type="number" step="1" class="cell-input text-right" data-arq-col="${idx}" data-field="mon1" value="${col.mon1 || ''}" ${editable ? '' : 'disabled'}></td>
                      `).join('')}
                    </tr>
                    <tr>
                      <td>MON. 2 ($ en monedas)</td>
                      ${d.arqueoColumnas.map((col, idx) => `
                        <td><input type="number" step="1" class="cell-input text-right" data-arq-col="${idx}" data-field="mon2" value="${col.mon2 || ''}" ${editable ? '' : 'disabled'}></td>
                      `).join('')}
                    </tr>
                    <tr>
                      <td>MON. 5 ($ en monedas)</td>
                      ${d.arqueoColumnas.map((col, idx) => `
                        <td><input type="number" step="1" class="cell-input text-right" data-arq-col="${idx}" data-field="mon5" value="${col.mon5 || ''}" ${editable ? '' : 'disabled'}></td>
                      `).join('')}
                    </tr>
                    <tr>
                      <td>MON. 10 ($ en monedas)</td>
                      ${d.arqueoColumnas.map((col, idx) => `
                        <td><input type="number" step="1" class="cell-input text-right" data-arq-col="${idx}" data-field="mon10" value="${col.mon10 || ''}" ${editable ? '' : 'disabled'}></td>
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
                    ${d.retiros.map((ret, idx) => `
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
                    `).join('')}

                    ${editable ? `
                      <!-- ÚLTIMO RENGLÓN CON SOLO EL SIGNO + -->
                      <tr class="fila-agregar-mas">
                        <td colspan="3" class="celda-agregar-mas">
                          <button type="button" class="btn-solo-plus" id="btnPlusRetiro" title="Agregar">+</button>
                        </td>
                      </tr>
                    ` : ''}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 4. CASCADA (Máquinas) -->
            <div class="hoja-subcuadro" style="margin-top: 14px;">
              <div class="subcuadro-titulo">CASCADA</div>
              <div class="grid-tres-campos">
                <div>
                  <label>MONEDAS:</label>
                  <input type="number" class="cell-input text-right font-bold" id="cascadaMonedas" value="${d.cascada.monedas}" ${editable ? '' : 'disabled'}>
                </div>
                <div>
                  <label>PREMIOS:</label>
                  <input type="number" class="cell-input text-right font-bold text-red" id="cascadaPremios" value="${d.cascada.premios}" ${editable ? '' : 'disabled'}>
                </div>
                <div>
                  <label>TOTAL:</label>
                  <div class="field-static-val">${this.formatMoney(d.cascada.total)}</div>
                </div>
              </div>
              <div class="corte-reparto-box">
                <div class="reparto-item">
                  <span>ELLOS (${d.cascada.porcentajeEllos}%):</span>
                  <strong>${this.formatMoney(d.cascada.ellosTotal)}</strong>
                </div>
                <div class="reparto-item item-nosotros">
                  <span>NOSOTROS (${d.cascada.porcentajeNosotros}%):</span>
                  <strong>${this.formatMoney(d.cascada.nosotrosTotal)}</strong>
                </div>
              </div>
            </div>

            <!-- 5. MAQUINA MUÑECOS (Peluches) -->
            <div class="hoja-subcuadro" style="margin-top: 14px;">
              <div class="subcuadro-titulo">MAQUINA MUÑECOS</div>
              <div class="grid-dos-campos">
                <div>
                  <label>MONEDAS:</label>
                  <input type="number" class="cell-input text-right font-bold" id="munecosMonedas" value="${d.maquinaMunecos.monedas}" ${editable ? '' : 'disabled'}>
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
                      <td><input type="number" class="cell-input text-right font-bold" id="indivMaq1" value="${d.maquinasIndividuales.maq1_1}" ${editable ? '' : 'disabled'}></td>
                    </tr>
                    <tr>
                      <td>MAQUINA 2 $1</td>
                      <td><input type="number" class="cell-input text-right font-bold" id="indivMaq2" value="${d.maquinasIndividuales.maq2_1}" ${editable ? '' : 'disabled'}></td>
                    </tr>
                    <tr>
                      <td>MAQUINA 3 $5</td>
                      <td><input type="number" class="cell-input text-right font-bold" id="indivMaq3" value="${d.maquinasIndividuales.maq3_5}" ${editable ? '' : 'disabled'}></td>
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
                <input type="text" class="cell-input" id="indivNota" value="${d.maquinasIndividuales.nota || ''}" placeholder="Anotaciones..." ${editable ? '' : 'disabled'}>
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
    document.getElementById('inputCantidadInicial')?.addEventListener('change', (e) => {
      stateManager.updateCantidadInicial(e.target.value);
    });

    // Botón Imprimir
    document.getElementById('btnImprimirHoja')?.addEventListener('click', () => {
      window.print();
    });

    // Panaderos
    this.container.querySelectorAll('[data-pan]').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-pan'));
        const field = e.target.getAttribute('data-field');
        const val = e.target.value;
        stateManager.updateConteoPan(idx, { [field]: val });
      });
    });

    // Tortillerías
    this.container.querySelectorAll('[data-tort]').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-tort'));
        const field = e.target.getAttribute('data-field');
        const val = e.target.value;
        stateManager.updateConteoTortilla(idx, { [field]: val });
      });
    });

    // 1. Clic en Renglón Guardado de Proveedores (Abre Modal de Detalles con Hora, Tipo de Pago, etc.)
    this.container.querySelectorAll('[data-ver-detalle-prov]').forEach(rowEl => {
      rowEl.addEventListener('click', (e) => {
        e.preventDefault();
        const idx = parseInt(rowEl.getAttribute('data-ver-detalle-prov'));
        const compra = stateManager.data.comprasProveedores[idx];
        if (compra && window.adminFenixApp?.modalManager) {
          window.adminFenixApp.modalManager.openDetallesProveedorModal(compra, stateManager.data.fecha);
        }
      });
    });

    // 1.1 Clic en Renglón Disponible de Compras / Proveedores (Abre Modal de Captura Segura)
    this.container.querySelectorAll('[data-captura-prov]').forEach(rowEl => {
      rowEl.addEventListener('click', (e) => {
        e.preventDefault();
        const idx = parseInt(rowEl.getAttribute('data-captura-prov'));
        const rowData = stateManager.data.comprasProveedores[idx];
        if (window.adminFenixApp?.modalManager) {
          window.adminFenixApp.modalManager.openCapturaProveedorModal({
            index: idx,
            nota: rowData?.nota || (idx + 1),
            proveedor: '',
            pagado: 0,
            tipoPago: 'Efectivo'
          }, () => {
            this.render();
          });
        }
      });
    });

    // 2. Botón + Proveedor en último renglón
    document.getElementById('btnPlusProveedor')?.addEventListener('click', (e) => {
      e.preventDefault();
      // Buscar primer renglón disponible o crear uno nuevo
      const provs = stateManager.data.comprasProveedores;
      let targetIdx = provs.findIndex(p => !p.proveedor && (!p.pagado || p.pagado == 0));
      if (targetIdx === -1) {
        stateManager.addFilaCompraProveedor('', 0, 'Efectivo');
        targetIdx = stateManager.data.comprasProveedores.length - 1;
      }
      const targetRow = stateManager.data.comprasProveedores[targetIdx];
      if (window.adminFenixApp?.modalManager) {
        window.adminFenixApp.modalManager.openCapturaProveedorModal({
          index: targetIdx,
          nota: targetRow?.nota || (targetIdx + 1),
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
      if (window.adminFenixApp?.modalManager) {
        window.adminFenixApp.modalManager.openCapturaPrestamoModal({
          index: stateManager.data.prestamosPendientes.length,
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
      if (window.adminFenixApp?.modalManager) {
        window.adminFenixApp.modalManager.openCapturaRetiroModal({
          index: stateManager.data.retiros.length,
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

    // Cascada
    const saveCascada = () => {
      const m = document.getElementById('cascadaMonedas')?.value;
      const p = document.getElementById('cascadaPremios')?.value;
      stateManager.updateCascada({ monedas: m, premios: p });
    };
    document.getElementById('cascadaMonedas')?.addEventListener('change', saveCascada);
    document.getElementById('cascadaPremios')?.addEventListener('change', saveCascada);

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
