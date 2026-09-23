/**
 * Módulo de Pipeline Semanal de Proveedores (Fase 1)
 * 7 Columnas (Lunes a Domingo) con Paleta Sobria Azul y Rojo Fénix
 */

import { stateManager } from '../state.js';

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
  constructor(containerId, onOpenEditModal, onOpenPedidoModal) {
    this.container = document.getElementById(containerId);
    this.onOpenEditModal = onOpenEditModal;
    this.onOpenPedidoModal = onOpenPedidoModal;
    this.searchTerm = '';
    this.filtroCategoria = 'todas';
    this.filtroTipoPago = 'todos';
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
    const provsHoyVinieron = provsHoy.filter(p => p.yaVino);
    const totalPresupuestoHoy = provsHoy.reduce((acc, p) => acc + (parseFloat(p.presupuestoAprox || p.preventaPresupuesto) || 0), 0);
    const totalPagadoHoy = provsHoyVinieron.reduce((acc, p) => acc + (parseFloat(p.montoPagadoReal) || 0), 0);

    return `
      <div style="padding: 12px 20px 0 20px;">
        <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: 800; font-size: 0.95rem; color: #0f172a;">Hoy: ${diasInfo.nombreHoy}</span>
              <span class="badge-dia-destacado hoy">HOY</span>
              <span style="font-size: 0.78rem; color: #64748b;">• ${provsHoy.length} proveedores programados</span>
              <span style="font-size: 0.78rem; color: #047857; font-weight: 700;">• ${provsHoyVinieron.length} atendidos</span>
            </div>

            <div style="display: flex; align-items: center; gap: 14px; font-size: 0.8rem;">
              <div>
                <span style="color: #64748b;">Presupuesto Hoy:</span>
                <strong style="color: #0f172a; margin-left: 4px;">${this.formatCurrency(totalPresupuestoHoy)}</strong>
              </div>
              <div>
                <span style="color: #64748b;">Pagado en Caja:</span>
                <strong style="color: #047857; margin-left: 4px;">${this.formatCurrency(totalPagadoHoy)}</strong>
              </div>
              <button type="button" id="btnAgregarProveedorHoyBanner" class="btn-secondary" style="font-size: 0.74rem; height: 26px; padding: 0 10px; cursor: pointer;">
                + Proveedor para Hoy
              </button>
            </div>
          </div>

          <!-- Chips sobrios de proveedores de hoy -->
          ${provsHoy.length > 0 ? `
            <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #f1f5f9;">
              ${provsHoy.map(p => {
                const cant = Array.isArray(p.listaPedido) ? p.listaPedido.length : 0;
                return `
                  <button type="button" class="btn-chip-proveedor-hoy" data-id="${p.id}" style="background: ${p.yaVino ? '#f0fdf4' : '#ffffff'}; border: 1px solid ${p.yaVino ? '#bbf7d0' : '#e2e8f0'}; border-radius: 4px; padding: 3px 8px; font-size: 0.74rem; font-weight: 600; color: ${p.yaVino ? '#166534' : '#1e293b'}; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                    <span class="${p.yaVino ? 'nombre-prov-tachado' : ''}">${p.proveedor}</span>
                    <span style="color: #64748b; font-size: 0.7rem;">${this.formatCurrency(p.presupuestoAprox || p.preventaPresupuesto)}</span>
                    ${cant > 0 ? `<span style="color: #0284c7; font-size: 0.68rem;">📋 ${cant}</span>` : ''}
                    ${p.yaVino ? `<span style="color:#047857; font-size:0.68rem; font-weight:700;">✓ ${p.horaVino}</span>` : ''}
                  </button>
                `;
              }).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderKanban() {
    const proveedores = stateManager.data.proveedores;
    const filtrados = this.filtrarProveedores(proveedores);
    const diasInfo = this.getDiasInfo();
    const diasVisibles = this.getDiasVisibles();

    let html = this.renderBannerHoy(proveedores, diasInfo);

    // Barra de navegación sobria de días visibles (evita saturar la pantalla)
    html += `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 20px 0 20px;">
        <div style="font-size: 0.78rem; font-weight: 600; color: #475569;">
          Días en pantalla: <span style="color: #0f172a; font-weight: 700;">${diasVisibles.map(d => d.nombre).join(' ➔ ')}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <button type="button" id="btnDiaAnterior" class="btn-secondary" style="height: 24px; padding: 0 8px; font-size: 0.72rem; cursor: pointer;" title="Desplazar al día anterior">
            ‹ Anterior
          </button>
          <button type="button" id="btnDiaSiguiente" class="btn-secondary" style="height: 24px; padding: 0 8px; font-size: 0.72rem; cursor: pointer;" title="Desplazar al día siguiente">
            Siguiente ›
          </button>
          <button type="button" id="btnToggleTodosDias" class="btn-secondary" style="height: 24px; padding: 0 8px; font-size: 0.72rem; cursor: pointer;">
            ${this.diasVisiblesCantidad === 7 ? 'Ver 4 días (ajustado)' : 'Ver 7 días'}
          </button>
        </div>
      </div>
    `;

    html += `<div class="kanban-board" id="kanbanBoard">`;

    diasVisibles.forEach(dia => {
      const provsDia = filtrados.filter(p => p.dia === dia.id);
      const totalPresupuesto = provsDia.reduce((acc, p) => acc + (parseFloat(p.presupuestoAprox || p.preventaPresupuesto) || 0), 0);
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
              <span>Presupuesto Aprox:</span>
              <span class="column-total-budget">${this.formatCurrency(totalPresupuesto)}</span>
            </div>
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
    const esVino = !!p.yaVino;

    return `
      <div class="deal-card ${esVino ? 'proveedor-vino' : ''}" data-id="${p.id}" id="card-${p.id}" style="cursor: pointer;">
        <!-- Línea 1: Nombre del proveedor + Presupuesto Aprox (Sin venta anterior) -->
        <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px;">
          <div class="card-proveedor-nombre ${esVino ? 'nombre-prov-tachado' : ''}" style="font-weight: 700; font-size: 0.88rem; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${p.proveedor}">
            ${p.proveedor}
          </div>
          <div style="font-weight: 700; font-size: 0.82rem; color: #1e293b; white-space: nowrap;">
            ${this.formatCurrency(p.presupuestoAprox || p.preventaPresupuesto)}
          </div>
        </div>

        <!-- Línea 2: Hora / Estado + Botones con Logo (Lista, Editar, Eliminar) -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px; padding-top: 4px; border-top: 1px solid #f1f5f9;">
          <div style="font-size: 0.7rem; color: #64748b;">
            ${esVino 
              ? `<span class="badge-vino-hora">✓ Vino ${p.horaVino || ''}</span>` 
              : `<span>⏰ ${p.hora || '10:00'}</span>`
            }
          </div>

          <div style="display: flex; align-items: center; gap: 4px;" class="card-action-bar">
            <!-- Botón Lista de Pedido con Logo -->
            <button type="button" class="btn-card-accion" data-action="ver-pedido" data-id="${p.id}" title="Ver/Editar lista de pedido">
              <span>📋</span>
              <span style="font-size: 0.68rem; font-weight: 700;">${cantArticulos}</span>
            </button>

            <!-- Botón Editar con Logo -->
            <button type="button" class="btn-card-accion" data-action="edit" data-id="${p.id}" title="Editar datos del proveedor">
              <span>✏️</span>
            </button>

            <!-- Botón Eliminar con Logo -->
            <button type="button" class="btn-card-accion btn-card-delete" data-action="delete" data-id="${p.id}" title="Eliminar proveedor">
              <span>🗑️</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  renderLista() {
    const proveedores = stateManager.data.proveedores;
    const filtrados = this.filtrarProveedores(proveedores);

    let html = `
      <div style="padding: 16px 20px; max-width: 1300px; margin: 0 auto;">
        <div style="background: #fff; border: 1px solid #cbd5e1; padding: 14px; border-radius: 6px;">
          <h2 style="font-size: 1rem; font-weight: 800; color: #0f172a; margin-bottom: 10px;">Agenda Consolidada de Proveedores</h2>
          <table class="hoja-tabla-proveedores">
            <thead>
              <tr>
                <th>DÍA</th>
                <th>PROVEEDOR</th>
                <th>HORA</th>
                <th style="text-align: right;">PRESUPUESTO APROX.</th>
                <th style="text-align: center;">PEDIDO</th>
                <th>ESTADO HOJA</th>
                <th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              ${filtrados.map(p => {
                const cant = Array.isArray(p.listaPedido) ? p.listaPedido.length : 0;
                return `
                <tr style="cursor: pointer;" class="fila-proveedor-lista ${p.yaVino ? 'proveedor-vino' : ''}" data-id="${p.id}">
                  <td class="font-bold">${p.dia.toUpperCase()}</td>
                  <td class="font-bold ${p.yaVino ? 'nombre-prov-tachado' : ''}">
                    ${p.proveedor}
                    ${p.yaVino ? `<div class="badge-vino-hora" style="display:inline-block; margin-left:6px;">✓ Vino ${p.horaVino}</div>` : ''}
                  </td>
                  <td>${p.hora || '-'}</td>
                  <td style="text-align: right; font-weight: 700;">${this.formatCurrency(p.presupuestoAprox || p.preventaPresupuesto)}</td>
                  <td style="text-align: center;">
                    <button class="btn-card-accion" data-action="ver-pedido" data-id="${p.id}">
                      <span>📋</span> ${cant} art.
                    </button>
                  </td>
                  <td>
                    ${p.yaVino 
                      ? `<span class="badge-vino-hora">✓ Vino ${p.horaVino}</span>`
                      : `<span class="deal-status-pill status-${p.estado}">${p.estado}</span>`
                    }
                  </td>
                  <td>
                    <button class="btn-card-accion" data-action="edit" data-id="${p.id}" title="Editar">✏️</button>
                    <button class="btn-card-accion btn-card-delete" data-action="delete" data-id="${p.id}" title="Eliminar">🗑️</button>
                  </td>
                </tr>
              `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this.bindCardActions();
  }

  bindCardActions() {
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

    // Controles de navegación de días en pantalla
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
