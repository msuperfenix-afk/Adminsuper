/**
 * Módulo de Pipeline Semanal de Proveedores (Fase 1)
 * 7 Columnas (Lunes a Domingo) con Paleta Sobria Azul y Rojo Fénix
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

export const CATEGORIAS_PROVEEDOR = {
  refrescos: { nombre: 'Refrescos / Bebidas', color: '#1e293b', bg: '#f1f5f9' },
  panaderia: { nombre: 'Panadería / Galletas', color: '#1e3a8a', bg: '#eff6ff' },
  botanas: { nombre: 'Botanas / Frituras', color: '#334155', bg: '#f1f5f9' },
  lacteos: { nombre: 'Lácteos / Embutidos', color: '#0369a1', bg: '#e0f2fe' },
  cerveza: { nombre: 'Cerveza / Licores', color: '#475569', bg: '#f1f5f9' },
  abarrotes: { nombre: 'Abarrotes / Granel', color: '#0f172a', bg: '#e2e8f0' },
  carniceria: { nombre: 'Carnes / Fríos', color: '#334155', bg: '#f1f5f9' }
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

    // Control para mostrar los días que caben en pantalla sin saturar
    this.diasVisiblesCantidad = 4;
    this.offsetDias = 0;

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
    // Sincronizar botones de la barra superior global
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

  getDiasOrdenadosDesdeHoy() {
    const diasInfo = this.getDiasInfo();
    const idxHoy = DIAS_SEMANA.findIndex(d => d.id === diasInfo.idHoy);
    if (idxHoy === -1) return DIAS_SEMANA;
    return [...DIAS_SEMANA.slice(idxHoy), ...DIAS_SEMANA.slice(0, idxHoy)];
  }

  getDiasVisibles() {
    const todos = this.getDiasOrdenadosDesdeHoy();
    if (this.diasVisiblesCantidad >= 7) return todos;
    const vis = [];
    for (let i = 0; i < this.diasVisiblesCantidad; i++) {
      const idx = (this.offsetDias + i) % todos.length;
      vis.push(todos[idx]);
    }
    return vis;
  }

  filtrarProveedores(proveedores) {
    return proveedores.filter(p => {
      const matchSearch = !this.searchTerm ||
        p.proveedor.toLowerCase().includes(this.searchTerm) ||
        (p.notas && p.notas.toLowerCase().includes(this.searchTerm)) ||
        (p.tipoPago && p.tipoPago.toLowerCase().includes(this.searchTerm));

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

    if (this.vistaModo === 'lista') {
      this.renderLista();
    } else {
      this.renderKanban();
    }
  }

  renderBannerHoy(proveedores, diasInfo) {
    const provsHoy = proveedores.filter(p => p.dia === diasInfo.idHoy);
    const entregasHoy = provsHoy.filter(p => p.tipoVisita !== 'preventa');
    const preventasHoy = provsHoy.filter(p => p.tipoVisita === 'preventa');

    const entregasAtendidas = entregasHoy.filter(p => p.yaVino);
    const preventasAtendidas = preventasHoy.filter(p => p.vinoPreventa);

    const totalPresupuestoHoy = entregasHoy.reduce((acc, p) => acc + (parseFloat(p.presupuestoAprox || p.preventaPresupuesto) || 0), 0);
    const totalPagadoHoy = entregasAtendidas.reduce((acc, p) => acc + (parseFloat(p.montoPagadoReal) || 0), 0);
    const totalPreventasHoy = preventasHoy.reduce((acc, p) => acc + (parseFloat(p.costoPreventa || p.presupuestoAprox) || 0), 0);
    const totalArticulosHoy = provsHoy.reduce((acc, p) => acc + (Array.isArray(p.listaPedido) ? p.listaPedido.length : 0), 0);

    return `
      <div style="padding: 12px 20px 0 20px;">
        <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span style="font-weight: 800; font-size: 0.95rem; color: #0f172a;">Hoy: ${diasInfo.nombreHoy}</span>
              <span class="badge-dia-destacado hoy">HOY</span>
              <span style="font-size: 0.78rem; color: #64748b;">• ${entregasHoy.length} entregas (${entregasAtendidas.length} recibidas)</span>
              ${preventasHoy.length > 0 ? `<span style="font-size: 0.78rem; color: #92400e; font-weight: 700;">• ${preventasHoy.length} preventas (${preventasAtendidas.length} atendidas)</span>` : ''}
              ${totalArticulosHoy > 0 ? `<span style="font-size: 0.75rem; background: #e0f2fe; color: #0369a1; padding: 1px 6px; border-radius: 9999px; font-weight: 700;">${totalArticulosHoy} prod. a pedir hoy</span>` : ''}
            </div>

            <div style="display: flex; align-items: center; gap: 10px; font-size: 0.8rem; flex-wrap: wrap;">
              <div>
                <span style="color: #64748b;">Presupuesto Caja Hoy:</span>
                <strong style="color: #0f172a; margin-left: 4px;">${this.formatCurrency(totalPresupuestoHoy)}</strong>
              </div>
              <div>
                <span style="color: #64748b;">Pagado en Caja:</span>
                <strong style="color: #047857; margin-left: 4px;">${this.formatCurrency(totalPagadoHoy)}</strong>
              </div>
              ${preventasHoy.length > 0 ? `
                <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 2px 8px; border-radius: 4px;">
                  <span style="color: #92400e; font-weight: 600;">Preventas Hoy:</span>
                  <strong style="color: #b45309; margin-left: 4px;">${this.formatCurrency(totalPreventasHoy)}</strong>
                </div>
              ` : ''}

              <!-- Botón rápido Imprimir Pedidos de Hoy -->
              <button type="button" id="btnImprimirPedidosHoyBanner" class="btn-secondary" style="font-size: 0.74rem; height: 26px; padding: 0 10px; cursor: pointer; background: #f0fdf4; border: 1.5px solid #86efac; color: #166534; font-weight: 700; display: inline-flex; align-items: center; gap: 5px;" title="Imprimir pedidos de los proveedores que vienen hoy (Ticket USB o Hoja Carta)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                <span>🖨️ Pedidos de Hoy</span>
              </button>

              <button type="button" id="btnAgregarProveedorHoyBanner" class="btn-secondary" style="font-size: 0.74rem; height: 26px; padding: 0 10px; cursor: pointer;">
                + Proveedor para Hoy
              </button>
            </div>
          </div>

          <!-- Chips sobrios de proveedores de hoy -->
          ${provsHoy.length > 0 ? `
            <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #f1f5f9;">
              ${provsHoy.map(p => {
                const esPreventa = p.tipoVisita === 'preventa';
                const cant = Array.isArray(p.listaPedido) ? p.listaPedido.length : 0;
                return `
                  <button type="button" class="btn-chip-proveedor-hoy" data-id="${p.id}" style="background: ${esPreventa ? '#fffbeb' : (p.yaVino ? '#f0fdf4' : '#ffffff')}; border: 1px solid ${esPreventa ? '#fde68a' : (p.yaVino ? '#bbf7d0' : '#e2e8f0')}; border-radius: 4px; padding: 3px 8px; font-size: 0.74rem; font-weight: 600; color: ${esPreventa ? '#92400e' : (p.yaVino ? '#166534' : '#1e293b')}; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;" title="Ver o editar pedido de ${p.proveedor}">
                    ${esPreventa ? '<span style="font-size: 0.65rem; background:#fef3c7; color:#92400e; padding:1px 4px; border-radius:3px; font-weight:700;">PREV</span>' : ''}
                    <span class="${p.yaVino ? 'nombre-prov-tachado' : ''}">${p.proveedor}</span>
                    <span style="color: #64748b; font-size: 0.7rem;">${this.formatCurrency(esPreventa ? (p.costoPreventa || p.presupuestoAprox) : (p.presupuestoAprox || p.preventaPresupuesto))}</span>
                    ${cant > 0 
                      ? `<span style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; font-size: 0.68rem; font-weight: 700; padding: 1px 5px; border-radius: 9999px;">📋 ${cant}</span>` 
                      : `<span style="color: #94a3b8; font-size: 0.68rem;">(+ped)</span>`
                    }
                    ${esPreventa && p.vinoPreventa ? `<span style="color:#166534; font-size:0.68rem; font-weight:700;">✓ Vino ${p.horaVinoPreventa}</span>` : ''}
                    ${!esPreventa && p.yaVino ? `<span style="color:#047857; font-size:0.68rem; font-weight:700;">✓ ${p.horaVino}</span>` : ''}
                  </button>
                `;
              }).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderBarraControlesAgenda(diasInfo, totalArticulosPedidosSemana) {
    const diasVisibles = this.getDiasVisibles();

    return `
      <div class="agenda-controls-bar" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 20px 0 20px; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <!-- Conmutador integrado de vista: Tablero Kanban vs Lista -->
          <div class="agenda-view-mode-toggle" style="display: inline-flex; background: #e2e8f0; padding: 2px; border-radius: 6px; border: 1px solid #cbd5e1;">
            <button type="button" class="btn-toggle-view ${this.vistaModo === 'kanban' ? 'active' : ''}" id="btnAgendaToggleKanban" style="padding: 4px 10px; font-size: 0.76rem; font-weight: 700; border: none; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 5px; background: ${this.vistaModo === 'kanban' ? '#ffffff' : 'transparent'}; color: ${this.vistaModo === 'kanban' ? '#1e3a8a' : '#475569'}; box-shadow: ${this.vistaModo === 'kanban' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'};" title="Vista de Tablero Kanban">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="18" rx="1"></rect><rect x="14" y="3" width="7" height="18" rx="1"></rect></svg>
              <span>Tablero</span>
            </button>
            <button type="button" class="btn-toggle-view ${this.vistaModo === 'lista' ? 'active' : ''}" id="btnAgendaToggleLista" style="padding: 4px 10px; font-size: 0.76rem; font-weight: 700; border: none; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 5px; background: ${this.vistaModo === 'lista' ? '#ffffff' : 'transparent'}; color: ${this.vistaModo === 'lista' ? '#1e3a8a' : '#475569'}; box-shadow: ${this.vistaModo === 'lista' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'};" title="Vista de Lista Consolidada">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line></svg>
              <span>Lista</span>
            </button>
          </div>

          ${this.vistaModo === 'lista' ? `
            <!-- Filtro de días en vista de Lista -->
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 0.75rem; color: #64748b; font-weight: 600;">Filtrar día:</span>
              <select id="selectFiltroDiaLista" class="form-control" style="font-size: 0.76rem; font-weight: 700; padding: 2px 8px; height: 28px; border-radius: 5px; border: 1px solid #cbd5e1; background: #ffffff;">
                <option value="todos" ${this.filtroDiaLista === 'todos' ? 'selected' : ''}>Todos los días (Semana)</option>
                <option value="hoy" ${this.filtroDiaLista === 'hoy' ? 'selected' : ''}>Solo Hoy (${diasInfo.nombreHoy})</option>
                ${DIAS_SEMANA.map(d => `<option value="${d.id}" ${this.filtroDiaLista === d.id ? 'selected' : ''}>${d.nombre}</option>`).join('')}
              </select>
            </div>
          ` : `
            <!-- Navegación de columnas en pantalla en Kanban -->
            <div style="display: flex; align-items: center; gap: 5px;">
              <span style="font-size: 0.74rem; font-weight: 600; color: #64748b; margin-right: 4px;">En pantalla: <strong style="color: #0f172a;">${diasVisibles.map(d => d.corto).join(' - ')}</strong></span>
              <button type="button" id="btnDiaAnterior" class="btn-secondary" style="height: 26px; padding: 0 8px; font-size: 0.72rem; cursor: pointer;" title="Desplazar al día anterior">‹ Anterior</button>
              <button type="button" id="btnDiaSiguiente" class="btn-secondary" style="height: 26px; padding: 0 8px; font-size: 0.72rem; cursor: pointer;" title="Desplazar al día siguiente">Siguiente ›</button>
              <button type="button" id="btnToggleTodosDias" class="btn-secondary" style="height: 26px; padding: 0 8px; font-size: 0.72rem; cursor: pointer;">
                ${this.diasVisiblesCantidad === 7 ? 'Ver 4 días' : 'Ver 7 días'}
              </button>
            </div>
          `}
        </div>

        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <!-- Botón Imprimir Lista de Pedidos -->
          <button type="button" id="btnImprimirListaPedidosAgenda" class="btn-secondary" style="background: #f0fdf4; border: 1.5px solid #86efac; color: #166534; font-weight: 700; font-size: 0.76rem; height: 28px; padding: 0 10px; border-radius: 5px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;" title="Generar e imprimir la lista de pedidos en ticket USB (58mm/80mm) o formato carta">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            <span>Imprimir Lista de Pedidos</span>
            ${totalArticulosPedidosSemana > 0 ? `<span style="background: #166534; color: #ffffff; font-size: 0.68rem; padding: 1px 6px; border-radius: 9999px;">${totalArticulosPedidosSemana}</span>` : ''}
          </button>

          <!-- Botón Agregar Proveedor -->
          <button type="button" id="btnAgregarProvAgendaGlobal" class="btn-primary" style="font-size: 0.76rem; height: 28px; padding: 0 10px; cursor: pointer; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
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
    const diasVisibles = this.getDiasVisibles();
    const totalArticulosSemana = filtrados.reduce((acc, p) => acc + (Array.isArray(p.listaPedido) ? p.listaPedido.length : 0), 0);

    let html = this.renderBannerHoy(proveedores, diasInfo);
    html += this.renderBarraControlesAgenda(diasInfo, totalArticulosSemana);

    html += `<div class="kanban-board" id="kanbanBoard">`;

    diasVisibles.forEach(dia => {
      const provsDia = filtrados.filter(p => p.dia === dia.id);
      const entregasDia = provsDia.filter(p => p.tipoVisita !== 'preventa');
      const preventasDia = provsDia.filter(p => p.tipoVisita === 'preventa');

      const totalPresupuestoEntregas = entregasDia.reduce((acc, p) => acc + (parseFloat(p.presupuestoAprox || p.preventaPresupuesto) || 0), 0);
      const totalCostoPreventas = preventasDia.reduce((acc, p) => acc + (parseFloat(p.costoPreventa || p.presupuestoAprox) || 0), 0);

      const esHoy = dia.id === diasInfo.idHoy;
      const claseColExtra = esHoy ? 'col-hoy' : '';

      html += `
        <div class="kanban-column ${claseColExtra}" data-dia="${dia.id}">
          <div class="column-header">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div class="column-day" style="display: flex; align-items: center; gap: 6px;">
                <span style="text-transform: capitalize;">${dia.nombre}</span>
                ${esHoy ? '<span class="badge-dia-destacado hoy">HOY</span>' : ''}
              </div>
              <span style="font-size: 0.74rem; font-weight: 700; color: #64748b;">
                ${provsDia.length} ${provsDia.length === 1 ? 'prov.' : 'provs.'}
              </span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: #475569; margin-top: 4px;">
              <span>Presupuesto Caja:</span>
              <span class="column-total-budget">${this.formatCurrency(totalPresupuestoEntregas)}</span>
            </div>
            ${preventasDia.length > 0 ? `
              <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: #92400e; margin-top: 2px;">
                <span>Preventas (${preventasDia.length}):</span>
                <span style="font-weight: 700;">${this.formatCurrency(totalCostoPreventas)}</span>
              </div>
            ` : ''}
          </div>

          <!-- Contenedor con scroll interno para que deslice en el mismo recuadro -->
          <div class="column-cards-scroll" data-dia="${dia.id}" id="col-${dia.id}">
            ${provsDia.length === 0 ? `
              <div style="text-align: center; color: #94a3b8; padding: 16px 8px; font-size: 0.75rem; border: 1px dashed #e2e8f0; border-radius: 4px;">
                Sin proveedores
              </div>
            ` : provsDia.map(p => this.renderDealCard(p)).join('')}

            <!-- Botón + debajo del siguiente registro -->
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
    const cantArticulos = Array.isArray(p.listaPedido) ? p.listaPedido.length : 0;
    const esPreventa = p.tipoVisita === 'preventa';
    const esVino = !esPreventa && !!p.yaVino;

    let subtituloEstado = '';
    let bloqueAccionPreventa = '';

    if (esPreventa) {
      if (p.vinoPreventa) {
        subtituloEstado = `
          <div style="font-size: 0.7rem; color: #166534; font-weight: 700;">
            ✓ Preventa vino ${p.horaVinoPreventa || ''}
          </div>
        `;
        if (!p.entregaAgendada) {
          const diaDestino = p.diaEntregaProgramada ? p.diaEntregaProgramada.toUpperCase() : 'MAÑANA';
          bloqueAccionPreventa = `
            <button type="button" class="btn-agendar-entrega" data-action="agendar-entrega" data-id="${p.id}" style="width: 100%; margin-top: 6px; background: #f0fdf4; border: 1.5px solid #bbf7d0; color: #15803d; border-radius: 5px; padding: 4px 8px; font-size: 0.72rem; font-weight: 700; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 4px;" title="Agendar entrega para ${diaDestino} con el costo acordado">
              Agendar Entrega (${diaDestino})
            </button>
          `;
        } else {
          const diaDestino = p.diaEntregaProgramada ? p.diaEntregaProgramada.toUpperCase() : 'MAÑANA';
          bloqueAccionPreventa = `
            <div style="margin-top: 5px; font-size: 0.68rem; color: #15803d; font-weight: 700; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 4px; padding: 2px 6px; text-align: center;">
              ✓ Entrega agendada para el ${diaDestino}
            </div>
          `;
        }
      } else {
        subtituloEstado = `
          <div style="font-size: 0.7rem; color: #92400e;">
            ⏰ Preventa: ${p.hora || '10:00'}
          </div>
        `;
        bloqueAccionPreventa = `
          <button type="button" class="btn-vino-preventa" data-action="vino-preventa" data-id="${p.id}" style="width: 100%; margin-top: 6px; background: #fffbeb; border: 1.5px solid #fde68a; color: #92400e; border-radius: 5px; padding: 4px 8px; font-size: 0.74rem; font-weight: 700; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 5px;" title="Registrar que vino el preventista, anotar costo y agendar entrega">
            <span>✓</span> Vino Preventa
          </button>
        `;
      }
    } else {
      subtituloEstado = `
        <div style="font-size: 0.7rem; color: #64748b;">
          ${esVino 
            ? `<span class="badge-vino-hora">✓ Vino ${p.horaVino || ''}</span>` 
            : `<span>${p.hora || '10:00'}</span>`
          }
        </div>
      `;
    }

    const badgeTipo = esPreventa 
      ? `<span style="font-size: 0.65rem; font-weight: 800; background: #fef3c7; color: #92400e; border: 1px solid #fde68a; padding: 1px 6px; border-radius: 4px; letter-spacing: 0.3px;">PREVENTA</span>`
      : (p.idPreventaOrigen 
          ? `<span style="font-size: 0.65rem; font-weight: 700; background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; padding: 1px 6px; border-radius: 4px;">ENTREGA AGENDADA</span>` 
          : '');

    const montoMostrar = esPreventa 
      ? (p.vinoPreventa ? (p.costoPreventa || p.presupuestoAprox) : (p.presupuestoAprox || p.preventaPresupuesto || 0))
      : (p.presupuestoAprox || p.preventaPresupuesto || 0);

    // Teléfono de contacto
    let contactoTel = p.contacto || '';
    if (!contactoTel && stateManager.data.catalogoProveedores) {
      const cat = stateManager.data.catalogoProveedores.find(c => 
        (c.id && p.catalogoId && c.id === p.catalogoId) ||
        (c.nombre && p.proveedor && c.nombre.trim().toLowerCase() === p.proveedor.trim().toLowerCase())
      );
      if (cat) {
        contactoTel = cat.contacto || cat.telefono || '';
      }
    }
    const telInfo = obtenerInfoTelefono(contactoTel);

    return `
      <div class="deal-card ${esVino ? 'proveedor-vino' : ''} ${esPreventa ? 'card-preventa' : ''}" data-id="${p.id}" id="card-${p.id}" style="cursor: pointer; ${esPreventa ? 'border-left: 3.5px solid #d97706;' : ''}">
        
        <!-- Línea superior: Badge de tipo si aplica -->
        ${badgeTipo ? `<div style="margin-bottom: 4px;">${badgeTipo}</div>` : ''}

        <!-- Línea 1: Nombre del proveedor + Costo/Presupuesto -->
        <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px;">
          <div class="card-proveedor-nombre ${esVino ? 'nombre-prov-tachado' : ''}" style="font-weight: 700; font-size: 0.88rem; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${p.proveedor}">
            ${p.proveedor}
          </div>
          <div style="font-weight: 700; font-size: 0.82rem; color: ${esPreventa ? '#92400e' : '#1e293b'}; white-space: nowrap;">
            ${this.formatCurrency(montoMostrar)}
          </div>
        </div>

        <!-- Acciones especiales de Preventa si aplica -->
        ${bloqueAccionPreventa}

        <!-- Línea 2: Hora / Estado + Botones de Acción (Lista, Llamar, Editar, Eliminar) -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px; padding-top: 4px; border-top: 1px solid #f1f5f9;">
          ${subtituloEstado}

          <div style="display: flex; align-items: center; gap: 4px;" class="card-action-bar">
            ${telInfo.tieneNumero ? `
              <!-- Botón Llamar Directo a Celular con Icono SVG -->
              <a href="${telInfo.urlTel}" class="btn-card-accion btn-card-call" title="Llamar a ${p.proveedor} (${telInfo.formateado})" onclick="event.stopPropagation();">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              </a>
            ` : ''}

            <!-- Botón Lista de Pedido destacado con Icono SVG -->
            <button type="button" class="btn-card-accion ${cantArticulos > 0 ? 'con-pedido' : ''}" data-action="ver-pedido" data-id="${p.id}" title="Ver o editar lista de pedido (${cantArticulos} productos)" style="${cantArticulos > 0 ? 'background: #e0f2fe; border-color: #7dd3fc; color: #0369a1;' : ''}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg>
              <span style="font-size: 0.68rem; font-weight: 700;">${cantArticulos > 0 ? `${cantArticulos} ped.` : '+ Pedido'}</span>
            </button>

            <!-- Botón Editar con Icono SVG -->
            <button type="button" class="btn-card-accion" data-action="edit" data-id="${p.id}" title="Editar datos del proveedor">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>

            <!-- Botón Eliminar con Icono SVG -->
            <button type="button" class="btn-card-accion btn-card-delete" data-action="delete" data-id="${p.id}" title="Eliminar proveedor">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
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
    const totalArticulosLista = listaMostrar.reduce((acc, p) => acc + (Array.isArray(p.listaPedido) ? p.listaPedido.length : 0), 0);

    let html = this.renderBannerHoy(proveedores, diasInfo);
    html += this.renderBarraControlesAgenda(diasInfo, totalArticulosSemana);

    html += `
      <div style="padding: 12px 20px 20px 20px; max-width: 1400px; margin: 0 auto;">
        <div style="background: #fff; border: 1px solid #cbd5e1; padding: 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(15,23,42,0.04);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
            <div>
              <h2 style="font-size: 0.98rem; font-weight: 800; color: #0f172a; margin: 0;">Lista de Proveedores y Pedidos Programados</h2>
              <div style="font-size: 0.76rem; color: #64748b; margin-top: 2px;">
                ${listaMostrar.length} proveedores • Presupuesto: <strong style="color: #0f172a;">${this.formatCurrency(totalPresupuestoLista)}</strong> • Total productos a pedir: <strong style="color: #0284c7;">${totalArticulosLista} artículos</strong>
              </div>
            </div>
            <div style="display: flex; gap: 6px;">
              <button type="button" class="btn-secondary btn-imprimir-pedidos-rapido" style="font-size: 0.74rem; height: 26px; padding: 0 10px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; background: #f0fdf4; border: 1px solid #86efac; color: #166534; font-weight: 700;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                <span>🖨️ Imprimir Esta Lista</span>
              </button>
            </div>
          </div>

          <div style="overflow-x: auto;">
            <table class="hoja-tabla-proveedores" style="width: 100%;">
              <thead>
                <tr>
                  <th style="width: 110px;">DÍA</th>
                  <th>PROVEEDOR</th>
                  <th style="width: 130px;">TIPO / HORA</th>
                  <th style="text-align: right; width: 140px;">PRESUPUESTO</th>
                  <th style="text-align: center; width: 160px;">LISTA DE PEDIDO</th>
                  <th style="width: 130px;">ESTADO</th>
                  <th style="text-align: center; width: 120px;">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                ${listaMostrar.length === 0 ? `
                  <tr><td colspan="7" style="text-align: center; padding: 24px; color: #94a3b8; font-style: italic;">No hay proveedores registrados para este día o búsqueda</td></tr>
                ` : listaMostrar.map(p => {
                  const cant = Array.isArray(p.listaPedido) ? p.listaPedido.length : 0;
                  const esPreventa = p.tipoVisita === 'preventa';
                  const esHoy = p.dia === diasInfo.idHoy;
                  let cTel = p.contacto || '';
                  if (!cTel && stateManager.data.catalogoProveedores) {
                    const cat = stateManager.data.catalogoProveedores.find(c => 
                      (c.id && p.catalogoId && c.id === p.catalogoId) ||
                      (c.nombre && p.proveedor && c.nombre.trim().toLowerCase() === p.proveedor.trim().toLowerCase())
                    );
                    if (cat) cTel = cat.contacto || cat.telefono || '';
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
                      <td>
                        <div style="font-size: 0.78rem; color: #334155;">${esPreventa ? 'Preventa' : 'Entrega'} • ${p.hora || '-'}</div>
                      </td>
                      <td style="text-align: right; font-weight: 700; color: #0f172a;">
                        ${this.formatCurrency(esPreventa ? (p.costoPreventa || p.presupuestoAprox) : (p.presupuestoAprox || p.preventaPresupuesto))}
                      </td>
                      <td style="text-align: center;">
                        <button type="button" class="btn-card-accion ${cant > 0 ? 'con-pedido' : ''}" data-action="ver-pedido" data-id="${p.id}" style="padding: 3px 9px; font-size: 0.74rem; font-weight: 700; display: inline-flex; align-items: center; gap: 5px; border-radius: 5px; cursor: pointer; background: ${cant > 0 ? '#e0f2fe' : '#f1f5f9'}; border: 1px solid ${cant > 0 ? '#7dd3fc' : '#cbd5e1'}; color: ${cant > 0 ? '#0369a1' : '#475569'};" title="Abrir y editar lista de pedidos">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg>
                          <span>${cant > 0 ? `📋 ${cant} art.` : '+ Crear Pedido'}</span>
                        </button>
                      </td>
                      <td>
                        ${p.yaVino 
                          ? `<span class="badge-vino-hora">✓ Vino ${p.horaVino}</span>`
                          : (esPreventa && p.vinoPreventa 
                              ? `<span style="color:#166534; font-size:0.75rem; font-weight:700;">✓ Vino Prev</span>` 
                              : `<span class="deal-status-pill status-${p.estado}">${p.estado}</span>`)
                        }
                      </td>
                      <td style="text-align: center;">
                        <div style="display: inline-flex; align-items: center; gap: 4px;">
                          ${telInfo.tieneNumero ? `
                            <a href="${telInfo.urlTel}" class="btn-card-accion btn-card-call" title="Llamar a ${p.proveedor} (${telInfo.formateado})" onclick="event.stopPropagation();">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                            </a>
                          ` : ''}
                          <button type="button" class="btn-card-accion" data-action="edit" data-id="${p.id}" title="Editar">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                          </button>
                          <button type="button" class="btn-card-accion btn-card-delete" data-action="delete" data-id="${p.id}" title="Eliminar">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
              <tfoot>
                <tr style="background: #f8fafc; font-weight: 800; border-top: 2px solid #cbd5e1;">
                  <td colspan="3" style="padding: 8px 10px;">TOTALES (${listaMostrar.length} proveedores):</td>
                  <td style="text-align: right; padding: 8px 10px; color: #047857; font-size: 0.95rem;">${this.formatCurrency(totalPresupuestoLista)}</td>
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

    // Botones de impresión de pedidos consolidados
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

    this.container.querySelectorAll('.btn-imprimir-pedidos-rapido').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dispararImpresion(this.filtroDiaLista !== 'todos' ? this.filtroDiaLista : 'todos');
      });
    });

    // Botón agregar proveedor en cabecera de agenda
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

    // Clic en la tarjeta o fila de lista para abrir modal de pedido
    this.container.querySelectorAll('.deal-card, .fila-proveedor-lista').forEach(elem => {
      elem.addEventListener('click', (e) => {
        if (e.target.closest('[data-action]')) return;
        const id = elem.getAttribute('data-id');
        const prov = stateManager.data.proveedores.find(p => p.id === id);
        if (prov && this.onOpenPedidoModal) {
          this.onOpenPedidoModal(prov);
        }
      });
    });

    // Clic en los chips de acceso rápido del banner superior de hoy
    this.container.querySelectorAll('.btn-chip-proveedor-hoy').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const prov = stateManager.data.proveedores.find(p => p.id === id);
        if (prov && this.onOpenPedidoModal) {
          this.onOpenPedidoModal(prov);
        }
      });
    });

    // Botón agregar proveedor para hoy en el banner superior
    this.container.querySelector('#btnAgregarProveedorHoyBanner')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const diasInfo = this.getDiasInfo();
      if (this.onOpenEditModal) {
        this.onOpenEditModal({ dia: diasInfo.idHoy });
      }
    });

    // Botones + debajo del siguiente registro en cada columna
    this.container.querySelectorAll('.btn-agregar-prov-abajo').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dia = btn.getAttribute('data-dia');
        if (this.onOpenEditModal) {
          this.onOpenEditModal({ dia });
        }
      });
    });

    // Controles de navegación de días en pantalla (Kanban)
    this.container.querySelector('#btnDiaAnterior')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.offsetDias = (this.offsetDias - 1 + 7) % 7;
      this.render();
    });

    this.container.querySelector('#btnDiaSiguiente')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.offsetDias = (this.offsetDias + 1) % 7;
      this.render();
    });

    this.container.querySelector('#btnToggleTodosDias')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.diasVisiblesCantidad = this.diasVisiblesCantidad === 7 ? 4 : 7;
      this.offsetDias = 0;
      this.render();
    });

    // Clic en botones de acciones (eliminar, editar, ver pedido)
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
        } else if (action === 'agendar-entrega') {
          if (prov) {
            const diaDest = prov.diaEntregaProgramada || stateManager.getDiaSiguiente(prov.dia);
            stateManager.agendarEntregaDesdePreventa(prov.id, diaDest);
            this.render();
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
