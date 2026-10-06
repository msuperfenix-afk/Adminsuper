/**
 * Módulo de Pipeline Semanal de Proveedores (Agenda Semanal)
 * Diseño minimalista, monocromático y sobrio.
 * Ajustable a pantallas sin scroll horizontal forzado:
 * - El día actual inicia siempre en la primera columna.
 * - Muestra únicamente las columnas que caben en la pantalla.
 * - Botones con flechas (‹ Anterior y Siguiente ›) para continuar navegando los días.
 * - Mantiene intactas las cajas de Presupuesto Aprox, Venta Anterior, pedidos e impresión.
 */

import { stateManager } from '../state.js';
import { obtenerInfoTelefono } from './proveedoresDb.js';

export const DIAS_SEMANA = [
  { id: 'lunes', nombre: 'Lunes', corto: 'LUN' },
  { id: 'martes', nombre: 'Martes', corto: 'MAR' },
  { id: 'miercoles', nombre: 'Miércoles', corto: 'MIÉ' },
  { id: 'jueves', nombre: 'Jueves', corto: 'JUE' },
  { id: 'viernes', nombre: 'Viernes', corto: 'VIE' },
  { id: 'sabado', nombre: 'Sábado', corto: 'SÁB' },
  { id: 'domingo', nombre: 'Domingo', corto: 'DOM' }
];

// Paleta minimalista sobria en escala de grises neutros
export const CATEGORIAS_PROVEEDOR = {
  refrescos: { nombre: 'Refrescos / Bebidas', color: '#475569', bg: '#f1f5f9' },
  panaderia: { nombre: 'Panadería / Galletas', color: '#475569', bg: '#f1f5f9' },
  botanas: { nombre: 'Botanas / Frituras', color: '#475569', bg: '#f1f5f9' },
  lacteos: { nombre: 'Lácteos / Embutidos', color: '#475569', bg: '#f1f5f9' },
  cerveza: { nombre: 'Cerveza / Licores', color: '#475569', bg: '#f1f5f9' },
  abarrotes: { nombre: 'Abarrotes / Granel', color: '#475569', bg: '#f1f5f9' },
  carniceria: { nombre: 'Carnes / Fríos', color: '#475569', bg: '#f1f5f9' }
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

    // Control de desplazamiento: el día de hoy es el primer día (offset 0)
    this.offsetDias = 0;
    this.diasVisiblesCantidad = this.calcularDiasVisiblesPorPantalla();

    this.init();
  }

  init() {
    this.render();
    this.setupEventListeners();
  }

  calcularDiasVisiblesPorPantalla() {
    const contenedor = this.container || (typeof document !== 'undefined' ? document.getElementById('pipelineViewContainer') : null);
    const ancho = (contenedor && contenedor.clientWidth > 0)
      ? contenedor.clientWidth
      : ((typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth : 1200);

    if (ancho < 600) return 1;
    if (ancho < 950) return 2;
    if (ancho < 1320) return 3;
    if (ancho < 1680) return 4;
    return 5;
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

  /**
   * Ordena los días de la semana colocando SIEMPRE el día actual en la primera posición.
   */
  getDiasOrdenadosDesdeHoy() {
    const diasInfo = this.getDiasInfo();
    const idxHoy = DIAS_SEMANA.findIndex(d => d.id === diasInfo.idHoy);
    if (idxHoy === -1) return DIAS_SEMANA;
    return [...DIAS_SEMANA.slice(idxHoy), ...DIAS_SEMANA.slice(0, idxHoy)];
  }

  /**
   * Retorna únicamente los días que alcanzan a mostrarse en la pantalla actual a partir del desplazamiento (offset).
   */
  getDiasVisibles() {
    const todos = this.getDiasOrdenadosDesdeHoy();
    const cant = Math.min(this.diasVisiblesCantidad, todos.length);
    const vis = [];
    for (let i = 0; i < cant; i++) {
      const idx = (this.offsetDias + i) % todos.length;
      vis.push(todos[idx]);
    }
    return vis;
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
        <div style="padding: 24px 20px; text-align: center; color: #0f172a; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; margin: 20px auto; max-width: 600px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <h3 style="margin-bottom: 6px; font-weight: 800;">Atención al cargar la Agenda Semanal</h3>
          <p style="font-size: 0.82rem; color: #64748b; margin-bottom: 12px;">${err?.message || 'Error inesperado'}</p>
          <button type="button" class="btn-primary" onclick="location.reload()" style="font-size: 0.78rem; padding: 6px 14px; cursor: pointer;">Recargar</button>
        </div>
      `;
    }
  }

  renderBannerMinimalista(proveedores = [], diasInfo) {
    const provsLista = Array.isArray(proveedores) ? proveedores : [];
    const provsHoy = provsLista.filter(p => p && p.dia === diasInfo.idHoy);
    const provsHoyVinieron = provsHoy.filter(p => p && p.yaVino);
    const totalPresupuestoHoy = provsHoy.reduce((acc, p) => acc + (parseFloat(p.presupuestoAprox || p.preventaPresupuesto) || 0), 0);
    const totalPagadoHoy = provsHoyVinieron.reduce((acc, p) => acc + (parseFloat(p.montoPagadoReal) || 0), 0);
    const totalArticulosHoy = provsHoy.reduce((acc, p) => acc + (Array.isArray(p.listaPedido) ? p.listaPedido.length : 0), 0);

    const provsManana = provsLista.filter(p => p && p.dia === diasInfo.idManana);
    const totalPresupuestoManana = provsManana.reduce((acc, p) => acc + (parseFloat(p.presupuestoAprox || p.preventaPresupuesto) || 0), 0);
    const totalArticulosManana = provsManana.reduce((acc, p) => acc + (Array.isArray(p.listaPedido) ? p.listaPedido.length : 0), 0);

    return `
      <div style="padding: 12px 20px 0 20px;">
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);">
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 14px; align-items: start;">
            
            <!-- Resumen de Hoy -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="badge-dia-destacado hoy">HOY</span>
                  <span style="font-weight: 800; font-size: 0.90rem; color: #0f172a;">${diasInfo.nombreHoy}</span>
                  <span style="font-size: 0.76rem; color: #64748b;">• ${provsHoyVinieron.length}/${provsHoy.length} recibidos</span>
                </div>
                <div style="font-size: 0.8rem;">
                  <span style="color: #64748b;">Presupuesto: </span>
                  <strong style="color: #0f172a;">${this.formatCurrency(totalPresupuestoHoy)}</strong>
                </div>
              </div>

              <!-- Chips sobrios de proveedores de hoy -->
              ${provsHoy.length > 0 ? `
                <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px;">
                  ${provsHoy.map(p => {
                    const cant = Array.isArray(p.listaPedido) ? p.listaPedido.length : 0;
                    return `
                      <button type="button" class="btn-chip-proveedor-hoy" data-id="${p.id}" style="background: #ffffff; border: 1px solid ${p.yaVino ? '#bbf7d0' : '#e2e8f0'}; border-radius: 4px; padding: 2px 8px; font-size: 0.74rem; font-weight: 600; color: ${p.yaVino ? '#166534' : '#1e293b'}; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;" title="Ver pedido de ${p.proveedor}">
                        <span class="${p.yaVino ? 'nombre-prov-tachado' : ''}">${p.proveedor}</span>
                        ${cant > 0 ? `<span style="background: #f1f5f9; color: #334155; padding: 1px 4px; border-radius: 3px; font-size: 0.68rem; font-weight: 700;">📋 ${cant}</span>` : ''}
                        ${p.yaVino ? `<span style="font-size:0.68rem; color:#166534; font-weight:700;">✓</span>` : ''}
                      </button>
                    `;
                  }).join('')}
                </div>
              ` : `
                <div style="font-size: 0.75rem; color: #94a3b8; font-style: italic; margin-top: 4px;">Sin visitas programadas para hoy.</div>
              `}
            </div>

            <!-- Resumen de Mañana -->
            <div style="border-left: 1px solid #f1f5f9; padding-left: 14px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="badge-dia-destacado manana">MAÑANA</span>
                  <span style="font-weight: 800; font-size: 0.90rem; color: #334155;">${diasInfo.nombreManana}</span>
                  <span style="font-size: 0.76rem; color: #64748b;">• ${provsManana.length} proveedores</span>
                </div>
                <div style="font-size: 0.8rem;">
                  <span style="color: #64748b;">Estimado: </span>
                  <strong style="color: #334155;">${this.formatCurrency(totalPresupuestoManana)}</strong>
                </div>
              </div>

              ${provsManana.length > 0 ? `
                <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px;">
                  ${provsManana.map(p => {
                    const cant = Array.isArray(p.listaPedido) ? p.listaPedido.length : 0;
                    return `
                      <button type="button" class="btn-chip-proveedor-manana" data-id="${p.id}" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 2px 8px; font-size: 0.74rem; font-weight: 600; color: #334155; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;" title="Ver lista de pedido de ${p.proveedor}">
                        <span>${p.proveedor}</span>
                        ${cant > 0 ? `<span style="background: #f1f5f9; color: #334155; padding: 1px 4px; border-radius: 3px; font-size: 0.68rem; font-weight: 700;">📋 ${cant}</span>` : ''}
                      </button>
                    `;
                  }).join('')}
                </div>
              ` : `
                <div style="font-size: 0.75rem; color: #94a3b8; font-style: italic; margin-top: 4px;">Sin visitas programadas para mañana.</div>
              `}
            </div>

          </div>

        </div>
      </div>
    `;
  }

  renderBarraControlesAgenda(diasInfo, totalArticulosPedidosSemana) {
    const todos = this.getDiasOrdenadosDesdeHoy();
    const visibles = this.getDiasVisibles();
    const nombrePrimerDia = visibles[0]?.nombre || 'Hoy';
    const nombreUltimoDia = visibles[visibles.length - 1]?.nombre || '';
    const rangoTexto = visibles.length === 1 
      ? `${nombrePrimerDia}` 
      : `${nombrePrimerDia} a ${nombreUltimoDia}`;

    return `
      <div class="agenda-controls-bar" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 20px 0 20px; flex-wrap: wrap; gap: 10px;">
        
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          
          <!-- Conmutador minimalista: Tablero vs Lista -->
          <div class="agenda-view-mode-toggle" style="display: inline-flex; background: #f1f5f9; padding: 2px; border-radius: 6px; border: 1px solid #e2e8f0;">
            <button type="button" class="btn-toggle-view ${this.vistaModo === 'kanban' ? 'active' : ''}" id="btnAgendaToggleKanban" style="padding: 4px 10px; font-size: 0.76rem; font-weight: 700; border: none; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 5px; background: ${this.vistaModo === 'kanban' ? '#ffffff' : 'transparent'}; color: ${this.vistaModo === 'kanban' ? '#0f172a' : '#64748b'}; box-shadow: ${this.vistaModo === 'kanban' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'};">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="18" rx="1"></rect><rect x="14" y="3" width="7" height="18" rx="1"></rect></svg>
              <span>Tablero</span>
            </button>
            <button type="button" class="btn-toggle-view ${this.vistaModo === 'lista' ? 'active' : ''}" id="btnAgendaToggleLista" style="padding: 4px 10px; font-size: 0.76rem; font-weight: 700; border: none; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 5px; background: ${this.vistaModo === 'lista' ? '#ffffff' : 'transparent'}; color: ${this.vistaModo === 'lista' ? '#0f172a' : '#64748b'}; box-shadow: ${this.vistaModo === 'lista' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'};">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line></svg>
              <span>Lista</span>
            </button>
          </div>

          ${this.vistaModo === 'kanban' ? `
            <!-- NAVEGACIÓN CON FLECHAS AJUSTABLE A PANTALLA -->
            <div style="display: flex; align-items: center; gap: 4px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 2px 4px; box-shadow: 0 1px 2px rgba(15,23,42,0.03);">
              <button type="button" id="btnAgendaNavAnterior" class="btn-secondary" style="height: 28px; padding: 0 9px; font-size: 0.74rem; font-weight: 700; cursor: pointer; border: none; background: transparent; color: #334155; display: inline-flex; align-items: center; gap: 4px;" title="Ver día anterior">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                <span>Anterior</span>
              </button>
              
              <div style="padding: 0 8px; font-size: 0.75rem; font-weight: 700; color: #0f172a; white-space: nowrap; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; display: inline-flex; align-items: center; gap: 4px;">
                <span>${rangoTexto}</span>
                <span style="font-weight: 500; color: #64748b; font-size: 0.70rem;">(${visibles.length}/7)</span>
              </div>

              <button type="button" id="btnAgendaNavSiguiente" class="btn-secondary" style="height: 28px; padding: 0 9px; font-size: 0.74rem; font-weight: 700; cursor: pointer; border: none; background: transparent; color: #334155; display: inline-flex; align-items: center; gap: 4px;" title="Ver siguientes días">
                <span>Siguiente</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>

              ${this.offsetDias !== 0 ? `
                <button type="button" id="btnAgendaNavHoy" class="btn-primary" style="height: 24px; padding: 0 7px; font-size: 0.68rem; font-weight: 700; border-radius: 4px; margin-left: 3px; background: #0f172a; border: 1px solid #0f172a; color: #ffffff; cursor: pointer;" title="Volver a la vista donde el día actual es la primera columna">
                  Ir a Hoy
                </button>
              ` : ''}
            </div>
          ` : `
            <!-- Filtro de días en vista de Lista -->
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 0.76rem; color: #64748b;">Día:</span>
              <select id="selectFiltroDiaLista" class="form-control" style="font-size: 0.76rem; font-weight: 700; padding: 2px 8px; height: 28px; border-radius: 5px; border: 1px solid #cbd5e1; background: #ffffff;">
                <option value="todos" ${this.filtroDiaLista === 'todos' ? 'selected' : ''}>Semana Completa</option>
                <option value="hoy" ${this.filtroDiaLista === 'hoy' ? 'selected' : ''}>Solo Hoy (${diasInfo.nombreHoy})</option>
                ${DIAS_SEMANA.map(d => `<option value="${d.id}" ${this.filtroDiaLista === d.id ? 'selected' : ''}>${d.nombre}</option>`).join('')}
              </select>
            </div>
          `}
        </div>

        <!-- Acciones Minimalistas a la derecha -->
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <button type="button" id="btnImprimirListaPedidosAgenda" class="btn-secondary" style="font-size: 0.76rem; height: 28px; padding: 0 10px; cursor: pointer; font-weight: 700; display: inline-flex; align-items: center; gap: 5px; background: #ffffff; border: 1px solid #cbd5e1; color: #0f172a;" title="Imprimir pedidos en ticket USB (58mm/80mm) o formato carta">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            <span>Imprimir Pedidos</span>
            ${totalArticulosPedidosSemana > 0 ? `<span style="background: #0f172a; color: #ffffff; font-size: 0.68rem; padding: 1px 6px; border-radius: 9999px;">${totalArticulosPedidosSemana}</span>` : ''}
          </button>

          <button type="button" id="btnAgregarProvAgendaGlobal" class="btn-primary" style="font-size: 0.76rem; height: 28px; padding: 0 10px; cursor: pointer; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; background: #0f172a; border-color: #0f172a;">
            <span>+</span> Proveedor
          </button>
        </div>

      </div>
    `;
  }

  renderKanban() {
    const proveedores = (stateManager.data && Array.isArray(stateManager.data.proveedores)) ? stateManager.data.proveedores : [];
    const filtrados = this.filtrarProveedores(proveedores);
    const diasInfo = this.getDiasInfo();
    const diasVisibles = this.getDiasVisibles();
    const totalArticulosSemana = filtrados.reduce((acc, p) => acc + (Array.isArray(p.listaPedido) ? p.listaPedido.length : 0), 0);

    let html = this.renderBannerMinimalista(proveedores, diasInfo);
    html += this.renderBarraControlesAgenda(diasInfo, totalArticulosSemana);

    // Grid que se ajusta exactamente a las columnas visibles en pantalla (sin scroll horizontal forzado)
    html += `<div class="kanban-board" id="kanbanBoard" style="--columnas-visibles: ${diasVisibles.length};">`;

    diasVisibles.forEach((dia, colIdx) => {
      const provsDia = filtrados.filter(p => p && p.dia === dia.id);
      const totalPresupuesto = provsDia.reduce((acc, p) => acc + (parseFloat(p.presupuestoAprox || p.preventaPresupuesto) || 0), 0);
      const totalCompletados = provsDia.filter(p => p && (p.yaVino || p.estado === 'pagado' || p.estado === 'recibido')).length;
      const porcentaje = provsDia.length > 0 ? Math.round((totalCompletados / provsDia.length) * 100) : 0;

      const esHoy = dia.id === diasInfo.idHoy;
      const esManana = dia.id === diasInfo.idManana;
      const claseColExtra = esHoy ? 'col-hoy' : (esManana ? 'col-manana' : '');

      html += `
        <div class="kanban-column ${claseColExtra}" data-dia="${dia.id}">
          
          <div class="column-header">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <div class="column-day" style="display: flex; align-items: center; gap: 6px;">
                <span>${dia.nombre}</span>
                ${esHoy ? '<span class="badge-dia-destacado hoy">HOY</span>' : ''}
                ${esManana ? '<span class="badge-dia-destacado manana">MAÑANA</span>' : ''}
              </div>
              <span style="background: #f1f5f9; font-size: 0.70rem; font-weight: 700; padding: 1px 6px; border-radius: 4px; color: #475569;">
                ${provsDia.length}
              </span>
            </div>

            <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: #64748b;">
              <span>Presupuesto:</span>
              <span class="column-total-budget">${this.formatCurrency(totalPresupuesto)}</span>
            </div>

            <div style="width: 100%; height: 3px; background: #e2e8f0; border-radius: 2px; margin-top: 6px; overflow: hidden;">
              <div class="column-progress-fill" style="width: ${porcentaje}%; height: 100%; background: ${esHoy ? '#0f172a' : '#64748b'};"></div>
            </div>
          </div>

          <!-- Contenedor con scroll vertical interno por columna -->
          <div class="column-cards-scroll" data-dia="${dia.id}" id="col-${dia.id}">
            ${provsDia.length === 0 ? `
              <div style="text-align: center; color: #94a3b8; padding: 24px 8px; font-size: 0.75rem; border: 1px dashed #e2e8f0; border-radius: 5px; font-style: italic;">
                Sin proveedores
              </div>
            ` : provsDia.map(p => this.renderDealCard(p)).join('')}

            <!-- Botón + Agregar Proveedor al pie de la columna -->
            <button type="button" class="btn-agregar-prov-abajo" data-dia="${dia.id}" title="Agregar proveedor para el ${dia.nombre}" style="border: 1px dashed #cbd5e1; background: #f8fafc; color: #475569; font-size: 0.74rem; padding: 6px 8px; border-radius: 5px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; margin-top: 2px;">
              <span>+</span> Proveedor
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
    const cantArticulos = Array.isArray(p.listaPedido) ? p.listaPedido.length : 0;
    const esPreventa = p.tipoVisita === 'preventa';
    const esVino = !esPreventa && !!p.yaVino;

    // Contacto telefónico
    let contactoTel = p.contacto || '';
    if (!contactoTel && stateManager.data && Array.isArray(stateManager.data.catalogoProveedores)) {
      const catItem = stateManager.data.catalogoProveedores.find(c => 
        (c && c.id && p.catalogoId && c.id === p.catalogoId) ||
        (c && c.nombre && p.proveedor && c.nombre.trim().toLowerCase() === (p.proveedor || '').trim().toLowerCase())
      );
      if (catItem) {
        contactoTel = catItem.contacto || catItem.telefono || '';
      }
    }
    const telInfo = obtenerInfoTelefono(contactoTel);

    let estadoLabel = '';
    if (esPreventa) {
      if (p.vinoPreventa) {
        estadoLabel = `<span style="font-size:0.68rem; color:#166534; font-weight:700;">✓ Prev ${p.horaVinoPreventa || ''}</span>`;
      } else {
        estadoLabel = `<span style="font-size:0.65rem; font-weight:700; background:#f1f5f9; color:#475569; padding:1px 5px; border-radius:3px;">PREVENTA</span>`;
      }
    } else {
      if (esVino) {
        estadoLabel = `<span class="badge-vino-hora">✓ Vino ${p.horaVino || ''}</span>`;
      } else {
        estadoLabel = `<span style="font-size:0.7rem; color:#64748b;">${p.hora || '10:00'}</span>`;
      }
    }

    const montoPresupuesto = esPreventa 
      ? (p.vinoPreventa ? (p.costoPreventa || p.presupuestoAprox) : (p.presupuestoAprox || p.preventaPresupuesto || 0))
      : (p.presupuestoAprox || p.preventaPresupuesto || 0);

    const montoVentaAnterior = p.ventaAnterior !== undefined ? p.ventaAnterior : (p.compra || 0);

    return `
      <div class="deal-card ${esVino ? 'proveedor-vino' : ''}" data-id="${p.id}" id="card-${p.id}" style="cursor: pointer;">
        
        <!-- Línea 1: Nombre del Proveedor y Estado -->
        <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px;">
          <div class="card-proveedor-nombre ${esVino ? 'nombre-prov-tachado' : ''}" style="font-weight: 700; font-size: 0.88rem; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${p.proveedor}">
            ${p.proveedor}
          </div>
          <div>
            ${estadoLabel}
          </div>
        </div>

        <!-- Línea 2: Cajas de Presupuesto Aprox y Venta Anterior (Minimalista) -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 5px 8px; margin: 6px 0;">
          <div>
            <div style="font-size: 0.62rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Presupuesto</div>
            <div style="font-weight: 800; font-size: 0.82rem; color: #0f172a;">${this.formatCurrency(montoPresupuesto)}</div>
          </div>
          <div>
            <div style="font-size: 0.62rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Venta Ant.</div>
            <div style="font-weight: 800; font-size: 0.82rem; color: #475569;">${this.formatCurrency(montoVentaAnterior)}</div>
          </div>
        </div>

        <!-- Línea 3: Botón de Pedido y Pagado Real si vino -->
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: #475569; padding-top: 4px; border-top: 1px solid #f1f5f9;">
          <button type="button" class="btn-card-accion ${cantArticulos > 0 ? 'con-pedido' : ''}" data-action="ver-pedido" data-id="${p.id}" style="padding: 2px 6px; font-size: 0.72rem; font-weight: 700; border-radius: 4px; background: ${cantArticulos > 0 ? '#f1f5f9' : 'transparent'}; border: 1px solid ${cantArticulos > 0 ? '#cbd5e1' : '#e2e8f0'}; color: #0f172a;" title="Ver o editar lista de pedido (${cantArticulos} productos)">
            <span>📋</span>
            <span>${cantArticulos > 0 ? `${cantArticulos} art.` : '+ Pedido'}</span>
          </button>

          ${esVino && p.montoPagadoReal > 0 ? `
            <div style="font-size: 0.70rem; color: #166534; font-weight: 700;">
              Pagado: ${this.formatCurrency(p.montoPagadoReal)}
            </div>
          ` : ''}

          <!-- Botones sutiles de acción -->
          <div style="display: flex; align-items: center; gap: 4px;" class="card-action-bar">
            ${telInfo && telInfo.tieneNumero ? `
              <a href="${telInfo.urlTel}" class="btn-card-accion btn-card-call" title="Llamar a ${p.proveedor} (${telInfo.formateado})" onclick="event.stopPropagation();" style="padding: 2px 5px;">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              </a>
            ` : ''}
            <button type="button" class="btn-card-accion" data-action="edit" data-id="${p.id}" title="Editar" style="padding: 2px 5px; font-size: 0.70rem;">✏️</button>
            <button type="button" class="btn-card-accion btn-card-delete" data-action="delete" data-id="${p.id}" title="Eliminar" style="padding: 2px 5px; font-size: 0.70rem; color: #94a3b8;">🗑️</button>
          </div>
        </div>

      </div>
    `;
  }

  renderLista() {
    const proveedores = (stateManager.data && Array.isArray(stateManager.data.proveedores)) ? stateManager.data.proveedores : [];
    const diasInfo = this.getDiasInfo();
    const filtrados = this.filtrarProveedores(proveedores);

    // Filtrar por día seleccionado si aplica
    let listaMostrar = filtrados;
    if (this.filtroDiaLista === 'hoy') {
      listaMostrar = filtrados.filter(p => p && p.dia === diasInfo.idHoy);
    } else if (this.filtroDiaLista !== 'todos') {
      listaMostrar = filtrados.filter(p => p && p.dia === this.filtroDiaLista);
    }

    const totalArticulosSemana = filtrados.reduce((acc, p) => acc + (Array.isArray(p.listaPedido) ? p.listaPedido.length : 0), 0);
    const totalPresupuestoLista = listaMostrar.reduce((acc, p) => acc + (parseFloat(p.presupuestoAprox || p.preventaPresupuesto) || 0), 0);
    const totalVentaAnteriorLista = listaMostrar.reduce((acc, p) => acc + (parseFloat(p.ventaAnterior || p.compra) || 0), 0);
    const totalArticulosLista = listaMostrar.reduce((acc, p) => acc + (Array.isArray(p.listaPedido) ? p.listaPedido.length : 0), 0);

    let html = this.renderBannerMinimalista(proveedores, diasInfo);
    html += this.renderBarraControlesAgenda(diasInfo, totalArticulosSemana);

    html += `
      <div style="padding: 14px 20px 24px 20px; max-width: 1400px; margin: 0 auto;">
        <div style="background: #ffffff; border: 1px solid #e2e8f0; padding: 14px; border-radius: 6px; box-shadow: 0 1px 2px rgba(15,23,42,0.03);">
          
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
            <div>
              <h2 style="font-size: 0.95rem; font-weight: 800; color: #0f172a; margin: 0;">Lista Detallada de Proveedores</h2>
              <div style="font-size: 0.74rem; color: #64748b; margin-top: 2px;">
                ${listaMostrar.length} proveedores • Presupuesto: <strong style="color: #0f172a;">${this.formatCurrency(totalPresupuestoLista)}</strong> • Total artículos: <strong style="color: #0f172a;">${totalArticulosLista}</strong>
              </div>
            </div>
            <div>
              <button type="button" class="btn-secondary btn-imprimir-pedidos-rapido" style="font-size: 0.74rem; height: 26px; padding: 0 10px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; background: #ffffff; border: 1px solid #cbd5e1; color: #0f172a; font-weight: 700;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                <span>Imprimir Lista</span>
              </button>
            </div>
          </div>

          <div style="overflow-x: auto;">
            <table class="hoja-tabla-proveedores" style="width: 100%;">
              <thead>
                <tr>
                  <th style="width: 90px;">DÍA</th>
                  <th>PROVEEDOR</th>
                  <th style="width: 120px;">CATEGORÍA</th>
                  <th style="width: 80px;">HORA</th>
                  <th style="text-align: right; width: 130px;">PRESUPUESTO</th>
                  <th style="text-align: right; width: 120px;">VENTA ANT.</th>
                  <th style="text-align: center; width: 120px;">PEDIDO</th>
                  <th style="width: 120px;">ESTADO</th>
                  <th style="text-align: center; width: 110px;">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                ${listaMostrar.length === 0 ? `
                  <tr><td colspan="9" style="text-align: center; padding: 20px; color: #94a3b8; font-style: italic;">No hay proveedores registrados</td></tr>
                ` : listaMostrar.map(p => {
                  const cant = Array.isArray(p.listaPedido) ? p.listaPedido.length : 0;
                  const cat = CATEGORIAS_PROVEEDOR[p.categoria] || { nombre: p.categoria || 'General' };
                  const esPreventa = p.tipoVisita === 'preventa';
                  const esHoy = p.dia === diasInfo.idHoy;

                  let cTel = p.contacto || '';
                  if (!cTel && stateManager.data && Array.isArray(stateManager.data.catalogoProveedores)) {
                    const catItem = stateManager.data.catalogoProveedores.find(c => 
                      (c && c.id && p.catalogoId && c.id === p.catalogoId) ||
                      (c && c.nombre && p.proveedor && c.nombre.trim().toLowerCase() === (p.proveedor || '').trim().toLowerCase())
                    );
                    if (catItem) cTel = catItem.contacto || catItem.telefono || '';
                  }
                  const telInfo = obtenerInfoTelefono(cTel);

                  return `
                    <tr style="cursor: pointer;" class="fila-proveedor-lista ${p.yaVino ? 'proveedor-vino' : ''}" data-id="${p.id}">
                      <td class="font-bold">
                        <span style="text-transform: uppercase;">${p.dia}</span>
                        ${esHoy ? '<span class="badge-dia-destacado hoy" style="margin-left: 3px; font-size: 0.62rem;">HOY</span>' : ''}
                      </td>
                      <td class="font-bold ${p.yaVino ? 'nombre-prov-tachado' : ''}">
                        ${p.proveedor}
                        ${esPreventa ? '<span style="font-size:0.62rem; background:#f1f5f9; color:#475569; padding:1px 4px; border-radius:3px; margin-left:4px; font-weight:700;">PREV</span>' : ''}
                        ${p.yaVino ? `<span class="badge-vino-hora" style="margin-left:4px;">✓ ${p.horaVino}</span>` : ''}
                      </td>
                      <td style="font-size: 0.74rem; color: #64748b;">
                        ${cat.nombre}
                      </td>
                      <td>${p.hora || '-'}</td>
                      <td style="text-align: right; font-weight: 700; color: #0f172a;">
                        ${this.formatCurrency(p.presupuestoAprox || p.preventaPresupuesto)}
                      </td>
                      <td style="text-align: right; font-weight: 700; color: #475569;">
                        ${this.formatCurrency(p.ventaAnterior || p.compra || 0)}
                      </td>
                      <td style="text-align: center;">
                        <button type="button" class="btn-card-accion ${cant > 0 ? 'con-pedido' : ''}" data-action="ver-pedido" data-id="${p.id}" style="padding: 2px 7px; font-size: 0.72rem; font-weight: 700; border-radius: 4px;" title="Ver o editar lista de pedido">
                          <span>📋</span> ${cant > 0 ? `${cant} art.` : 'Crear'}
                        </button>
                      </td>
                      <td>
                        ${p.yaVino 
                          ? `<span class="badge-vino-hora">✓ Vino ${p.horaVino}</span>`
                          : (esPreventa && p.vinoPreventa 
                              ? `<span style="color:#166534; font-size:0.72rem; font-weight:700;">✓ Vino Prev</span>` 
                              : `<span class="deal-status-pill status-${p.estado || 'programado'}">${p.estado || 'programado'}</span>`)
                        }
                      </td>
                      <td style="text-align: center;">
                        <div style="display: inline-flex; align-items: center; gap: 3px;">
                          ${telInfo && telInfo.tieneNumero ? `
                            <a href="${telInfo.urlTel}" class="btn-card-accion btn-card-call" title="Llamar a ${p.proveedor} (${telInfo.formateado})" onclick="event.stopPropagation();" style="padding: 2px 5px;">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                            </a>
                          ` : ''}
                          <button type="button" class="btn-secondary" style="padding: 2px 5px; font-size: 0.70rem;" data-action="edit" data-id="${p.id}" title="Editar">✏️</button>
                          <button type="button" class="btn-secondary btn-card-delete" style="padding: 2px 5px; font-size: 0.70rem; color:#94a3b8;" data-action="delete" data-id="${p.id}" title="Eliminar">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
              <tfoot>
                <tr style="background: #f8fafc; font-weight: 800; border-top: 1px solid #cbd5e1;">
                  <td colspan="4" style="padding: 6px 10px;">TOTALES (${listaMostrar.length} proveedores):</td>
                  <td style="text-align: right; padding: 6px 10px; color: #0f172a; font-size: 0.90rem;">${this.formatCurrency(totalPresupuestoLista)}</td>
                  <td style="text-align: right; padding: 6px 10px; color: #475569; font-size: 0.90rem;">${this.formatCurrency(totalVentaAnteriorLista)}</td>
                  <td style="text-align: center; padding: 6px 10px; color: #0f172a; font-size: 0.82rem;">${totalArticulosLista} art.</td>
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
    // Conmutador Tablero / Lista
    this.container.querySelector('#btnAgendaToggleKanban')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setVistaModo('kanban');
    });

    this.container.querySelector('#btnAgendaToggleLista')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setVistaModo('lista');
    });

    // FLECHAS DE NAVEGACIÓN CONTINUA ENTRE DÍAS
    this.container.querySelector('#btnAgendaNavAnterior')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.offsetDias = (this.offsetDias - 1 + 7) % 7;
      this.render();
    });

    this.container.querySelector('#btnAgendaNavSiguiente')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.offsetDias = (this.offsetDias + 1) % 7;
      this.render();
    });

    this.container.querySelector('#btnAgendaNavHoy')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.offsetDias = 0;
      this.render();
    });

    // Filtro de día en vista de lista
    this.container.querySelector('#selectFiltroDiaLista')?.addEventListener('change', (e) => {
      this.filtroDiaLista = e.target.value;
      this.render();
    });

    // Impresión de lista consolidada de pedidos
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

    this.container.querySelectorAll('.btn-imprimir-pedidos-rapido').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dispararImpresion(this.filtroDiaLista !== 'todos' ? this.filtroDiaLista : 'todos');
      });
    });

    // Botones para agregar proveedor
    this.container.querySelector('#btnAgregarProvAgendaGlobal')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const diasVisibles = this.getDiasVisibles();
      const diaInicial = (this.vistaModo === 'lista' && this.filtroDiaLista !== 'todos' && this.filtroDiaLista !== 'hoy') 
        ? this.filtroDiaLista 
        : (diasVisibles[0]?.id || 'lunes');
      if (this.onOpenEditModal) {
        this.onOpenEditModal({ dia: diaInicial });
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

    // Clic en la tarjeta o fila de lista para abrir pedido
    this.container.querySelectorAll('.deal-card, .fila-proveedor-lista').forEach(elem => {
      elem.addEventListener('click', (e) => {
        if (e.target.closest('[data-action]') || e.target.closest('a') || e.target.closest('button')) return;
        const id = elem.getAttribute('data-id');
        const prov = stateManager.data.proveedores.find(p => p && p.id === id);
        if (prov && this.onOpenPedidoModal) {
          this.onOpenPedidoModal(prov);
        }
      });
    });

    // Clic en los chips de acceso rápido
    this.container.querySelectorAll('.btn-chip-proveedor-hoy, .btn-chip-proveedor-manana').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const prov = stateManager.data.proveedores.find(p => p && p.id === id);
        if (prov && this.onOpenPedidoModal) {
          this.onOpenPedidoModal(prov);
        }
      });
    });

    // Acciones de las tarjetas (eliminar, editar, ver pedido, preventa)
    this.container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.getAttribute('data-action');
        const id = btn.getAttribute('data-id');
        const prov = stateManager.data.proveedores.find(p => p && p.id === id);

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

    // Adaptabilidad automática al redimensionar la ventana sin recargar
    if (typeof window !== 'undefined') {
      let resizeTimeout = null;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          const nuevaCant = this.calcularDiasVisiblesPorPantalla();
          if (nuevaCant !== this.diasVisiblesCantidad) {
            this.diasVisiblesCantidad = nuevaCant;
            this.render();
          }
        }, 150);
      });
    }
  }
}
