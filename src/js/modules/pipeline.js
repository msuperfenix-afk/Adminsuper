/**
 * Módulo de Pipeline Semanal de Proveedores (Fase 1)
 * 7 Columnas (Lunes a Domingo) con Paleta Sobria Azul y Rojo Fénix
 */

import { stateManager } from '../state.js';

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
  constructor(containerId, onOpenEditModal, onOpenPedidoModal) {
    this.container = document.getElementById(containerId);
    this.onOpenEditModal = onOpenEditModal;
    this.onOpenPedidoModal = onOpenPedidoModal;
    this.searchTerm = '';
    this.filtroCategoria = 'todas';
    this.filtroTipoPago = 'todos';
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

  renderBannerProximos(proveedores, diasInfo) {
    const provsManana = proveedores.filter(p => p.dia === diasInfo.idManana);
    const totalPresupuestoManana = provsManana.reduce((acc, p) => acc + (parseFloat(p.presupuestoAprox || p.preventaPresupuesto) || 0), 0);
    
    const provsHoy = proveedores.filter(p => p.dia === diasInfo.idHoy);
    const provsHoyVinieron = provsHoy.filter(p => p.yaVino);
    const totalPagadoHoy = provsHoyVinieron.reduce((acc, p) => acc + (parseFloat(p.montoPagadoReal) || 0), 0);

    return `
      <div style="padding: 14px 24px 0 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 14px;">
        <!-- Tarjeta Proveedores de Mañana -->
        <div style="background: #ffffff; border: 1.5px solid #0284c7; border-radius: 8px; padding: 12px 16px; box-shadow: 0 1px 3px rgba(2, 132, 199, 0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge-dia-destacado manana">MAÑANA</span>
              <span style="font-weight: 800; font-size: 0.92rem; color: #0c4a6e;">Proveedores de ${diasInfo.nombreManana}</span>
            </div>
            <span style="font-size: 0.8rem; font-weight: 700; color: #0284c7;">
              Presupuesto: ${this.formatCurrency(totalPresupuestoManana)}
            </span>
          </div>

          <div style="font-size: 0.8rem; color: #475569; margin-bottom: 8px;">
            ${provsManana.length === 0 ? 'No hay proveedores programados para mañana.' : `<strong>${provsManana.length} proveedores</strong> programados para visita mañana:`}
          </div>

          ${provsManana.length > 0 ? `
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${provsManana.map(p => {
                const cant = Array.isArray(p.listaPedido) ? p.listaPedido.length : 0;
                return `
                  <button type="button" class="btn-chip-proveedor-manana" data-id="${p.id}" style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 4px 10px; font-size: 0.78rem; font-weight: 700; color: #0369a1; cursor: pointer; display: flex; align-items: center; gap: 6px; text-align: left;">
                    <span>${p.proveedor}</span>
                    <span style="color: #64748b; font-weight: 600;">${this.formatCurrency(p.presupuestoAprox || p.preventaPresupuesto)}</span>
                    <span style="background: #e0f2fe; padding: 1px 5px; border-radius: 4px; font-size: 0.7rem;">📋 ${cant}</span>
                  </button>
                `;
              }).join('')}
            </div>
          ` : ''}
        </div>

        <!-- Tarjeta Proveedores de Hoy (Sincronizado con Hoja Diaria) -->
        <div style="background: #ffffff; border: 1.5px solid #10b981; border-radius: 8px; padding: 12px 16px; box-shadow: 0 1px 3px rgba(16, 185, 129, 0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge-dia-destacado hoy">HOY</span>
              <span style="font-weight: 800; font-size: 0.92rem; color: #064e3b;">Visitas de Hoy (${diasInfo.nombreHoy})</span>
            </div>
            <span style="font-size: 0.8rem; font-weight: 700; color: #059669;">
              ${provsHoyVinieron.length}/${provsHoy.length} ya vinieron
            </span>
          </div>

          <div style="font-size: 0.8rem; color: #475569; margin-bottom: 8px;">
            Pagado hoy en hoja diaria: <strong style="color: #047857;">${this.formatCurrency(totalPagadoHoy)}</strong>
          </div>

          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${provsHoy.map(p => `
              <button type="button" class="btn-chip-proveedor-manana" data-id="${p.id}" style="background: ${p.yaVino ? '#ecfdf5' : '#f8fafc'}; border: 1px solid ${p.yaVino ? '#a7f3d0' : '#cbd5e1'}; border-radius: 6px; padding: 4px 10px; font-size: 0.78rem; font-weight: 700; color: ${p.yaVino ? '#065f46' : '#334155'}; cursor: pointer; display: flex; align-items: center; gap: 6px; ${p.yaVino ? 'text-decoration: line-through;' : ''}">
                <span>${p.proveedor}</span>
                ${p.yaVino ? `<span style="text-decoration:none; font-size:0.7rem; color:#047857;">✓ ${p.horaVino || 'vino'}</span>` : `<span style="font-size:0.7rem; color:#64748b;">${p.hora || '10:00'}</span>`}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  renderKanban() {
    const proveedores = stateManager.data.proveedores;
    const filtrados = this.filtrarProveedores(proveedores);
    const diasInfo = this.getDiasInfo();

    let html = this.renderBannerProximos(proveedores, diasInfo);
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
              <span style="background: #e2e8f0; font-size: 0.72rem; font-weight: 800; padding: 2px 6px; border-radius: 4px;">${provsDia.length} prov.</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #475569;">
              <span>Presupuesto Aprox:</span>
              <span class="column-total-budget">${this.formatCurrency(totalPresupuesto)}</span>
            </div>
            <div style="width: 100%; height: 4px; background: #e2e8f0; border-radius: 2px; margin-top: 8px; overflow: hidden;">
              <div class="column-progress-fill" style="width: ${porcentaje}%; height: 100%; background: ${esHoy ? '#10b981' : (esManana ? '#0284c7' : '#1e3a8a')};"></div>
            </div>
          </div>
          <div style="padding: 10px; display: flex; flex-direction: column; gap: 10px;" data-dia="${dia.id}" id="col-${dia.id}">
            ${provsDia.length === 0 ? `
              <div style="text-align: center; color: #94a3b8; padding: 24px 10px; font-size: 0.78rem; border: 1.5px dashed #cbd5e1; border-radius: 6px;">
                Sin proveedores programados
              </div>
            ` : provsDia.map(p => this.renderDealCard(p)).join('')}
          </div>
        </div>
      `;
    });

    html += `</div>`;

    this.container.innerHTML = html;
    this.bindCardActions();
  }

  renderDealCard(p) {
    const cat = CATEGORIAS_PROVEEDOR[p.categoria] || { color: '#1e3a8a', bg: '#eff6ff' };
    const cantArticulos = Array.isArray(p.listaPedido) ? p.listaPedido.length : 0;
    const esVino = !!p.yaVino;

    return `
      <div class="deal-card ${esVino ? 'proveedor-vino' : ''}" data-id="${p.id}" id="card-${p.id}" style="cursor: pointer; transition: all 0.15s ease;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
          <div style="flex: 1; padding-right: 6px;">
            <div class="card-proveedor-nombre ${esVino ? 'nombre-prov-tachado' : ''}" style="font-weight: 800; font-size: 0.92rem; color: #0f172a; line-height: 1.2;">
              ${p.proveedor}
            </div>
            <div style="font-size: 0.72rem; font-weight: 600; color: ${cat.color}; margin-top: 2px;">
              ${cat.nombre || p.categoria}
            </div>
          </div>
          ${esVino 
            ? `<span class="badge-vino-hora">✓ Vino a las ${p.horaVino || 'hoy'}</span>` 
            : `<span class="deal-status-pill status-${p.estado}">${p.estado.toUpperCase().replace('_', ' ')}</span>`
          }
        </div>

        <!-- Cajas de Presupuesto Aprox y Venta Anterior -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: ${esVino ? '#f1f5f9' : '#f8fafc'}; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; margin: 8px 0;">
          <div>
            <div style="font-size: 0.65rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Presupuesto Aprox.</div>
            <div style="font-weight: 800; font-size: 0.88rem; color: #0f172a;">${this.formatCurrency(p.presupuestoAprox || p.preventaPresupuesto)}</div>
          </div>
          <div>
            <div style="font-size: 0.65rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Venta Anterior</div>
            <div style="font-weight: 800; font-size: 0.88rem; color: #475569;">${this.formatCurrency(p.ventaAnterior)}</div>
          </div>
        </div>

        <!-- Indicador de Lista de Pedido (clic en tarjeta para ver y editar) -->
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: #475569; padding-top: 6px; border-top: 1px dashed #cbd5e1;">
          <span style="display: inline-flex; align-items: center; gap: 4px; color: #0284c7; font-weight: 700;">
            📋 ${cantArticulos > 0 ? `${cantArticulos} productos en pedido` : 'Ver lista de pedido'}
          </span>
          <span style="font-size: 0.7rem; color: #64748b;">
            ⏰ ${p.hora || '10:00'}
          </span>
        </div>

        ${esVino && p.montoPagadoReal > 0 ? `
          <div style="margin-top: 6px; font-size: 0.72rem; color: #166534; background: #ecfdf5; border: 1px solid #bbf7d0; border-radius: 4px; padding: 3px 6px; font-weight: 600; display: flex; justify-content: space-between;">
            <span>Pagado en Hoja:</span>
            <span>${this.formatCurrency(p.montoPagadoReal)}</span>
          </div>
        ` : ''}

        <div style="display: flex; justify-content: flex-end; gap: 6px; margin-top: 8px;" class="card-action-bar">
          <button class="btn-secondary" style="height: 24px; font-size: 0.7rem; padding: 0 8px;" data-action="edit" data-id="${p.id}" title="Editar detalles generales">
            Editar
          </button>
          <button class="btn-secondary" style="height: 24px; font-size: 0.7rem; padding: 0 6px; color:#ef4444;" data-action="delete" data-id="${p.id}" title="Eliminar de la agenda">
            🗑️
          </button>
        </div>
      </div>
    `;
  }

  renderLista() {
    const proveedores = stateManager.data.proveedores;
    const filtrados = this.filtrarProveedores(proveedores);

    let html = `
      <div style="padding: 20px; max-width: 1300px; margin: 0 auto;">
        <div style="background: #fff; border: 1.5px solid #0f172a; padding: 16px; border-radius: 6px;">
          <h2 style="font-size: 1.1rem; font-weight: 900; color: #0f172a; margin-bottom: 12px;">Agenda Consolidada de Proveedores</h2>
          <table class="hoja-tabla-proveedores">
            <thead>
              <tr>
                <th>DÍA</th>
                <th>PROVEEDOR</th>
                <th>CATEGORÍA</th>
                <th>HORA</th>
                <th style="text-align: right;">PRESUPUESTO APROX.</th>
                <th style="text-align: right;">VENTA ANTERIOR</th>
                <th style="text-align: center;">LISTA PEDIDO</th>
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
                  <td>${p.categoria}</td>
                  <td>${p.hora || '-'}</td>
                  <td style="text-align: right; font-weight: 800;">${this.formatCurrency(p.presupuestoAprox || p.preventaPresupuesto)}</td>
                  <td style="text-align: right; font-weight: 800; color: #475569;">${this.formatCurrency(p.ventaAnterior)}</td>
                  <td style="text-align: center;">
                    <button class="btn-secondary" style="padding: 2px 8px; font-size: 0.75rem; color: #0284c7; font-weight: 700;" data-action="ver-pedido" data-id="${p.id}">
                      📋 ${cant} art.
                    </button>
                  </td>
                  <td>
                    ${p.yaVino 
                      ? `<span class="badge-vino-hora">✓ Vino ${p.horaVino}</span>`
                      : `<span class="deal-status-pill status-${p.estado}">${p.estado}</span>`
                    }
                  </td>
                  <td>
                    <button class="btn-secondary" style="padding: 2px 6px; font-size: 0.72rem;" data-action="edit" data-id="${p.id}" title="Editar">✏️</button>
                    <button class="btn-secondary" style="padding: 2px 6px; font-size: 0.72rem; color:#ef4444;" data-action="delete" data-id="${p.id}" title="Eliminar">🗑️</button>
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

    // Clic en los chips de acceso rápido del banner superior
    this.container.querySelectorAll('.btn-chip-proveedor-manana').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const prov = stateManager.data.proveedores.find(p => p.id === id);
        if (prov && this.onOpenPedidoModal) {
          this.onOpenPedidoModal(prov);
        }
      });
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
