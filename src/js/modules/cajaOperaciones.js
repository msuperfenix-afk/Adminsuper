/**
 * Módulo de Operaciones Diarias y Caja (Fase 2)
 * Incluye: Pagos del Día, Panaderos, Tortillerías, Pendientes de Pago,
 * Corte y Arqueo Multi-Sesión (con desglose de monedas $1, $2, $5, $10, Billetes, Tarjetas, Yomp, Sistema),
 * Retiros de Efectivo y Máquinas Tragamonedas / Peluches.
 */

import { stateManager } from '../state.js';

export class CajaOperacionesModule {
  constructor(containerId, modalCallbacks = {}) {
    this.container = document.getElementById(containerId);
    this.modalCallbacks = modalCallbacks;
    this.subtabActiva = 'arqueos'; // 'arqueos', 'pagos', 'panaderos', 'tortillerias', 'pendientes', 'retiros', 'maquinas'
    
    this.init();
  }

  init() {
    this.render();
    this.setupEventListeners();
  }

  setSubtab(subtab) {
    this.subtabActiva = subtab;
    this.render();
  }

  formatCurrency(val) {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(val || 0);
  }

  render() {
    if (!this.container) return;

    const metricas = stateManager.getMetricasGlobales();
    const data = stateManager.data;

    let html = `
      <div class="daily-operations-view">
        
        <!-- Tarjetas de Resumen Rápido Superior -->
        <div class="summary-cards-grid">
          <div class="summary-card">
            <div class="summary-icon-box icon-box-green">💵</div>
            <div class="summary-details">
              <span class="summary-label">Pagos del Día</span>
              <span class="summary-value">${this.formatCurrency(metricas.totalPagosHoy)}</span>
              <span class="summary-subtext">${data.pagosDia.length} desembolsos hoy</span>
            </div>
          </div>

          <div class="summary-card">
            <div class="summary-icon-box icon-box-blue">🏦</div>
            <div class="summary-details">
              <span class="summary-label">Arqueos Registrados</span>
              <span class="summary-value">${data.arqueos.length}</span>
              <span class="summary-subtext">Sesiones de corte hoy</span>
            </div>
          </div>

          <div class="summary-card">
            <div class="summary-icon-box icon-box-red">📤</div>
            <div class="summary-details">
              <span class="summary-label">Retiros de Efectivo</span>
              <span class="summary-value">${this.formatCurrency(metricas.totalRetirosHoy)}</span>
              <span class="summary-subtext">${data.retiros.length} retiros autorizados</span>
            </div>
          </div>

          <div class="summary-card">
            <div class="summary-icon-box icon-box-amber">⏳</div>
            <div class="summary-details">
              <span class="summary-label">Cuentas por Pagar</span>
              <span class="summary-value">${this.formatCurrency(metricas.totalPendientes)}</span>
              <span class="summary-subtext">Pendientes próximos días</span>
            </div>
          </div>

          <div class="summary-card">
            <div class="summary-icon-box icon-box-purple">🎰</div>
            <div class="summary-details">
              <span class="summary-label">Ganancia Máquinas</span>
              <span class="summary-value">${this.formatCurrency(metricas.totalGananciaMaquinas)}</span>
              <span class="summary-subtext">Tragamonedas y Peluches</span>
            </div>
          </div>
        </div>

        <!-- Pestañas de Navegación Secundaria de Fase 2 -->
        <div class="ops-tabs">
          <button class="ops-tab-btn ${this.subtabActiva === 'arqueos' ? 'active' : ''}" data-subtab="arqueos">
            <span>🏦 Corte y Arqueo de Caja</span>
            <span class="ops-tab-badge">${data.arqueos.length}</span>
          </button>
          <button class="ops-tab-btn ${this.subtabActiva === 'pagos' ? 'active' : ''}" data-subtab="pagos">
            <span>💵 Pagos a Proveedores</span>
            <span class="ops-tab-badge">${data.pagosDia.length}</span>
          </button>
          <button class="ops-tab-btn ${this.subtabActiva === 'panaderos' ? 'active' : ''}" data-subtab="panaderos">
            <span>🥖 Panaderos (Cambios & Nuevo)</span>
            <span class="ops-tab-badge">${data.panaderos.length}</span>
          </button>
          <button class="ops-tab-btn ${this.subtabActiva === 'tortillerias' ? 'active' : ''}" data-subtab="tortillerias">
            <span>🌽 Tortillerías</span>
            <span class="ops-tab-badge">${data.tortillerias.length}</span>
          </button>
          <button class="ops-tab-btn ${this.subtabActiva === 'pendientes' ? 'active' : ''}" data-subtab="pendientes">
            <span>⏳ Pendientes de Pago</span>
            <span class="ops-tab-badge">${data.pendientesPago.filter(p => p.estado !== 'liquidado').length}</span>
          </button>
          <button class="ops-tab-btn ${this.subtabActiva === 'retiros' ? 'active' : ''}" data-subtab="retiros">
            <span>📤 Retiros de Efectivo</span>
            <span class="ops-tab-badge">${data.retiros.length}</span>
          </button>
          <button class="ops-tab-btn ${this.subtabActiva === 'maquinas' ? 'active' : ''}" data-subtab="maquinas">
            <span>🎰 Tragamonedas & Peluches</span>
            <span class="ops-tab-badge">${data.maquinas.length}</span>
          </button>
        </div>

        <!-- Contenido de las Subsecciones -->
        <div class="ops-section ${this.subtabActiva === 'arqueos' ? 'active' : ''}">
          ${this.renderArqueosSection(data.arqueos)}
        </div>

        <div class="ops-section ${this.subtabActiva === 'pagos' ? 'active' : ''}">
          ${this.renderPagosSection(data.pagosDia)}
        </div>

        <div class="ops-section ${this.subtabActiva === 'panaderos' ? 'active' : ''}">
          ${this.renderPanaderosSection(data.panaderos)}
        </div>

        <div class="ops-section ${this.subtabActiva === 'tortillerias' ? 'active' : ''}">
          ${this.renderTortilleriasSection(data.tortillerias)}
        </div>

        <div class="ops-section ${this.subtabActiva === 'pendientes' ? 'active' : ''}">
          ${this.renderPendientesSection(data.pendientesPago)}
        </div>

        <div class="ops-section ${this.subtabActiva === 'retiros' ? 'active' : ''}">
          ${this.renderRetirosSection(data.retiros)}
        </div>

        <div class="ops-section ${this.subtabActiva === 'maquinas' ? 'active' : ''}">
          ${this.renderMaquinasSection(data.maquinas)}
        </div>

      </div>
    `;

    this.container.innerHTML = html;
    this.bindEvents();
  }

  // ==========================================
  // SUBSECCIÓN 1: ARQUEOS Y CORTES DE CAJA
  // ==========================================
  renderArqueosSection(arqueos) {
    return `
      <div class="content-panel">
        <div class="panel-header">
          <div class="panel-title-group">
            <h2>🏦 Arqueos y Cuadre de Caja (Multi-Turnos)</h2>
            <p>Conteo detallado de monedas ($1, $2, $5, $10), morralla, billetes, tarjetas, Yomp y comparativa con el Sistema</p>
          </div>
          <div class="panel-actions">
            <button class="btn-primary" id="btnNuevoArqueo">
              + Nuevo Arqueo / Turno
            </button>
          </div>
        </div>

        <div class="arqueo-grid">
          ${arqueos.map(arq => {
            const isBalanced = Math.abs(arq.diferencia) < 5;
            const isSobrante = arq.diferencia >= 5;
            const isFaltante = arq.diferencia <= -5;

            return `
              <div class="arqueo-card ${isBalanced ? 'balanced' : (isFaltante ? 'unbalanced' : '')}" data-arq-id="${arq.id}">
                <div class="arqueo-header">
                  <div>
                    <div class="arqueo-title">${arq.turno}</div>
                    <div class="arqueo-time">📅 ${arq.fecha} • 👤 ${arq.cajero}</div>
                  </div>
                  <button class="card-action-btn" data-action="delete-arqueo" data-id="${arq.id}" title="Eliminar arqueo">🗑️</button>
                </div>

                <div class="arqueo-body">
                  
                  <!-- Desglose de Morralla (Monedas $1, $2, $5, $10) -->
                  <div class="coins-section">
                    <div class="coins-title">
                      <span>Desglose de Monedas (Morralla)</span>
                      <span style="color: #0284c7;">Suma: ${this.formatCurrency(arq.morralla)}</span>
                    </div>
                    <div class="coins-grid">
                      <div class="coin-item">
                        <span class="coin-badge">$1</span>
                        <input type="number" min="0" class="coin-count-input" data-arq="${arq.id}" data-field="monedas1" value="${arq.monedas1}" title="Cantidad de monedas de $1">
                        <span style="font-size: 0.75rem; color: #64748b;">$${arq.monedas1 * 1}</span>
                      </div>
                      <div class="coin-item">
                        <span class="coin-badge">$2</span>
                        <input type="number" min="0" class="coin-count-input" data-arq="${arq.id}" data-field="monedas2" value="${arq.monedas2}" title="Cantidad de monedas de $2">
                        <span style="font-size: 0.75rem; color: #64748b;">$${arq.monedas2 * 2}</span>
                      </div>
                      <div class="coin-item">
                        <span class="coin-badge">$5</span>
                        <input type="number" min="0" class="coin-count-input" data-arq="${arq.id}" data-field="monedas5" value="${arq.monedas5}" title="Cantidad de monedas de $5">
                        <span style="font-size: 0.75rem; color: #64748b;">$${arq.monedas5 * 5}</span>
                      </div>
                      <div class="coin-item">
                        <span class="coin-badge">$10</span>
                        <input type="number" min="0" class="coin-count-input" data-arq="${arq.id}" data-field="monedas10" value="${arq.monedas10}" title="Cantidad de monedas de $10">
                        <span style="font-size: 0.75rem; color: #64748b;">$${arq.monedas10 * 10}</span>
                      </div>
                    </div>
                    <div class="morralla-total-row">
                      <span>Total Morralla:</span>
                      <span style="color: #0284c7;">${this.formatCurrency(arq.morralla)}</span>
                    </div>
                  </div>

                  <!-- Billetes -->
                  <div class="arqueo-row">
                    <span class="arqueo-label">💵 Total Billetes ($)</span>
                    <input type="number" step="10" class="arqueo-input" data-arq="${arq.id}" data-field="billetes" value="${arq.billetes}">
                  </div>

                  <!-- Subtotal Efectivo Físico -->
                  <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 700; color: #0f172a; padding: 4px 8px; background: #e2e8f0; border-radius: 4px;">
                    <span>Total Efectivo en Caja:</span>
                    <span>${this.formatCurrency(arq.totalEfectivo)}</span>
                  </div>

                  <!-- Terminales y Medios de Pago Electrónico -->
                  <div class="arqueo-row">
                    <span class="arqueo-label">💳 Tarjetas Bancarias ($)</span>
                    <input type="number" step="0.5" class="arqueo-input" data-arq="${arq.id}" data-field="tarjetas" value="${arq.tarjetas}">
                  </div>

                  <div class="arqueo-row">
                    <span class="arqueo-label">📲 Yomp Tarjetas / QR ($)</span>
                    <input type="number" step="0.5" class="arqueo-input" data-arq="${arq.id}" data-field="yompTarjetas" value="${arq.yompTarjetas}">
                  </div>

                  <!-- Retiros y Pagos del Turno (Para cuadre exacto) -->
                  <div class="arqueo-row">
                    <span class="arqueo-label" title="Dinero que salió de caja en este turno">📤 Retiros del Turno ($)</span>
                    <input type="number" step="10" class="arqueo-input" data-arq="${arq.id}" data-field="retirosTurno" value="${arq.retirosTurno}">
                  </div>

                  <div class="arqueo-row">
                    <span class="arqueo-label" title="Pagos a proveedores pagados desde caja">🧾 Pagos a Proveedores ($)</span>
                    <input type="number" step="10" class="arqueo-input" data-arq="${arq.id}" data-field="pagosTurno" value="${arq.pagosTurno}">
                  </div>

                  <!-- Venta Registrada en Sistema POS -->
                  <div class="arqueo-row" style="background: #f8fafc; padding: 6px 8px; border-radius: 6px; border: 1px dashed #cbd5e1;">
                    <span class="arqueo-label" style="font-weight: 700; color: #1e293b;">🖥️ Venta Según Sistema ($)</span>
                    <input type="number" step="0.5" class="arqueo-input" style="border-color: #3b82f6; font-weight: 800;" data-arq="${arq.id}" data-field="sistema" value="${arq.sistema}">
                  </div>

                  <!-- Cuadro de Balance y Totales -->
                  <div class="arqueo-totals-box">
                    <div class="arqueo-subtotal">
                      <span>Efectivo + Tarjetas + Yomp:</span>
                      <strong>${this.formatCurrency(arq.totalEfectivo + arq.tarjetas + arq.yompTarjetas)}</strong>
                    </div>
                    <div class="arqueo-subtotal">
                      <span>+ Egresos (Retiros & Pagos):</span>
                      <strong>${this.formatCurrency(arq.retirosTurno + arq.pagosTurno)}</strong>
                    </div>
                    <div class="arqueo-grand-total">
                      <span>Total Justificado / Caja:</span>
                      <span>${this.formatCurrency(arq.totalDeclarado)}</span>
                    </div>
                  </div>

                  <!-- Resultado de Balance (Faltante / Sobrante / Cuadrado) -->
                  <div class="arqueo-difference-badge ${isBalanced ? 'difference-balanced' : (isSobrante ? 'difference-sobrante' : 'difference-faltante')}">
                    <span>${isBalanced ? '✅ CAJA CUADRADA' : (isSobrante ? '🟢 SOBRANTE EN CAJA' : '🔴 FALTANTE EN CAJA')}</span>
                    <span>${this.formatCurrency(Math.abs(arq.diferencia))}</span>
                  </div>

                  ${arq.notas ? `
                    <div style="font-size: 0.74rem; color: #64748b; font-style: italic;">
                      💬 ${arq.notas}
                    </div>
                  ` : ''}

                </div>

                <div class="arqueo-footer">
                  <button class="btn-secondary" data-action="print-ticket" data-id="${arq.id}">
                    🖨️ Imprimir Ticket de Corte
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // ==========================================
  // SUBSECCIÓN 2: PAGOS DEL DÍA A PROVEEDORES
  // ==========================================
  renderPagosSection(pagos) {
    const total = pagos.reduce((acc, p) => acc + (parseFloat(p.monto) || 0), 0);

    return `
      <div class="content-panel">
        <div class="panel-header">
          <div class="panel-title-group">
            <h2>💵 Registro de Pagos del Día</h2>
            <p>Control exacto de todo el dinero entregado hoy a repartidores y proveedores</p>
          </div>
          <div class="panel-actions">
            <span class="stats-pill">Total Pagado: <strong class="highlight">${this.formatCurrency(total)}</strong></span>
            <button class="btn-primary" id="btnNuevoPago">
              + Registrar Pago
            </button>
          </div>
        </div>

        <div class="data-table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Proveedor / Empresa</th>
                <th>Comprobante / Folio</th>
                <th>Método de Pago</th>
                <th>Cajero / Responsable</th>
                <th>Monto Pagado</th>
                <th>Notas</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${pagos.length === 0 ? `
                <tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 24px;">No se han registrado pagos el día de hoy</td></tr>
              ` : pagos.map(p => `
                <tr>
                  <td><strong>${p.hora}</strong></td>
                  <td><div style="font-weight: 700; color: #0f172a;">${p.proveedor}</div></td>
                  <td><span class="table-tag" style="background: #f1f5f9; color: #334155;">${p.comprobante || 'Sin folio'}</span></td>
                  <td>💳 ${p.metodo}</td>
                  <td>👤 ${p.cajero || 'Caja Central'}</td>
                  <td class="table-amount" style="color: #dc2626; font-size: 0.95rem;">${this.formatCurrency(p.monto)}</td>
                  <td><small style="color: #64748b;">${p.notas || '-'}</small></td>
                  <td>
                    <button class="card-action-btn" data-action="delete-pago" data-id="${p.id}" title="Eliminar pago">🗑️</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ==========================================
  // SUBSECCIÓN 3: MÓDULO PANADEROS
  // ==========================================
  renderPanaderosSection(panaderos) {
    const totalLiquidado = panaderos.reduce((acc, p) => acc + (parseFloat(p.total) || 0), 0);

    return `
      <div class="content-panel">
        <div class="panel-header">
          <div class="panel-title-group">
            <h2>🥖 Control y Liquidación de Panaderos</h2>
            <p>Cálculo automático: Total a Pagar = (Pan Dulce + Bolillo) - Cambios / Merma devuelta</p>
          </div>
          <div class="panel-actions">
            <span class="stats-pill">Total Neto: <strong class="highlight">${this.formatCurrency(totalLiquidado)}</strong></span>
            <button class="btn-primary" id="btnNuevoPanadero">
              + Registrar Panadería
            </button>
          </div>
        </div>

        <div class="data-table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Panadería / Proveedor</th>
                <th>Cambios (Merma devuelta)</th>
                <th>Pan Dulce ($)</th>
                <th>Bolillo / Telera ($)</th>
                <th>Total a Pagar</th>
                <th>Estado</th>
                <th>Notas</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${panaderos.length === 0 ? `
                <tr><td colspan="9" style="text-align: center; color: #94a3b8; padding: 24px;">No hay registros de panaderías hoy</td></tr>
              ` : panaderos.map(pan => `
                <tr>
                  <td><strong>${pan.hora}</strong></td>
                  <td><div style="font-weight: 700; color: #0f172a;">${pan.proveedor}</div></td>
                  <td style="color: #dc2626; font-weight: 600;">-${this.formatCurrency(pan.cambios)}</td>
                  <td style="color: #0284c7; font-weight: 600;">+${this.formatCurrency(pan.dulces)}</td>
                  <td style="color: #0284c7; font-weight: 600;">+${this.formatCurrency(pan.bolillo)}</td>
                  <td class="table-amount" style="font-size: 1rem; color: #00aa44;">${this.formatCurrency(pan.total)}</td>
                  <td>
                    <button class="deal-status-pill ${pan.pagado ? 'status-pagado' : 'status-en-tienda'}" data-action="toggle-pan-pagado" data-id="${pan.id}">
                      ${pan.pagado ? '✅ PAGADO' : '⏳ PENDIENTE'}
                    </button>
                  </td>
                  <td><small style="color: #64748b;">${pan.notas || '-'}</small></td>
                  <td>
                    <button class="card-action-btn" data-action="delete-pan" data-id="${pan.id}" title="Eliminar registro">🗑️</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ==========================================
  // SUBSECCIÓN 4: MÓDULO TORTILLERÍAS
  // ==========================================
  renderTortilleriasSection(tortillerias) {
    const totalLiquidado = tortillerias.reduce((acc, t) => acc + (parseFloat(t.total) || 0), 0);

    return `
      <div class="content-panel">
        <div class="panel-header">
          <div class="panel-title-group">
            <h2>🌽 Control y Conteo de Tortillerías</h2>
            <p>Cálculo automático: Total a Pagar = Producto Nuevo - Cambio (Merma devuelta)</p>
          </div>
          <div class="panel-actions">
            <span class="stats-pill">Total Neto: <strong class="highlight">${this.formatCurrency(totalLiquidado)}</strong></span>
            <button class="btn-primary" id="btnNuevaTortilleria">
              + Registrar Tortillería
            </button>
          </div>
        </div>

        <div class="data-table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Tortillería / Proveedor</th>
                <th>Cambio (Merma devuelta)</th>
                <th>Producto Nuevo</th>
                <th>Total Neto a Liquidar</th>
                <th>Estado</th>
                <th>Notas</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${tortillerias.length === 0 ? `
                <tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 24px;">No hay registros de tortillas hoy</td></tr>
              ` : tortillerias.map(tort => `
                <tr>
                  <td><strong>${tort.hora}</strong></td>
                  <td><div style="font-weight: 700; color: #0f172a;">${tort.proveedor}</div></td>
                  <td style="color: #dc2626; font-weight: 600;">-${this.formatCurrency(tort.cambio)}</td>
                  <td style="color: #0284c7; font-weight: 600;">+${this.formatCurrency(tort.nuevo)}</td>
                  <td class="table-amount" style="font-size: 1rem; color: #00aa44;">${this.formatCurrency(tort.total)}</td>
                  <td>
                    <button class="deal-status-pill ${tort.pagado ? 'status-pagado' : 'status-en-tienda'}" data-action="toggle-tort-pagada" data-id="${tort.id}">
                      ${tort.pagado ? '✅ PAGADO' : '⏳ PENDIENTE'}
                    </button>
                  </td>
                  <td><small style="color: #64748b;">${tort.notas || '-'}</small></td>
                  <td>
                    <button class="card-action-btn" data-action="delete-tort" data-id="${tort.id}" title="Eliminar registro">🗑️</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ==========================================
  // SUBSECCIÓN 5: PENDIENTES DE PAGO
  // ==========================================
  renderPendientesSection(pendientes) {
    const activos = pendientes.filter(p => p.estado !== 'liquidado');
    const totalPendiente = activos.reduce((acc, p) => acc + (parseFloat(p.monto) || 0), 0);

    return `
      <div class="content-panel">
        <div class="panel-header">
          <div class="panel-title-group">
            <h2>⏳ Cuentas por Pagar (Próximos Días)</h2>
            <p>Registro de deudas, créditos de mercancía y facturas con vencimiento futuro</p>
          </div>
          <div class="panel-actions">
            <span class="stats-pill">Por Liquidar: <strong class="highlight">${this.formatCurrency(totalPendiente)}</strong></span>
            <button class="btn-primary" id="btnNuevoPendiente">
              + Nuevo Pendiente
            </button>
          </div>
        </div>

        <div class="data-table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Fecha Límite / Vencimiento</th>
                <th>Proveedor</th>
                <th>Concepto / Folio Factura</th>
                <th>Monto Pendiente</th>
                <th>Estado</th>
                <th>Observaciones</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${pendientes.length === 0 ? `
                <tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 24px;">No hay cuentas pendientes registradas</td></tr>
              ` : pendientes.map(pend => `
                <tr style="${pend.estado === 'liquidado' ? 'opacity: 0.6;' : ''}">
                  <td><strong>📅 ${pend.fechaVencimiento}</strong></td>
                  <td><div style="font-weight: 700; color: #0f172a;">${pend.proveedor}</div></td>
                  <td><span class="table-tag" style="background: #f1f5f9; color: #334155;">${pend.concepto}</span></td>
                  <td class="table-amount" style="color: #dc2626; font-size: 0.95rem;">${this.formatCurrency(pend.monto)}</td>
                  <td>
                    <span class="deal-status-pill ${pend.estado === 'liquidado' ? 'status-pagado' : 'status-en-tienda'}">
                      ${pend.estado === 'liquidado' ? 'LIQUIDADO' : 'PENDIENTE'}
                    </span>
                  </td>
                  <td><small style="color: #64748b;">${pend.notas || '-'}</small></td>
                  <td>
                    <div style="display: flex; gap: 6px;">
                      ${pend.estado !== 'liquidado' ? `
                        <button class="btn-primary" style="height: 30px; font-size: 0.76rem; padding: 0 10px;" data-action="liquidar-pendiente" data-id="${pend.id}">
                          Liquidar a Caja
                        </button>
                      ` : ''}
                      <button class="card-action-btn" data-action="delete-pendiente" data-id="${pend.id}" title="Eliminar">🗑️</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ==========================================
  // SUBSECCIÓN 6: RETIROS DE EFECTIVO
  // ==========================================
  renderRetirosSection(retiros) {
    const totalRetirado = retiros.reduce((acc, r) => acc + (parseFloat(r.monto) || 0), 0);

    return `
      <div class="content-panel">
        <div class="panel-header">
          <div class="panel-title-group">
            <h2>📤 Retiros de Efectivo de Caja</h2>
            <p>Salidas de efectivo autorizadas para resguardo de seguridad, depósitos bancarios o gastos mayores</p>
          </div>
          <div class="panel-actions">
            <span class="stats-pill">Total Retirado Hoy: <strong style="color: #dc2626;">${this.formatCurrency(totalRetirado)}</strong></span>
            <button class="btn-primary" id="btnNuevoRetiro">
              + Registrar Retiro
            </button>
          </div>
        </div>

        <div class="data-table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Monto Retirado</th>
                <th>Nombre del Responsable</th>
                <th>Motivo / Destino</th>
                <th>Autorizado por</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${retiros.length === 0 ? `
                <tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 24px;">No se han efectuado retiros de efectivo hoy</td></tr>
              ` : retiros.map(ret => `
                <tr>
                  <td><strong>${ret.hora}</strong></td>
                  <td class="table-amount" style="color: #dc2626; font-size: 1rem;">${this.formatCurrency(ret.monto)}</td>
                  <td><div style="font-weight: 700; color: #0f172a;">👤 ${ret.responsable}</div></td>
                  <td>${ret.motivo}</td>
                  <td><span class="table-tag" style="background: #e0f2fe; color: #0369a1;">${ret.autorizo || 'Gerencia'}</span></td>
                  <td>
                    <button class="card-action-btn" data-action="delete-retiro" data-id="${ret.id}" title="Eliminar retiro">🗑️</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ==========================================
  // SUBSECCIÓN 7: MÁQUINAS TRAGAMONEDAS Y PELUCHES
  // ==========================================
  renderMaquinasSection(maquinas) {
    const totalContado = maquinas.reduce((acc, m) => acc + (parseFloat(m.montoTotal) || 0), 0);
    const totalTienda = maquinas.reduce((acc, m) => acc + (parseFloat(m.gananciaTienda) || 0), 0);
    const totalProveedor = maquinas.reduce((acc, m) => acc + (parseFloat(m.pagoProveedor) || 0), 0);

    return `
      <div class="content-panel">
        <div class="panel-header">
          <div class="panel-title-group">
            <h2>🎰 Recaudación de Máquinas Tragamonedas y Peluches</h2>
            <p>Cálculo de recaudación total, porcentaje para la tienda y reparto para el dueño de la máquina</p>
          </div>
          <div class="panel-actions">
            <span class="stats-pill">Ganancia Tienda: <strong class="highlight">${this.formatCurrency(totalTienda)}</strong></span>
            <button class="btn-primary" id="btnNuevaMaquina">
              + Registrar Recaudación
            </button>
          </div>
        </div>

        <div class="data-table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Nombre / Tipo de Máquina</th>
                <th>Contador Anterior / Actual</th>
                <th>Monto Total Recaudado</th>
                <th>% Tienda</th>
                <th>Ganancia para Tienda</th>
                <th>Pago a Dueño Máquina</th>
                <th>Responsable</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${maquinas.length === 0 ? `
                <tr><td colspan="9" style="text-align: center; color: #94a3b8; padding: 24px;">No hay registros de recaudación de máquinas</td></tr>
              ` : maquinas.map(m => `
                <tr>
                  <td><strong>${m.fecha}</strong></td>
                  <td><div style="font-weight: 700; color: #0f172a;">${m.nombreMaquina}</div></td>
                  <td><small style="color: #64748b;">${m.contadorAnterior} ➔ ${m.contadorActual}</small></td>
                  <td class="table-amount" style="font-size: 0.95rem;">${this.formatCurrency(m.montoTotal)}</td>
                  <td><span class="table-tag" style="background: #fef3c7; color: #b45309;">${m.porcentajeTienda}%</span></td>
                  <td class="table-amount positive">${this.formatCurrency(m.gananciaTienda)}</td>
                  <td class="table-amount" style="color: #64748b;">${this.formatCurrency(m.pagoProveedor)}</td>
                  <td>👤 ${m.responsable}</td>
                  <td>
                    <button class="card-action-btn" data-action="delete-maquina" data-id="${m.id}" title="Eliminar registro">🗑️</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ==========================================
  // EVENT LISTENERS Y VINCULACIÓN
  // ==========================================
  bindEvents() {
    // Cambio de subpestañas
    this.container.querySelectorAll('.ops-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const subtab = btn.getAttribute('data-subtab');
        this.setSubtab(subtab);
      });
    });

    // Botones para abrir modales
    const bindBtnModal = (btnId, modalKey) => {
      const btn = this.container.querySelector(`#${btnId}`);
      if (btn && this.modalCallbacks[modalKey]) {
        btn.addEventListener('click', () => this.modalCallbacks[modalKey]());
      }
    };

    bindBtnModal('btnNuevoArqueo', 'openNuevoArqueo');
    bindBtnModal('btnNuevoPago', 'openNuevoPago');
    bindBtnModal('btnNuevoPanadero', 'openNuevoPanadero');
    bindBtnModal('btnNuevaTortilleria', 'openNuevaTortilleria');
    bindBtnModal('btnNuevoPendiente', 'openNuevoPendiente');
    bindBtnModal('btnNuevoRetiro', 'openNuevoRetiro');
    bindBtnModal('btnNuevaMaquina', 'openNuevaMaquina');

    // Edición en tiempo real de inputs de arqueo (monedas, billetes, tarjetas, sistema)
    this.container.querySelectorAll('.coin-count-input, .arqueo-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const arqId = e.target.getAttribute('data-arq');
        const field = e.target.getAttribute('data-field');
        const val = parseFloat(e.target.value) || 0;

        if (arqId && field) {
          stateManager.updateArqueo(arqId, { [field]: val });
        }
      });
    });

    // Botones de acción en tablas
    this.container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = btn.getAttribute('data-action');
        const id = btn.getAttribute('data-id');

        if (action === 'delete-arqueo') {
          if (confirm('¿Eliminar esta sesión de arqueo?')) stateManager.deleteArqueo(id);
        } else if (action === 'delete-pago') {
          if (confirm('¿Eliminar este registro de pago?')) stateManager.deletePagoDia(id);
        } else if (action === 'toggle-pan-pagado') {
          stateManager.togglePanaderoPagado(id);
        } else if (action === 'delete-pan') {
          if (confirm('¿Eliminar registro de panadería?')) stateManager.deletePanadero(id);
        } else if (action === 'toggle-tort-pagada') {
          stateManager.toggleTortilleriaPagada(id);
        } else if (action === 'delete-tort') {
          if (confirm('¿Eliminar registro de tortillería?')) stateManager.deleteTortilleria(id);
        } else if (action === 'liquidar-pendiente') {
          stateManager.liquidarPendientePago(id);
        } else if (action === 'delete-pendiente') {
          if (confirm('¿Eliminar cuenta pendiente?')) stateManager.deletePendientePago(id);
        } else if (action === 'delete-retiro') {
          if (confirm('¿Eliminar registro de retiro?')) stateManager.deleteRetiro(id);
        } else if (action === 'delete-maquina') {
          if (confirm('¿Eliminar recaudación de máquina?')) stateManager.deleteMaquina(id);
        } else if (action === 'print-ticket') {
          if (this.modalCallbacks.printArqueoTicket) {
            const arq = stateManager.data.arqueos.find(a => a.id === id);
            this.modalCallbacks.printArqueoTicket(arq);
          }
        }
      });
    });
  }

  setupEventListeners() {
    stateManager.subscribe(() => {
      this.render();
    });
  }
}
