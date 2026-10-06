/**
 * Módulo de Base de Datos Maestra de Proveedores - Minisúper Fénix
 * Catálogo central de proveedores para alimentar la Hoja Diaria y la Agenda Semanal
 */

import { stateManager } from '../state.js';
import { DIAS_SEMANA, CATEGORIAS_PROVEEDOR } from './pipeline.js';

/**
 * Extrae y valida la información de teléfono de un campo de contacto
 * Soporta números locales (7 dígitos), móviles/nacionales (10 dígitos) y con prefijo +52
 */
export function obtenerInfoTelefono(contacto) {
  if (!contacto || typeof contacto !== 'string') {
    return { tieneNumero: false, numero: null, formateado: '', urlTel: null, urlWa: null };
  }

  // Buscar secuencias numéricas de teléfono en el texto
  const matches = contacto.match(/(?:\+?52\s*)?(?:[0-9][\s.-]?){7,13}[0-9]/g);
  let numero = null;
  if (matches && matches.length > 0) {
    numero = matches[0].replace(/\D/g, '');
  } else {
    const soloNum = contacto.replace(/\D/g, '');
    if (soloNum.length >= 7 && soloNum.length <= 15) {
      numero = soloNum;
    }
  }

  if (!numero || numero.length < 7) {
    return { tieneNumero: false, numero: null, formateado: '', urlTel: null, urlWa: null };
  }

  // Manejar prefijo país México 52 si viene incluido
  let numDiez = null;
  if (numero.length === 12 && numero.startsWith('52')) {
    numDiez = numero.slice(2);
  } else if (numero.length === 10) {
    numDiez = numero;
  }

  let formateado = numero;
  if (numDiez) {
    formateado = `(${numDiez.slice(0, 3)}) ${numDiez.slice(3, 6)}-${numDiez.slice(6)}`;
  } else if (numero.length === 7) {
    formateado = `${numero.slice(0, 3)}-${numero.slice(3)}`;
  }

  return {
    tieneNumero: true,
    numero,
    formateado,
    esDiezDigitos: !!numDiez,
    numDiez: numDiez || numero,
    urlTel: `tel:${numero}`,
    urlWa: numDiez ? `https://wa.me/52${numDiez}` : null
  };
}

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
        
        <!-- RESUMEN KPI MINIMALISTA Y COMPACTO -->
        <div class="provdb-kpi-grid">
          <div class="provdb-kpi-card">
            <span class="kpi-label">Proveedores</span>
            <strong class="kpi-value">${totalProveedores}</strong>
          </div>

          <div class="provdb-kpi-card">
            <span class="kpi-label">Efectivo</span>
            <strong class="kpi-value">${pagoEfectivo}</strong>
          </div>

          <div class="provdb-kpi-card">
            <span class="kpi-label">Transferencia</span>
            <strong class="kpi-value">${pagoTransferencia}</strong>
          </div>

          <div class="provdb-kpi-card">
            <span class="kpi-label">Presupuesto Est.</span>
            <strong class="kpi-value">${this.formatMoney(presupuestoTotal)}</strong>
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
                  <th style="width: 165px; text-align: center;">ACCIONES</th>
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
                  
                  // Extracción de datos telefónicos para llamada directa
                  const telInfo = obtenerInfoTelefono(p.contacto);

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
                          
                          <!-- Fila de Contacto y Botón de Llamada Móvil -->
                          <div class="provdb-contact-row" onclick="event.stopPropagation();">
                            ${p.contacto ? `
                              <span class="provdb-contact-info" title="${p.contacto}">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                ${p.contacto}
                              </span>
                            ` : ''}

                            ${telInfo ? `
                              <a href="${telInfo.urlTel}" class="btn-chip-llamar" title="Llamar a ${p.nombre} (${telInfo.formateado})">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                <span>Llamar</span>
                              </a>
                            ` : `
                              <button type="button" class="btn-chip-asignar-tel btn-pedir-tel" data-id="${p.id}" data-nombre="${p.nombre}" title="Ingresar teléfono para llamar con un toque">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                <span>+ Tel</span>
                              </button>
                            `}
                          </div>

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
                          <!-- Botón de Llamada Directa (abre la app de llamadas del teléfono) -->
                          ${telInfo ? `
                            <a href="${telInfo.urlTel}" class="btn-act-icon btn-call-action activo" title="Llamar a ${p.nombre}: ${telInfo.formateado}">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                            </a>
                            ${telInfo.esDiezDigitos ? `
                              <a href="${telInfo.urlWa}" target="_blank" rel="noopener noreferrer" class="btn-act-icon btn-wa-action" title="Mensaje de WhatsApp a ${p.nombre}">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                              </a>
                            ` : ''}
                          ` : `
                            <button type="button" class="btn-act-icon btn-call-action sin-tel btn-pedir-tel" data-id="${p.id}" data-nombre="${p.nombre}" title="Ingresar número para llamar a ${p.nombre}">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                            </button>
                          `}

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

    // 7. Acciones de Llamada Telefónica Directa (para celular y registro rápido)
    this.container.querySelectorAll('.btn-pedir-tel').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const nombre = btn.getAttribute('data-nombre');
        const prov = stateManager.data.catalogoProveedores.find(p => p.id === id);
        const telExistente = prov?.contacto ? (obtenerInfoTelefono(prov.contacto)?.numero || '') : '';
        
        const nuevoNum = prompt(
          `📞 Llamar a ${nombre}\n\nIngresa el número de teléfono del proveedor o preventista (ej: 4491234567) para marcarle directamente y guardarlo en su contacto:`,
          telExistente
        );

        if (nuevoNum !== null && nuevoNum.trim() !== '') {
          const limpio = nuevoNum.replace(/\D/g, '');
          if (limpio.length >= 7) {
            let contactoNuevo = '';
            if (prov?.contacto && !prov.contacto.match(/\d{7}/)) {
              contactoNuevo = `${prov.contacto} - Tel: ${limpio}`;
            } else {
              contactoNuevo = `Tel: ${limpio}`;
            }
            stateManager.updateProveedorCatalogo(id, { contacto: contactoNuevo });
            this.render();

            // Abrir la app de llamadas del teléfono celular inmediatamente
            window.location.href = `tel:${limpio}`;
          } else {
            alert('Por favor ingresa un número de teléfono válido (mínimo 7 a 10 dígitos).');
          }
        }
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
