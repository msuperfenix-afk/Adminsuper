/**
 * Módulo de Pipeline Semanal de Proveedores (Agenda Semanal Lunes a Domingo)
 * Estructura original completa de proveedores por día, cajas de presupuesto y venta anterior,
 * banner de Hoy y Mañana, conmutador de Tablero / Lista e impresión consolidada de pedidos.
 */

import { stateManager } from '../state.js';
import { obtenerInfoTelefono } from './proveedoresDb.js';

export const DIAS_SEMANA = [
  { id: 'lunes', nombre: 'Lunes', corto: 'LUN', icono: '📅' },
  { id: 'martes', nombre: 'Martes', corto: 'MAR', icono: '📅' },
  { id: 'miercoles', nombre: 'Miércoles', corto: 'MIÉ', icono: '📅' },
  { id: 'jueves', nombre: 'Jueves', corto: 'JUE', icono: '📅' },
  { id: 'viernes', nombre: 'Viernes', corto: 'VIE', icono: '📅' },
  { id: 'sabado', nombre: 'Sábado', corto: 'SÁB', icono: '⭐' },
  { id: 'domingo', nombre: 'Domingo', corto: 'DOM', icono: '⭐' }
];

export const CATEGORIAS_PROVEEDOR = {
  refrescos: { nombre: 'Refrescos / Bebidas', color: '#b91c1c', bg: '#fef2f2' },
  panaderia: { nombre: 'Panadería / Galletas', color: '#1e3a8a', bg: '#eff6ff' },
  botanas: { nombre: 'Botanas / Frituras', color: '#334155', bg: '#f1f5f9' },
  lacteos: { nombre: 'Lácteos / Embutidos', color: '#1d4ed8', bg: '#dbeafe' },
  cerveza: { nombre: 'Cerveza / Licores', color: '#991b1b', bg: '#fee2e2' },
  abarrotes: { nombre: 'Abarrotes / Granel', color: '#0f172a', bg: '#e2e8f0' },
  carniceria: { nombre: 'Carnes / Fríos', color: '#7f1d1d', bg: '#fef2f2' }
};

export class PipelineModule {
  constructor(containerId, onOpenEditModal, onOpenPedidoModal, onOpenVinoPreventaModal = null, onOpenImprimirListaModal = null) {
    this.container = document.getElementById(containerId);
    this.onOpenEditModal = onOpenEditModal;
    this.onOpenPedidoModal = onOpenPedidoModal;
    this.onOpenVinoPreventaModal = onOpenVinoPreventaModal;
    this.onOpenImprimirListaModal = onOpenImprimirListaModal;
    this.searchTerm = '';
    this.filtroCategoria = 'todas';
    this.filtroTipoPago = 'todos';
    this.filtroDiaLista = 'todos';
    this.vistaModo = 'kanban';
    this.draggedCardId = null;

    this.init();
  }

  init() {
    this.render();
    this.setupEventListeners();
  }

  setSearchTerm(term) {
    this.searchTerm = term.toLowerCase().trim();
    this.render();
  }

  setFiltros(categoria, tipoPago) {
    this.filtroCategoria = categoria;
    this.filtroTipoPago = tipoPago;
    this.render();
  }

  setVistaModo(modo) {
    this.vistaModo = modo;
    // Sincronizar botones de la barra superior si existen
    const btnTopKanban = document.getElementById('btnViewKanban');
    const btnTopList = document.getElementById('btnViewList');
    if (btnTopKanban && btnTopList) {
      if (modo === 'kanban') {
        btnTopKanban.classList.add('active');
        btnTopList.classList.remove('active');
      } else {
        btnTopList.classList.add('active');
        btnTopKanban.classList.remove('active');
      }
    }
    this.render();
  }

  getDiasInfo() {
    const diasIds = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const fStr = stateManager.data.fecha || new Date().toISOString().split('T')[0];
    const fechaObj = new Date(fStr + 'T12:00:00');
    const diaHoyIdx = fechaObj.getDay();
    const diaMananaIdx = (diaHoyIdx + 1) % 7;

    return {
      idHoy: diasIds[diaHoyIdx],
      idManana: diasIds[diaMananaIdx],
      nombreHoy: DIAS_SEMANA.find(d => d.id === diasIds[diaHoyIdx])?.nombre || 'Hoy',
      nombreManana: DIAS_SEMANA.find(d => d.id === diasIds[diaMananaIdx])?.nombre || 'Mañana'
    };
  }

  filtrarProveedores(proveedores) {
    if (!Array.isArray(proveedores)) return [];
    return proveedores.filter(p => {
      if (!p) return false;
      const provNombre = (p.proveedor || '').toLowerCase();
      const provNotas = (p.notas || '').toLowerCase();
      const provPago = (p.tipoPago || '').toLowerCase();

      const matchSearch = !this.searchTerm ||
        provNombre.includes(this.searchTerm) ||
        provNotas.includes(this.searchTerm) ||
        provPago.includes(this.searchTerm);

      const matchCat = this.filtroCategoria === 'todas' || p.categoria === this.filtroCategoria;
      const matchPago = this.filtroTipoPago === 'todos' || p.tipoPago === this.filtroTipoPago;

      return matchSearch && matchCat && matchPago;
    });
  }

  formatCurrency(val) {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val || 0);
  }

  render() {
    if (!this.container) return;

    try {
      if (this.vistaModo === 'lista') {
        this.renderLista();
      } else {
        this.renderKanban();
      }
    } catch (err) {
      console.error('Error al renderizar Agenda Semanal:', err);
      this.container.innerHTML = `
        <div style="padding: 24px 20px; text-align: center; color: #b91c1c; background: #fef2f2; border: 1.5px solid #f87171; border-radius: 8px; margin: 20px auto; max-width: 600px;">
          <h3 style="margin-bottom: 6px; font-weight: 800;">Atención al cargar Agenda Semanal</h3>
          <p style="font-size: 0.82rem; color: #7f1d1d; margin-bottom: 12px;">Se produjo un conflicto: ${err?.message || 'Error desconocido'}</p>
          <button type="button" class="btn-primary" onclick="location.reload()" style="font-size: 0.78rem; padding: 6px 14px; cursor: pointer;">Recargar</button>
        </div>
      `;
    }
  }

  renderBannerProximos(proveedores = [], diasInfo) {
    const provsLista = Array.isArray(proveedores) ? proveedores : [];
    const provsManana = provsLista.filter(p => p && p.dia === diasInfo.idManana);
    const totalPresupuestoManana = provsManana.reduce((acc, p) => acc + (parseFloat(p.presupuestoAprox || p.preventaPresupuesto) || 0), 0);
    const totalArticulosManana = provsManana.reduce((acc, p) => acc + (Array.isArray(p.listaPedido) ? p.listaPedido.length : 0), 0);
    
    const provsHoy = provsLista.filter(p => p && p.dia === diasInfo.idHoy);
    const provsHoyVinieron = provsHoy.filter(p => p && p.yaVino);
    const totalPresupuestoHoy = provsHoy.reduce((acc, p) => acc + (parseFloat(p.presupuestoAprox || p.preventaPresupuesto) || 0), 0);
    const totalPagadoHoy = provsHoyVinieron.reduce((acc, p) => acc + (parseFloat(p.montoPagadoReal) || 0), 0);
    const totalArticulosHoy = provsHoy.reduce((acc, p) => acc + (Array.isArray(p.listaPedido) ? p.listaPedido.length : 0), 0);

    return `
      <div style="padding: 14px 20px 0 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(330px, 1fr)); gap: 14px;">
        
        <!-- Tarjeta Proveedores de Hoy (Sincronizado con Hoja Diaria) -->
        <div style="background: #ffffff; border: 1.5px solid #10b981; border-radius: 8px; padding: 12px 16px; box-shadow: 0 1px 3px rgba(16, 185, 129, 0.08); display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="badge-dia-destacado hoy">HOY</span>
                <span style="font-weight: 800; font-size: 0.95rem; color: #064e3b;">Visitas de Hoy (${diasInfo.nombreHoy})</span>
              </div>
              <span style="font-size: 0.8rem; font-weight: 700; color: #059669;">
                ${provsHoyVinieron.length}/${provsHoy.length} ya vinieron
              </span>
            </div>

            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #475569; margin-bottom: 8px; flex-wrap: wrap; gap: 4px;">
              <div>
                <span>Presupuesto Hoy: </span>
                <strong style="color: #0f172a;">${this.formatCurrency(totalPresupuestoHoy)}</strong>
              </div>
              <div>
                <span>Pagado en Caja: </span>
                <strong style="color: #047857;">${this.formatCurrency(totalPagadoHoy)}</strong>
              </div>
            </div>

            <div style="font-size: 0.78rem; color: #64748b; margin-bottom: 8px;">
              ${provsHoy.length === 0 
                ? 'No hay proveedores programados para hoy.' 
                : `<strong>${provsHoy.length} proveedores</strong> asignados para hoy${totalArticulosHoy > 0 ? ` (${totalArticulosHoy} artículos en pedidos)` : ''}:`
              }
            </div>

            ${provsHoy.length > 0 ? `
              <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px;">
                ${provsHoy.map(p => {
                  const cant = Array.isArray(p.listaPedido) ? p.listaPedido.length : 0;
                  const esPrev = p.tipoVisita === 'preventa';
                  return `
                    <button type="button" class="btn-chip-proveedor-hoy" data-id="${p.id}" style="background: ${p.yaVino ? '#ecfdf5' : '#f8fafc'}; border: 1px solid ${p.yaVino ? '#a7f3d0' : '#cbd5e1'}; border-radius: 6px; padding: 4px 10px; font-size: 0.78rem; font-weight: 700; color: ${p.yaVino ? '#065f46' : '#334155'}; cursor: pointer; display: flex; align-items: center; gap: 6px;" title="Ver/editar pedido de ${p.proveedor}">
                      ${esPrev ? '<span style="font-size:0.65rem; background:#fef3c7; color:#92400e; padding:1px 4px; border-radius:3px;">PREV</span>' : ''}
                      <span class="${p.yaVino ? 'nombre-prov-tachado' : ''}">${p.proveedor}</span>
                      ${cant > 0 ? `<span style="background: #e0f2fe; color:#0369a1; padding: 1px 5px; border-radius: 4px; font-size: 0.7rem;">📋 ${cant}</span>` : ''}
                      ${p.yaVino ? `<span style="font-size:0.7rem; color:#047857; font-weight:800;">✓ ${p.horaVino || 'vino'}</span>` : `<span style="font-size:0.7rem; color:#64748b;">${p.hora || '10:00'}</span>`}
                    </button>
                  `;
                }).join('')}
              </div>
            ` : ''}
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 6px; margin-top: 6px; padding-top: 6px; border-top: 1px dashed #e2e8f0;">
            <button type="button" id="btnImprimirPedidosHoyBanner" class="btn-secondary" style="font-size: 0.74rem; height: 26px; padding: 0 10px; cursor: pointer; background: #f0fdf4; border: 1.5px solid #86efac; color: #166534; font-weight: 700; display: inline-flex; align-items: center; gap: 5px;" title="Imprimir pedidos de los proveedores que vienen hoy en ticket USB o carta">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              <span>🖨️ Pedidos de Hoy</span>
            </button>
            <button type="button" id="btnAgregarProveedorHoyBanner" class="btn-secondary" style="font-size: 0.74rem; height: 26px; padding: 0 10px; cursor: pointer;">
              + Proveedor para Hoy
            </button>
          </div>
        </div>

        <!-- Tarjeta Proveedores de Mañana -->
        <div style="background: #ffffff; border: 1.5px solid #0284c7; border-radius: 8px; padding: 12px 16px; box-shadow: 0 1px 3px rgba(2, 132, 199, 0.08); display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="badge-dia-destacado manana">MAÑANA</span>
                <span style="font-weight: 800; font-size: 0.95rem; color: #0c4a6e;">Proveedores de ${diasInfo.nombreManana}</span>
              </div>
              <span style="font-size: 0.8rem; font-weight: 700; color: #0284c7;">
                Presupuesto: ${this.formatCurrency(totalPresupuestoManana)}
              </span>
            </div>

            <div style="font-size: 0.78rem; color: #475569; margin-bottom: 8px;">
              ${provsManana.length === 0 
                ? 'No hay proveedores programados para mañana.' 
                : `<strong>${provsManana.length} proveedores</strong> programados para visita mañana${totalArticulosManana > 0 ? ` (${totalArticulosManana} artículos a pedir)` : ''}:`
              }
            </div>

            ${provsManana.length > 0 ? `
              <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px;">
                ${provsManana.map(p => {
                  const cant = Array.isArray(p.listaPedido) ? p.listaPedido.length : 0;
                  return `
                    <button type="button" class="btn-chip-proveedor-manana" data-id="${p.id}" style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 4px 10px; font-size: 0.78rem; font-weight: 700; color: #0369a1; cursor: pointer; display: flex; align-items: center; gap: 6px;" title="Ver/editar lista de pedido de ${p.proveedor}">
                      <span>${p.proveedor}</span>
                      <span style="color: #64748b; font-weight: 600;">${this.formatCurrency(p.presupuestoAprox || p.preventaPresupuesto)}</span>
                      <span style="background: #e0f2fe; padding: 1px 5px; border-radius: 4px; font-size: 0.7rem;">📋 ${cant}</span>
                    </button>
                  `;
                }).join('')}
              </div>
            ` : ''}
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 6px; margin-top: 6px; padding-top: 6px; border-top: 1px dashed #e2e8f0;">
            <button type="button" id="btnImprimirPedidosMananaBanner" class="btn-secondary" style="font-size: 0.74rem; height: 26px; padding: 0 10px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;" title="Imprimir pedidos de mañana">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              <span>🖨️ Pedidos de Mañana</span>
            </button>
            <button type="button" id="btnAgregarProveedorMananaBanner" class="btn-secondary" style="font-size: 0.74rem; height: 26px; padding: 0 10px; cursor: pointer;">
              + Proveedor para Mañana
            </button>
          </div>
        </div>

      </div>
    `;
  }

  renderBarraControlesAgenda(diasInfo, totalArticulosPedidosSemana) {
    return `
      <div class="agenda-controls-bar" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 20px 0 20px; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          <!-- Conmutador integrado de vista: Tablero Kanban vs Lista -->
          <div class="agenda-view-mode-toggle" style="display: inline-flex; background: #e2e8f0; padding: 3px; border-radius: 6px; border: 1px solid #cbd5e1;">
            <button type="button" class="btn-toggle-view ${this.vistaModo === 'kanban' ? 'active' : ''}" id="btnAgendaToggleKanban" style="padding: 5px 12px; font-size: 0.78rem; font-weight: 700; border: none; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 6px; background: ${this.vistaModo === 'kanban' ? '#ffffff' : 'transparent'}; color: ${this.vistaModo === 'kanban' ? '#1e3a8a' : '#475569'}; box-shadow: ${this.vistaModo === 'kanban' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'};" title="Vista de Tablero Kanban">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="18" rx="1"></rect><rect x="14" y="3" width="7" height="18" rx="1"></rect></svg>
              <span>Tablero Semanal</span>
            </button>
            <button type="button" class="btn-toggle-view ${this.vistaModo === 'lista' ? 'active' : ''}" id="btnAgendaToggleLista" style="padding: 5px 12px; font-size: 0.78rem; font-weight: 700; border: none; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 6px; background: ${this.vistaModo === 'lista' ? '#ffffff' : 'transparent'}; color: ${this.vistaModo === 'lista' ? '#1e3a8a' : '#475569'}; box-shadow: ${this.vistaModo === 'lista' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'};" title="Vista de Lista Consolidada">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line></svg>
              <span>Lista Detallada</span>
            </button>
          </div>

          ${this.vistaModo === 'lista' ? `
            <!-- Filtro de días en vista de Lista -->
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 0.78rem; color: #64748b; font-weight: 600;">Filtrar día:</span>
              <select id="selectFiltroDiaLista" class="form-control" style="font-size: 0.78rem; font-weight: 700; padding: 2px 8px; height: 30px; border-radius: 5px; border: 1px solid #cbd5e1; background: #ffffff;">
                <option value="todos" ${this.filtroDiaLista === 'todos' ? 'selected' : ''}>Todos los días (Semana Completa)</option>
                <option value="hoy" ${this.filtroDiaLista === 'hoy' ? 'selected' : ''}>Solo Hoy (${diasInfo.nombreHoy})</option>
                ${DIAS_SEMANA.map(d => `<option value="${d.id}" ${this.filtroDiaLista === d.id ? 'selected' : ''}>${d.nombre}</option>`).join('')}
              </select>
            </div>
          ` : `
            <div style="display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: #64748b;">
              <span style="font-weight: 700; color: #0f172a;">Semana Completa:</span>
              <span>Lunes a Domingo (7 Columnas)</span>
            </div>
          `}
        </div>

        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <!-- Botón Imprimir Lista de Pedidos -->
          <button type="button" id="btnImprimirListaPedidosAgenda" class="btn-secondary" style="background: #f0fdf4; border: 1.5px solid #86efac; color: #166534; font-weight: 700; font-size: 0.78rem; height: 30px; padding: 0 12px; border-radius: 5px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;" title="Generar e imprimir la lista de pedidos en ticket USB (58mm/80mm) o formato carta">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            <span>Imprimir Lista de Pedidos</span>
            ${totalArticulosPedidosSemana > 0 ? `<span style="background: #166534; color: #ffffff; font-size: 0.7rem; padding: 1px 7px; border-radius: 9999px;">${totalArticulosPedidosSemana}</span>` : ''}
          </button>

          <!-- Botón Agregar Proveedor -->
          <button type="button" id="btnAgregarProvAgendaGlobal" class="btn-primary" style="font-size: 0.78rem; height: 30px; padding: 0 12px; cursor: pointer; font-weight: 700; display: inline-flex; align-items: center; gap: 5px;">
            <span>+</span> Proveedor
          </button>
        </div>
      </div>
    `;
  }

  renderKanban() {
    const proveedores = stateManager.data.proveedores;
    const filtrados = this.filtrarProveedores(proveedores);
    const diasInfo = this.getDiasInfo();
    const totalArticulosSemana = filtrados.reduce((acc, p) => acc + (Array.isArray(p.listaPedido) ? p.listaPedido.length : 0), 0);

    let html = this.renderBannerProximos(proveedores, diasInfo);
    html += this.renderBarraControlesAgenda(diasInfo, totalArticulosSemana);

    html += `<div class="kanban-board" id="kanbanBoard">`;

    DIAS_SEMANA.forEach(dia => {
      const provsDia = filtrados.filter(p => p.dia === dia.id);
      const totalPresupuesto = provsDia.reduce((acc, p) => acc + (parseFloat(p.presupuestoAprox || p.preventaPresupuesto) || 0), 0);
      const totalCompletados = provsDia.filter(p => p.yaVino || p.estado === 'pagado' || p.estado === 'recibido').length;
      const porcentaje = provsDia.length > 0 ? Math.round((totalCompletados / provsDia.length) * 100) : 0;

      const esManana = dia.id === diasInfo.idManana;
      const esHoy = dia.id === diasInfo.idHoy;
      const claseColExtra = esManana ? 'col-manana' : (esHoy ? 'col-hoy' : '');

      html += `
        <div class="kanban-column ${claseColExtra}" data-dia="${dia.id}">
          <div class="column-header">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <div class="column-day" style="display: flex; align-items: center; gap: 6px;">
                <span>${dia.icono}</span>
                <span>${dia.nombre}</span>
                ${esManana ? '<span class="badge-dia-destacado manana">MAÑANA</span>' : ''}
                ${esHoy ? '<span class="badge-dia-destacado hoy">HOY</span>' : ''}
              </div>
              <span style="background: #e2e8f0; font-size: 0.72rem; font-weight: 800; padding: 2px 7px; border-radius: 4px; color: #334155;">
                ${provsDia.length} prov.
              </span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #475569;">
              <span>Presupuesto Aprox:</span>
              <span class="column-total-budget">${this.formatCurrency(totalPresupuesto)}</span>
            </div>
            <div style="width: 100%; height: 4px; background: #e2e8f0; border-radius: 2px; margin-top: 8px; overflow: hidden;">
              <div class="column-progress-fill" style="width: ${porcentaje}%; height: 100%; background: ${esHoy ? '#10b981' : (esManana ? '#0284c7' : '#1e3a8a')};"></div>
            </div>
          </div>

          <!-- Contenedor de Tarjetas del Día -->
          <div style="padding: 10px; display: flex; flex-direction: column; gap: 10px; flex: 1;" data-dia="${dia.id}" id="col-${dia.id}">
            ${provsDia.length === 0 ? `
              <div style="text-align: center; color: #94a3b8; padding: 28px 10px; font-size: 0.78rem; border: 1.5px dashed #cbd5e1; border-radius: 6px; font-style: italic;">
                Sin proveedores programados
              </div>
            ` : provsDia.map(p => this.renderDealCard(p)).join('')}

            <!-- Botón + Agregar Proveedor al pie de la columna -->
            <button type="button" class="btn-agregar-prov-abajo" data-dia="${dia.id}" title="Agregar proveedor para el ${dia.nombre}">
              <span>+</span> Agregar Proveedor
            </button>
          </div>
        </div>
      `;
    });

    html += `</div>`;

    this.container.innerHTML = html;
    this.bindCardActions();
  }

  renderDealCard(p) {
    const cat = CATEGORIAS_PROVEEDOR[p.categoria] || { nombre: p.categoria || 'General', color: '#1e3a8a', bg: '#eff6ff' };
    const cantArticulos = Array.isArray(p.listaPedido) ? p.listaPedido.length : 0;
    const esPreventa = p.tipoVisita === 'preventa';
    const esVino = !esPreventa && !!p.yaVino;

    // Contacto de teléfono si está disponible en catálogo maestro o proveedor
    let contactoTel = p.contacto || '';
    if (!contactoTel && stateManager.data.catalogoProveedores) {
      const catItem = stateManager.data.catalogoProveedores.find(c => 
        (c.id && p.catalogoId && c.id === p.catalogoId) ||
        (c.nombre && p.proveedor && c.nombre.trim().toLowerCase() === p.proveedor.trim().toLowerCase())
      );
      if (catItem) {
        contactoTel = catItem.contacto || catItem.telefono || '';
      }
    }
    const telInfo = obtenerInfoTelefono(contactoTel);

    let subtituloEstadoBadge = '';
    if (esPreventa) {
      if (p.vinoPreventa) {
        subtituloEstadoBadge = `<span class="badge-vino-hora" style="background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0;">✓ Preventa vino ${p.horaVinoPreventa || ''}</span>`;
      } else {
        subtituloEstadoBadge = `<span style="font-size:0.68rem; font-weight:800; background:#fef3c7; color:#92400e; border:1px solid #fde68a; padding:2px 6px; border-radius:4px;">PREVENTA</span>`;
      }
    } else {
      if (esVino) {
        subtituloEstadoBadge = `<span class="badge-vino-hora">✓ Vino a las ${p.horaVino || 'hoy'}</span>`;
      } else {
        const est = (p.estado || 'programado').toUpperCase().replace('_', ' ');
        subtituloEstadoBadge = `<span class="deal-status-pill status-${p.estado || 'programado'}">${est}</span>`;
      }
    }

    const montoPresupuesto = esPreventa 
      ? (p.vinoPreventa ? (p.costoPreventa || p.presupuestoAprox) : (p.presupuestoAprox || p.preventaPresupuesto || 0))
      : (p.presupuestoAprox || p.preventaPresupuesto || 0);

    const montoVentaAnterior = p.ventaAnterior !== undefined ? p.ventaAnterior : (p.compra || 0);

    return `
      <div class="deal-card ${esVino ? 'proveedor-vino' : ''} ${esPreventa ? 'card-preventa' : ''}" data-id="${p.id}" id="card-${p.id}" style="cursor: pointer; transition: all 0.15s ease; ${esPreventa ? 'border-left: 4px solid #d97706;' : ''}">
        
        <!-- Fila 1: Nombre del Proveedor y Estado/Badge -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; gap: 8px;">
          <div style="flex: 1; min-width: 0;">
            <div class="card-proveedor-nombre ${esVino ? 'nombre-prov-tachado' : ''}" style="font-weight: 800; font-size: 0.92rem; color: #0f172a; line-height: 1.25; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${p.proveedor}">
              ${p.proveedor}
            </div>
            <div style="font-size: 0.72rem; font-weight: 600; color: ${cat.color}; margin-top: 2px;">
              ${cat.nombre || p.categoria}
            </div>
          </div>
          <div>
            ${subtituloEstadoBadge}
          </div>
        </div>

        <!-- Fila 2: Cajas de Presupuesto Aprox y Venta Anterior (Estructura Original) -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: ${esVino ? '#f1f5f9' : '#f8fafc'}; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; margin: 8px 0;">
          <div>
            <div style="font-size: 0.65rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px;">Presupuesto Aprox.</div>
            <div style="font-weight: 800; font-size: 0.88rem; color: ${esPreventa ? '#92400e' : '#0f172a'};">${this.formatCurrency(montoPresupuesto)}</div>
          </div>
          <div>
            <div style="font-size: 0.65rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px;">Venta Anterior</div>
            <div style="font-weight: 800; font-size: 0.88rem; color: #475569;">${this.formatCurrency(montoVentaAnterior)}</div>
          </div>
        </div>

        <!-- Fila 3: Indicador de Lista de Pedido y Hora Programada -->
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: #475569; padding-top: 6px; border-top: 1px dashed #cbd5e1;">
          <button type="button" class="btn-card-accion ${cantArticulos > 0 ? 'con-pedido' : ''}" data-action="ver-pedido" data-id="${p.id}" style="padding: 2px 7px; font-size: 0.74rem; font-weight: 700; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;" title="Ver o editar lista de pedido (${cantArticulos} productos)">
            <span>📋</span>
            <span>${cantArticulos > 0 ? `${cantArticulos} productos en pedido` : 'Ver lista de pedido'}</span>
          </button>
          <span style="font-size: 0.72rem; color: #64748b; font-weight: 600;">
            ⏰ ${p.hora || '10:00'}
          </span>
        </div>

        <!-- Si ya vino y se pagó en caja: Resumen Verde -->
        ${esVino && p.montoPagadoReal > 0 ? `
          <div style="margin-top: 6px; font-size: 0.72rem; color: #166534; background: #ecfdf5; border: 1px solid #bbf7d0; border-radius: 4px; padding: 3px 6px; font-weight: 600; display: flex; justify-content: space-between;">
            <span>Pagado en Hoja:</span>
            <strong>${this.formatCurrency(p.montoPagadoReal)}</strong>
          </div>
        ` : ''}

        <!-- Acciones especiales si es preventa -->
        ${esPreventa && !p.vinoPreventa ? `
          <button type="button" class="btn-vino-preventa" data-action="vino-preventa" data-id="${p.id}" style="width: 100%; margin-top: 6px; background: #fffbeb; border: 1.5px solid #fde68a; color: #92400e; border-radius: 5px; padding: 4px 8px; font-size: 0.74rem; font-weight: 700; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 5px;" title="Registrar que vino el preventista">
            <span>✓</span> Vino Preventa
          </button>
        ` : ''}

        <!-- Fila 4: Barra de Acciones (Llamar directo, Editar y Eliminar) -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; padding-top: 6px; border-top: 1px solid #f1f5f9;" class="card-action-bar">
          <div>
            ${telInfo.tieneNumero ? `
              <a href="${telInfo.urlTel}" class="btn-card-accion btn-card-call" title="Llamar a ${p.proveedor} (${telInfo.formateado})" onclick="event.stopPropagation();">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                <span style="font-size: 0.68rem; font-weight: 700;">Llamar</span>
              </a>
            ` : ''}
          </div>
          <div style="display: flex; gap: 6px;">
            <button type="button" class="btn-secondary" style="height: 24px; font-size: 0.72rem; padding: 0 8px;" data-action="edit" data-id="${p.id}" title="Editar detalles">
              ✏️ Editar
            </button>
            <button type="button" class="btn-secondary btn-card-delete" style="height: 24px; font-size: 0.72rem; padding: 0 6px; color:#ef4444;" data-action="delete" data-id="${p.id}" title="Eliminar de la agenda">
              🗑️
            </button>
          </div>
        </div>

      </div>
    `;
  }

  renderLista() {
    const proveedores = stateManager.data.proveedores;
    const diasInfo = this.getDiasInfo();
    const filtrados = this.filtrarProveedores(proveedores);

    // Filtrar por día seleccionado si aplica
    let listaMostrar = filtrados;
    if (this.filtroDiaLista === 'hoy') {
      listaMostrar = filtrados.filter(p => p.dia === diasInfo.idHoy);
    } else if (this.filtroDiaLista !== 'todos') {
      listaMostrar = filtrados.filter(p => p.dia === this.filtroDiaLista);
    }

    const totalArticulosSemana = filtrados.reduce((acc, p) => acc + (Array.isArray(p.listaPedido) ? p.listaPedido.length : 0), 0);
    const totalPresupuestoLista = listaMostrar.reduce((acc, p) => acc + (parseFloat(p.presupuestoAprox || p.preventaPresupuesto) || 0), 0);
    const totalVentaAnteriorLista = listaMostrar.reduce((acc, p) => acc + (parseFloat(p.ventaAnterior || p.compra) || 0), 0);
    const totalArticulosLista = listaMostrar.reduce((acc, p) => acc + (Array.isArray(p.listaPedido) ? p.listaPedido.length : 0), 0);

    let html = this.renderBannerProximos(proveedores, diasInfo);
    html += this.renderBarraControlesAgenda(diasInfo, totalArticulosSemana);

    html += `
      <div style="padding: 16px 20px 24px 20px; max-width: 1400px; margin: 0 auto;">
        <div style="background: #ffffff; border: 1.5px solid #0f172a; padding: 16px; border-radius: 6px; box-shadow: 0 1px 3px rgba(15,23,42,0.05);">
          
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
            <div>
              <h2 style="font-size: 1.05rem; font-weight: 900; color: #0f172a; margin: 0;">Agenda Consolidada de Proveedores</h2>
              <div style="font-size: 0.78rem; color: #64748b; margin-top: 2px;">
                ${listaMostrar.length} proveedores • Presupuesto: <strong style="color: #0f172a;">${this.formatCurrency(totalPresupuestoLista)}</strong> • Total artículos a pedir: <strong style="color: #0284c7;">${totalArticulosLista} artículos</strong>
              </div>
            </div>
            <div>
              <button type="button" class="btn-secondary btn-imprimir-pedidos-rapido" style="font-size: 0.76rem; height: 28px; padding: 0 10px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; background: #f0fdf4; border: 1.5px solid #86efac; color: #166534; font-weight: 700;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                <span>🖨️ Imprimir Esta Lista</span>
              </button>
            </div>
          </div>

          <div style="overflow-x: auto;">
            <table class="hoja-tabla-proveedores" style="width: 100%;">
              <thead>
                <tr>
                  <th style="width: 100px;">DÍA</th>
                  <th>PROVEEDOR</th>
                  <th style="width: 140px;">CATEGORÍA</th>
                  <th style="width: 90px;">HORA</th>
                  <th style="text-align: right; width: 140px;">PRESUPUESTO APROX.</th>
                  <th style="text-align: right; width: 130px;">VENTA ANTERIOR</th>
                  <th style="text-align: center; width: 140px;">LISTA PEDIDO</th>
                  <th style="width: 130px;">ESTADO HOJA</th>
                  <th style="text-align: center; width: 130px;">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                ${listaMostrar.length === 0 ? `
                  <tr><td colspan="9" style="text-align: center; padding: 24px; color: #94a3b8; font-style: italic;">No hay proveedores registrados para este día o búsqueda</td></tr>
                ` : listaMostrar.map(p => {
                  const cant = Array.isArray(p.listaPedido) ? p.listaPedido.length : 0;
                  const cat = CATEGORIAS_PROVEEDOR[p.categoria] || { nombre: p.categoria || 'General', color: '#1e3a8a' };
                  const esPreventa = p.tipoVisita === 'preventa';
                  const esHoy = p.dia === diasInfo.idHoy;

                  let cTel = p.contacto || '';
                  if (!cTel && stateManager.data.catalogoProveedores) {
                    const catItem = stateManager.data.catalogoProveedores.find(c => 
                      (c.id && p.catalogoId && c.id === p.catalogoId) ||
                      (c.nombre && p.proveedor && c.nombre.trim().toLowerCase() === p.proveedor.trim().toLowerCase())
                    );
                    if (catItem) cTel = catItem.contacto || catItem.telefono || '';
                  }
                  const telInfo = obtenerInfoTelefono(cTel);

                  return `
                    <tr style="cursor: pointer;" class="fila-proveedor-lista ${p.yaVino ? 'proveedor-vino' : ''}" data-id="${p.id}">
                      <td class="font-bold">
                        <span style="text-transform: uppercase;">${p.dia}</span>
                        ${esHoy ? '<span class="badge-dia-destacado hoy" style="margin-left: 4px; font-size: 0.65rem;">HOY</span>' : ''}
                      </td>
                      <td class="font-bold ${p.yaVino ? 'nombre-prov-tachado' : ''}">
                        ${p.proveedor}
                        ${esPreventa ? '<span style="font-size:0.65rem; background:#fef3c7; color:#92400e; padding:1px 5px; border-radius:3px; margin-left:6px; font-weight:700;">PREVENTA</span>' : ''}
                        ${p.yaVino ? `<div class="badge-vino-hora" style="display:inline-block; margin-left:6px;">✓ Vino ${p.horaVino}</div>` : ''}
                      </td>
                      <td style="font-size: 0.78rem; font-weight: 600; color: ${cat.color};">
                        ${cat.nombre}
                      </td>
                      <td>${p.hora || '-'}</td>
                      <td style="text-align: right; font-weight: 800; color: #0f172a;">
                        ${this.formatCurrency(p.presupuestoAprox || p.preventaPresupuesto)}
                      </td>
                      <td style="text-align: right; font-weight: 800; color: #475569;">
                        ${this.formatCurrency(p.ventaAnterior || p.compra || 0)}
                      </td>
                      <td style="text-align: center;">
                        <button type="button" class="btn-card-accion ${cant > 0 ? 'con-pedido' : ''}" data-action="ver-pedido" data-id="${p.id}" style="padding: 2px 8px; font-size: 0.74rem; font-weight: 700; border-radius: 4px;" title="Ver o editar lista de pedido">
                          <span>📋</span> ${cant > 0 ? `${cant} art.` : 'Crear'}
                        </button>
                      </td>
                      <td>
                        ${p.yaVino 
                          ? `<span class="badge-vino-hora">✓ Vino ${p.horaVino}</span>`
                          : (esPreventa && p.vinoPreventa 
                              ? `<span style="color:#166534; font-size:0.75rem; font-weight:700;">✓ Vino Prev</span>` 
                              : `<span class="deal-status-pill status-${p.estado || 'programado'}">${p.estado || 'programado'}</span>`)
                        }
                      </td>
                      <td style="text-align: center;">
                        <div style="display: inline-flex; align-items: center; gap: 4px;">
                          ${telInfo.tieneNumero ? `
                            <a href="${telInfo.urlTel}" class="btn-card-accion btn-card-call" title="Llamar a ${p.proveedor} (${telInfo.formateado})" onclick="event.stopPropagation();">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                            </a>
                          ` : ''}
                          <button type="button" class="btn-secondary" style="padding: 2px 6px; font-size: 0.72rem;" data-action="edit" data-id="${p.id}" title="Editar">✏️</button>
                          <button type="button" class="btn-secondary btn-card-delete" style="padding: 2px 6px; font-size: 0.72rem; color:#ef4444;" data-action="delete" data-id="${p.id}" title="Eliminar">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
              <tfoot>
                <tr style="background: #f8fafc; font-weight: 800; border-top: 2px solid #cbd5e1;">
                  <td colspan="4" style="padding: 8px 10px;">TOTALES (${listaMostrar.length} proveedores):</td>
                  <td style="text-align: right; padding: 8px 10px; color: #b91c1c; font-size: 0.95rem;">${this.formatCurrency(totalPresupuestoLista)}</td>
                  <td style="text-align: right; padding: 8px 10px; color: #475569; font-size: 0.95rem;">${this.formatCurrency(totalVentaAnteriorLista)}</td>
                  <td style="text-align: center; padding: 8px 10px; color: #0284c7; font-size: 0.88rem;">${totalArticulosLista} art.</td>
                  <td colspan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this.bindCardActions();
  }

  bindCardActions() {
    // Conmutador integrado Tablero / Lista
    this.container.querySelector('#btnAgendaToggleKanban')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setVistaModo('kanban');
    });

    this.container.querySelector('#btnAgendaToggleLista')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setVistaModo('lista');
    });

    // Selector de filtro de día en la vista de lista
    this.container.querySelector('#selectFiltroDiaLista')?.addEventListener('change', (e) => {
      this.filtroDiaLista = e.target.value;
      this.render();
    });

    // Asistente para imprimir lista consolidada de pedidos
    const dispararImpresion = (filtroPredeterminado = 'hoy') => {
      if (this.onOpenImprimirListaModal) {
        this.onOpenImprimirListaModal({ filtroInicial: filtroPredeterminado });
      }
    };

    this.container.querySelector('#btnImprimirListaPedidosAgenda')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const filtro = this.vistaModo === 'lista' && this.filtroDiaLista !== 'todos' ? this.filtroDiaLista : 'hoy';
      dispararImpresion(filtro);
    });

    this.container.querySelector('#btnImprimirPedidosHoyBanner')?.addEventListener('click', (e) => {
      e.stopPropagation();
      dispararImpresion('hoy');
    });

    this.container.querySelector('#btnImprimirPedidosMananaBanner')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const diasInfo = this.getDiasInfo();
      dispararImpresion(diasInfo.idManana);
    });

    this.container.querySelectorAll('.btn-imprimir-pedidos-rapido').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dispararImpresion(this.filtroDiaLista !== 'todos' ? this.filtroDiaLista : 'todos');
      });
    });

    // Botones para agregar proveedor
    this.container.querySelector('#btnAgregarProvAgendaGlobal')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const diasInfo = this.getDiasInfo();
      const diaInicial = (this.vistaModo === 'lista' && this.filtroDiaLista !== 'todos' && this.filtroDiaLista !== 'hoy') 
        ? this.filtroDiaLista 
        : diasInfo.idHoy;
      if (this.onOpenEditModal) {
        this.onOpenEditModal({ dia: diaInicial });
      }
    });

    this.container.querySelector('#btnAgregarProveedorHoyBanner')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const diasInfo = this.getDiasInfo();
      if (this.onOpenEditModal) {
        this.onOpenEditModal({ dia: diasInfo.idHoy });
      }
    });

    this.container.querySelector('#btnAgregarProveedorMananaBanner')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const diasInfo = this.getDiasInfo();
      if (this.onOpenEditModal) {
        this.onOpenEditModal({ dia: diasInfo.idManana });
      }
    });

    // Botón + Agregar Proveedor al pie de cada columna
    this.container.querySelectorAll('.btn-agregar-prov-abajo').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dia = btn.getAttribute('data-dia');
        if (this.onOpenEditModal) {
          this.onOpenEditModal({ dia });
        }
      });
    });

    // Clic en la tarjeta o fila de lista para abrir modal de pedido
    this.container.querySelectorAll('.deal-card, .fila-proveedor-lista').forEach(elem => {
      elem.addEventListener('click', (e) => {
        if (e.target.closest('[data-action]') || e.target.closest('a') || e.target.closest('button')) return;
        const id = elem.getAttribute('data-id');
        const prov = stateManager.data.proveedores.find(p => p.id === id);
        if (prov && this.onOpenPedidoModal) {
          this.onOpenPedidoModal(prov);
        }
      });
    });

    // Clic en los chips de acceso rápido de los banners
    this.container.querySelectorAll('.btn-chip-proveedor-hoy, .btn-chip-proveedor-manana').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const prov = stateManager.data.proveedores.find(p => p.id === id);
        if (prov && this.onOpenPedidoModal) {
          this.onOpenPedidoModal(prov);
        }
      });
    });

    // Clic en botones de acciones (eliminar, editar, ver pedido, preventa)
    this.container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.getAttribute('data-action');
        const id = btn.getAttribute('data-id');
        const prov = stateManager.data.proveedores.find(p => p.id === id);

        if (action === 'delete') {
          if (confirm(`¿Eliminar proveedor ${prov?.proveedor || ''} de la agenda?`)) {
            stateManager.deleteProveedor(id);
          }
        } else if (action === 'edit') {
          if (prov && this.onOpenEditModal) {
            this.onOpenEditModal(prov);
          }
        } else if (action === 'ver-pedido') {
          if (prov && this.onOpenPedidoModal) {
            this.onOpenPedidoModal(prov);
          }
        } else if (action === 'vino-preventa') {
          if (prov && this.onOpenVinoPreventaModal) {
            this.onOpenVinoPreventaModal(prov);
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
