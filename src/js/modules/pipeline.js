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
  constructor(containerId, onOpenEditModal) {
    this.container = document.getElementById(containerId);
    this.onOpenEditModal = onOpenEditModal;
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

  renderKanban() {
    const proveedores = stateManager.data.proveedores;
    const filtrados = this.filtrarProveedores(proveedores);

    let html = `<div class="kanban-board" id="kanbanBoard">`;

    DIAS_SEMANA.forEach(dia => {
      const provsDia = filtrados.filter(p => p.dia === dia.id);
      const totalPresupuesto = provsDia.reduce((acc, p) => acc + (parseFloat(p.preventaPresupuesto) || 0), 0);
      const totalCompletados = provsDia.filter(p => p.estado === 'pagado' || p.estado === 'recibido').length;
      const porcentaje = provsDia.length > 0 ? Math.round((totalCompletados / provsDia.length) * 100) : 0;

      html += `
        <div class="kanban-column" data-dia="${dia.id}">
          <div class="column-header">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <div class="column-day">
                <span>${dia.icono}</span>
                <span>${dia.nombre}</span>
              </div>
              <span style="background: #e2e8f0; font-size: 0.72rem; font-weight: 800; padding: 2px 6px; border-radius: 4px;">${provsDia.length} prov.</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #475569;">
              <span>Presupuesto:</span>
              <span class="column-total-budget">${this.formatCurrency(totalPresupuesto)}</span>
            </div>
            <div style="width: 100%; height: 4px; background: #e2e8f0; border-radius: 2px; margin-top: 8px; overflow: hidden;">
              <div class="column-progress-fill" style="width: ${porcentaje}%; height: 100%;"></div>
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
    
    return `
      <div class="deal-card" data-id="${p.id}" id="card-${p.id}">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
          <div>
            <div style="font-weight: 800; font-size: 0.88rem; color: #0f172a;">${p.proveedor}</div>
            <div style="font-size: 0.72rem; font-weight: 700; color: ${cat.color};">${cat.nombre || p.categoria}</div>
          </div>
          <span class="deal-status-pill status-${p.estado}">${p.estado.toUpperCase().replace('_', ' ')}</span>
        </div>

        <div style="display: flex; gap: 12px; font-size: 0.75rem; color: #64748b; margin: 6px 0;">
          <span>⏰ ${p.hora || '10:00'}</span>
          <span>💳 ${p.tipoPago || 'Efectivo'}</span>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: baseline; border-top: 1px dashed #cbd5e1; padding-top: 6px; margin-top: 6px;">
          <div>
            <div style="font-size: 0.65rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Presupuesto</div>
            <div style="font-weight: 800; font-size: 0.92rem; color: #0f172a;">${this.formatCurrency(p.preventaPresupuesto)}</div>
          </div>
          ${p.compra > 0 ? `
            <div style="text-align: right;">
              <div style="font-size: 0.65rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Compra Real</div>
              <div style="font-weight: 800; font-size: 0.92rem; color: #b91c1c;">${this.formatCurrency(p.compra)}</div>
            </div>
          ` : ''}
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 4px; margin-top: 6px;">
          ${p.estado !== 'pagado' ? `
            <button class="btn-primary" style="height: 26px; font-size: 0.72rem; padding: 0 8px;" data-action="quick-pay" data-id="${p.id}">
              Pagar en Caja
            </button>
          ` : ''}
          <button class="btn-secondary" style="height: 26px; font-size: 0.72rem; padding: 0 8px;" data-action="delete" data-id="${p.id}">
            Eliminar
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
        <div style="background: #fff; border: 1.5px solid #0f172a; padding: 16px;">
          <h2 style="font-size: 1.1rem; font-weight: 900; color: #0f172a; margin-bottom: 12px;">Agenda Consolidada de Proveedores</h2>
          <table class="hoja-tabla-proveedores">
            <thead>
              <tr>
                <th>DÍA</th>
                <th>PROVEEDOR</th>
                <th>CATEGORÍA</th>
                <th>HORA</th>
                <th>FORMA PAGO</th>
                <th style="text-align: right;">PRESUPUESTO</th>
                <th style="text-align: right;">COMPRA REAL</th>
                <th>ESTADO</th>
                <th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              ${filtrados.map(p => `
                <tr>
                  <td class="font-bold">${p.dia.toUpperCase()}</td>
                  <td class="font-bold">${p.proveedor}</td>
                  <td>${p.categoria}</td>
                  <td>${p.hora || '-'}</td>
                  <td>${p.tipoPago}</td>
                  <td style="text-align: right; font-weight: 800;">${this.formatCurrency(p.preventaPresupuesto)}</td>
                  <td style="text-align: right; font-weight: 800; color: #b91c1c;">${p.compra > 0 ? this.formatCurrency(p.compra) : '-'}</td>
                  <td><span class="deal-status-pill status-${p.estado}">${p.estado}</span></td>
                  <td>
                    <button class="btn-secondary" style="padding: 2px 6px; font-size: 0.72rem;" data-action="delete" data-id="${p.id}">🗑️</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this.bindCardActions();
  }

  bindCardActions() {
    this.container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.getAttribute('data-action');
        const id = btn.getAttribute('data-id');

        if (action === 'delete') {
          if (confirm('¿Eliminar proveedor?')) stateManager.deleteProveedor(id);
        } else if (action === 'quick-pay') {
          const prov = stateManager.data.proveedores.find(p => p.id === id);
          if (prov) {
            const monto = prompt(`Confirmar monto pagado a ${prov.proveedor}:`, prov.preventaPresupuesto);
            if (monto !== null && !isNaN(parseFloat(monto))) {
              stateManager.marcarProveedorPagado(id, parseFloat(monto));
            }
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
