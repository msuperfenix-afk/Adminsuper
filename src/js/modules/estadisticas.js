/**
 * Módulo de Estadísticas Generales y por Proveedor - Minisúper Fénix
 */

import { stateManager } from '../state.js';
import { CATEGORIAS_PROVEEDOR, DIAS_SEMANA } from './pipeline.js';

export class EstadisticasModule {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.vistaActiva = 'generales'; // 'generales' o 'proveedor'
    this.proveedorSeleccionado = '';

    this.init();
  }

  init() {
    // Inicializar proveedor por defecto con el primer proveedor del catálogo si no hay uno
    const catalogo = stateManager.getProveedoresCatalogo();
    if (catalogo.length > 0 && !this.proveedorSeleccionado) {
      this.proveedorSeleccionado = catalogo[0].nombre;
    }

    this.render();
    this.setupEventListeners();
  }

  formatMoney(v) {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v || 0);
  }

  formatPercent(v) {
    return (v || 0).toFixed(1) + '%';
  }

  render() {
    if (!this.container) return;

    let html = `
      <div class="stats-module-layout">
        
        <!-- PESTAÑAS PRINCIPALES DEL MÓDULO -->
        <div class="stats-tab-nav">
          <button type="button" class="stats-tab-btn ${this.vistaActiva === 'generales' ? 'active' : ''}" id="btnTabStatsGenerales">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10"></path><path d="M12 20V4"></path><path d="M6 20v-6"></path></svg>
            <span>Estadísticas Generales</span>
          </button>
          <button type="button" class="stats-tab-btn ${this.vistaActiva === 'proveedor' ? 'active' : ''}" id="btnTabStatsProveedor">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <span>Estadísticas por Proveedor</span>
          </button>
        </div>

        <div class="stats-tab-content">
          ${this.vistaActiva === 'generales' ? this.renderVistaGenerales() : this.renderVistaProveedor()}
        </div>

      </div>
    `;

    this.container.innerHTML = html;
    this.bindEvents();
  }

  renderVistaGenerales() {
    const stats = stateManager.getEstadisticasGenerales();
    const topProveedores = stateManager.getTopProveedores(8);

    // Calcular proporciones de días de la semana
    const maxDia = Math.max(1, ...Object.values(stats.gastoPorDiaSemana));

    return `
      <div class="stats-generales-view">
        
        <!-- KPI METRICS GRID -->
        <div class="stats-kpi-grid">
          <div class="stats-kpi-card highlight-card">
            <div class="kpi-icon-pill icon-blue" style="font-weight: 800; font-size: 0.75rem;">TOTAL</div>
            <div class="kpi-info">
              <span class="kpi-label">Total Pagado a Proveedores</span>
              <strong class="kpi-value text-blue">${this.formatMoney(stats.totalPagado)}</strong>
              <span class="kpi-subtext">Histórico acumulado de compras</span>
            </div>
          </div>

          <div class="stats-kpi-card">
            <div class="kpi-icon-pill icon-green" style="font-weight: 800; font-size: 0.75rem;">EFEC</div>
            <div class="kpi-info">
              <span class="kpi-label">Total en Efectivo</span>
              <strong class="kpi-value text-green">${this.formatMoney(stats.totalEfectivo)}</strong>
              <span class="kpi-subtext">${this.formatPercent(stats.pctEfectivo)} del desembolso total</span>
            </div>
          </div>

          <div class="stats-kpi-card">
            <div class="kpi-icon-pill icon-purple" style="font-weight: 800; font-size: 0.75rem;">TR</div>
            <div class="kpi-info">
              <span class="kpi-label">Total por Transferencia</span>
              <strong class="kpi-value text-purple">${this.formatMoney(stats.totalTransferencia)}</strong>
              <span class="kpi-subtext">${this.formatPercent(stats.pctTransferencia)} de pagos bancarios</span>
            </div>
          </div>

          <div class="stats-kpi-card">
            <div class="kpi-icon-pill icon-amber" style="font-weight: 800; font-size: 0.75rem;">NOTAS</div>
            <div class="kpi-info">
              <span class="kpi-label">Compras Realizadas</span>
              <strong class="kpi-value">${stats.totalNotas} <small style="font-size: 0.8rem; font-weight: normal; color:#64748b;">notas</small></strong>
              <span class="kpi-subtext">Promedio: <strong>${this.formatMoney(stats.promedioPorCompra)}</strong> / compra</span>
            </div>
          </div>
        </div>

        <!-- BARRA COMPARATIVA DE MÉTODOS DE PAGO -->
        <div class="stats-section-card">
          <div class="stats-card-header">
            <div>
              <h3 class="stats-card-title">Proporción de Métodos de Pago</h3>
              <p class="stats-card-subtitle">Desglose de Efectivo vs Transferencia en todas las compras registradas</p>
            </div>
          </div>
          
          <div class="stats-pago-bar-container">
            <div class="stats-pago-bar">
              <div class="pago-bar-fill bar-efectivo" style="width: ${Math.max(5, stats.pctEfectivo)}%;" title="Efectivo: ${this.formatMoney(stats.totalEfectivo)} (${this.formatPercent(stats.pctEfectivo)})">
                ${stats.pctEfectivo > 15 ? `<span>Efectivo ${this.formatPercent(stats.pctEfectivo)}</span>` : ''}
              </div>
              <div class="pago-bar-fill bar-transferencia" style="width: ${Math.max(5, stats.pctTransferencia)}%;" title="Transferencia: ${this.formatMoney(stats.totalTransferencia)} (${this.formatPercent(stats.pctTransferencia)})">
                ${stats.pctTransferencia > 15 ? `<span>Transferencia ${this.formatPercent(stats.pctTransferencia)}</span>` : ''}
              </div>
            </div>

            <div class="stats-pago-legend">
              <div class="legend-item">
                <span class="legend-color-dot dot-efectivo"></span>
                <span>Efectivo de Caja: <strong>${this.formatMoney(stats.totalEfectivo)}</strong> (${this.formatPercent(stats.pctEfectivo)})</span>
              </div>
              <div class="legend-item">
                <span class="legend-color-dot dot-transferencia"></span>
                <span>Transferencia Bancaria: <strong>${this.formatMoney(stats.totalTransferencia)}</strong> (${this.formatPercent(stats.pctTransferencia)})</span>
              </div>
            </div>
          </div>
        </div>

        <!-- DOS COLUMNAS: GASTO POR DÍA DE SEMANA & TOP PROVEEDORES -->
        <div class="stats-two-cols-grid">
          
          <!-- Columna 1: Desembolso por Día de la Semana -->
          <div class="stats-section-card">
            <div class="stats-card-header">
              <h3 class="stats-card-title">Desembolso por Día de la Semana</h3>
              <p class="stats-card-subtitle">Total acumulado pagado según el día de visita</p>
            </div>
            <div class="dias-semana-chart">
              ${DIAS_SEMANA.map(d => {
                const monto = stats.gastoPorDiaSemana[d.id] || 0;
                const pct = (monto / maxDia) * 100;
                return `
                  <div class="dia-bar-row">
                    <span class="dia-label font-bold">${d.nombre}</span>
                    <div class="dia-bar-track">
                      <div class="dia-bar-fill" style="width: ${Math.max(4, pct)}%;"></div>
                    </div>
                    <span class="dia-monto-val font-bold">${this.formatMoney(monto)}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Columna 2: Distribución por Categorías de Producto -->
          <div class="stats-section-card">
            <div class="stats-card-header">
              <h3 class="stats-card-title">Gastos por Categoría</h3>
              <p class="stats-card-subtitle">Distribución del gasto según el rubro de productos</p>
            </div>
            <div class="categorias-chart-wrap">
              ${Object.entries(CATEGORIAS_PROVEEDOR).map(([key, cat]) => {
                const monto = stats.gastoPorCategoria[key] || 0;
                const pct = stats.totalPagado > 0 ? ((monto / stats.totalPagado) * 100) : 0;
                return `
                  <div class="cat-bar-row">
                    <div class="cat-bar-header">
                      <span class="cat-name font-bold" style="color: ${cat.color};">${cat.nombre}</span>
                      <strong class="cat-amount">${this.formatMoney(monto)} <small style="color:#64748b; font-weight:normal;">(${this.formatPercent(pct)})</small></strong>
                    </div>
                    <div class="cat-bar-track">
                      <div class="cat-bar-fill" style="width: ${Math.max(2, pct)}%; background: ${cat.color};"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

        </div>

        <!-- TOP 8 PROVEEDORES CON MAYOR FACTURACIÓN -->
        <div class="stats-section-card" style="margin-top: 18px;">
          <div class="stats-card-header">
            <div>
              <h3 class="stats-card-title">Top Proveedores con Mayor Desembolso</h3>
              <p class="stats-card-subtitle">Empresas con mayor volumen de compras acumulado</p>
            </div>
          </div>
          <div class="table-responsive">
            <table class="provdb-table">
              <thead>
                <tr>
                  <th style="width: 50px; text-align: center;">LUGAR</th>
                  <th>PROVEEDOR</th>
                  <th style="width: 180px;">CATEGORÍA</th>
                  <th style="width: 140px; text-align: center;">FORMA DE PAGO</th>
                  <th style="width: 130px; text-align: center;">COMPRAS</th>
                  <th style="width: 150px; text-align: right;">PROMEDIO / COMPRA</th>
                  <th style="width: 170px; text-align: right;">TOTAL PAGADO</th>
                </tr>
              </thead>
              <tbody>
                ${topProveedores.map((p, idx) => {
                  const medallas = ['1°', '2°', '3°', '4°', '5°', '6°', '7°', '8°'];
                  const catInfo = CATEGORIAS_PROVEEDOR[p.categoria] || { nombre: p.categoria || 'Abarrotes', color: '#334155', bg: '#f1f5f9' };
                  const esTransf = (p.tipoPago || '').toLowerCase().includes('transferencia');
                  return `
                    <tr>
                      <td class="text-center font-bold" style="color: ${idx < 3 ? '#1e40af' : '#64748b'};">${medallas[idx]}</td>
                      <td>
                        <strong style="color: #0f172a; font-size: 0.95rem;">${p.nombre}</strong>
                      </td>
                      <td>
                        <span class="provdb-cat-badge" style="color: ${catInfo.color}; background: ${catInfo.bg};">
                          ${catInfo.nombre}
                        </span>
                      </td>
                      <td class="text-center">
                        <span class="badge-tipo-pago ${esTransf ? 'badge-pago-transf' : 'badge-pago-efec'}">
                          ${esTransf ? 'Transferencia' : 'Efectivo'}
                        </span>
                      </td>
                      <td class="text-center font-bold" style="color: #475569;">${p.totalCompras}</td>
                      <td class="text-right font-bold" style="color: #334155;">${this.formatMoney(p.promedioPorCompra)}</td>
                      <td class="text-right font-bold" style="color: #0f172a; font-size: 0.96rem;">${this.formatMoney(p.totalPagado)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;
  }

  renderVistaProveedor() {
    const catalogo = stateManager.getProveedoresCatalogo();
    const provActual = this.proveedorSeleccionado || (catalogo.length > 0 ? catalogo[0].nombre : '');
    const stats = stateManager.getEstadisticasProveedor(provActual);
    const catInfo = stats ? (CATEGORIAS_PROVEEDOR[stats.categoria] || { nombre: stats.categoria || 'Abarrotes', color: '#334155', bg: '#f1f5f9' }) : null;

    return `
      <div class="stats-proveedor-view">
        
        <!-- SELECTOR DE PROVEEDOR SUPERIOR -->
        <div class="stats-prov-selector-card">
          <div class="selector-field-group">
            <label for="selectProveedorStats" class="font-bold" style="font-size: 0.88rem; color: #1e293b;">
              Seleccionar Proveedor:
            </label>
            <div style="display: flex; gap: 10px; align-items: center; flex: 1;">
              <select id="selectProveedorStats" class="prov-selector-select">
                ${catalogo.map(p => `
                  <option value="${p.nombre}" ${p.nombre === provActual ? 'selected' : ''}>
                    ${p.nombre} (${CATEGORIAS_PROVEEDOR[p.categoria]?.nombre || p.categoria})
                  </option>
                `).join('')}
              </select>
            </div>
          </div>
        </div>

        ${stats ? `
          <!-- TARJETAS DE MÉTRICAS DEL PROVEEDOR SELECCIONADO -->
          <div class="stats-kpi-grid" style="margin-top: 16px;">
            <div class="stats-kpi-card highlight-card">
              <div class="kpi-icon-pill icon-blue" style="font-weight: 800; font-size: 0.75rem;">PROV</div>
              <div class="kpi-info">
                <span class="kpi-label">Proveedor</span>
                <strong class="kpi-value" style="font-size: 1.18rem;">${stats.nombre}</strong>
                <span class="kpi-subtext" style="color: ${catInfo?.color}; font-weight: 600;">${catInfo?.nombre || stats.categoria}</span>
              </div>
            </div>

            <div class="stats-kpi-card">
              <div class="kpi-icon-pill icon-green" style="font-weight: 800; font-size: 0.75rem;">TOTAL</div>
              <div class="kpi-info">
                <span class="kpi-label">Total Histórico Pagado</span>
                <strong class="kpi-value text-green">${this.formatMoney(stats.totalPagado)}</strong>
                <span class="kpi-subtext">${stats.totalCompras} notas registradas</span>
              </div>
            </div>

            <div class="stats-kpi-card">
              <div class="kpi-icon-pill icon-purple" style="font-weight: 800; font-size: 0.75rem;">PROM</div>
              <div class="kpi-info">
                <span class="kpi-label">Gasto Promedio por Compra</span>
                <strong class="kpi-value text-purple">${this.formatMoney(stats.promedioPorCompra)}</strong>
                <span class="kpi-subtext">Presupuesto base: <strong>${this.formatMoney(stats.presupuestoHabitual)}</strong></span>
              </div>
            </div>

            <div class="stats-kpi-card">
              <div class="kpi-icon-pill icon-amber" style="font-weight: 800; font-size: 0.75rem;">PAGO</div>
              <div class="kpi-info">
                <span class="kpi-label">Forma de Pago Habitual</span>
                <strong class="kpi-value" style="font-size: 1.05rem;">${stats.tipoPagoHabitual}</strong>
                <span class="kpi-subtext">${stats.conteoEfectivo} efec • ${stats.conteoTransferencia} transf</span>
              </div>
            </div>
          </div>

          <!-- COMPARATIVA DE PRESUPUESTO VS GASTO REAL PROMEDIO -->
          <div class="stats-section-card" style="margin-top: 16px;">
            <div class="stats-card-header">
              <h3 class="stats-card-title">Análisis de Desempeño: ${stats.nombre}</h3>
            </div>
            
            <div class="prov-analisis-grid">
              <div class="analisis-box">
                <span class="analisis-lbl">Presupuesto Estimado</span>
                <strong class="analisis-val">${this.formatMoney(stats.presupuestoHabitual)}</strong>
                <small style="color: #64748b;">Asignado en el catálogo</small>
              </div>

              <div class="analisis-box">
                <span class="analisis-lbl">Compra Real Promedio</span>
                <strong class="analisis-val">${this.formatMoney(stats.promedioPorCompra)}</strong>
                <small style="color: #64748b;">Calculado de las hojas diarias</small>
              </div>

              <div class="analisis-box ${stats.diferenciaPresupuesto > 0 ? 'box-excedido' : 'box-ahorro'}">
                <span class="analisis-lbl">Diferencia vs Presupuesto</span>
                <strong class="analisis-val ${stats.diferenciaPresupuesto > 0 ? 'text-red' : 'text-green'}">
                  ${stats.diferenciaPresupuesto > 0 ? `+${this.formatMoney(stats.diferenciaPresupuesto)}` : (stats.diferenciaPresupuesto < 0 ? `-${this.formatMoney(Math.abs(stats.diferenciaPresupuesto))}` : '$0.00')}
                </strong>
                <small>${stats.diferenciaPresupuesto > 0 ? 'Compra promedio supera el estimado' : (stats.diferenciaPresupuesto < 0 ? 'Dentro del margen presupuestal' : 'En línea con lo previsto')}</small>
              </div>

              <div class="analisis-box">
                <span class="analisis-lbl">Día y Contacto</span>
                <strong class="analisis-val" style="font-size: 0.95rem; text-transform: capitalize;">${stats.diaHabitual || 'Variable'}</strong>
                <small style="color: #64748b;">${stats.contacto || 'Sin teléfono registrado'}</small>
              </div>
            </div>
          </div>

          <!-- TABLA CRONOLÓGICA DE COMPRAS DEL PROVEEDOR -->
          <div class="stats-section-card" style="margin-top: 16px;">
            <div class="stats-card-header">
              <div>
                <h3 class="stats-card-title">Historial de Compras y Pagos Realizados</h3>
                <p class="stats-card-subtitle">Relación detallada de todas las notas liquidadas a este proveedor</p>
              </div>
              <span class="provdb-table-count">${stats.comprasHistorial.length} registros</span>
            </div>

            <div class="table-responsive">
              <table class="provdb-table">
                <thead>
                  <tr>
                    <th style="width: 50px; text-align: center;">NOTA</th>
                    <th style="width: 130px;">FECHA</th>
                    <th style="width: 110px;">DÍA</th>
                    <th style="width: 120px;">HORA</th>
                    <th style="width: 140px; text-align: center;">MÉTODO</th>
                    <th style="width: 150px; text-align: right;">MONTO PAGADO</th>
                  </tr>
                </thead>
                <tbody>
                  ${stats.comprasHistorial.length === 0 ? `
                    <tr>
                      <td colspan="6" class="text-center" style="padding: 24px; color: #94a3b8; font-style: italic;">
                        No hay pagos registrados para este proveedor en las hojas contables guardadas.
                      </td>
                    </tr>
                  ` : stats.comprasHistorial.map((c, i) => {
                    const esTransf = (c.tipoPago === 'Transferencia');
                    return `
                      <tr>
                        <td class="text-center font-bold" style="color: #64748b;">#${c.nota || (i + 1)}</td>
                        <td class="font-bold" style="color: #0f172a;">${c.fecha || '-'}</td>
                        <td style="color: #475569; text-transform: capitalize;">${c.dia || '-'}</td>
                        <td style="color: #64748b;">${c.hora || '-'}</td>
                        <td class="text-center">
                          <span class="badge-tipo-pago ${esTransf ? 'badge-pago-transf' : 'badge-pago-efec'}">
                            ${esTransf ? 'Transferencia' : 'Efectivo'}
                          </span>
                        </td>
                        <td class="text-right font-bold" style="color: #0f172a; font-size: 0.95rem;">
                          ${this.formatMoney(c.monto)}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : `
          <div class="provdb-empty-box" style="margin-top: 20px;">
            <p>No se encontraron datos para este proveedor.</p>
          </div>
        `}

      </div>
    `;
  }

  bindEvents() {
    // 1. Conmutador de Pestañas
    document.getElementById('btnTabStatsGenerales')?.addEventListener('click', () => {
      this.vistaActiva = 'generales';
      this.render();
    });

    document.getElementById('btnTabStatsProveedor')?.addEventListener('click', () => {
      this.vistaActiva = 'proveedor';
      this.render();
    });

    // 2. Selector de Proveedor
    document.getElementById('selectProveedorStats')?.addEventListener('change', (e) => {
      this.proveedorSeleccionado = e.target.value;
      this.render();
    });
  }

  setupEventListeners() {
    stateManager.subscribe(() => {
      if (this.container && this.container.classList.contains('active')) {
        this.render();
      }
    });
  }
}
