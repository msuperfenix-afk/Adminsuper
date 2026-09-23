/**
 * Módulo de Gestión de Modales y Formularios Dinámicos (AdminFenix)
 */

import { stateManager, CATALOGO_PROVEEDORES_PREDETERMINADOS } from '../state.js';
import { DIAS_SEMANA, CATEGORIAS_PROVEEDOR } from './pipeline.js';
import { inicializarFirebase, getFirebaseConfigActual, isFirebaseConectado } from '../firebaseClient.js';

export class ModalManager {
  constructor(overlayId, containerId) {
    this.overlay = document.getElementById(overlayId);
    this.container = document.getElementById(containerId);
    this.currentModalType = null;
    this.setupListeners();
  }

  setupListeners() {
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // Cerrar con Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });
  }

  isOpen() {
    return this.overlay.classList.contains('active');
  }

  open(title, bodyHtml, footerButtonsHtml = '') {
    this.container.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close-btn" id="modalCloseBtn">&times;</button>
      </div>
      <div class="modal-body">
        ${bodyHtml}
      </div>
      ${footerButtonsHtml ? `<div class="modal-footer">${footerButtonsHtml}</div>` : ''}
    `;

    document.getElementById('modalCloseBtn')?.addEventListener('click', () => this.close());
    this.overlay.classList.add('active');
  }

  close() {
    this.overlay.classList.remove('active');
    this.container.innerHTML = '';
  }

  // ==========================================
  // 1. MODAL: AGREGAR / EDITAR PROVEEDOR (SEMANAL)
  // ==========================================
  openProveedorModal(proveedor = null) {
    const isEdit = !!proveedor;
    const title = isEdit ? `✏️ Editar Proveedor: ${proveedor.proveedor}` : '➕ Nuevo Proveedor a la Agenda Semanal';

    const p = proveedor || {
      dia: 'lunes',
      proveedor: '',
      categoria: 'abarrotes',
      hora: '10:00',
      tipoPago: 'Efectivo Caja',
      preventaPresupuesto: '',
      compra: '',
      estado: 'programado',
      notas: ''
    };

    const diasOptions = DIAS_SEMANA.map(d => `<option value="${d.id}" ${p.dia === d.id ? 'selected' : ''}>${d.nombre}</option>`).join('');
    const catsOptions = Object.entries(CATEGORIAS_PROVEEDOR).map(([key, val]) => `<option value="${key}" ${p.categoria === key ? 'selected' : ''}>${val.nombre}</option>`).join('');

    const body = `
      <form id="formProveedor">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Día de Visita *</label>
            <select class="form-control" name="dia" required>
              ${diasOptions}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Categoría de Producto *</label>
            <select class="form-control" name="categoria" required>
              ${catsOptions}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Nombre del Proveedor / Empresa *</label>
          <input type="text" class="form-control" name="proveedor" placeholder="Ej: Coca-Cola, Sabritas, Panadería..." value="${p.proveedor}" required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Hora Estimada de Llegada</label>
            <input type="time" class="form-control" name="hora" value="${p.hora || '10:00'}">
          </div>
          <div class="form-group">
            <label class="form-label">Forma de Pago Preferida *</label>
            <select class="form-control" name="tipoPago" required>
              <option value="Efectivo Caja" ${p.tipoPago === 'Efectivo Caja' ? 'selected' : ''}>Efectivo de Caja</option>
              <option value="Transferencia" ${p.tipoPago === 'Transferencia' ? 'selected' : ''}>Transferencia Electrónica</option>
              <option value="Crédito Semanal" ${p.tipoPago === 'Crédito Semanal' ? 'selected' : ''}>Crédito Semanal</option>
              <option value="Cheque" ${p.tipoPago === 'Cheque' ? 'selected' : ''}>Cheque</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Preventa Presupuesto ($)</label>
            <input type="number" step="10" min="0" class="form-control" name="preventaPresupuesto" placeholder="0.00" value="${p.preventaPresupuesto}">
          </div>
          <div class="form-group">
            <label class="form-label">Compra Real / Factura ($)</label>
            <input type="number" step="10" min="0" class="form-control" name="compra" placeholder="0.00" value="${p.compra || ''}">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Estado Actual</label>
          <select class="form-control" name="estado">
            <option value="programado" ${p.estado === 'programado' ? 'selected' : ''}>Programado</option>
            <option value="en_tienda" ${p.estado === 'en_tienda' ? 'selected' : ''}>En Tienda (Descargando)</option>
            <option value="recibido" ${p.estado === 'recibido' ? 'selected' : ''}>Recibido</option>
            <option value="pagado" ${p.estado === 'pagado' ? 'selected' : ''}>Pagado</option>
            <option value="no_llego" ${p.estado === 'no_llego' ? 'selected' : ''}>No Llegó</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Observaciones / Pedido Específico</label>
          <textarea class="form-control" name="notas" placeholder="Anotaciones para el recibo, promociones o producto faltante...">${p.notas || ''}</textarea>
        </div>
      </form>
    `;

    const footer = `
      <button type="button" class="btn-secondary" id="modalCancelBtn">Cancelar</button>
      <button type="button" class="btn-primary" id="modalSaveProvBtn">${isEdit ? 'Guardar Cambios' : 'Agregar Proveedor'}</button>
    `;

    this.open(title, body, footer);

    document.getElementById('modalCancelBtn')?.addEventListener('click', () => this.close());
    document.getElementById('modalSaveProvBtn')?.addEventListener('click', () => {
      const form = document.getElementById('formProveedor');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const formData = new FormData(form);
      const datos = {
        dia: formData.get('dia'),
        categoria: formData.get('categoria'),
        proveedor: formData.get('proveedor').trim(),
        hora: formData.get('hora'),
        tipoPago: formData.get('tipoPago'),
        preventaPresupuesto: parseFloat(formData.get('preventaPresupuesto')) || 0,
        compra: parseFloat(formData.get('compra')) || 0,
        estado: formData.get('estado'),
        notas: formData.get('notas').trim()
      };

      if (isEdit) {
        stateManager.updateProveedor(proveedor.id, datos);
      } else {
        stateManager.addProveedor(datos);
      }

      this.close();
    });
  }

  // ==========================================
  // 2. MODAL: REGISTRAR PAGO DEL DÍA
  // ==========================================
  openNuevoPagoModal() {
    const provsList = stateManager.data.proveedores.map(p => `<option value="${p.proveedor}">`).join('');

    const body = `
      <form id="formNuevoPago">
        <div class="form-group">
          <label class="form-label">Proveedor / Empresa *</label>
          <input list="listaProveedores" type="text" class="form-control" name="proveedor" placeholder="Buscar o escribir nombre..." required>
          <datalist id="listaProveedores">${provsList}</datalist>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Monto Pagado ($) *</label>
            <input type="number" step="0.50" min="1" class="form-control" name="monto" placeholder="0.00" required>
          </div>
          <div class="form-group">
            <label class="form-label">Método de Pago *</label>
            <select class="form-control" name="metodo" required>
              <option value="Efectivo de Caja">Efectivo de Caja</option>
              <option value="Transferencia">Transferencia Electrónica</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Folio de Nota o Factura</label>
            <input type="text" class="form-control" name="comprobante" placeholder="Ej: Factura 4591">
          </div>
          <div class="form-group">
            <label class="form-label">Cajero / Encargado</label>
            <input type="text" class="form-control" name="cajero" value="${stateManager.data.cajeroActual}">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Notas Adicionales</label>
          <input type="text" class="form-control" name="notas" placeholder="Detalles de la entrega...">
        </div>
      </form>
    `;

    const footer = `
      <button type="button" class="btn-secondary" id="modalCancelBtn">Cancelar</button>
      <button type="button" class="btn-primary" id="modalSavePagoBtn">Registrar Pago</button>
    `;

    this.open('💵 Registrar Pago a Proveedor', body, footer);

    document.getElementById('modalCancelBtn')?.addEventListener('click', () => this.close());
    document.getElementById('modalSavePagoBtn')?.addEventListener('click', () => {
      const form = document.getElementById('formNuevoPago');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      const formData = new FormData(form);
      stateManager.addPagoDia({
        proveedor: formData.get('proveedor').trim(),
        monto: parseFloat(formData.get('monto')) || 0,
        metodo: formData.get('metodo'),
        comprobante: formData.get('comprobante').trim(),
        cajero: formData.get('cajero').trim(),
        notas: formData.get('notas').trim()
      });
      this.close();
    });
  }

  // ==========================================
  // 3. MODAL: REGISTRAR PANADERÍA
  // ==========================================
  openNuevoPanaderoModal() {
    const body = `
      <form id="formPanadero">
        <div class="form-group">
          <label class="form-label">Nombre de la Panadería / Proveedor *</label>
          <input type="text" class="form-control" name="proveedor" placeholder="Ej: Panadería San José, Don Pancho..." required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Pan Dulce Recibido ($)</label>
            <input type="number" step="1" min="0" class="form-control calc-pan" id="panDulces" name="dulces" placeholder="0.00" value="0">
          </div>
          <div class="form-group">
            <label class="form-label">Bolillo / Telera Recibido ($)</label>
            <input type="number" step="1" min="0" class="form-control calc-pan" id="panBolillo" name="bolillo" placeholder="0.00" value="0">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Cambios / Merma Devuelta ($)</label>
          <input type="number" step="1" min="0" class="form-control calc-pan" id="panCambios" name="cambios" placeholder="0.00" value="0">
          <small style="color: #64748b;">Este monto se descuenta automáticamente del total a pagar.</small>
        </div>

        <div style="background: #e6f7ed; padding: 14px; border-radius: 8px; border: 1px solid #86efac; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
          <strong style="color: #15803d;">Total Neto a Pagar:</strong>
          <span style="font-size: 1.3rem; font-weight: 800; color: #15803d;" id="lblPanTotal">$0.00</span>
        </div>

        <div class="form-group">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.88rem; font-weight: 600;">
            <input type="checkbox" name="pagado" checked>
            <span>Marcar como Pagado inmediatamente en Caja Central</span>
          </label>
        </div>

        <div class="form-group">
          <label class="form-label">Observaciones</label>
          <input type="text" class="form-control" name="notas" placeholder="Piezas devueltas o comentarios...">
        </div>
      </form>
    `;

    const footer = `
      <button type="button" class="btn-secondary" id="modalCancelBtn">Cancelar</button>
      <button type="button" class="btn-primary" id="modalSavePanBtn">Guardar Panadería</button>
    `;

    this.open('🥖 Conteo y Registro de Panaderos', body, footer);

    const recomputePan = () => {
      const d = parseFloat(document.getElementById('panDulces')?.value) || 0;
      const b = parseFloat(document.getElementById('panBolillo')?.value) || 0;
      const c = parseFloat(document.getElementById('panCambios')?.value) || 0;
      const total = Math.max(0, (d + b) - c);
      const lbl = document.getElementById('lblPanTotal');
      if (lbl) lbl.textContent = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(total);
    };

    document.querySelectorAll('.calc-pan').forEach(inp => inp.addEventListener('input', recomputePan));

    document.getElementById('modalCancelBtn')?.addEventListener('click', () => this.close());
    document.getElementById('modalSavePanBtn')?.addEventListener('click', () => {
      const form = document.getElementById('formPanadero');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      const formData = new FormData(form);
      stateManager.addPanadero({
        proveedor: formData.get('proveedor').trim(),
        dulces: formData.get('dulces'),
        bolillo: formData.get('bolillo'),
        cambios: formData.get('cambios'),
        pagado: formData.get('pagado') === 'on',
        notas: formData.get('notas').trim()
      });
      this.close();
    });
  }

  // ==========================================
  // 4. MODAL: REGISTRAR TORTILLERÍA
  // ==========================================
  openNuevaTortilleriaModal() {
    const body = `
      <form id="formTortilleria">
        <div class="form-group">
          <label class="form-label">Tortillería / Proveedor *</label>
          <input type="text" class="form-control" name="proveedor" placeholder="Ej: Tortillería El Maizal..." required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Producto Nuevo ($ o kg) *</label>
            <input type="number" step="0.5" min="0" class="form-control calc-tort" id="tortNuevo" name="nuevo" placeholder="0.00" value="0" required>
          </div>
          <div class="form-group">
            <label class="form-label">Cambio / Merma Devuelta ($)</label>
            <input type="number" step="0.5" min="0" class="form-control calc-tort" id="tortCambio" name="cambio" placeholder="0.00" value="0">
          </div>
        </div>

        <div style="background: #e6f7ed; padding: 14px; border-radius: 8px; border: 1px solid #86efac; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
          <strong style="color: #15803d;">Total Neto a Liquidar:</strong>
          <span style="font-size: 1.3rem; font-weight: 800; color: #15803d;" id="lblTortTotal">$0.00</span>
        </div>

        <div class="form-group">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.88rem; font-weight: 600;">
            <input type="checkbox" name="pagado" checked>
            <span>Marcar como Pagado inmediatamente en Caja</span>
          </label>
        </div>

        <div class="form-group">
          <label class="form-label">Observaciones</label>
          <input type="text" class="form-control" name="notas" placeholder="Kilos exactos o turno...">
        </div>
      </form>
    `;

    const footer = `
      <button type="button" class="btn-secondary" id="modalCancelBtn">Cancelar</button>
      <button type="button" class="btn-primary" id="modalSaveTortBtn">Guardar Registro</button>
    `;

    this.open('🌽 Conteo y Registro de Tortillería', body, footer);

    const recomputeTort = () => {
      const n = parseFloat(document.getElementById('tortNuevo')?.value) || 0;
      const c = parseFloat(document.getElementById('tortCambio')?.value) || 0;
      const total = Math.max(0, n - c);
      const lbl = document.getElementById('lblTortTotal');
      if (lbl) lbl.textContent = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(total);
    };

    document.querySelectorAll('.calc-tort').forEach(inp => inp.addEventListener('input', recomputeTort));

    document.getElementById('modalCancelBtn')?.addEventListener('click', () => this.close());
    document.getElementById('modalSaveTortBtn')?.addEventListener('click', () => {
      const form = document.getElementById('formTortilleria');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      const formData = new FormData(form);
      stateManager.addTortilleria({
        proveedor: formData.get('proveedor').trim(),
        nuevo: formData.get('nuevo'),
        cambio: formData.get('cambio'),
        pagado: formData.get('pagado') === 'on',
        notas: formData.get('notas').trim()
      });
      this.close();
    });
  }

  // ==========================================
  // 5. MODAL: NUEVO ARQUEO / TURNO
  // ==========================================
  openNuevoArqueoModal() {
    const num = stateManager.data.arqueos.length + 1;
    const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const body = `
      <form id="formArqueo">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Nombre del Turno / Sesión *</label>
            <input type="text" class="form-control" name="turno" value="Arqueo ${num} (${hora})" required>
          </div>
          <div class="form-group">
            <label class="form-label">Cajero / Encargado</label>
            <input type="text" class="form-control" name="cajero" value="${stateManager.data.cajeroActual}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Venta Total en Sistema POS ($) *</label>
            <input type="number" step="0.5" class="form-control" name="sistema" placeholder="0.00" required>
          </div>
          <div class="form-group">
            <label class="form-label">Billetes en Caja ($)</label>
            <input type="number" step="10" class="form-control" name="billetes" placeholder="0.00" value="0">
          </div>
        </div>

        <div class="coins-section" style="margin-bottom: 16px;">
          <div class="coins-title">
            <span>Conteo de Monedas (Morralla)</span>
            <span style="color: #0284c7;" id="lblModalMorralla">$0.00</span>
          </div>
          <div class="coins-grid">
            <div class="coin-item">
              <span class="coin-badge">$1</span>
              <input type="number" min="0" class="coin-count-input calc-coin" id="m1" name="monedas1" value="0">
            </div>
            <div class="coin-item">
              <span class="coin-badge">$2</span>
              <input type="number" min="0" class="coin-count-input calc-coin" id="m2" name="monedas2" value="0">
            </div>
            <div class="coin-item">
              <span class="coin-badge">$5</span>
              <input type="number" min="0" class="coin-count-input calc-coin" id="m5" name="monedas5" value="0">
            </div>
            <div class="coin-item">
              <span class="coin-badge">$10</span>
              <input type="number" min="0" class="coin-count-input calc-coin" id="m10" name="monedas10" value="0">
            </div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Tarjetas Bancarias ($)</label>
            <input type="number" step="0.5" class="form-control" name="tarjetas" placeholder="0.00" value="0">
          </div>
          <div class="form-group">
            <label class="form-label">Yomp Tarjetas / QR ($)</label>
            <input type="number" step="0.5" class="form-control" name="yompTarjetas" placeholder="0.00" value="0">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Retiros del Turno ($)</label>
            <input type="number" step="10" class="form-control" name="retirosTurno" placeholder="0.00" value="0">
          </div>
          <div class="form-group">
            <label class="form-label">Pagos a Proveedores en Turno ($)</label>
            <input type="number" step="10" class="form-control" name="pagosTurno" placeholder="0.00" value="0">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Observaciones del Arqueo</label>
          <input type="text" class="form-control" name="notas" placeholder="Detalles de turno o incidencias...">
        </div>
      </form>
    `;

    const footer = `
      <button type="button" class="btn-secondary" id="modalCancelBtn">Cancelar</button>
      <button type="button" class="btn-primary" id="modalSaveArqueoBtn">Generar Arqueo</button>
    `;

    this.open('🏦 Nuevo Corte y Arqueo de Caja', body, footer);

    const recomputeCoins = () => {
      const c1 = parseInt(document.getElementById('m1')?.value) || 0;
      const c2 = parseInt(document.getElementById('m2')?.value) || 0;
      const c5 = parseInt(document.getElementById('m5')?.value) || 0;
      const c10 = parseInt(document.getElementById('m10')?.value) || 0;
      const total = stateManager.calcularMorralla(c1, c2, c5, c10);
      const lbl = document.getElementById('lblModalMorralla');
      if (lbl) lbl.textContent = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(total);
    };

    document.querySelectorAll('.calc-coin').forEach(inp => inp.addEventListener('input', recomputeCoins));

    document.getElementById('modalCancelBtn')?.addEventListener('click', () => this.close());
    document.getElementById('modalSaveArqueoBtn')?.addEventListener('click', () => {
      const form = document.getElementById('formArqueo');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      const formData = new FormData(form);
      stateManager.addArqueo({
        turno: formData.get('turno'),
        cajero: formData.get('cajero'),
        sistema: formData.get('sistema'),
        billetes: formData.get('billetes'),
        monedas1: formData.get('monedas1'),
        monedas2: formData.get('monedas2'),
        monedas5: formData.get('monedas5'),
        monedas10: formData.get('monedas10'),
        tarjetas: formData.get('tarjetas'),
        yompTarjetas: formData.get('yompTarjetas'),
        retirosTurno: formData.get('retirosTurno'),
        pagosTurno: formData.get('pagosTurno'),
        notas: formData.get('notas')
      });
      this.close();
    });
  }

  // ==========================================
  // 6. MODAL: NUEVO PENDIENTE DE PAGO
  // ==========================================
  openNuevoPendienteModal() {
    const today = new Date().toISOString().split('T')[0];

    const body = `
      <form id="formPendiente">
        <div class="form-group">
          <label class="form-label">Proveedor / Empresa *</label>
          <input type="text" class="form-control" name="proveedor" placeholder="Ej: Grupo Modelo, Sabritas, Lácteos..." required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Monto por Pagar ($) *</label>
            <input type="number" step="10" min="1" class="form-control" name="monto" placeholder="0.00" required>
          </div>
          <div class="form-group">
            <label class="form-label">Fecha Límite / Tentativa de Pago *</label>
            <input type="date" class="form-control" name="fechaVencimiento" value="${today}" required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Concepto / Folio de Factura o Remisión</label>
          <input type="text" class="form-control" name="concepto" placeholder="Ej: Factura F-4890 por Cerveza">
        </div>

        <div class="form-group">
          <label class="form-label">Instrucciones o Notas</label>
          <textarea class="form-control" name="notas" placeholder="Tener preparado el dinero en efectivo, pagar por la tarde, etc..."></textarea>
        </div>
      </form>
    `;

    const footer = `
      <button type="button" class="btn-secondary" id="modalCancelBtn">Cancelar</button>
      <button type="button" class="btn-primary" id="modalSavePendBtn">Guardar Pendiente</button>
    `;

    this.open('⏳ Registrar Cuenta por Pagar (Próximos Días)', body, footer);

    document.getElementById('modalCancelBtn')?.addEventListener('click', () => this.close());
    document.getElementById('modalSavePendBtn')?.addEventListener('click', () => {
      const form = document.getElementById('formPendiente');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      const formData = new FormData(form);
      stateManager.addPendientePago({
        proveedor: formData.get('proveedor').trim(),
        monto: formData.get('monto'),
        fechaVencimiento: formData.get('fechaVencimiento'),
        concepto: formData.get('concepto').trim(),
        notas: formData.get('notas').trim()
      });
      this.close();
    });
  }

  // ==========================================
  // 7. MODAL: REGISTRAR RETIRO DE EFECTIVO
  // ==========================================
  openNuevoRetiroModal() {
    const body = `
      <form id="formRetiro">
        <div class="form-group">
          <label class="form-label">Monto a Retirar ($) *</label>
          <input type="number" step="50" min="10" class="form-control" name="monto" placeholder="0.00" required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Nombre de quien Retira / Recibe *</label>
            <input type="text" class="form-control" name="responsable" placeholder="Ej: Don Manuel (Dueño), Supervisor..." required>
          </div>
          <div class="form-group">
            <label class="form-label">Autorizado Por</label>
            <input type="text" class="form-control" name="autorizo" value="Gerencia">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Motivo o Destino del Retiro *</label>
          <select class="form-control" name="motivo" required>
            <option value="Resguardo en Caja Fuerte">Resguardo de seguridad en caja fuerte</option>
            <option value="Depósito Bancario">Depósito bancario de ventas</option>
            <option value="Pago de Servicios / Renta">Pago de servicios / Renta</option>
            <option value="Gasto Extraordinario">Gasto extraordinario tienda</option>
          </select>
        </div>
      </form>
    `;

    const footer = `
      <button type="button" class="btn-secondary" id="modalCancelBtn">Cancelar</button>
      <button type="button" class="btn-primary" id="modalSaveRetiroBtn">Registrar Retiro</button>
    `;

    this.open('📤 Registrar Retiro de Efectivo', body, footer);

    document.getElementById('modalCancelBtn')?.addEventListener('click', () => this.close());
    document.getElementById('modalSaveRetiroBtn')?.addEventListener('click', () => {
      const form = document.getElementById('formRetiro');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      const formData = new FormData(form);
      stateManager.addRetiro({
        monto: formData.get('monto'),
        responsable: formData.get('responsable').trim(),
        autorizo: formData.get('autorizo').trim(),
        motivo: formData.get('motivo')
      });
      this.close();
    });
  }

  // ==========================================
  // 8. MODAL: REGISTRAR MÁQUINA / TRAGAMONEDAS
  // ==========================================
  openNuevaMaquinaModal() {
    const body = `
      <form id="formMaquina">
        <div class="form-group">
          <label class="form-label">Nombre / Tipo de Máquina *</label>
          <input type="text" class="form-control" name="nombreMaquina" placeholder="Ej: Tragamonedas Frutas #1, Peluchera..." required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Monto Total Contado ($) *</label>
            <input type="number" step="10" min="1" class="form-control calc-maq" id="maqMonto" name="montoTotal" placeholder="0.00" required>
          </div>
          <div class="form-group">
            <label class="form-label">% Ganancia Tienda *</label>
            <input type="number" step="5" min="0" max="100" class="form-control calc-maq" id="maqPorcentaje" name="porcentajeTienda" value="50" required>
          </div>
        </div>

        <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 0.85rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Ganancia Neta para Tienda:</span>
            <strong style="color: #16a34a;" id="lblMaqTienda">$0.00</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Reparto al Dueño de Máquina:</span>
            <strong style="color: #64748b;" id="lblMaqProveedor">$0.00</strong>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Lectura Contador Anterior</label>
            <input type="number" class="form-control" name="contadorAnterior" placeholder="0" value="0">
          </div>
          <div class="form-group">
            <label class="form-label">Lectura Contador Actual</label>
            <input type="number" class="form-control" name="contadorActual" placeholder="0" value="0">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Responsable en la Apertura</label>
          <input type="text" class="form-control" name="responsable" value="${stateManager.data.cajeroActual}">
        </div>
      </form>
    `;

    const footer = `
      <button type="button" class="btn-secondary" id="modalCancelBtn">Cancelar</button>
      <button type="button" class="btn-primary" id="modalSaveMaqBtn">Guardar Recaudación</button>
    `;

    this.open('🎰 Recaudación de Tragamonedas y Peluches', body, footer);

    const recomputeMaq = () => {
      const total = parseFloat(document.getElementById('maqMonto')?.value) || 0;
      const pct = parseFloat(document.getElementById('maqPorcentaje')?.value) || 50;
      const tienda = (total * pct) / 100;
      const prov = total - tienda;
      const fmt = (v) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);
      const l1 = document.getElementById('lblMaqTienda');
      const l2 = document.getElementById('lblMaqProveedor');
      if (l1) l1.textContent = fmt(tienda);
      if (l2) l2.textContent = fmt(prov);
    };

    document.querySelectorAll('.calc-maq').forEach(inp => inp.addEventListener('input', recomputeMaq));

    document.getElementById('modalCancelBtn')?.addEventListener('click', () => this.close());
    document.getElementById('modalSaveMaqBtn')?.addEventListener('click', () => {
      const form = document.getElementById('formMaquina');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      const formData = new FormData(form);
      stateManager.addMaquina({
        nombreMaquina: formData.get('nombreMaquina').trim(),
        montoTotal: formData.get('montoTotal'),
        porcentajeTienda: formData.get('porcentajeTienda'),
        contadorAnterior: formData.get('contadorAnterior'),
        contadorActual: formData.get('contadorActual'),
        responsable: formData.get('responsable').trim()
      });
      this.close();
    });
  }

  // ==========================================
  // 9. MODAL: IMPRESIÓN DE TICKET DE ARQUEO
  // ==========================================
  openPrintTicketModal(arq) {
    if (!arq) return;

    const fmt = (v) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v || 0);

    const body = `
      <div style="font-family: monospace; background: #fff; border: 1px solid #ccc; padding: 18px; border-radius: 6px; font-size: 0.88rem; line-height: 1.5; max-width: 380px; margin: 0 auto;" id="ticketPrintArea">
        <div style="text-align: center; border-bottom: 1px dashed #333; padding-bottom: 8px; margin-bottom: 8px;">
          <h2 style="font-size: 1.1rem; margin: 0; font-weight: 800;">ADMIN FENIX • MINISÚPER</h2>
          <div style="font-size: 0.75rem;">COMPROBANTE DE ARQUEO Y CORTE</div>
          <div style="font-size: 0.75rem;">Fecha: ${arq.fecha} • Hora: ${arq.hora || '12:00'}</div>
          <div style="font-size: 0.75rem;">Sesión: ${arq.turno}</div>
          <div style="font-size: 0.75rem;">Cajero: ${arq.cajero}</div>
        </div>

        <div style="margin-bottom: 8px;">
          <div style="font-weight: bold; border-bottom: 1px dotted #888;">DESGLOSE DE EFECTIVO:</div>
          <div style="display: flex; justify-content: space-between;"><span>Billetes:</span> <span>${fmt(arq.billetes)}</span></div>
          <div style="display: flex; justify-content: space-between;"><span>Monedas $1 (x${arq.monedas1}):</span> <span>${fmt(arq.monedas1 * 1)}</span></div>
          <div style="display: flex; justify-content: space-between;"><span>Monedas $2 (x${arq.monedas2}):</span> <span>${fmt(arq.monedas2 * 2)}</span></div>
          <div style="display: flex; justify-content: space-between;"><span>Monedas $5 (x${arq.monedas5}):</span> <span>${fmt(arq.monedas5 * 5)}</span></div>
          <div style="display: flex; justify-content: space-between;"><span>Monedas $10 (x${arq.monedas10}):</span> <span>${fmt(arq.monedas10 * 10)}</span></div>
          <div style="display: flex; justify-content: space-between; font-weight: bold; margin-top: 4px;"><span>SUBTOTAL EFECTIVO:</span> <span>${fmt(arq.totalEfectivo)}</span></div>
        </div>

        <div style="margin-bottom: 8px; border-top: 1px dashed #aaa; padding-top: 6px;">
          <div style="display: flex; justify-content: space-between;"><span>Tarjetas Bancarias:</span> <span>${fmt(arq.tarjetas)}</span></div>
          <div style="display: flex; justify-content: space-between;"><span>Yomp Tarjetas:</span> <span>${fmt(arq.yompTarjetas)}</span></div>
          <div style="display: flex; justify-content: space-between;"><span>Retiros del Turno:</span> <span>${fmt(arq.retirosTurno)}</span></div>
          <div style="display: flex; justify-content: space-between;"><span>Pagos a Proveedores:</span> <span>${fmt(arq.pagosTurno)}</span></div>
        </div>

        <div style="border-top: 2px solid #333; padding-top: 6px; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 0.95rem;">
            <span>TOTAL DECLARADO:</span>
            <span>${fmt(arq.totalDeclarado)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: bold;">
            <span>VENTA SISTEMA POS:</span>
            <span>${fmt(arq.sistema)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: 800; margin-top: 6px; padding: 4px; background: #eee;">
            <span>${arq.diferencia >= 0 ? 'SOBRANTE:' : 'FALTANTE:'}</span>
            <span>${fmt(Math.abs(arq.diferencia))}</span>
          </div>
        </div>

        ${arq.notas ? `
          <div style="font-size: 0.72rem; margin-top: 8px; border-top: 1px dotted #888; padding-top: 4px;">
            Nota: ${arq.notas}
          </div>
        ` : ''}

        <div style="margin-top: 25px; text-align: center; font-size: 0.75rem;">
          _____________________________
          <div>Firma Cajero / Encargado</div>
        </div>
      </div>
    `;

    const footer = `
      <button type="button" class="btn-secondary" id="modalCancelBtn">Cerrar</button>
      <button type="button" class="btn-primary" id="btnImprimirTicketWindow">🖨️ Imprimir Ticket</button>
    `;

    this.open('🖨️ Vista Previa de Ticket de Arqueo', body, footer);

    document.getElementById('modalCancelBtn')?.addEventListener('click', () => this.close());
    document.getElementById('btnImprimirTicketWindow')?.addEventListener('click', () => {
      window.print();
    });
  }

  // ==========================================
  // 10. MODAL: RESPALDO Y RESTAURACIÓN JSON
  // ==========================================
  openBackupModal() {
    const jsonStr = stateManager.exportarJSON();

    const body = `
      <div class="form-group">
        <label class="form-label">Respaldo Actual en Formato JSON</label>
        <textarea class="form-control" style="height: 180px; font-family: monospace; font-size: 0.75rem;" id="txtBackupJson" readonly>${jsonStr}</textarea>
      </div>

      <div style="display: flex; gap: 10px; margin-bottom: 20px;">
        <button class="btn-secondary" id="btnDescargarJSON">💾 Descargar Archivo JSON</button>
        <button class="btn-secondary" id="btnCopiarJSON">📋 Copiar al Portapapeles</button>
      </div>

      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 16px;">

      <div class="form-group">
        <label class="form-label">Restaurar Datos desde un Respaldo JSON</label>
        <textarea class="form-control" style="height: 100px; font-family: monospace; font-size: 0.75rem;" id="txtImportJson" placeholder="Pega aquí el contenido JSON a restaurar..."></textarea>
      </div>

      <div style="display: flex; gap: 10px;">
        <button class="btn-primary" id="btnRestaurarJSON" style="background: #2563eb;">🔄 Restaurar Datos</button>
        <button class="btn-secondary" id="btnResetSeed" style="color: #dc2626;">⚠️ Restaurar Datos Demo</button>
      </div>
    `;

    const footer = `
      <button type="button" class="btn-secondary" id="modalCancelBtn">Cerrar</button>
    `;

    this.open('💾 Respaldo y Mantenimiento de Base de Datos', body, footer);

    document.getElementById('modalCancelBtn')?.addEventListener('click', () => this.close());

    document.getElementById('btnDescargarJSON')?.addEventListener('click', () => {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AdminFenix_Respaldo_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    document.getElementById('btnCopiarJSON')?.addEventListener('click', () => {
      navigator.clipboard.writeText(jsonStr);
      alert('¡JSON copiado con éxito al portapapeles!');
    });

    document.getElementById('btnRestaurarJSON')?.addEventListener('click', () => {
      const inputVal = document.getElementById('txtImportJson')?.value.trim();
      if (!inputVal) {
        alert('Por favor pega el código JSON.');
        return;
      }
      if (confirm('¿Deseas sobreescribir los datos actuales con este respaldo?')) {
        const ok = stateManager.importarJSON(inputVal);
        if (ok) {
          alert('¡Base de datos restaurada correctamente!');
          this.close();
        } else {
          alert('El archivo o formato JSON no es válido.');
        }
      }
    });

    document.getElementById('btnResetSeed')?.addEventListener('click', () => {
      if (confirm('¿Restablecer el sistema con los datos de demostración originales? Se perderán las modificaciones locales.')) {
        stateManager.resetearDatosDemo();
        alert('¡Datos de demostración restablecidos!');
        this.close();
      }
    });
  }

  // ==========================================
  // 11. MODAL: CONFIGURACIÓN DE FIREBASE FIRESTORE
  // ==========================================
  openFirebaseConfigModal(onSuccessCallback = null) {
    const configActual = getFirebaseConfigActual();
    const conectado = isFirebaseConectado();
    const configStr = configActual ? JSON.stringify(configActual, null, 2) : '';

    const body = `
      <div style="margin-bottom: 16px;">
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: ${conectado ? '#ecfdf5' : '#fff7ed'}; border: 1.5px solid ${conectado ? '#10b981' : '#f97316'}; border-radius: 6px; margin-bottom: 14px;">
          <div>
            <strong style="color: ${conectado ? '#065f46' : '#9a3412'}; font-size: 0.9rem;">
              ${conectado ? '🟢 Cloud Firestore Conectado' : '🟠 Firebase No Conectado'}
            </strong>
            <div style="font-size: 0.75rem; color: #475569;">
              ${conectado ? `Proyecto: <strong>${configActual.projectId}</strong>` : 'Conecta tu proyecto adminsuper para sincronizar las hojas diarias.'}
            </div>
          </div>
        </div>

        <p style="font-size: 0.82rem; color: #334155; margin-bottom: 8px;">
          Pega el bloque <code>firebaseConfig</code> obtenido desde <strong>Firebase Console &gt; Configuración del proyecto &gt; Tus apps (&lt;/&gt;)</strong>:
        </p>

        <textarea class="form-control" id="txtFirebaseConfig" style="height: 170px; font-family: monospace; font-size: 0.78rem;" placeholder='{\n  "apiKey": "AIzaSy...",\n  "authDomain": "adminsuper.firebaseapp.com",\n  "projectId": "adminsuper",\n  "storageBucket": "adminsuper.appspot.com",\n  "messagingSenderId": "...",\n  "appId": "..."\n}'>${configStr}</textarea>
        <small style="color: #64748b; font-size: 0.72rem; display: block; margin-top: 4px;">
          * Se guarda de forma segura en tu navegador y conecta directamente con la base de datos de tu tienda.
        </small>
      </div>
    `;

    const footer = `
      <button type="button" class="btn-secondary" id="modalCancelBtn">Cerrar</button>
      <button type="button" class="btn-primary" id="btnGuardarFirebase" style="background: #1e3a8a;">💾 Conectar y Guardar</button>
    `;

    this.open('🔥 Conectar Firebase Cloud Firestore', body, footer);

    document.getElementById('modalCancelBtn')?.addEventListener('click', () => this.close());
    document.getElementById('btnGuardarFirebase')?.addEventListener('click', () => {
      const input = document.getElementById('txtFirebaseConfig')?.value.trim();
      if (!input) {
        alert('Por favor pega el código de configuración de Firebase.');
        return;
      }

      try {
        let parsed = null;
        if (input.startsWith('{')) {
          parsed = JSON.parse(input);
        } else {
          // Si el usuario pegó const firebaseConfig = { ... }
          const match = input.match(/\{[\s\S]*\}/);
          if (match) {
            // Reemplazar claves no entrecomilladas si es necesario
            const sanitized = match[0]
              .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
              .replace(/'/g, '"');
            parsed = JSON.parse(sanitized);
          }
        }

        if (parsed && parsed.projectId) {
          const ok = inicializarFirebase(parsed);
          if (ok) {
            alert(`¡Conexión exitosa a Firebase Firestore (${parsed.projectId})!`);
            this.close();
            if (onSuccessCallback) onSuccessCallback(parsed);
          } else {
            alert('No se pudo inicializar Firebase con esa configuración. Revisa las claves.');
          }
        } else {
          alert('El formato no parece ser una configuración válida de Firebase (debe contener projectId).');
        }
      } catch (err) {
        alert('Error al interpretar el código de Firebase. Asegúrate de incluir las llaves { ... }. Error: ' + err.message);
      }
    });
  }

  // ==========================================
  // 12. MODAL: CAPTURA SEGURA DE PROVEEDOR PAGADO
  // ==========================================
  openCapturaProveedorModal({ index, nota, proveedor = '', pagado = 0, tipoPago = 'Efectivo' }, onGuardar) {
    const numNota = nota || (index !== undefined ? index + 1 : stateManager.data.comprasProveedores.length + 1);

    // Obtener proveedores únicos combinando el catálogo y los ya registrados
    const catalogo = Array.from(new Set([
      ...CATALOGO_PROVEEDORES_PREDETERMINADOS,
      ...stateManager.data.proveedores.map(p => p.proveedor).filter(Boolean),
      ...stateManager.data.comprasProveedores.map(p => p.proveedor).filter(Boolean)
    ])).sort();

    const body = `
      <form id="formCapturaProveedorSeguro">
        <div style="background: #eff6ff; border: 1.5px solid #bfdbfe; padding: 10px 14px; border-radius: 6px; margin-bottom: 16px; font-size: 0.8rem; color: #1e3a8a;">
          <strong>🔒 Registro Contable Seguro (Nota #${numNota})</strong>
          <p style="margin: 4px 0 0; color: #475569; font-size: 0.75rem;">
            Selecciona un proveedor de la lista o escribe uno nuevo. Una vez guardado, el renglón quedará protegido para evitar modificaciones accidentales.
          </p>
        </div>

        <div class="form-group">
          <label class="form-label">Proveedor *</label>
          <input list="dlProveedoresFenix" class="form-control" id="modalInputProveedor" name="proveedor" placeholder="Escribe o selecciona un proveedor..." value="${proveedor}" autocomplete="off" required autofocus>
          <datalist id="dlProveedoresFenix">
            ${catalogo.map(p => `<option value="${p}"></option>`).join('')}
          </datalist>
          <small style="color: #64748b; font-size: 0.72rem;">* Puedes desplegar la lista de opciones o escribir un proveedor nuevo.</small>
        </div>

        <div class="form-group">
          <label class="form-label">Tipo de Pago *</label>
          <div style="display: flex; gap: 12px; margin-top: 4px;">
            <label style="display: flex; align-items: center; gap: 6px; font-weight: 700; cursor: pointer; background: #f8fafc; padding: 6px 12px; border: 1.5px solid #cbd5e1; border-radius: 4px;">
              <input type="radio" name="modalTipoPago" value="Efectivo" ${tipoPago !== 'Transferencia' ? 'checked' : ''}>
              <span>💵 Efectivo</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; font-weight: 700; cursor: pointer; background: #f8fafc; padding: 6px 12px; border: 1.5px solid #cbd5e1; border-radius: 4px;">
              <input type="radio" name="modalTipoPago" value="Transferencia" ${tipoPago === 'Transferencia' ? 'checked' : ''}>
              <span>🏦 Transferencia</span>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Cantidad Pagada ($ MXN) *</label>
          <input type="number" step="0.5" min="0.01" class="form-control font-bold" id="modalInputMonto" name="pagado" placeholder="0.00" value="${pagado > 0 ? pagado : ''}" style="font-size: 1.1rem; color: #b91c1c;" required>
        </div>
      </form>
    `;

    const footer = `
      <button type="button" class="btn-secondary" id="modalCancelProvSeguro">Cancelar</button>
      <button type="button" class="btn-primary" id="btnGuardarProvSeguro" style="background: #1e3a8a;">💾 Guardar Registro</button>
    `;

    this.open(`➕ Registro de Proveedor Pagado (Nota #${numNota})`, body, footer);

    document.getElementById('modalCancelProvSeguro')?.addEventListener('click', () => this.close());
    document.getElementById('btnGuardarProvSeguro')?.addEventListener('click', () => {
      const provInput = document.getElementById('modalInputProveedor')?.value.trim();
      const montoInput = parseFloat(document.getElementById('modalInputMonto')?.value) || 0;
      const tipoSeleccionado = document.querySelector('input[name="modalTipoPago"]:checked')?.value || 'Efectivo';

      if (!provInput) {
        alert('Por favor selecciona o escribe el nombre del proveedor.');
        document.getElementById('modalInputProveedor')?.focus();
        return;
      }

      if (montoInput <= 0) {
        alert('Por favor ingresa una cantidad válida mayor a $0.');
        document.getElementById('modalInputMonto')?.focus();
        return;
      }

      stateManager.guardarCompraProveedorSegura({
        index,
        proveedor: provInput,
        pagado: montoInput,
        tipoPago: tipoSeleccionado
      });

      this.close();
      if (onGuardar) onGuardar();
    });
  }

  // ==========================================
  // 13. MODAL: CAPTURA SEGURA DE PRÉSTAMO / PENDIENTE
  // ==========================================
  openCapturaPrestamoModal({ index, proveedor = '', pendiente = 0, nota = '' }, onGuardar) {
    const catalogo = Array.from(new Set([
      ...CATALOGO_PROVEEDORES_PREDETERMINADOS,
      'Sr Combi',
      'Empleado Don Manuel',
      'Supervisor Roberto'
    ])).sort();

    const body = `
      <form id="formCapturaPrestamoSeguro">
        <div style="background: #fff7ed; border: 1.5px solid #fed7aa; padding: 10px 14px; border-radius: 6px; margin-bottom: 16px; font-size: 0.8rem; color: #9a3412;">
          <strong>🔒 Préstamo o Pendiente de Pago Seguro</strong>
          <p style="margin: 4px 0 0; color: #475569; font-size: 0.75rem;">
            Una vez guardado, el pendiente quedará registrado. Cuando sea liquidado, podrás marcar la casilla en la hoja para tacharlo y descontarlo del adeudo activo.
          </p>
        </div>

        <div class="form-group">
          <label class="form-label">Proveedor o Persona a quien se debe *</label>
          <input list="dlPrestamosFenix" class="form-control" id="modalInputPrestamoProv" placeholder="Escribe o selecciona proveedor o persona..." value="${proveedor}" autocomplete="off" required autofocus>
          <datalist id="dlPrestamosFenix">
            ${catalogo.map(p => `<option value="${p}"></option>`).join('')}
          </datalist>
        </div>

        <div class="form-group">
          <label class="form-label">Monto Pendiente ($ MXN) *</label>
          <input type="number" step="10" min="1" class="form-control font-bold" id="modalInputPrestamoMonto" placeholder="0.00" value="${pendiente > 0 ? pendiente : ''}" style="font-size: 1.1rem; color: #b91c1c;" required>
        </div>

        <div class="form-group">
          <label class="form-label">Concepto / Motivo de la deuda</label>
          <input type="text" class="form-control" id="modalInputPrestamoNota" placeholder="Ej: Préstamo acordado, pago de fin de semana..." value="${nota}">
        </div>
      </form>
    `;

    const footer = `
      <button type="button" class="btn-secondary" id="modalCancelPresSeguro">Cancelar</button>
      <button type="button" class="btn-primary" id="btnGuardarPresSeguro" style="background: #1e3a8a;">💾 Guardar Pendiente</button>
    `;

    this.open('➕ Registrar Préstamo o Pendiente de Pago', body, footer);

    document.getElementById('modalCancelPresSeguro')?.addEventListener('click', () => this.close());
    document.getElementById('btnGuardarPresSeguro')?.addEventListener('click', () => {
      const provInput = document.getElementById('modalInputPrestamoProv')?.value.trim();
      const montoInput = parseFloat(document.getElementById('modalInputPrestamoMonto')?.value) || 0;
      const notaInput = document.getElementById('modalInputPrestamoNota')?.value.trim();

      if (!provInput) {
        alert('Por favor ingresa a quién se le debe o prestó.');
        document.getElementById('modalInputPrestamoProv')?.focus();
        return;
      }

      if (montoInput <= 0) {
        alert('Por favor ingresa un monto válido.');
        document.getElementById('modalInputPrestamoMonto')?.focus();
        return;
      }

      stateManager.guardarPrestamoSeguro({
        index,
        proveedor: provInput,
        pendiente: montoInput,
        nota: notaInput
      });

      this.close();
      if (onGuardar) onGuardar();
    });
  }

  // ==========================================
  // 14. MODAL: CAPTURA SEGURA DE RETIRO DE EFECTIVO
  // ==========================================
  openCapturaRetiroModal({ index, monto = 0, nombre = '', concepto = '' }, onGuardar) {
    const responsables = ['Don Manuel (Encargado)', 'Supervisor Roberto', 'Dueño / Administración', 'Cajero en Turno'];

    const body = `
      <form id="formCapturaRetiroSeguro">
        <div style="background: #eff6ff; border: 1.5px solid #bfdbfe; padding: 10px 14px; border-radius: 6px; margin-bottom: 16px; font-size: 0.8rem; color: #1e3a8a;">
          <strong>🔒 Retiro de Efectivo de Caja</strong>
          <p style="margin: 4px 0 0; color: #475569; font-size: 0.75rem;">
            Registra los retiros que se realizan durante el turno. Al guardar, quedará registrado y bloqueado.
          </p>
        </div>

        <div class="form-group">
          <label class="form-label">Monto del Retiro ($ MXN) *</label>
          <input type="number" step="10" min="1" class="form-control font-bold" id="modalInputRetiroMonto" placeholder="0.00" value="${monto > 0 ? monto : ''}" style="font-size: 1.1rem; color: #b91c1c;" required autofocus>
        </div>

        <div class="form-group">
          <label class="form-label">Persona que Retira / Responsable *</label>
          <input list="dlRetiroResponsables" class="form-control" id="modalInputRetiroNombre" placeholder="Selecciona o escribe el nombre..." value="${nombre || 'Don Manuel'}" required>
          <datalist id="dlRetiroResponsables">
            ${responsables.map(r => `<option value="${r}"></option>`).join('')}
          </datalist>
        </div>

        <div class="form-group">
          <label class="form-label">Concepto / Destino del Efectivo</label>
          <input type="text" class="form-control" id="modalInputRetiroConcepto" placeholder="Ej: Depósito bancario, caja fuerte, resguardo..." value="${concepto || 'Caja Fuerte'}">
        </div>
      </form>
    `;

    const footer = `
      <button type="button" class="btn-secondary" id="modalCancelRetSeguro">Cancelar</button>
      <button type="button" class="btn-primary" id="btnGuardarRetSeguro" style="background: #1e3a8a;">💾 Guardar Retiro</button>
    `;

    this.open('➕ Registrar Retiro de Efectivo', body, footer);

    document.getElementById('modalCancelRetSeguro')?.addEventListener('click', () => this.close());
    document.getElementById('btnGuardarRetSeguro')?.addEventListener('click', () => {
      const montoInput = parseFloat(document.getElementById('modalInputRetiroMonto')?.value) || 0;
      const nombreInput = document.getElementById('modalInputRetiroNombre')?.value.trim();
      const conceptoInput = document.getElementById('modalInputRetiroConcepto')?.value.trim();

      if (montoInput <= 0) {
        alert('Por favor ingresa un monto válido a retirar.');
        document.getElementById('modalInputRetiroMonto')?.focus();
        return;
      }

      if (!nombreInput) {
        alert('Por favor indica quién retira el efectivo.');
        document.getElementById('modalInputRetiroNombre')?.focus();
        return;
      }

      stateManager.guardarRetiroSeguro({
        index,
        monto: montoInput,
        nombre: nombreInput,
        concepto: conceptoInput
      });

      this.close();
      if (onGuardar) onGuardar();
    });
  }

  // ==========================================
  // 15. MODAL: DETALLES DE COMPRA / PROVEEDOR (Muestra hora, tipo de pago, etc.)
  // ==========================================
  openDetallesProveedorModal(compra, fecha = '') {
    const numNota = compra.nota || 1;
    const hora = compra.hora || '08:00 a. m.';
    const proveedor = compra.proveedor || 'Sin especificar';
    const tipoPago = compra.tipoPago || 'Efectivo';
    const pagado = parseFloat(compra.pagado) || 0;
    const fechaReg = fecha || compra.fechaRegistro || stateManager.data.fecha || '';
    const formatMoney = (v) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);

    const body = `
      <div style="padding: 4px 0;">
        <div style="display: flex; align-items: center; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 16px; border-radius: 6px; margin-bottom: 14px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 1.8rem;">${tipoPago === 'Transferencia' ? '🏦' : '💵'}</span>
            <div>
              <div style="font-size: 0.72rem; font-weight: 600; color: #64748b; text-transform: uppercase;">Tipo de Pago</div>
              <div style="font-size: 1rem; font-weight: 700; color: #0f172a;">Pago con ${tipoPago}</div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.72rem; font-weight: 600; color: #64748b; text-transform: uppercase;">Importe Pagado</div>
            <div style="font-size: 1.3rem; font-weight: 800; color: #0f172a;">${formatMoney(pagado)}</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 12px;">
          <div>
            <span style="display: block; font-size: 0.7rem; color: #64748b; font-weight: 600; text-transform: uppercase;">No. de Nota / Renglón</span>
            <strong style="font-size: 0.9rem; color: #0f172a;">Nota #${numNota}</strong>
          </div>

          <div>
            <span style="display: block; font-size: 0.7rem; color: #64748b; font-weight: 600; text-transform: uppercase;">Proveedor / Empresa</span>
            <strong style="font-size: 0.9rem; color: #0f172a;">${proveedor}</strong>
          </div>

          <div>
            <span style="display: block; font-size: 0.7rem; color: #64748b; font-weight: 600; text-transform: uppercase;">Hora de Registro</span>
            <strong style="font-size: 0.9rem; color: #334155; display: inline-flex; align-items: center; gap: 4px;">
              <span>⏰</span> ${hora}
            </strong>
          </div>

          <div>
            <span style="display: block; font-size: 0.7rem; color: #64748b; font-weight: 600; text-transform: uppercase;">Fecha de Comprobante</span>
            <strong style="font-size: 0.9rem; color: #0f172a;">📅 ${fechaReg}</strong>
          </div>

          <div>
            <span style="display: block; font-size: 0.7rem; color: #64748b; font-weight: 600; text-transform: uppercase;">Cajero / Encargado</span>
            <span style="font-size: 0.85rem; color: #334155; font-weight: 600;">${stateManager.data.cajeroActual || 'Don Manuel'}</span>
          </div>

          <div>
            <span style="display: block; font-size: 0.7rem; color: #64748b; font-weight: 600; text-transform: uppercase;">Estado de Auditoría</span>
            <span style="display: inline-block; background: #f8fafc; color: #334155; border: 1px solid #e2e8f0; padding: 2px 8px; border-radius: 3px; font-size: 0.72rem; font-weight: 600;">🔒 Guardado</span>
          </div>
        </div>

        <div style="margin-top: 12px; background: #f8fafc; border-left: 3px solid #64748b; padding: 8px 12px; font-size: 0.72rem; color: #64748b;">
          Por control de auditoría interna, los renglones guardados quedan protegidos contra alteraciones.
        </div>
      </div>
    `;

    const footer = `
      <button type="button" class="btn-primary" id="btnCerrarDetallesProv" style="background: #1e293b; min-width: 100px;">Cerrar</button>
    `;

    this.open(`📄 Detalle del Proveedor: ${proveedor}`, body, footer);
    document.getElementById('btnCerrarDetallesProv')?.addEventListener('click', () => this.close());
  }

  // ==========================================
  // 16. MODAL: CALENDARIO DE HISTORIAL Y CONSULTA DE DÍAS PASADOS
  // ==========================================
  openCalendarioHistorialModal(fechaActual, onSeleccionarFecha) {
    const hoyStr = stateManager.getFechaHoy();
    let currentFecha = fechaActual || stateManager.data.fecha || hoyStr;
    const parts = currentFecha.split('-');
    let navYear = parseInt(parts[0]) || new Date().getFullYear();
    let navMonth = (parseInt(parts[1]) || (new Date().getMonth() + 1)) - 1;

    const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const formatMoney = (v) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v);

    const renderCalendarioDOM = () => {
      const resumenHistorial = stateManager.getResumenFechasHistorial();
      const primerDiaMes = new Date(navYear, navMonth, 1);
      const ultimoDiaMes = new Date(navYear, navMonth + 1, 0);
      const diasEnMes = ultimoDiaMes.getDate();
      
      let startDayOfWeek = primerDiaMes.getDay();
      startDayOfWeek = (startDayOfWeek === 0 ? 6 : startDayOfWeek - 1);

      const diasSemanaNombres = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

      let celdasHTML = '';

      for (let i = 0; i < startDayOfWeek; i++) {
        celdasHTML += `<div class="cal-celda cal-celda-vacia"></div>`;
      }

      for (let dia = 1; dia <= diasEnMes; dia++) {
        const diaPadded = String(dia).padStart(2, '0');
        const mesPadded = String(navMonth + 1).padStart(2, '0');
        const fechaISO = `${navYear}-${mesPadded}-${diaPadded}`;
        
        const esHoy = fechaISO === hoyStr;
        const esSeleccionado = fechaISO === stateManager.data.fecha;
        const esFuturo = fechaISO > hoyStr;
        
        const hist = resumenHistorial[fechaISO];
        const tieneRegistros = hist && hist.tieneRegistros;

        let badgeHistorial = '';
        if (tieneRegistros) {
          badgeHistorial = `
            <div class="cal-badge-pagado" title="Total Pagado: ${formatMoney(hist.totalPagado)}">
              💵 ${formatMoney(hist.totalPagado)}
            </div>
          `;
        }

        celdasHTML += `
          <div class="cal-celda ${esHoy ? 'cal-es-hoy' : ''} ${esSeleccionado ? 'cal-seleccionado' : ''} ${tieneRegistros ? 'cal-con-historial' : ''} ${esFuturo ? 'cal-futuro' : ''}" 
            data-cal-fecha="${fechaISO}" title="${tieneRegistros ? `Historial: ${formatMoney(hist.totalPagado)} pagados` : (esHoy ? 'Día de Hoy (Editable)' : 'Consultar día')}">
            <div class="cal-celda-header">
              <span class="cal-numero-dia">${dia}</span>
              ${esHoy ? '<span class="cal-tag-hoy">HOY</span>' : ''}
              ${tieneRegistros && !esHoy ? '<span class="cal-punto-historial" title="Día con registros guardados">✓</span>' : ''}
            </div>
            <div class="cal-celda-body">
              ${badgeHistorial}
              ${hist && hist.comprasCount > 0 ? `<span class="cal-sub-count">${hist.comprasCount} notas</span>` : ''}
            </div>
          </div>
        `;
      }

      return `
        <div class="calendario-historial-wrap">
          <div style="background: #f8fafc; border-left: 3px solid #64748b; padding: 10px 14px; border-radius: 4px; margin-bottom: 14px; font-size: 0.76rem; color: #334155;">
            <strong>📅 Historial de Hojas Contables Diarias</strong>
            <p style="margin: 4px 0 0; color: #64748b;">
              Selecciona cualquier fecha para consultar su hoja contable. Solo el día de <em>HOY</em> es editable; las fechas pasadas se abren en modo de solo lectura.
            </p>
          </div>

          <div class="cal-mes-nav">
            <button type="button" class="btn-cal-nav" id="btnCalPrevMes" title="Mes Anterior">◀</button>
            <div class="cal-mes-titulo">
              <strong>${mesesNombres[navMonth]} ${navYear}</strong>
            </div>
            <button type="button" class="btn-cal-nav" id="btnCalNextMes" title="Mes Siguiente">▶</button>
            <button type="button" class="btn-cal-hoy" id="btnCalIrHoy">Ir a Hoy</button>
          </div>

          <div class="cal-grid-dias-semana">
            ${diasSemanaNombres.map(d => `<div class="cal-header-dia">${d}</div>`).join('')}
          </div>

          <div class="cal-grid-celdas">
            ${celdasHTML}
          </div>
        </div>
      `;
    };

    const attachCalListeners = () => {
      document.getElementById('btnCalPrevMes')?.addEventListener('click', () => {
        navMonth--;
        if (navMonth < 0) {
          navMonth = 11;
          navYear--;
        }
        actualizarVista();
      });

      document.getElementById('btnCalNextMes')?.addEventListener('click', () => {
        navMonth++;
        if (navMonth > 11) {
          navMonth = 0;
          navYear++;
        }
        actualizarVista();
      });

      document.getElementById('btnCalIrHoy')?.addEventListener('click', () => {
        this.close();
        if (onSeleccionarFecha) onSeleccionarFecha(hoyStr);
      });

      this.container.querySelectorAll('[data-cal-fecha]').forEach(el => {
        el.addEventListener('click', () => {
          const f = el.getAttribute('data-cal-fecha');
          if (f > hoyStr) {
            alert('Esta es una fecha futura. Solo puedes consultar el historial de días pasados o la hoja de hoy.');
            return;
          }
          this.close();
          if (onSeleccionarFecha) onSeleccionarFecha(f);
        });
      });
    };

    const actualizarVista = () => {
      const bodyEl = this.container.querySelector('.modal-body');
      if (bodyEl) {
        bodyEl.innerHTML = renderCalendarioDOM();
        attachCalListeners();
      }
    };

    this.open('📅 Historial Contable y Calendario de Días', renderCalendarioDOM(), `
      <button type="button" class="btn-secondary" id="btnCerrarModalCal">Cerrar Calendario</button>
    `);

    document.getElementById('btnCerrarModalCal')?.addEventListener('click', () => this.close());
    attachCalListeners();
  }
}

