/**
 * Módulo de Base de Datos Maestra de Proveedores - Minisúper Fénix
 * Catálogo central de proveedores para alimentar la Hoja Diaria y la Agenda Semanal
 */

import { stateManager } from '../state.js';
import { DIAS_SEMANA, CATEGORIAS_PROVEEDOR } from './pipeline.js';

export class ProveedoresDbModule {
  constructor(containerId, modalCallbacks = {}) {
    this.container = document.getElementById(containerId);
    this.modalCallbacks = modalCallbacks;
    this.filtroTexto = '';
    this.filtroCategoria = 'todas';
    this.filtroDia = 'todos';
    this.filtroPago = 'todos';

    this.init();
  }

  init() {
    this.render();
    this.setupEventListeners();
  }

  formatMoney(v) {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v || 0);
  }

  render() {
    if (!this.container) return;

    const proveedores = stateManager.getProveedoresCatalogo();
    
    // Calcular métricas del catálogo
    const totalProveedores = proveedores.length;
    const pagoEfectivo = proveedores.filter(p => (p.tipoPago || 'Efectivo').toLowerCase().includes('efectivo')).length;
    const pagoTransferencia = proveedores.filter(p => (p.tipoPago || '').toLowerCase().includes('transferencia')).length;
    const presupuestoTotal = proveedores.reduce((acc, p) => acc + (parseFloat(p.presupuestoHabitual) || 0), 0);

    // Filtrar proveedores
    const texto = this.filtroTexto.toLowerCase().trim();
    const proveedoresFiltrados = proveedores.filter(p => {
      // Filtro texto
      if (texto) {
        const nom = (p.nombre || '').toLowerCase();
        const cat = (p.categoria || '').toLowerCase();
        const cont = (p.contacto || '').toLowerCase();
        const not = (p.notas || '').toLowerCase();
        if (!nom.includes(texto) && !cat.includes(texto) && !cont.includes(texto) && !not.includes(texto)) {
          return false;
        }
      }

      // Filtro categoría
      if (this.filtroCategoria !== 'todas' && p.categoria !== this.filtroCategoria) {
        return false;
      }

      // Filtro día
      if (this.filtroDia !== 'todos' && p.diaHabitual !== this.filtroDia) {
        return false;
      }

      // Filtro forma de pago
      if (this.filtroPago !== 'todos') {
        const esTransf = (p.tipoPago || '').toLowerCase().includes('transferencia');
        if (this.filtroPago === 'transferencia' && !esTransf) return false;
        if (this.filtroPago === 'efectivo' && esTransf) return false;
      }

      return true;
    });

    let html = `
      <div class="proveedores-db-layout">
        
        <!-- RESUMEN SUPERIOR KPI SOBRIO -->
        <div class="provdb-kpi-grid">
          <div class="provdb-kpi-card">
            <div class="kpi-icon-pill icon-blue" style="font-weight: 800; font-size: 0.75rem;">CAT</div>
            <div class="kpi-info">
              <span class="kpi-label">Proveedores Registrados</span>
              <strong class="kpi-value">${totalProveedores}</strong>
              <span class="kpi-subtext">Catálogo maestro activo</span>
            </div>
          </div>

          <div class="provdb-kpi-card">
            <div class="kpi-icon-pill icon-green" style="font-weight: 800; font-size: 0.75rem;">PAG</div>
            <div class="kpi-info">
              <span class="kpi-label">Forma de Pago</span>
              <strong class="kpi-value">${pagoEfectivo} <small style="font-size: 0.8rem; font-weight: normal; color: #64748b;">Efec</small> • ${pagoTransferencia} <small style="font-size: 0.8rem; font-weight: normal; color: #64748b;">Transf</small></strong>
              <span class="kpi-subtext">Preferencia de desembolso</span>
            </div>
          </div>

          <div class="provdb-kpi-card">
            <div class="kpi-icon-pill icon-purple" style="font-weight: 800; font-size: 0.75rem;">PRE</div>
            <div class="kpi-info">
              <span class="kpi-label">Presupuesto Habitual Total</span>
              <strong class="kpi-value">${this.formatMoney(presupuestoTotal)}</strong>
              <span class="kpi-subtext">Suma de compras estimadas</span>
            </div>
          </div>

          <div class="provdb-kpi-card">
            <div class="kpi-icon-pill icon-amber" style="font-weight: 800; font-size: 0.75rem;">SYNC</div>
            <div class="kpi-info">
              <span class="kpi-label">Alimentación Automática</span>
              <strong class="kpi-value" style="font-size: 1.05rem; color: #0284c7;">Hoja Diaria & Agenda</strong>
              <span class="kpi-subtext">Sincronizado en tiempo real</span>
            </div>
          </div>
        </div>

        <!-- BARRA DE HERRAMIENTAS: BÚSQUEDA, FILTROS Y ACCIÓN NUEVO -->
        <div class="provdb-toolbar">
          <div class="provdb-toolbar-left">
            <div class="provdb-search-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" id="inputBuscarProveedorDb" class="provdb-search-input" placeholder="Buscar por nombre, categoría, preventista..." value="${this.filtroTexto}">
              ${this.filtroTexto ? `<button type="button" id="btnLimpiarBuscarDb" class="btn-clear-search">✕</button>` : ''}
            </div>

            <!-- Filtro de Categoría -->
            <select id="selectFiltroCatDb" class="provdb-filter-select">
              <option value="todas" ${this.filtroCategoria === 'todas' ? 'selected' : ''}>Todas las Categorías</option>
              ${Object.entries(CATEGORIAS_PROVEEDOR).map(([k, v]) => `
                <option value="${k}" ${this.filtroCategoria === k ? 'selected' : ''}>${v.nombre}</option>
              `).join('')}
            </select>

            <!-- Filtro de Día Habitual -->
            <select id="selectFiltroDiaDb" class="provdb-filter-select">
              <option value="todos" ${this.filtroDia === 'todos' ? 'selected' : ''}>Todos los Días</option>
              ${DIAS_SEMANA.map(d => `
                <option value="${d.id}" ${this.filtroDia === d.id ? 'selected' : ''}>${d.nombre}</option>
              `).join('')}
            </select>

            <!-- Filtro Forma de Pago -->
            <select id="selectFiltroPagoDb" class="provdb-filter-select">
              <option value="todos" ${this.filtroPago === 'todos' ? 'selected' : ''}>Todo tipo de pago</option>
              <option value="efectivo" ${this.filtroPago === 'efectivo' ? 'selected' : ''}>Efectivo</option>
              <option value="transferencia" ${this.filtroPago === 'transferencia' ? 'selected' : ''}>Transferencia</option>
            </select>
          </div>

          <div class="provdb-toolbar-right">
            <button type="button" class="btn-primary" id="btnNuevoProveedorDb">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              <span>+ Nuevo Proveedor</span>
            </button>
          </div>
        </div>

        <!-- TABLA PRINCIPAL DEL CATÁLOGO -->
        <div class="provdb-table-card">
          <div class="provdb-table-header-info">
            <span class="provdb-table-count">Mostrando <strong>${proveedoresFiltrados.length}</strong> de <strong>${totalProveedores}</strong> proveedores</span>
          </div>

          <div class="provdb-table-responsive">
            <table class="provdb-table">
              <thead>
                <tr>
                  <th style="width: 44px; text-align: center;">#</th>
                  <th>PROVEEDOR / EMPRESA</th>
                  <th style="width: 160px;">CATEGORÍA</th>
                  <th style="width: 130px;">DÍA HABITUAL</th>
                  <th style="width: 140px;">FORMA DE PAGO</th>
                  <th style="width: 130px; text-align: right;">PRESUPUESTO</th>
                  <th style="width: 160px; text-align: center;">CANTIDAD COMPRAS</th>
                  <th style="width: 150px; text-align: right;">TOTAL COMPRADO</th>
                  <th style="width: 130px; text-align: center;">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                ${proveedoresFiltrados.length === 0 ? `
                  <tr>
                    <td colspan="9" class="provdb-empty-td">
                      <div class="provdb-empty-box">
                        <span class="empty-icon" style="display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; background: #f1f5f9; color: #64748b; margin: 0 auto 8px;">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </span>
                        <strong>No se encontraron proveedores</strong>
                        <p>Intenta con otro término de búsqueda o añade un nuevo proveedor.</p>
                      </div>
                    </td>
                  </tr>
                ` : proveedoresFiltrados.map((p, idx) => {
                  const catInfo = CATEGORIAS_PROVEEDOR[p.categoria] || { nombre: p.categoria || 'General', color: '#334155', bg: '#f1f5f9' };
                  const diaObj = DIAS_SEMANA.find(d => d.id === p.diaHabitual);
                  const diaNombre = diaObj ? diaObj.nombre : (p.diaHabitual ? p.diaHabitual : 'Variable');
                  const esTransf = (p.tipoPago || '').toLowerCase().includes('transferencia');
                  
                  // Obtener total pagado y cantidad de compras
                  const statsProv = stateManager.getEstadisticasProveedor(p.nombre);
                  const totalPagado = statsProv ? statsProv.totalPagado : 0;
                  const totalNotas = statsProv ? statsProv.totalCompras : 0;
                  const promCompra = statsProv ? statsProv.promedioPorCompra : 0;

                  return `
                    <tr class="provdb-row">
                      <td class="text-center font-bold" style="color: #94a3b8;">${idx + 1}</td>
                      <td>
                        <div class="provdb-name-cell fila-clickeable-compras" data-nombre-prov="${p.nombre}" style="cursor: pointer;" title="Clic para ver o registrar compras de ${p.nombre}">
                          <strong class="provdb-name-title" style="color: #0284c7;">${p.nombre}</strong>
                          ${p.contacto ? `<span class="provdb-contact-info">Tel: ${p.contacto}</span>` : ''}
                          ${p.notas ? `<span class="provdb-notes-info">Nota: ${p.notas}</span>` : ''}
                        </div>
                      </td>
                      <td>
                        <span class="provdb-cat-badge" style="color: ${catInfo.color}; background: ${catInfo.bg};">
                          ${catInfo.nombre}
                        </span>
                      </td>
                      <td>
                        <div class="provdb-dia-cell">
                          ${(() => {
                            const diasList = Array.isArray(p.diasHabituales) && p.diasHabituales.length > 0 
                              ? p.diasHabituales 
                              : [(p.diaHabitual || 'lunes')];
                            const textoDias = diasList.map(dId => DIAS_SEMANA.find(d => d.id === dId)?.corto || dId).join(', ');
                            return `
                              <span class="dia-nombre font-bold" title="${diasList.join(', ')}">${textoDias}</span>
                              ${p.tienePreventa ? '<span style="font-size:0.65rem; background:#fef3c7; color:#92400e; border:1px solid #fde68a; padding:1px 5px; border-radius:3px; display:inline-block; margin-top:2px; font-weight:700;">PREVENTA</span>' : ''}
                              ${p.horaHabitual ? `<span class="dia-hora">${p.horaHabitual}</span>` : ''}
                            `;
                          })()}
                        </div>
                      </td>
                      <td>
                        <span class="badge-tipo-pago ${esTransf ? 'badge-pago-transf' : 'badge-pago-efec'}">
                          ${esTransf ? 'Transferencia' : 'Efectivo'}
                        </span>
                      </td>
                      <td class="text-right font-bold" style="color: #1e293b;">
                        ${p.presupuestoHabitual > 0 ? this.formatMoney(p.presupuestoHabitual) : '<span style="color:#94a3b8; font-weight:normal;">-</span>'}
                      </td>
                      <td class="text-center">
                        <button type="button" class="btn-badge-compras btn-ver-compras" data-nombre-prov="${p.nombre}" title="Clic para ver o registrar compras">
                          <strong>${totalNotas} ${totalNotas === 1 ? 'compra' : 'compras'}</strong>
                          ${totalNotas > 0 ? `<small>Prom: ${this.formatMoney(promCompra)}</small>` : '<small>+ Registrar</small>'}
                        </button>
                      </td>
                      <td class="text-right font-bold" style="color: #0f172a; font-size: 0.95rem;">
                        ${this.formatMoney(totalPagado)}
                      </td>
                      <td class="text-center">
                        <div class="provdb-actions-wrap">
                          <button type="button" class="btn-act-icon btn-compras-action btn-ver-compras" data-nombre-prov="${p.nombre}" title="Registro de Compras">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                          </button>
                          <button type="button" class="btn-act-icon btn-edit-prov" data-id="${p.id}" title="Editar Proveedor">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                          </button>
                          <button type="button" class="btn-act-icon btn-del-prov" data-id="${p.id}" data-nombre="${p.nombre}" title="Eliminar del catálogo">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;

    this.container.innerHTML = html;
    this.bindEvents();
  }

  bindEvents() {
    // 1. Buscador en tiempo real
    const searchInput = document.getElementById('inputBuscarProveedorDb');
    searchInput?.addEventListener('input', (e) => {
      this.filtroTexto = e.target.value;
      this.render();
      // Volver a colocar el foco y el cursor al final
      const el = document.getElementById('inputBuscarProveedorDb');
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    });

    document.getElementById('btnLimpiarBuscarDb')?.addEventListener('click', () => {
      this.filtroTexto = '';
      this.render();
    });

    // 2. Filtros
    document.getElementById('selectFiltroCatDb')?.addEventListener('change', (e) => {
      this.filtroCategoria = e.target.value;
      this.render();
    });

    document.getElementById('selectFiltroDiaDb')?.addEventListener('change', (e) => {
      this.filtroDia = e.target.value;
      this.render();
    });

    document.getElementById('selectFiltroPagoDb')?.addEventListener('change', (e) => {
      this.filtroPago = e.target.value;
      this.render();
    });

    // 3. Botón Nuevo Proveedor
    document.getElementById('btnNuevoProveedorDb')?.addEventListener('click', () => {
      if (window.adminFenixApp?.modalManager) {
        window.adminFenixApp.modalManager.openProveedorCatalogoModal(null, () => {
          this.render();
        });
      }
    });

    // 4. Acciones en cada fila: Editar
    this.container.querySelectorAll('.btn-edit-prov').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.getAttribute('data-id');
        const prov = stateManager.data.catalogoProveedores.find(p => p.id === id);
        if (prov && window.adminFenixApp?.modalManager) {
          window.adminFenixApp.modalManager.openProveedorCatalogoModal(prov, () => {
            this.render();
          });
        }
      });
    });

    // 5. Acciones en cada fila: Eliminar
    this.container.querySelectorAll('.btn-del-prov').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const nombre = btn.getAttribute('data-nombre') || 'este proveedor';
        if (confirm(`¿Estás seguro de eliminar a "${nombre}" de la Base de Datos de Proveedores?`)) {
          stateManager.deleteProveedorCatalogo(id);
          this.render();
        }
      });
    });

    // 6. Clic para ver o registrar compras del proveedor
    const abrirCompras = (nombre) => {
      if (nombre && window.adminFenixApp?.modalManager) {
        window.adminFenixApp.modalManager.openRegistroComprasProveedorModal(nombre, () => {
          this.render();
        });
      }
    };

    this.container.querySelectorAll('.btn-ver-compras').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const nombre = btn.getAttribute('data-nombre-prov');
        abrirCompras(nombre);
      });
    });

    this.container.querySelectorAll('.fila-clickeable-compras').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const nombre = el.getAttribute('data-nombre-prov');
        abrirCompras(nombre);
      });
    });
  }

  setupEventListeners() {
    // Suscribirse al stateManager para refrescar si cambia en otro módulo
    stateManager.subscribe(() => {
      if (this.container && this.container.classList.contains('active')) {
        this.render();
      }
    });
  }
}
