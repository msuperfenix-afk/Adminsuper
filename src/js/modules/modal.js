/**
 * Módulo de Gestión de Modales y Formularios Dinámicos (AdminFenix)
 */

import { stateManager, CATALOGO_PROVEEDORES_PREDETERMINADOS } from '../state.js';
import { DIAS_SEMANA, CATEGORIAS_PROVEEDOR } from './pipeline.js';
import { inicializarFirebase, getFirebaseConfigActual, isFirebaseConectado } from '../firebaseClient.js';
import { ExportManager } from './exportManager.js';

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
    this.lastFocusedElement = document.activeElement;
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

    // Inicializar autoenfoque y navegación ergonómica de teclado (Enter / Shift+Enter)
    this.setupKeyboardNavigation();
  }

  close() {
    this.overlay.classList.remove('active');
    this.container.innerHTML = '';
    // Restaurar foco al elemento previo si continúa disponible
    if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
      try {
        this.lastFocusedElement.focus();
      } catch (err) {
        // Ignorar si el elemento ya no está en el DOM
      }
    }
  }

  setupKeyboardNavigation() {
    // 1. Posicionar el cursor en el lugar correcto al abrir el modal
    setTimeout(() => {
      if (!this.isOpen()) return;

      // Prioridad 1: Campo con autofocus o data-autofocus
      const conAutofocus = this.container.querySelector('[autofocus], [data-autofocus]');
      if (conAutofocus && typeof conAutofocus.focus === 'function' && !conAutofocus.disabled && !conAutofocus.readOnly) {
        conAutofocus.focus();
        if (typeof conAutofocus.select === 'function' && conAutofocus.type !== 'checkbox' && conAutofocus.type !== 'radio' && conAutofocus.type !== 'date') {
          conAutofocus.select();
        }
        return;
      }

      // Prioridad 2: Primer campo editable visible de tipo input o select
      const campos = this.getCamposEditables();
      if (campos.length > 0) {
        const primerCampo = campos[0];
        primerCampo.focus();
        if (typeof primerCampo.select === 'function' && primerCampo.type !== 'checkbox' && primerCampo.type !== 'radio' && primerCampo.type !== 'date') {
          primerCampo.select();
        }
      }
    }, 60);

    // 2. Navegación fluida con tecla Enter y Shift+Enter entre casillas
    this.container.onkeydown = (e) => {
      if (e.key === 'Enter') {
        const target = e.target;
        if (!target) return;

        // Si se pulsa Enter sobre un botón explícito, dejar actuar el comportamiento natural
        if (target.tagName === 'BUTTON') return;

        // En un textarea permitir salto de línea normal, salvo que se presione con Ctrl
        if (target.tagName === 'TEXTAREA' && !e.ctrlKey) return;

        // Interceptar inputs y selects para avanzar de casilla
        if (target.matches('input, select, textarea')) {
          e.preventDefault();

          const campos = this.getCamposEditables();
          const currentIndex = campos.indexOf(target);

          // Si presiona Shift+Enter: regresar a la casilla anterior
          if (e.shiftKey) {
            if (currentIndex > 0) {
              const prev = campos[currentIndex - 1];
              prev.focus();
              if (typeof prev.select === 'function' && prev.type !== 'checkbox' && prev.type !== 'radio' && prev.type !== 'date') {
                prev.select();
              }
            }
            return;
          }

          // Si hay una siguiente casilla editable: enfocarla y seleccionar su texto
          if (currentIndex >= 0 && currentIndex < campos.length - 1) {
            const next = campos[currentIndex + 1];
            next.focus();
            if (typeof next.select === 'function' && next.type !== 'checkbox' && next.type !== 'radio' && next.type !== 'date') {
              next.select();
            }
          } else {
            // Es la última casilla -> disparar el guardado de datos
            this.triggerPrimaryModalAction();
          }
        }
      }
    };
  }

  getCamposEditables() {
    return Array.from(this.container.querySelectorAll(
      '.modal-body input:not([type="hidden"]):not([disabled]):not([readonly]), .modal-body select:not([disabled]), .modal-body textarea:not([disabled]):not([readonly])'
    )).filter(el => {
      // Filtrar sólo elementos visibles y computados en pantalla
      return el.offsetParent !== null && window.getComputedStyle(el).display !== 'none' && window.getComputedStyle(el).visibility !== 'hidden';
    });
  }

  triggerPrimaryModalAction() {
    // Si hay un recuadro de confirmación de la interfaz visible (ej. sellado de arqueo)
    const btnConfirmar = this.container.querySelector('#btnConfirmarSellarInterfaz');
    if (btnConfirmar && btnConfirmar.offsetParent !== null && !btnConfirmar.disabled) {
      btnConfirmar.click();
      return;
    }

    // Buscar el botón de guardado o acción primaria del modal actual
    const btnGuardar = this.container.querySelector(
      '#btnConfirmarSellarInterfaz, #btnSaveArqCol, #btnGuardarProvSeguro, #btnGuardarCostoPanadero, #btnGuardarCostoTortilleria, #btnGuardarPrestamo, #btnGuardarRetiro, #btnGuardarProveedorDb, #modalSaveBtn, #modalSaveArqueoBtn, #btnGuardarPedidoModal, #btnGuardarListaPedido, #btnGuardarPreventa, #btnGuardarConfigFirebase, .modal-footer .btn-primary, button[type="submit"]'
    );

    if (btnGuardar && !btnGuardar.disabled && btnGuardar.offsetParent !== null) {
      btnGuardar.click();
    }
  }

  // ==========================================
  // 1. MODAL: AGREGAR / EDITAR PROVEEDOR (SEMANAL)
  // ==========================================
  openProveedorModal(proveedor = null, onGuardado = null) {
    const isEdit = !!(proveedor && (proveedor.id || proveedor.proveedor));
    const diaDefault = (proveedor && proveedor.dia) ? proveedor.dia : 'lunes';
    const diaNombre = DIAS_SEMANA.find(d => d.id === diaDefault)?.nombre || diaDefault;
    const title = isEdit ? `Editar Proveedor: ${proveedor.proveedor}` : `Nuevo Proveedor en Agenda (${diaNombre})`;

    const p = {
      dia: diaDefault,
      tipoVisita: 'entrega',
      proveedor: '',
      categoria: 'abarrotes',
      hora: '10:00',
      tipoPago: 'Efectivo',
      presupuestoAprox: '',
      preventaPresupuesto: '',
      costoPreventa: '',
      diaEntregaProgramada: stateManager.getDiaSiguiente(diaDefault),
      compra: '',
      estado: 'programado',
      notas: '',
      ...(proveedor || {})
    };

    // Obtener catálogo maestro de la BD de Proveedores
    const proveedoresBD = stateManager.getProveedoresCatalogo();

    const diasOptions = DIAS_SEMANA.map(d => `<option value="${d.id}" ${p.dia === d.id ? 'selected' : ''}>${d.nombre}</option>`).join('');
    const diasEntregaOptions = DIAS_SEMANA.map(d => `<option value="${d.id}" ${p.diaEntregaProgramada === d.id ? 'selected' : ''}>${d.nombre}</option>`).join('');
    const catsOptions = Object.entries(CATEGORIAS_PROVEEDOR).map(([key, val]) => `<option value="${key}" ${p.categoria === key ? 'selected' : ''}>${val.nombre}</option>`).join('');

    const body = `
      <form id="formProveedor" style="display: flex; flex-direction: column; gap: 14px;">
        
        <!-- SELECTOR DE TIPO DE VISITA (ENTREGA VS PREVENTA) -->
        <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 10px 14px;">
          <label style="display: block; font-weight: 700; font-size: 0.82rem; color: #0f172a; margin-bottom: 6px;">
            Tipo de Visita en este Día *
          </label>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <label style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; border: 1.5px solid ${p.tipoVisita !== 'preventa' ? '#0284c7' : '#cbd5e1'}; background: ${p.tipoVisita !== 'preventa' ? '#f0f9ff' : '#ffffff'}; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 700; color: #0f172a;">
              <input type="radio" name="tipoVisita" value="entrega" ${p.tipoVisita !== 'preventa' ? 'checked' : ''} id="radioTipoEntrega">
              <div>
                <div>Entrega y Cobro</div>
                <div style="font-size: 0.7rem; font-weight: normal; color: #64748b;">Llega camión repartidor, entrega mercancía y cobra en caja</div>
              </div>
            </label>

            <label style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; border: 1.5px solid ${p.tipoVisita === 'preventa' ? '#d97706' : '#cbd5e1'}; background: ${p.tipoVisita === 'preventa' ? '#fffbeb' : '#ffffff'}; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 700; color: #0f172a;">
              <input type="radio" name="tipoVisita" value="preventa" ${p.tipoVisita === 'preventa' ? 'checked' : ''} id="radioTipoPreventa">
              <div>
                <div>Preventa (Toma Pedido)</div>
                <div style="font-size: 0.7rem; font-weight: normal; color: #64748b;">Viene preventista un día antes a levantar la orden para mañana</div>
              </div>
            </label>
          </div>
        </div>

        <!-- BLOQUE 1: PROVEEDOR DESDE LA BASE DE DATOS -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <label class="form-label" style="font-weight: 700; color: #0f172a; margin-bottom: 0;">
              Proveedor / Empresa *
            </label>
            <span style="font-size: 0.72rem; color: #0284c7; font-weight: 600;">
              Base de Datos Proveedores (${proveedoresBD.length})
            </span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            <!-- Selector rápido de la BD -->
            <select id="selectProvAgendaDesdeBD" class="form-control" style="font-size: 0.88rem; font-weight: 600; color: #0369a1; border-color: #7dd3fc; background: #f0f9ff;">
              <option value="">-- Seleccionar de la Base de Datos de Proveedores --</option>
              ${proveedoresBD.map(cp => `
                <option value="${cp.nombre}" 
                  data-cat="${cp.categoria || 'abarrotes'}" 
                  data-pago="${cp.tipoPago || 'Efectivo'}" 
                  data-presupuesto="${cp.presupuestoHabitual || ''}" 
                  data-hora="${cp.horaHabitual || '10:00'}" 
                  data-notas="${cp.notas || ''}"
                  ${cp.nombre === p.proveedor ? 'selected' : ''}>
                  ${cp.nombre} • ${CATEGORIAS_PROVEEDOR[cp.categoria]?.nombre || cp.categoria}
                </option>
              `).join('')}
            </select>

            <!-- Input editable del nombre -->
            <input type="text" class="form-control font-bold" id="inputNombreProvAgenda" name="proveedor" placeholder="O escribe el nombre del proveedor..." value="${p.proveedor}" required style="font-size: 0.95rem;">
            <small style="color: #64748b; font-size: 0.72rem;">* Al seleccionar de la lista se autocompletan categoría, forma de pago y presupuesto.</small>
          </div>
        </div>

        <!-- BLOQUE 2: DÍA DE VISITA Y CATEGORÍA -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-weight: 700;">Día de Visita en Agenda *</label>
            <select class="form-control font-bold" name="dia" id="selectDiaPrincipalAgenda" required>
              ${diasOptions}
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-weight: 700;">Categoría de Producto *</label>
            <select class="form-control" name="categoria" id="selectCatProvAgenda" required>
              ${catsOptions}
            </select>
          </div>
        </div>

        <!-- BLOQUE ESPECÍFICO DE PREVENTA (SI SE MARCA PREVENTA) -->
        <div id="seccionCamposPreventa" style="display: ${p.tipoVisita === 'preventa' ? 'block' : 'none'}; background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 8px; padding: 12px 14px;">
          <div style="font-weight: 700; font-size: 0.85rem; color: #92400e; margin-bottom: 8px;">
            Configuración de Preventa
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-weight: 700; color: #92400e;">Costo Estimado de Preventa ($ MXN)</label>
              <input type="number" step="10" min="0" class="form-control font-bold" id="inputCostoPreventaAgenda" name="costoPreventa" placeholder="0.00" value="${p.costoPreventa || p.presupuestoAprox || ''}" style="font-size: 0.95rem;">
              <small style="color: #78350f; font-size: 0.72rem;">Monto estimado que cobrará en la entrega</small>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-weight: 700; color: #92400e;">Día de Entrega Programada</label>
              <select class="form-control font-bold" name="diaEntregaProgramada" id="selectDiaEntregaProgramada">
                ${diasEntregaOptions}
              </select>
              <small style="color: #78350f; font-size: 0.72rem;">Día en que llegará la mercancía</small>
            </div>
          </div>
        </div>

        <!-- BLOQUE 3: PRESUPUESTO, HORA Y FORMA DE PAGO -->
        <div id="seccionCamposEntrega" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-weight: 700;" id="labelPresupuestoGeneral">Presupuesto Aprox. ($ MXN)</label>
              <input type="number" step="10" min="0" class="form-control font-bold" id="inputPresupuestoProvAgenda" name="presupuestoAprox" placeholder="0.00" value="${p.presupuestoAprox || p.preventaPresupuesto || ''}" style="font-size: 0.95rem;">
              <small style="color: #64748b; font-size: 0.72rem;">Estimado a pagar al proveedor</small>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-weight: 700;">Hora Estimada de Llegada</label>
              <input type="time" class="form-control" id="inputHoraProvAgenda" name="hora" value="${p.hora || '10:00'}">
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-weight: 700; margin-bottom: 6px;">Forma de Pago *</label>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 6px 12px; border: 1.5px solid #cbd5e1; border-radius: 6px; font-weight: 600; font-size: 0.84rem; background: #f8fafc;">
                <input type="radio" name="tipoPago" value="Efectivo" ${(!p.tipoPago || p.tipoPago.toLowerCase().includes('efectivo')) ? 'checked' : ''}>
                <span>Efectivo de Caja</span>
              </label>
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 6px 12px; border: 1.5px solid #cbd5e1; border-radius: 6px; font-weight: 600; font-size: 0.84rem; background: #f8fafc;">
                <input type="radio" name="tipoPago" value="Transferencia" ${(p.tipoPago && p.tipoPago.toLowerCase().includes('transferencia')) ? 'checked' : ''}>
                <span>Transferencia Bancaria</span>
              </label>
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 6px 12px; border: 1.5px solid #cbd5e1; border-radius: 6px; font-weight: 600; font-size: 0.84rem; background: #f8fafc;">
                <input type="radio" name="tipoPago" value="Cheque" ${(p.tipoPago && p.tipoPago.toLowerCase().includes('cheque')) ? 'checked' : ''}>
                <span>Cheque / Otro</span>
              </label>
            </div>
          </div>
        </div>

        <!-- BLOQUE FRECUENCIA MÚLTIPLE (HASTA 3 VECES POR SEMANA) -->
        ${!isEdit ? `
          <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 10px 14px;">
            <div style="font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 4px;">
              Frecuencia múltiple (proveedores que vienen 2 o 3 veces por semana)
            </div>
            <p style="font-size: 0.72rem; color: #64748b; margin: 0 0 8px 0;">
              Si este proveedor visita varios días a la semana, marca los días adicionales y se agendarán juntos:
            </p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              ${DIAS_SEMANA.map(d => `
                <label style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.78rem; font-weight: 600; background: #ffffff; border: 1px solid #cbd5e1; padding: 3px 8px; border-radius: 4px; cursor: pointer;">
                  <input type="checkbox" name="diasMultiples" value="${d.id}" class="check-dia-multiple" ${d.id === diaDefault ? 'disabled title="Día principal ya seleccionado"' : ''}>
                  <span>${d.corto}</span>
                </label>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- BLOQUE 4: OBSERVACIONES -->
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label" style="font-weight: 600; font-size: 0.82rem; color: #475569;">Observaciones / Instrucciones de Entrega</label>
          <input type="text" class="form-control" id="inputNotasProvAgenda" name="notas" placeholder="Ej. Tener envases vacíos listos, llega por la mañana, etc." value="${p.notas || ''}" style="font-size: 0.86rem;">
        </div>
      </form>
    `;

    const footer = `
      <button type="button" class="btn-secondary" id="modalCancelBtn">Cancelar</button>
      <button type="button" class="btn-primary" id="modalSaveProvBtn">${isEdit ? 'Guardar Cambios' : 'Agregar a la Agenda'}</button>
    `;

    this.open(title, body, footer);

    // Conectar reactividad entre Entrega y Preventa
    const radioEntrega = document.getElementById('radioTipoEntrega');
    const radioPreventa = document.getElementById('radioTipoPreventa');
    const seccionPreventa = document.getElementById('seccionCamposPreventa');
    const selectDiaPrincipal = document.getElementById('selectDiaPrincipalAgenda');
    const selectDiaEntrega = document.getElementById('selectDiaEntregaProgramada');

    const actualizarVistaTipo = () => {
      const esPrev = radioPreventa?.checked;
      if (seccionPreventa) {
        seccionPreventa.style.display = esPrev ? 'block' : 'none';
      }
    };

    radioEntrega?.addEventListener('change', actualizarVistaTipo);
    radioPreventa?.addEventListener('change', actualizarVistaTipo);

    // Actualizar día de entrega automático si cambia el día principal
    selectDiaPrincipal?.addEventListener('change', (e) => {
      const nuevoDia = e.target.value;
      if (selectDiaEntrega) {
        selectDiaEntrega.value = stateManager.getDiaSiguiente(nuevoDia);
      }
    });

    // Conectar autocompletado en vivo al seleccionar proveedor de la BD
    const selectBD = document.getElementById('selectProvAgendaDesdeBD');
    const inputNombre = document.getElementById('inputNombreProvAgenda');
    const selectCat = document.getElementById('selectCatProvAgenda');
    const inputPresupuesto = document.getElementById('inputPresupuestoProvAgenda');
    const inputCostoPrev = document.getElementById('inputCostoPreventaAgenda');
    const inputHora = document.getElementById('inputHoraProvAgenda');
    const inputNotas = document.getElementById('inputNotasProvAgenda');

    selectBD?.addEventListener('change', (e) => {
      const selectedOption = e.target.selectedOptions?.[0];
      if (!selectedOption || !selectedOption.value) return;

      const nombre = selectedOption.value;
      const cat = selectedOption.getAttribute('data-cat');
      const pago = selectedOption.getAttribute('data-pago');
      const presupuesto = selectedOption.getAttribute('data-presupuesto');
      const hora = selectedOption.getAttribute('data-hora');
      const notas = selectedOption.getAttribute('data-notas');

      if (inputNombre) inputNombre.value = nombre;
      if (selectCat && cat) selectCat.value = cat;
      if (inputPresupuesto && presupuesto) inputPresupuesto.value = presupuesto;
      if (inputCostoPrev && presupuesto) inputCostoPrev.value = presupuesto;
      if (inputHora && hora) inputHora.value = hora;
      if (inputNotas && notas && !inputNotas.value) inputNotas.value = notas;

      // Autocompletar radio de forma de pago
      if (pago) {
        const esTransf = pago.toLowerCase().includes('transferencia');
        const esCheque = pago.toLowerCase().includes('cheque');
        const radios = document.querySelectorAll('input[name="tipoPago"]');
        radios.forEach(r => {
          if (esTransf && r.value === 'Transferencia') r.checked = true;
          else if (esCheque && r.value === 'Cheque') r.checked = true;
          else if (!esTransf && !esCheque && r.value === 'Efectivo') r.checked = true;
        });
      }
    });

    document.getElementById('modalCancelBtn')?.addEventListener('click', () => this.close());
    document.getElementById('modalSaveProvBtn')?.addEventListener('click', () => {
      const form = document.getElementById('formProveedor');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const formData = new FormData(form);
      const tipoVisita = formData.get('tipoVisita') || 'entrega';
      const diaPrincipal = formData.get('dia');
      const costoPrev = parseFloat(formData.get('costoPreventa')) || 0;
      const presupAprox = parseFloat(formData.get('presupuestoAprox')) || (tipoVisita === 'preventa' ? costoPrev : 0);

      const datos = {
        dia: diaPrincipal,
        tipoVisita: tipoVisita,
        categoria: formData.get('categoria'),
        proveedor: formData.get('proveedor').trim(),
        hora: formData.get('hora') || '10:00',
        tipoPago: formData.get('tipoPago') || 'Efectivo',
        presupuestoAprox: presupAprox,
        preventaPresupuesto: presupAprox,
        costoPreventa: costoPrev,
        diaEntregaProgramada: formData.get('diaEntregaProgramada') || stateManager.getDiaSiguiente(diaPrincipal),
        compra: parseFloat(p.compra) || 0,
        estado: p.estado || 'programado',
        notas: formData.get('notas')?.trim() || ''
      };

      if (isEdit) {
        stateManager.updateProveedor(proveedor.id, datos);
      } else {
        // Revisar si seleccionó días múltiples adicionales
        const diasExtras = Array.from(document.querySelectorAll('.check-dia-multiple:checked')).map(cb => cb.value);
        if (diasExtras.length > 0) {
          stateManager.addProveedorMultiplesDias({
            dias: [diaPrincipal, ...diasExtras],
            ...datos
          });
        } else {
          stateManager.addProveedor(datos);
        }
      }

      this.close();
      if (onGuardado) onGuardado();
    });
  }

  // ==========================================
  // MODAL: REGISTRAR "VINO PREVENTA", COSTO DE VENTA Y AGENDAR ENTREGA
  // ==========================================
  openVinoPreventaModal(proveedor, onGuardado = null) {
    if (!proveedor) return;
    const p = proveedor;
    const diaActual = p.dia || 'lunes';
    const diaSiguiente = p.diaEntregaProgramada || stateManager.getDiaSiguiente(diaActual);
    const horaActual = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
    const fmt = (v) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v || 0);

    const diasEntregaOptions = DIAS_SEMANA.map(d => `<option value="${d.id}" ${d.id === diaSiguiente ? 'selected' : ''}>${d.nombre} (Entrega)</option>`).join('');

    const body = `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div style="background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 8px; padding: 12px 14px;">
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <div>
              <span style="font-size: 0.7rem; font-weight: 800; background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px;">LEVANTAMIENTO DE PREVENTA</span>
              <h3 style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin: 4px 0 0;">${p.proveedor}</h3>
            </div>
            <div style="text-align: right; font-size: 0.78rem; color: #475569;">
              Visita Preventa: <strong style="text-transform: capitalize; color: #0f172a;">${p.dia}</strong>
            </div>
          </div>
          <p style="margin: 6px 0 0; font-size: 0.75rem; color: #78350f;">
            Registra la llegada del preventista y el <strong>costo de la orden acordada</strong> para generar de inmediato la entrega en la agenda con ese presupuesto.
          </p>
        </div>

        <!-- FORMULARIO DE CAPTURA RÁPIDA -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px;">
          <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 12px; margin-bottom: 12px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-weight: 700; color: #0f172a;">Hora en que Vino</label>
              <input type="time" class="form-control font-bold" id="inputHoraVinoPrev" value="${p.horaVinoPreventa || horaActual}">
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-weight: 700; color: #0f172a;">Costo de Venta / Pedido ($ MXN) *</label>
              <input type="number" step="10" min="0" class="form-control font-bold" id="inputCostoVinoPrev" placeholder="0.00" value="${p.costoPreventa || p.presupuestoAprox || ''}" style="font-size: 1rem; color: #047857;" autofocus required>
              <small style="color: #64748b; font-size: 0.72rem;">Monto a pagar en caja en la entrega</small>
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 12px;">
            <label class="form-label" style="font-weight: 700; color: #0f172a;">Día en que se Realizará la Entrega</label>
            <select class="form-control font-bold" id="selectDiaEntregaPrev">
              ${diasEntregaOptions}
            </select>
          </div>

          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 10px 12px;">
            <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer; font-size: 0.82rem; font-weight: 700; color: #166534; margin: 0;">
              <input type="checkbox" id="checkAgendarEntregaAuto" checked style="margin-top: 3px;">
              <div>
                <div>Agendar entrega automáticamente para ese día</div>
                <div style="font-weight: normal; font-size: 0.72rem; color: #15803d; margin-top: 2px;">
                  Crea en la agenda del día siguiente el registro de entrega con este costo exacto y la lista de pedido para el cajero.
                </div>
              </div>
            </label>
          </div>
        </div>

        <!-- NOTAS DE LA PREVENTA -->
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label" style="font-size: 0.8rem; color: #475569;">Notas de la Preventa / Variedad Pedida</label>
          <input type="text" class="form-control" id="inputNotasVinoPrev" value="${p.notas || ''}" placeholder="Ej. Pedido acordado con preventista, pedir factura, etc." style="font-size: 0.85rem;">
        </div>
      </div>
    `;

    const footer = `
      <button type="button" class="btn-secondary" id="btnCancelarVinoPrev">Cancelar</button>
      <button type="button" class="btn-primary" id="btnGuardarVinoPrev" style="min-width: 170px;">
        Guardar Preventa y Agendar
      </button>
    `;

    this.open(`Registrar Preventa: ${p.proveedor}`, body, footer);

    document.getElementById('btnCancelarVinoPrev')?.addEventListener('click', () => this.close());
    document.getElementById('btnGuardarVinoPrev')?.addEventListener('click', () => {
      const hora = document.getElementById('inputHoraVinoPrev')?.value || horaActual;
      const costo = parseFloat(document.getElementById('inputCostoVinoPrev')?.value) || 0;
      const diaEntrega = document.getElementById('selectDiaEntregaPrev')?.value || diaSiguiente;
      const agendarAuto = !!document.getElementById('checkAgendarEntregaAuto')?.checked;
      const notas = document.getElementById('inputNotasVinoPrev')?.value.trim() || '';

      stateManager.updateProveedor(p.id, { notas });
      stateManager.registrarVinoPreventa(p.id, {
        hora,
        costoPreventa: costo,
        diaEntrega,
        agendarEntregaAuto: agendarAuto
      });

      this.close();
      if (onGuardado) onGuardado();
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

    this.open('Registrar Pago a Proveedor', body, footer);

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

    this.open('Conteo y Registro de Panaderos', body, footer);

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

    this.open('Conteo y Registro de Tortillería', body, footer);

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

    this.open('Nuevo Corte y Arqueo de Caja', body, footer);

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
  // MODAL: CAPTURA DE CORTE Y ARQUEO POR COLUMNA (HOJA DIARIA)
  // ==========================================
  openCapturaArqueoColumnaModal(colIndex, onGuardado = null) {
    if (!stateManager.data.arqueoColumnas || !stateManager.data.arqueoColumnas[colIndex]) return;
    const col = stateManager.data.arqueoColumnas[colIndex];
    const colNombre = col.nombre || `Cantidad ${colIndex + 1}`;
    const estaBloqueado = !!col.bloqueado;
    const fmt = (v) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(parseFloat(v) || 0);

    if (estaBloqueado) {
      // MODO SOLO LECTURA: EL ARQUEO YA FUE GUARDADO Y CERRADO
      const body = `
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 8px; padding: 12px 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.72rem; font-weight: 800; background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px;">
                ✓ ARQUEO GUARDADO Y CERRADO
              </span>
              <span style="font-size: 0.75rem; color: #166534; font-weight: 700;">
                ⏰ ${col.horaCierre || 'Registrado'}
              </span>
            </div>
            <p style="margin: 6px 0 0; font-size: 0.76rem; color: #15803d;">
              Este arqueo ya fue completado y guardado. Los valores contables se encuentran protegidos contra alteraciones.
            </p>
          </div>

          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.86rem;">
              <tbody>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 9px 12px; font-weight: 700; color: #0f172a;">TARJETAS</td>
                  <td style="padding: 9px 12px; text-align: right; font-weight: 700;">${fmt(col.tarjetas)}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9; background: #fafafa;">
                  <td style="padding: 9px 12px; font-weight: 700; color: #0f172a;">TARJETA YOMP</td>
                  <td style="padding: 9px 12px; text-align: right; font-weight: 700;">${fmt(col.tarjetaYomp)}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 9px 12px; font-weight: 700; color: #0f172a;">SISTEMA (POS)</td>
                  <td style="padding: 9px 12px; text-align: right; font-weight: 700;">${fmt(col.sistema)}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9; background: #fafafa;">
                  <td style="padding: 9px 12px; font-weight: 700; color: #0f172a;">BILLETES</td>
                  <td style="padding: 9px 12px; text-align: right; font-weight: 700;">${fmt(col.billetes)}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 7px 12px; color: #475569;">MON. 1 ($ en monedas)</td>
                  <td style="padding: 7px 12px; text-align: right;">${fmt(col.mon1)}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9; background: #fafafa;">
                  <td style="padding: 7px 12px; color: #475569;">MON. 2 ($ en monedas)</td>
                  <td style="padding: 7px 12px; text-align: right;">${fmt(col.mon2)}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 7px 12px; color: #475569;">MON. 5 ($ en monedas)</td>
                  <td style="padding: 7px 12px; text-align: right;">${fmt(col.mon5)}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9; background: #fafafa;">
                  <td style="padding: 7px 12px; color: #475569;">MON. 10 ($ en monedas)</td>
                  <td style="padding: 7px 12px; text-align: right;">${fmt(col.mon10)}</td>
                </tr>
                <tr style="background: #f8fafc; font-weight: 800;">
                  <td style="padding: 10px 12px; color: #0f172a;">MORRALLA</td>
                  <td style="padding: 10px 12px; text-align: right; color: #0f172a; font-size: 0.95rem;">${fmt(col.morralla)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;

      const footer = `
        <button type="button" class="btn-primary" id="btnCerrarModalArqBloq" style="min-width: 110px;">Cerrar</button>
      `;

      this.open(`Arqueo Cerrado: ${colNombre}`, body, footer);
      document.getElementById('btnCerrarModalArqBloq')?.addEventListener('click', () => this.close());
      return;
    }

    // MODO EDICIÓN / CAPTURA: RECUADRO CON LA PROPIA INTERFAZ (SIN ALERTAS NEGRAS DEL SISTEMA)
    const body = `
      <form id="formCapturaArqueoCol" style="display: flex; flex-direction: column; gap: 14px;">
        <div style="background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 8px; padding: 10px 14px; font-size: 0.8rem; color: #1e3a8a;">
          <strong>Captura de Arqueo y Corte: ${colNombre}</strong>
          <p style="margin: 3px 0 0; color: #475569; font-size: 0.74rem;">
            Ingresa las cantidades de cada concepto solicitado. Al guardar, el arqueo se sellará y ya no se podrá modificar.
          </p>
        </div>

        <!-- TARJETAS Y SISTEMA -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-weight: 700; color: #0f172a;">TARJETAS ($ MXN)</label>
              <input type="number" step="0.5" class="form-control font-bold" id="inpColTarjetas" placeholder="0.00" value="${col.tarjetas || ''}" style="font-size: 0.95rem;">
              <small style="color: #64748b; font-size: 0.72rem;">Terminal bancaria</small>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-weight: 700; color: #0f172a;">TARJETA YOMP ($ MXN)</label>
              <input type="number" step="0.5" class="form-control font-bold" id="inpColTarjetaYomp" placeholder="0.00" value="${col.tarjetaYomp || ''}" style="font-size: 0.95rem; border-color: #93c5fd;">
              <small style="color: #64748b; font-size: 0.72rem;">Terminal / cobros Yomp</small>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-weight: 700; color: #0f172a;">SISTEMA (POS) ($ MXN)</label>
              <input type="number" step="0.5" class="form-control font-bold" id="inpColSistema" placeholder="0.00" value="${col.sistema || ''}" style="font-size: 0.95rem;">
              <small style="color: #64748b; font-size: 0.72rem;">Venta registrada en software</small>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-weight: 700; color: #0f172a;">BILLETES EN CAJA ($ MXN)</label>
              <input type="number" step="10" class="form-control font-bold" id="inpColBilletes" placeholder="0.00" value="${col.billetes || ''}" style="font-size: 0.95rem;">
              <small style="color: #64748b; font-size: 0.72rem;">Total acumulado en billetes</small>
            </div>
          </div>
        </div>

        <!-- CONTEO DE MONEDAS (CANTIDAD TOTAL EN PESOS) -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px;">
          <div style="font-weight: 700; font-size: 0.84rem; color: #0f172a; margin-bottom: 8px;">
            MONEDAS (Monto total en pesos)
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-weight: 600; font-size: 0.8rem;">MON. 1 ($ en monedas)</label>
              <input type="number" step="1" min="0" class="form-control calc-mon-col" id="inpColMon1" placeholder="0.00" value="${col.mon1 || ''}">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-weight: 600; font-size: 0.8rem;">MON. 2 ($ en monedas)</label>
              <input type="number" step="1" min="0" class="form-control calc-mon-col" id="inpColMon2" placeholder="0.00" value="${col.mon2 || ''}">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-weight: 600; font-size: 0.8rem;">MON. 5 ($ en monedas)</label>
              <input type="number" step="1" min="0" class="form-control calc-mon-col" id="inpColMon5" placeholder="0.00" value="${col.mon5 || ''}">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-weight: 600; font-size: 0.8rem;">MON. 10 ($ en monedas)</label>
              <input type="number" step="1" min="0" class="form-control calc-mon-col" id="inpColMon10" placeholder="0.00" value="${col.mon10 || ''}">
            </div>
          </div>

          <!-- APARTADO INDEPENDIENTE: MORRALLA -->
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-weight: 700; font-size: 0.85rem; color: #0f172a;">MORRALLA ($ MXN)</label>
            <input type="number" step="0.5" min="0" class="form-control font-bold" id="inpColMorralla" placeholder="0.00" value="${col.morralla || ''}" style="font-size: 0.95rem; color: #0284c7;">
            <small style="color: #64748b; font-size: 0.72rem;">Apartado independiente de morralla</small>
          </div>
        </div>

        <!-- RECUADRO DE CONFIRMACIÓN CON EL DISEÑO DE LA INTERFAZ (SIN CUADROS NEGROS DE SISTEMA) -->
        <div id="recuadroConfirmacionInterfaz" style="display: none; background: #f8fafc; border: 1.5px solid #94a3b8; border-radius: 8px; padding: 14px 16px; margin-top: 4px;">
          <div style="display: flex; align-items: flex-start; gap: 10px;">
            <div style="font-size: 0.8rem; font-weight: 800; background: #e2e8f0; padding: 3px 6px; border-radius: 4px;">CONFIRMAR</div>
            <div style="flex: 1;">
              <div style="font-weight: 700; font-size: 0.88rem; color: #0f172a;">
                ¿Deseas confirmar y sellar el arqueo de ${colNombre}?
              </div>
              <p style="margin: 4px 0 12px 0; font-size: 0.77rem; color: #475569; line-height: 1.4;">
                Una vez guardado, los importes quedarán registrados contablemente y ya no se podrán modificar.
              </p>
              <div style="display: flex; gap: 8px; justify-content: flex-end;">
                <button type="button" class="btn-secondary" id="btnVolverAEditar" style="padding: 6px 14px; font-size: 0.8rem;">
                  Volver a revisar
                </button>
                <button type="button" class="btn-primary" id="btnConfirmarSellarInterfaz" style="padding: 6px 16px; font-size: 0.8rem; background: #0284c7; border-color: #0284c7;">
                  ✓ Sí, Guardar y Sellar
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    `;

    const footer = `
      <div id="footerBotonesNormales" style="display: flex; gap: 8px; width: 100%; justify-content: flex-end;">
        <button type="button" class="btn-secondary" id="btnCancelArqCol">Cancelar</button>
        <button type="button" class="btn-primary" id="btnSaveArqCol" style="min-width: 170px;">
          ✓ Guardar Arqueo
        </button>
      </div>
    `;

    this.open(`Arqueo y Corte: ${colNombre}`, body, footer);

    const inpM1 = document.getElementById('inpColMon1');
    const inpM2 = document.getElementById('inpColMon2');
    const inpM5 = document.getElementById('inpColMon5');
    const inpM10 = document.getElementById('inpColMon10');
    const inpMorralla = document.getElementById('inpColMorralla');

    document.getElementById('btnCancelArqCol')?.addEventListener('click', () => this.close());
    
    // Al presionar Guardar, desplegamos el recuadro con la interfaz en lugar del confirm del sistema
    document.getElementById('btnSaveArqCol')?.addEventListener('click', () => {
      const boxConfirm = document.getElementById('recuadroConfirmacionInterfaz');
      const footerBtns = document.getElementById('footerBotonesNormales');
      if (boxConfirm) {
        boxConfirm.style.display = 'block';
        boxConfirm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setTimeout(() => {
          document.getElementById('btnConfirmarSellarInterfaz')?.focus();
        }, 60);
      }
      if (footerBtns) {
        footerBtns.style.display = 'none';
      }
    });

    document.getElementById('btnVolverAEditar')?.addEventListener('click', () => {
      const boxConfirm = document.getElementById('recuadroConfirmacionInterfaz');
      const footerBtns = document.getElementById('footerBotonesNormales');
      if (boxConfirm) boxConfirm.style.display = 'none';
      if (footerBtns) footerBtns.style.display = 'flex';
      setTimeout(() => {
        inpMorralla?.focus();
        inpMorralla?.select();
      }, 60);
    });

    document.getElementById('btnConfirmarSellarInterfaz')?.addEventListener('click', () => {
      const datos = {
        tarjetas: parseFloat(document.getElementById('inpColTarjetas')?.value) || 0,
        tarjetaYomp: parseFloat(document.getElementById('inpColTarjetaYomp')?.value) || 0,
        sistema: parseFloat(document.getElementById('inpColSistema')?.value) || 0,
        billetes: parseFloat(document.getElementById('inpColBilletes')?.value) || 0,
        mon1: parseFloat(inpM1?.value) || 0,
        mon2: parseFloat(inpM2?.value) || 0,
        mon5: parseFloat(inpM5?.value) || 0,
        mon10: parseFloat(inpM10?.value) || 0,
        morralla: parseFloat(inpMorralla?.value) || 0
      };

      stateManager.guardarArqueoColumnaSeguro(colIndex, datos, true);
      this.close();
      if (onGuardado) onGuardado();
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

    this.open('Registrar Retiro de Efectivo', body, footer);

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

    this.open('Recaudación de Tragamonedas y Peluches', body, footer);

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
      <button type="button" class="btn-primary" id="btnImprimirTicketWindow">Imprimir Ticket</button>
    `;

    this.open('Vista Previa de Ticket de Arqueo', body, footer);

    document.getElementById('modalCancelBtn')?.addEventListener('click', () => this.close());
    document.getElementById('btnImprimirTicketWindow')?.addEventListener('click', () => {
      window.print();
    });
  }

  // ==========================================
  // 10. MODAL: GUARDADO, EXPORTACIÓN Y RESPALDO (FILTRADO POR PERÍODO)
  // ==========================================
  openBackupModal() {
    const hoyStr = stateManager.getFechaHoy();
    const [anoActual, mesActual] = hoyStr.split('-');

    const body = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <!-- Cabecera Informativa Sobria -->
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 14px;">
          <div style="font-weight: 700; font-size: 0.9rem; color: #0f172a;">Exportación y Respaldo de Datos</div>
          <p style="margin: 4px 0 0; font-size: 0.76rem; color: #475569; line-height: 1.4;">
            Selecciona el período a consultar y exportar. La descarga se procesa internamente para evitar sobrecargas del sistema.
          </p>
        </div>

        <!-- Filtro por Período -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px;">
          <label style="display: block; font-weight: 700; font-size: 0.82rem; color: #0f172a; margin-bottom: 8px;">
            Período de Exportación:
          </label>

          <div style="display: flex; gap: 16px; margin-bottom: 12px;">
            <label style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem; color: #334155; cursor: pointer;">
              <input type="radio" name="tipoPeriodoExport" id="radioExportDia" value="dia" checked>
              <span>Día Específico</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem; color: #334155; cursor: pointer;">
              <input type="radio" name="tipoPeriodoExport" id="radioExportMes" value="mes">
              <span>Mes Completo</span>
            </label>
          </div>

          <!-- Selector Día -->
          <div id="contenedorFiltroDia" style="margin-bottom: 4px;">
            <label class="form-label" style="font-size: 0.78rem; font-weight: 600; color: #475569;">Fecha a exportar:</label>
            <input type="date" id="inputExportFecha" class="form-control" value="${hoyStr}" style="max-width: 240px; font-size: 0.85rem;">
          </div>

          <!-- Selector Mes (Oculto por default) -->
          <div id="contenedorFiltroMes" style="display: none; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 4px;">
            <div>
              <label class="form-label" style="font-size: 0.78rem; font-weight: 600; color: #475569;">Mes:</label>
              <select id="selectExportMes" class="form-control" style="font-size: 0.85rem;">
                <option value="1" ${mesActual === '01' ? 'selected' : ''}>Enero</option>
                <option value="2" ${mesActual === '02' ? 'selected' : ''}>Febrero</option>
                <option value="3" ${mesActual === '03' ? 'selected' : ''}>Marzo</option>
                <option value="4" ${mesActual === '04' ? 'selected' : ''}>Abril</option>
                <option value="5" ${mesActual === '05' ? 'selected' : ''}>Mayo</option>
                <option value="6" ${mesActual === '06' ? 'selected' : ''}>Junio</option>
                <option value="7" ${mesActual === '07' ? 'selected' : ''}>Julio</option>
                <option value="8" ${mesActual === '08' ? 'selected' : ''}>Agosto</option>
                <option value="9" ${mesActual === '09' ? 'selected' : ''}>Septiembre</option>
                <option value="10" ${mesActual === '10' ? 'selected' : ''}>Octubre</option>
                <option value="11" ${mesActual === '11' ? 'selected' : ''}>Noviembre</option>
                <option value="12" ${mesActual === '12' ? 'selected' : ''}>Diciembre</option>
              </select>
            </div>
            <div>
              <label class="form-label" style="font-size: 0.78rem; font-weight: 600; color: #475569;">Año:</label>
              <input type="number" id="inputExportAno" class="form-control" value="${anoActual}" min="2024" max="2035" style="font-size: 0.85rem;">
            </div>
          </div>
        </div>

        <!-- Botones de Descarga y Exportación Directa -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px;">
          <label style="display: block; font-weight: 700; font-size: 0.82rem; color: #0f172a; margin-bottom: 10px;">
            Opciones de Descarga:
          </label>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px;">
            <button type="button" class="btn-primary" id="btnDescargarJSONFiltrado" style="background: #0284c7; border: none; font-size: 0.82rem; padding: 9px 12px; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span>Descargar Archivo JSON</span>
            </button>
            <button type="button" class="btn-primary" id="btnDescargarExcelFiltrado" style="background: #16a34a; border: none; font-size: 0.82rem; padding: 9px 12px; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span>Exportar a Excel (.csv)</span>
            </button>
            <button type="button" class="btn-primary" id="btnExportarPDFFiltrado" style="background: #475569; border: none; font-size: 0.82rem; padding: 9px 12px; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span>Imprimir / Guardar PDF</span>
            </button>
          </div>
        </div>

        <!-- Sección de Restauración de Respaldo -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 700; font-size: 0.82rem; color: #334155;">Restauración de Base de Datos</span>
            <button type="button" id="btnToggleRestaurar" class="btn-secondary" style="font-size: 0.72rem; padding: 3px 8px;">
              Opciones de Restauración
            </button>
          </div>

          <div id="cajaOpcionesRestaurar" style="display: none; margin-top: 12px; border-top: 1px solid #cbd5e1; padding-top: 12px;">
            <p style="font-size: 0.74rem; color: #64748b; margin: 0 0 10px 0;">
              Sube un archivo de respaldo JSON generado previamente para restablecer el sistema.
            </p>
            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
              <input type="file" id="inputFileBackup" accept=".json" style="font-size: 0.78rem;">
              <button type="button" class="btn-primary" id="btnSubirArchivoJSON" style="font-size: 0.78rem; padding: 6px 12px; background: #2563eb;">
                Cargar Archivo
              </button>
              <button type="button" class="btn-secondary" id="btnLimpiarHojasProduccion" style="color: #dc2626; font-size: 0.78rem; margin-left: auto;">
                Limpiar Hojas (Iniciar en Vivo)
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    const footer = `
      <button type="button" class="btn-secondary" id="modalCancelBtn">Cerrar</button>
    `;

    this.open('Gestión y Exportación de Datos', body, footer);

    document.getElementById('modalCancelBtn')?.addEventListener('click', () => this.close());

    // Conmutador Día / Mes
    const rDia = document.getElementById('radioExportDia');
    const rMes = document.getElementById('radioExportMes');
    const cDia = document.getElementById('contenedorFiltroDia');
    const cMes = document.getElementById('contenedorFiltroMes');

    rDia?.addEventListener('change', () => {
      if (cDia) cDia.style.display = 'block';
      if (cMes) cMes.style.display = 'none';
    });

    rMes?.addEventListener('change', () => {
      if (cDia) cDia.style.display = 'none';
      if (cMes) cMes.style.display = 'grid';
    });

    // Helper para obtener parámetros activos
    const getParametrosActivos = () => {
      const tipo = rMes?.checked ? 'mes' : 'dia';
      const fecha = document.getElementById('inputExportFecha')?.value || hoyStr;
      const ano = document.getElementById('inputExportAno')?.value || anoActual;
      const mes = document.getElementById('selectExportMes')?.value || mesActual;
      return { tipo, fecha, ano, mes };
    };

    // 1. Descarga directa de JSON
    document.getElementById('btnDescargarJSONFiltrado')?.addEventListener('click', () => {
      const { tipo, fecha, ano, mes } = getParametrosActivos();
      ExportManager.exportarJSON(tipo, fecha, ano, mes);
    });

    // 2. Exportación a Excel (.csv)
    document.getElementById('btnDescargarExcelFiltrado')?.addEventListener('click', () => {
      const { tipo, fecha, ano, mes } = getParametrosActivos();
      ExportManager.exportarExcel(tipo, fecha, ano, mes);
    });

    // 3. Exportación a PDF / Vista de Impresión
    document.getElementById('btnExportarPDFFiltrado')?.addEventListener('click', () => {
      const { tipo, fecha, ano, mes } = getParametrosActivos();
      ExportManager.exportarPDF(tipo, fecha, ano, mes);
    });

    // Toggle de sección de restauración
    const btnToggle = document.getElementById('btnToggleRestaurar');
    const boxRestaurar = document.getElementById('cajaOpcionesRestaurar');
    btnToggle?.addEventListener('click', () => {
      if (boxRestaurar) {
        boxRestaurar.style.display = boxRestaurar.style.display === 'none' ? 'block' : 'none';
      }
    });

    // Restaurar desde archivo
    document.getElementById('btnSubirArchivoJSON')?.addEventListener('click', () => {
      const fileInput = document.getElementById('inputFileBackup');
      const file = fileInput?.files?.[0];
      if (!file) {
        alert('Por favor selecciona un archivo JSON de respaldo.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          const ok = stateManager.importarJSON(content);
          if (ok) {
            alert('¡Base de datos restaurada correctamente!');
            this.close();
          } else {
            alert('El archivo no contiene un formato de respaldo válido de AdminFénix.');
          }
        } catch (err) {
          alert('Error al leer el archivo JSON: ' + err.message);
        }
      };
      reader.readAsText(file);
    });

    const handleLimpiarHojas = () => {
      if (confirm('¿Vaciar los datos de las hojas diarias para iniciar la operación en limpio?\n\nNota: Tu catálogo de proveedores, agenda semanal y calendario se mantendrán intactos.')) {
        stateManager.limpiarHojasDiariasProduccion();
        alert('¡Hojas diarias vaciadas correctamente! El sistema está listo para la operación en vivo.');
        this.close();
      }
    };
    document.getElementById('btnLimpiarHojasProduccion')?.addEventListener('click', handleLimpiarHojas);
    document.getElementById('btnResetSeed')?.addEventListener('click', handleLimpiarHojas);
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
              ${conectado ? 'Cloud Firestore Conectado' : 'Firebase No Conectado'}
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
      <button type="button" class="btn-primary" id="btnGuardarFirebase" style="background: #1e3a8a;">Conectar y Guardar</button>
    `;

    this.open('Conectar Firebase Cloud Firestore', body, footer);

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

    // Obtener proveedores únicos combinando el catálogo maestro y los ya registrados
    const catalogo = Array.from(new Set([
      ...stateManager.getProveedoresCatalogo().map(p => p.nombre).filter(Boolean),
      ...CATALOGO_PROVEEDORES_PREDETERMINADOS,
      ...stateManager.data.proveedores.map(p => p.proveedor).filter(Boolean),
      ...stateManager.data.comprasProveedores.map(p => p.proveedor).filter(Boolean)
    ])).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

    const body = `
      <form id="formCapturaProveedorSeguro">
        <div style="background: #eff6ff; border: 1.5px solid #bfdbfe; padding: 10px 14px; border-radius: 6px; margin-bottom: 16px; font-size: 0.8rem; color: #1e3a8a;">
          <strong>Registro Contable Protegido (Nota #${numNota})</strong>
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
              <span>Efectivo</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; font-weight: 700; cursor: pointer; background: #f8fafc; padding: 6px 12px; border: 1.5px solid #cbd5e1; border-radius: 4px;">
              <input type="radio" name="modalTipoPago" value="Transferencia" ${tipoPago === 'Transferencia' ? 'checked' : ''}>
              <span>Transferencia</span>
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
      <button type="button" class="btn-primary" id="btnGuardarProvSeguro" style="background: #1e3a8a;">Guardar Registro</button>
    `;

    this.open(`Registro de Proveedor Pagado (Nota #${numNota})`, body, footer);

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
          <strong>Registro de Préstamo o Pendiente de Pago</strong>
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
      <button type="button" class="btn-primary" id="btnGuardarPresSeguro" style="background: #1e3a8a;">Guardar Pendiente</button>
    `;

    this.open('Registrar Préstamo o Pendiente de Pago', body, footer);

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
          <strong>Retiro de Efectivo de Caja</strong>
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
      <button type="button" class="btn-primary" id="btnGuardarRetSeguro" style="background: #1e3a8a;">Guardar Retiro</button>
    `;

    this.open('Registrar Retiro de Efectivo', body, footer);

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
    const hora = compra.hora || '08:00 a. m.';
    const proveedor = compra.proveedor || 'Sin especificar';
    const tipoPago = compra.tipoPago || 'Efectivo';
    const pagado = parseFloat(compra.pagado) || 0;
    const fechaReg = fecha || compra.fechaRegistro || stateManager.data.fecha || '';
    const formatMoney = (v) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);

    const body = `
      <div style="padding: 2px 0;">
        <!-- Resumen de Pago Minimalista y Sobrio -->
        <div style="display: flex; align-items: center; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px 18px; border-radius: 6px; margin-bottom: 14px;">
          <div>
            <div style="font-size: 0.7rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Tipo de Pago</div>
            <div style="font-size: 0.95rem; font-weight: 700; color: #0f172a; margin-top: 2px;">Pago con ${tipoPago}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.7rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Importe Pagado</div>
            <div style="font-size: 1.35rem; font-weight: 800; color: #0f172a; margin-top: 1px;">${formatMoney(pagado)}</div>
          </div>
        </div>

        <!-- Campos de Datos (Sin número de nota ni encargado) -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px 16px;">
          <div>
            <span style="display: block; font-size: 0.68rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Proveedor / Empresa</span>
            <strong style="font-size: 0.92rem; color: #0f172a; display: block; margin-top: 3px;">${proveedor}</strong>
          </div>

          <div>
            <span style="display: block; font-size: 0.68rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Fecha de Registro</span>
            <strong style="font-size: 0.92rem; color: #0f172a; display: block; margin-top: 3px;">${fechaReg}</strong>
          </div>

          <div>
            <span style="display: block; font-size: 0.68rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Hora de Registro</span>
            <strong style="font-size: 0.92rem; color: #334155; display: block; margin-top: 3px;">${hora}</strong>
          </div>

          <div>
            <span style="display: block; font-size: 0.68rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Estado</span>
            <span style="display: inline-block; background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; padding: 2px 8px; border-radius: 4px; font-size: 0.72rem; font-weight: 600; margin-top: 3px;">Guardado</span>
          </div>
        </div>

        <div style="margin-top: 12px; padding: 8px 12px; background: #f8fafc; border-left: 2px solid #94a3b8; font-size: 0.72rem; color: #64748b; border-radius: 0 4px 4px 0;">
          Registro contable protegido contra alteraciones.
        </div>
      </div>
    `;

    const footer = `
      <button type="button" class="btn-primary" id="btnCerrarDetallesProv" style="min-width: 90px; border-radius: 6px;">Cerrar</button>
    `;

    this.open(`Detalle del Proveedor: ${proveedor}`, body, footer);
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
              ${formatMoney(hist.totalPagado)}
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
            <strong>Historial de Hojas Contables Diarias</strong>
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

    this.open('Historial Contable y Calendario de Días', renderCalendarioDOM(), `
      <button type="button" class="btn-secondary" id="btnCerrarModalCal">Cerrar Calendario</button>
    `);

    document.getElementById('btnCerrarModalCal')?.addEventListener('click', () => this.close());
    attachCalListeners();
  }

  // ==========================================
  // 17. MODAL: CAPTURA COMPLETA Y COSTO PANADERO (i)
  // Permite ingresar Bolillos, Dulces, Cambios y Precio por Pieza
  // Operación: bolillos + dulces - cambios = piezas a pagar * precio = costo
  // ==========================================
  openCostoPanaderoModal(index, onGuardado = null) {
    const p = stateManager.data.conteoPan?.[index];
    if (!p) return;

    const esEditable = stateManager.puedeEditarCamposGenerales();
    const proveedor = p.proveedor;
    const bolActual = (parseFloat(p.bol) || 0) > 0 ? p.bol : '';
    const dulActual = (parseFloat(p.dul) || 0) > 0 ? p.dul : '';
    const cambActual = (parseFloat(p.camb) || 0) > 0 ? p.camb : '';
    const precioActual = p.precioPieza || (stateManager.data.preciosGuardadosPan?.[proveedor]) || '';

    const formatMoney = (v) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v || 0);

    const bIni = parseFloat(bolActual) || 0;
    const dIni = parseFloat(dulActual) || 0;
    const cIni = parseFloat(cambActual) || 0;
    const totPiezasIni = Math.max(0, bIni + dIni - cIni);
    const costoIni = totPiezasIni * (parseFloat(precioActual) || 0);

    const body = `
      <div class="costo-info-modal-wrap">
        <div class="costo-info-header-box">
          <div class="costo-info-proveedor-titulo">
            <span class="label-prov-fijo">PROVEEDOR:</span>
            <strong>${proveedor}</strong>
          </div>
          <div class="costo-info-sub">
            Registra el surtido del día y asigna el precio por pieza.
          </div>
        </div>

        <!-- FORMULARIO DE CAPTURA DE CANTIDADES -->
        <div class="costo-captura-card">
          <div class="costo-formula-header">
            <span>SURTIDO DE PIEZAS (ENTREGA Y CAMBIOS)</span>
          </div>
          <div class="grid-tres-campos" style="padding: 12px; gap: 10px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" for="inputModalBol" style="font-size: 0.72rem; font-weight: 700; color: #1e293b;">
                BOLILLOS (+)
              </label>
              <input 
                type="number" 
                min="0" 
                class="form-control text-center font-bold" 
                id="inputModalBol" 
                value="${bolActual}" 
                placeholder="0" 
                ${esEditable ? 'autofocus' : 'disabled'}>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" for="inputModalDul" style="font-size: 0.72rem; font-weight: 700; color: #1e293b;">
                DULCES (+)
              </label>
              <input 
                type="number" 
                min="0" 
                class="form-control text-center font-bold" 
                id="inputModalDul" 
                value="${dulActual}" 
                placeholder="0" 
                ${esEditable ? '' : 'disabled'}>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" for="inputModalCamb" style="font-size: 0.72rem; font-weight: 700; color: #b91c1c;">
                CAMBIOS / MERMA (-)
              </label>
              <input 
                type="number" 
                min="0" 
                class="form-control text-center font-bold" 
                id="inputModalCamb" 
                value="${cambActual}" 
                placeholder="0" 
                style="color: #b91c1c;" 
                ${esEditable ? '' : 'disabled'}>
            </div>
          </div>
        </div>

        <!-- TARJETA DE FÓRMULA CONTABLE VISUALIZADA EN VIVO -->
        <div class="costo-formula-card">
          <div class="costo-formula-header">
            <span>OPERACIÓN CONTABLE</span>
            <span class="costo-tag-formula">bolillos + dulces - cambios</span>
          </div>
          <div class="costo-formula-grid">
            <div class="costo-item-col">
              <span class="costo-item-lbl">Bolillos</span>
              <strong class="costo-item-num" id="displayModalNumBol">${bIni}</strong>
            </div>
            <div class="costo-simbolo-op">+</div>
            <div class="costo-item-col">
              <span class="costo-item-lbl">Dulces</span>
              <strong class="costo-item-num" id="displayModalNumDul">${dIni}</strong>
            </div>
            <div class="costo-simbolo-op">-</div>
            <div class="costo-item-col">
              <span class="costo-item-lbl">Cambios</span>
              <strong class="costo-item-num text-red" id="displayModalNumCamb">${cIni}</strong>
            </div>
            <div class="costo-simbolo-op">=</div>
            <div class="costo-item-col costo-item-resultado">
              <span class="costo-item-lbl">Total Piezas</span>
              <strong class="costo-item-num-total" id="displayModalTotalPiezas">${totPiezasIni}</strong>
            </div>
          </div>
        </div>

        <!-- ASIGNACIÓN DE PRECIO POR PIEZA -->
        <div class="costo-precio-box">
          <label class="form-label" for="inputModalPrecioPieza">
            <strong>Precio por Pieza ($):</strong>
          </label>
          <div class="input-precio-field-wrap">
            <span class="simbolo-precio-fijo">$</span>
            <input 
              type="number" 
              step="0.05" 
              min="0" 
              class="form-control input-precio-destacado" 
              id="inputModalPrecioPieza" 
              value="${precioActual}" 
              placeholder="0.00" 
              ${esEditable ? '' : 'disabled'}>
          </div>
          <p class="ayuda-precio-texto">
            ${esEditable 
              ? 'Asigna el precio por pieza acordado. El costo se calculará multiplicando el total de piezas netas por este precio.' 
              : 'Solo lectura (registrado o fuera de fecha/monto inicial).'}
          </p>
        </div>

        <!-- RESULTADO DEL COSTO CALCULADO -->
        <div class="costo-total-destacado-card">
          <div class="costo-total-titulo-sub">COSTO TOTAL DEL PEDIDO:</div>
          <div class="costo-total-numero-grande" id="displayModalCostoPan">
            ${formatMoney(costoIni)}
          </div>
          <div class="costo-total-desglose-linea" id="displayModalDesglosePan">
            ${totPiezasIni} piezas × ${formatMoney(parseFloat(precioActual) || 0)} = ${formatMoney(costoIni)}
          </div>
        </div>
      </div>
    `;

    const footer = `
      <div style="display: flex; gap: 8px; width: 100%; justify-content: space-between; flex-wrap: wrap; align-items: center;">
        <button type="button" class="btn-secondary" id="btnCerrarModalPanCosto" style="font-size: 0.78rem; padding: 7px 10px;">
          Cancelar
        </button>
        <div style="display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end;">
          <button type="button" class="btn-secondary" id="btnSeguirEditandoPan" style="font-size: 0.78rem; padding: 7px 11px; font-weight: 600;">
            Cerrar para seguir editando
          </button>
          ${esEditable ? `
            <button type="button" class="btn-primary" id="btnPagarDespuesPan" style="background: #d97706; border-color: #b45309; font-size: 0.78rem; padding: 7px 12px; font-weight: 700;">
              Pagar Después (Pendientes)
            </button>
            <button type="button" class="btn-primary" id="btnGuardarPagadoPan" style="background: #16a34a; border-color: #15803d; font-size: 0.78rem; padding: 7px 14px; font-weight: 700;">
              Guardar en Proveedores Pagados
            </button>
          ` : ''}
        </div>
      </div>
    `;

    this.open(`Conteo y Costo: ${proveedor}`, body, footer);

    const inputBol = document.getElementById('inputModalBol');
    const inputDul = document.getElementById('inputModalDul');
    const inputCamb = document.getElementById('inputModalCamb');
    const inputPrecio = document.getElementById('inputModalPrecioPieza');

    const displayNumBol = document.getElementById('displayModalNumBol');
    const displayNumDul = document.getElementById('displayModalNumDul');
    const displayNumCamb = document.getElementById('displayModalNumCamb');
    const displayTotalPiezas = document.getElementById('displayModalTotalPiezas');
    const displayCosto = document.getElementById('displayModalCostoPan');
    const displayDesglose = document.getElementById('displayModalDesglosePan');

    const actualizarVistaEnVivo = () => {
      const b = parseFloat(inputBol?.value) || 0;
      const d = parseFloat(inputDul?.value) || 0;
      const c = parseFloat(inputCamb?.value) || 0;
      const precio = parseFloat(inputPrecio?.value) || 0;

      const totalP = Math.max(0, b + d - c);
      const costo = totalP * precio;

      if (displayNumBol) displayNumBol.textContent = b;
      if (displayNumDul) displayNumDul.textContent = d;
      if (displayNumCamb) displayNumCamb.textContent = c;
      if (displayTotalPiezas) displayTotalPiezas.textContent = totalP;
      if (displayCosto) displayCosto.textContent = formatMoney(costo);
      if (displayDesglose) displayDesglose.textContent = `${totalP} piezas × ${formatMoney(precio)} = ${formatMoney(costo)}`;
    };

    [inputBol, inputDul, inputCamb, inputPrecio].forEach(inp => {
      inp?.addEventListener('input', actualizarVistaEnVivo);
      inp?.addEventListener('change', actualizarVistaEnVivo);
    });

    document.getElementById('btnCerrarModalPanCosto')?.addEventListener('click', () => this.close());

    // Opción 1: Cerrar para seguir editando (solo guarda conteo local sin pasar a pagos ni deudas)
    document.getElementById('btnSeguirEditandoPan')?.addEventListener('click', () => {
      stateManager.guardarCapturaPan(index, {
        bol: inputBol?.value,
        dul: inputDul?.value,
        camb: inputCamb?.value,
        precioPieza: inputPrecio?.value,
        destino: 'solo_guardar'
      });
      this.close();
      if (onGuardado) onGuardado();
    });

    if (esEditable) {
      // Opción 2: Guardar y registrar en RELACIÓN DE PROVEEDORES PAGADOS
      document.getElementById('btnGuardarPagadoPan')?.addEventListener('click', () => {
        stateManager.guardarCapturaPan(index, {
          bol: inputBol?.value,
          dul: inputDul?.value,
          camb: inputCamb?.value,
          precioPieza: inputPrecio?.value,
          destino: 'pagados'
        });
        this.close();
        if (onGuardado) onGuardado();
      });

      // Opción 3: Pagar después y registrar en PRESTAMOS O PENDIENTES DE PAGO
      document.getElementById('btnPagarDespuesPan')?.addEventListener('click', () => {
        stateManager.guardarCapturaPan(index, {
          bol: inputBol?.value,
          dul: inputDul?.value,
          camb: inputCamb?.value,
          precioPieza: inputPrecio?.value,
          destino: 'pendientes'
        });
        this.close();
        if (onGuardado) onGuardado();
      });

      // Enter en los campos guarda en Proveedores Pagados por defecto
      [inputBol, inputDul, inputCamb, inputPrecio].forEach(inp => {
        inp?.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('btnGuardarPagadoPan')?.click();
          }
        });
      });
    }
  }

  // ==========================================
  // 18. MODAL: CAPTURA COMPLETA Y COSTO TORTILLERÍA (i)
  // Permite ingresar Nuevas (kg), Cambios (kg) y Precio por Kilo
  // Operación: nuevas - cambios = kilos/piezas a pagar * precio = costo
  // ==========================================
  openCostoTortilleriaModal(index, onGuardado = null) {
    const t = stateManager.data.conteoTortilla?.[index];
    if (!t) return;

    const esEditable = stateManager.puedeEditarCamposGenerales();
    const proveedor = t.proveedor;
    const nuevActual = (parseFloat(t.nuev) || 0) > 0 ? t.nuev : '';
    const cambActual = (parseFloat(t.camb) || 0) > 0 ? t.camb : '';
    const precioActual = t.precioKilo || (stateManager.data.preciosGuardadosTortilla?.[proveedor]) || '';

    const formatMoney = (v) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v || 0);

    const nIni = parseFloat(nuevActual) || 0;
    const cIni = parseFloat(cambActual) || 0;
    const totKgIni = Math.max(0, nIni - cIni);
    const costoIni = totKgIni * (parseFloat(precioActual) || 0);

    const body = `
      <div class="costo-info-modal-wrap">
        <div class="costo-info-header-box">
          <div class="costo-info-proveedor-titulo">
            <span class="label-prov-fijo">PROVEEDOR:</span>
            <strong>${proveedor}</strong>
          </div>
          <div class="costo-info-sub">
            Registra los kilos nuevos, cambios devueltos y asigna el precio por kilo.
          </div>
        </div>

        <!-- FORMULARIO DE CAPTURA DE KILOS -->
        <div class="costo-captura-card">
          <div class="costo-formula-header">
            <span>KILOS RECIBIDOS Y DEVOLUCIONES</span>
          </div>
          <div class="grid-dos-campos" style="padding: 12px; gap: 12px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" for="inputModalNuev" style="font-size: 0.72rem; font-weight: 700; color: #1e293b;">
                NUEVAS / KILOS SURTIDOS (+)
              </label>
              <input 
                type="number" 
                step="0.5" 
                min="0" 
                class="form-control text-center font-bold" 
                id="inputModalNuev" 
                value="${nuevActual}" 
                placeholder="0.0" 
                ${esEditable ? 'autofocus' : 'disabled'}>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" for="inputModalCambTort" style="font-size: 0.72rem; font-weight: 700; color: #b91c1c;">
                CAMBIOS / MERMA (-)
              </label>
              <input 
                type="number" 
                step="0.5" 
                min="0" 
                class="form-control text-center font-bold" 
                id="inputModalCambTort" 
                value="${cambActual}" 
                placeholder="0.0" 
                style="color: #b91c1c;" 
                ${esEditable ? '' : 'disabled'}>
            </div>
          </div>
        </div>

        <!-- TARJETA DE FÓRMULA CONTABLE VISUALIZADA EN VIVO -->
        <div class="costo-formula-card">
          <div class="costo-formula-header">
            <span>OPERACIÓN CONTABLE</span>
            <span class="costo-tag-formula">nuevas - cambios</span>
          </div>
          <div class="costo-formula-grid" style="grid-template-columns: 1fr auto 1fr auto 1.3fr;">
            <div class="costo-item-col">
              <span class="costo-item-lbl">Nuevas</span>
              <strong class="costo-item-num" id="displayModalNumNuev">${nIni} kg</strong>
            </div>
            <div class="costo-simbolo-op">-</div>
            <div class="costo-item-col">
              <span class="costo-item-lbl">Cambios</span>
              <strong class="costo-item-num text-red" id="displayModalNumCambTort">${cIni} kg</strong>
            </div>
            <div class="costo-simbolo-op">=</div>
            <div class="costo-item-col costo-item-resultado">
              <span class="costo-item-lbl">Total Kilos</span>
              <strong class="costo-item-num-total" id="displayModalTotalKg">${totKgIni} kg</strong>
            </div>
          </div>
        </div>

        <!-- ASIGNACIÓN DE PRECIO POR KILO -->
        <div class="costo-precio-box">
          <label class="form-label" for="inputModalPrecioKilo">
            <strong>Precio por Kilo ($):</strong>
          </label>
          <div class="input-precio-field-wrap">
            <span class="simbolo-precio-fijo">$</span>
            <input 
              type="number" 
              step="0.5" 
              min="0" 
              class="form-control input-precio-destacado" 
              id="inputModalPrecioKilo" 
              value="${precioActual}" 
              placeholder="0.00" 
              ${esEditable ? '' : 'disabled'}>
          </div>
          <p class="ayuda-precio-texto">
            ${esEditable 
              ? 'Asigna el precio por kilo acordado. El costo se calculará multiplicando los kilos netos a pagar por este precio.' 
              : 'Solo lectura (registrado o fuera de fecha/monto inicial).'}
          </p>
        </div>

        <!-- RESULTADO DEL COSTO CALCULADO -->
        <div class="costo-total-destacado-card">
          <div class="costo-total-titulo-sub">COSTO TOTAL DEL PEDIDO:</div>
          <div class="costo-total-numero-grande" id="displayModalCostoTort">
            ${formatMoney(costoIni)}
          </div>
          <div class="costo-total-desglose-linea" id="displayModalDesgloseTort">
            ${totKgIni} kg × ${formatMoney(parseFloat(precioActual) || 0)} = ${formatMoney(costoIni)}
          </div>
        </div>
      </div>
    `;

    const footer = `
      <div style="display: flex; gap: 8px; width: 100%; justify-content: space-between; flex-wrap: wrap; align-items: center;">
        <button type="button" class="btn-secondary" id="btnCerrarModalTortCosto" style="font-size: 0.78rem; padding: 7px 10px;">
          Cancelar
        </button>
        <div style="display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end;">
          <button type="button" class="btn-secondary" id="btnSeguirEditandoTort" style="font-size: 0.78rem; padding: 7px 11px; font-weight: 600;">
            Cerrar para seguir editando
          </button>
          ${esEditable ? `
            <button type="button" class="btn-primary" id="btnPagarDespuesTort" style="background: #d97706; border-color: #b45309; font-size: 0.78rem; padding: 7px 12px; font-weight: 700;">
              Pagar Después (Pendientes)
            </button>
            <button type="button" class="btn-primary" id="btnGuardarPagadoTort" style="background: #16a34a; border-color: #15803d; font-size: 0.78rem; padding: 7px 14px; font-weight: 700;">
              Guardar en Proveedores Pagados
            </button>
          ` : ''}
        </div>
      </div>
    `;

    this.open(`Conteo y Costo: ${proveedor}`, body, footer);

    const inputNuev = document.getElementById('inputModalNuev');
    const inputCamb = document.getElementById('inputModalCambTort');
    const inputPrecio = document.getElementById('inputModalPrecioKilo');

    const displayNumNuev = document.getElementById('displayModalNumNuev');
    const displayNumCamb = document.getElementById('displayModalNumCambTort');
    const displayTotalKg = document.getElementById('displayModalTotalKg');
    const displayCosto = document.getElementById('displayModalCostoTort');
    const displayDesglose = document.getElementById('displayModalDesgloseTort');

    const actualizarVistaEnVivo = () => {
      const n = parseFloat(inputNuev?.value) || 0;
      const c = parseFloat(inputCamb?.value) || 0;
      const precio = parseFloat(inputPrecio?.value) || 0;

      const totalKg = Math.max(0, n - c);
      const costo = totalKg * precio;

      if (displayNumNuev) displayNumNuev.textContent = `${n} kg`;
      if (displayNumCamb) displayNumCamb.textContent = `${c} kg`;
      if (displayTotalKg) displayTotalKg.textContent = `${totalKg} kg`;
      if (displayCosto) displayCosto.textContent = formatMoney(costo);
      if (displayDesglose) displayDesglose.textContent = `${totalKg} kg × ${formatMoney(precio)} = ${formatMoney(costo)}`;
    };

    [inputNuev, inputCamb, inputPrecio].forEach(inp => {
      inp?.addEventListener('input', actualizarVistaEnVivo);
      inp?.addEventListener('change', actualizarVistaEnVivo);
    });

    document.getElementById('btnCerrarModalTortCosto')?.addEventListener('click', () => this.close());

    // Opción 1: Cerrar para seguir editando (solo guarda conteo local sin pasar a pagos ni deudas)
    document.getElementById('btnSeguirEditandoTort')?.addEventListener('click', () => {
      stateManager.guardarCapturaTortilla(index, {
        nuev: inputNuev?.value,
        camb: inputCamb?.value,
        precioKilo: inputPrecio?.value,
        destino: 'solo_guardar'
      });
      this.close();
      if (onGuardado) onGuardado();
    });

    if (esEditable) {
      // Opción 2: Guardar y registrar en RELACIÓN DE PROVEEDORES PAGADOS
      document.getElementById('btnGuardarPagadoTort')?.addEventListener('click', () => {
        stateManager.guardarCapturaTortilla(index, {
          nuev: inputNuev?.value,
          camb: inputCamb?.value,
          precioKilo: inputPrecio?.value,
          destino: 'pagados'
        });
        this.close();
        if (onGuardado) onGuardado();
      });

      // Opción 3: Pagar después y registrar en PRESTAMOS O PENDIENTES DE PAGO
      document.getElementById('btnPagarDespuesTort')?.addEventListener('click', () => {
        stateManager.guardarCapturaTortilla(index, {
          nuev: inputNuev?.value,
          camb: inputCamb?.value,
          precioKilo: inputPrecio?.value,
          destino: 'pendientes'
        });
        this.close();
        if (onGuardado) onGuardado();
      });

      // Guardar con Enter en los campos (por defecto a proveedores pagados)
      [inputNuev, inputCamb, inputPrecio].forEach(inp => {
        inp?.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('btnGuardarPagadoTort')?.click();
          }
        });
      });
    }
  }

  // ==========================================
  // MODAL: LISTA DE PEDIDO DE PROVEEDOR (AGENDA SEMANAL)
  // ==========================================
  openListaPedidoModal(proveedor, onGuardado = null) {
    if (!proveedor) return;
    const p = proveedor;
    const fmt = (v) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v || 0);

    const itemsPedido = Array.isArray(p.listaPedido) ? JSON.parse(JSON.stringify(p.listaPedido)) : [];

    const badgeEstado = p.yaVino 
      ? `<span class="badge badge-success" style="background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0; font-size:0.8rem; padding: 4px 10px; border-radius: 9999px;">✓ Llegó hoy a las ${p.horaVino || 'hora no registrada'}${p.montoPagadoReal ? ` (${fmt(p.montoPagadoReal)} pagados)` : ''}</span>`
      : `<span class="badge" style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; font-size:0.8rem; padding: 4px 10px; border-radius: 9999px;">Pendiente de visita (${p.dia ? p.dia.toUpperCase() : 'PROGRAMADO'})</span>`;

    const renderFilas = () => {
      if (itemsPedido.length === 0) {
        return `<tr><td colspan="4" style="text-align:center; padding: 18px; color:#94a3b8; font-style:italic;">No hay productos registrados en el pedido. Haz clic en "+ Agregar Producto" para añadir.</td></tr>`;
      }
      return itemsPedido.map((item, idx) => `
        <tr data-idx="${idx}" class="fila-item-pedido">
          <td style="padding: 8px 10px;">
            <input type="text" class="form-control item-prod-nombre" value="${item.producto || ''}" placeholder="Ej. Coca-Cola 600ml" style="font-size:0.88rem; padding: 6px 10px;">
          </td>
          <td style="padding: 8px 10px; width: 140px;">
            <input type="text" class="form-control item-prod-cant" value="${item.cantidad || ''}" placeholder="Ej. 3 rejas" style="font-size:0.88rem; padding: 6px 10px;">
          </td>
          <td style="padding: 8px 10px;">
            <input type="text" class="form-control item-prod-notas" value="${item.notas || ''}" placeholder="Observaciones / variedad" style="font-size:0.88rem; padding: 6px 10px;">
          </td>
          <td style="padding: 8px 10px; text-align: center; width: 44px;">
            <button type="button" class="btn-eliminar-item-pedido" data-idx="${idx}" title="Eliminar fila" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:1.1rem; padding:4px 8px; border-radius:4px;">✕</button>
          </td>
        </tr>
      `).join('');
    };

    const body = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <!-- Cabecera de estado -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; padding-bottom:12px; border-bottom:1px solid #e2e8f0;">
          <div>
            <div style="font-size:1.15rem; font-weight:700; color:#0f172a;">${p.proveedor}</div>
            <div style="font-size:0.82rem; color:#64748b;">Visita habitual: <strong style="color:#334155; text-transform:capitalize;">${p.dia || 'Día variable'}</strong> ${p.hora ? `• ${p.hora}` : ''} • Categoría: <span style="text-transform:capitalize;">${p.categoria || 'General'}</span></div>
          </div>
          <div>${badgeEstado}</div>
        </div>

        <!-- Cajas de Métricas: Presupuesto y Venta Anterior -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px;">
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
            <label style="display:block; font-size:0.75rem; font-weight:600; text-transform:uppercase; color:#64748b; margin-bottom:4px;">Presupuesto Aprox.</label>
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-weight:700; color:#334155;">$</span>
              <input type="number" id="inputPresupuestoAprox" class="form-control" value="${p.presupuestoAprox || 0}" step="10" min="0" style="font-size:1rem; font-weight:700; padding:6px 10px; color:#0f172a;">
            </div>
            <div style="font-size:0.72rem; color:#94a3b8; margin-top:4px;">Estimado a pagar al proveedor</div>
          </div>

          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
            <label style="display:block; font-size:0.75rem; font-weight:600; text-transform:uppercase; color:#64748b; margin-bottom:4px;">Registro Venta Anterior</label>
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-weight:700; color:#334155;">$</span>
              <input type="number" id="inputVentaAnterior" class="form-control" value="${p.ventaAnterior || 0}" step="10" min="0" style="font-size:1rem; font-weight:700; padding:6px 10px; color:#0f172a;">
            </div>
            <div style="font-size:0.72rem; color:#94a3b8; margin-top:4px;">Base de compra o venta previa</div>
          </div>

          ${p.yaVino ? `
            <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:12px;">
              <label style="display:block; font-size:0.75rem; font-weight:600; text-transform:uppercase; color:#166534; margin-bottom:4px;">Registrado en Hoja Diaria</label>
              <div style="font-size:1.1rem; font-weight:700; color:#15803d;">${fmt(p.montoPagadoReal)}</div>
              <div style="font-size:0.72rem; color:#166534; margin-top:4px;">Hora de llegada: <strong>${p.horaVino || 'Registrado'}</strong></div>
            </div>
          ` : ''}
        </div>

        <!-- Sección Lista de Pedido -->
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #ffffff;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; flex-wrap: wrap; gap: 8px;">
            <div style="font-size: 0.88rem; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 6px;">
              <span>Lista de Productos a Solicitar</span>
              <span id="spanTotalArticulos" style="background: #e2e8f0; color: #334155; font-size: 0.75rem; padding: 2px 8px; border-radius: 9999px; font-weight: 700;">${itemsPedido.length}</span>
            </div>
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              <!-- Botón Desplegar Lista Pasada para basarse en ella -->
              <button type="button" id="btnCargarPedidoAnterior" class="btn-secondary" style="font-size: 0.78rem; padding: 5px 12px; cursor: pointer; background: #ffffff; border: 1.5px solid #cbd5e1; color: #0f172a; font-weight: 700; border-radius: 6px; display: inline-flex; align-items: center; gap: 5px;" title="Cargar y desplegar la lista del pedido anterior para basarse de ahí">
                <span>↺</span> Cargar Lista Anterior
              </button>
              <button type="button" id="btnAgregarFilaPedido" class="btn-primary" style="font-size: 0.78rem; padding: 5px 12px; cursor: pointer; background: #0284c7; border: none; font-weight: 700; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;">
                <span>+</span> Agregar Producto
              </button>
            </div>
          </div>

          <!-- Alerta de estado al consultar lista previa -->
          <div id="alertaPedidoAnterior" style="display: none; padding: 10px 14px; font-size: 0.8rem; border-bottom: 1px solid #e2e8f0; transition: all 0.2s ease;"></div>

          <div style="max-height: 280px; overflow-y: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.86rem;">
              <thead>
                <tr style="background: #f1f5f9; text-align: left; color: #475569; font-size: 0.75rem; text-transform: uppercase;">
                  <th style="padding: 8px 10px;">Producto / Descripción</th>
                  <th style="padding: 8px 10px; width: 140px;">Cantidad</th>
                  <th style="padding: 8px 10px;">Notas / Variedad</th>
                  <th style="padding: 8px 10px; width: 44px; text-align: center;"></th>
                </tr>
              </thead>
              <tbody id="tbodyPedidoItems">
                ${renderFilas()}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Notas generales del proveedor -->
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label" style="font-size: 0.8rem; color: #475569;">Notas Adicionales del Proveedor</label>
          <input type="text" id="inputNotasProveedor" class="form-control" value="${p.notas || ''}" placeholder="Ej. Llega en la mañana, pedir factura, etc." style="font-size: 0.85rem;">
        </div>
      </div>
    `;

    const footer = `
      <button type="button" class="btn-secondary" id="btnCerrarModalPedido">Cerrar</button>
      <button type="button" class="btn-primary" id="btnGuardarPedidoModal" style="min-width: 150px;">Guardar Pedido</button>
    `;

    this.open(`Lista de Pedido: ${p.proveedor}`, body, footer);

    const tbody = document.getElementById('tbodyPedidoItems');
    const spanTotal = document.getElementById('spanTotalArticulos');
    const alerta = document.getElementById('alertaPedidoAnterior');

    const sincronizarItemsDesdeDOM = () => {
      const filas = tbody.querySelectorAll('.fila-item-pedido');
      const nuevosItems = [];
      filas.forEach(f => {
        const prod = f.querySelector('.item-prod-nombre')?.value.trim();
        const cant = f.querySelector('.item-prod-cant')?.value.trim();
        const notas = f.querySelector('.item-prod-notas')?.value.trim();
        if (prod || cant || notas) {
          nuevosItems.push({
            id: 'item-' + Math.random().toString(36).substr(2, 7),
            producto: prod,
            cantidad: cant,
            notas: notas
          });
        }
      });
      return nuevosItems;
    };

    const rebindEliminar = () => {
      tbody.querySelectorAll('.btn-eliminar-item-pedido').forEach(btn => {
        btn.onclick = (e) => {
          const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
          itemsPedido.splice(idx, 1);
          tbody.innerHTML = renderFilas();
          if (spanTotal) spanTotal.textContent = itemsPedido.length;
          rebindEliminar();
        };
      });
    };
    rebindEliminar();

    // Evento para Cargar / Desplegar la lista pasada de pedido
    document.getElementById('btnCargarPedidoAnterior')?.addEventListener('click', () => {
      const pedidoAnterior = stateManager.getPedidoAnteriorProveedor(p.proveedor);

      if (pedidoAnterior && Array.isArray(pedidoAnterior) && pedidoAnterior.length > 0) {
        // Cargar lista pasada como base
        itemsPedido.length = 0;
        itemsPedido.push(...JSON.parse(JSON.stringify(pedidoAnterior)));
        tbody.innerHTML = renderFilas();
        if (spanTotal) spanTotal.textContent = itemsPedido.length;
        rebindEliminar();

        if (alerta) {
          alerta.style.display = 'block';
          alerta.style.background = '#f0fdf4';
          alerta.style.color = '#166534';
          alerta.style.borderBottom = '1.5px solid #bbf7d0';
          alerta.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <div>
                <strong>✓ Lista anterior desplegada:</strong> Se cargaron <strong>${pedidoAnterior.length} productos</strong> del pedido anterior de <em>"${p.proveedor}"</em>. Puedes modificar cantidades o agregar más artículos para este nuevo pedido.
              </div>
              <button type="button" id="btnCerrarAlertaPedido" style="background: none; border: none; font-weight: bold; color: #166534; cursor: pointer; font-size: 1.1rem; line-height: 1;">✕</button>
            </div>
          `;
          document.getElementById('btnCerrarAlertaPedido')?.addEventListener('click', () => {
            alerta.style.display = 'none';
          });
        }
      } else {
        // Indicar claramente que no hay pedido anterior
        if (alerta) {
          alerta.style.display = 'block';
          alerta.style.background = '#fffbeb';
          alerta.style.color = '#92400e';
          alerta.style.borderBottom = '1.5px solid #fde68a';
          alerta.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <div>
                <strong>Sin lista anterior:</strong> No hay un pedido anterior registrado para <strong>"${p.proveedor}"</strong>. Registra los productos de este pedido y quedarán guardados automáticamente como base para tus próximos pedidos.
              </div>
              <button type="button" id="btnCerrarAlertaPedido" style="background: none; border: none; font-weight: bold; color: #92400e; cursor: pointer; font-size: 1.1rem; line-height: 1;">✕</button>
            </div>
          `;
          document.getElementById('btnCerrarAlertaPedido')?.addEventListener('click', () => {
            alerta.style.display = 'none';
          });
        }
      }
    });

    document.getElementById('btnAgregarFilaPedido')?.addEventListener('click', () => {
      const actuales = sincronizarItemsDesdeDOM();
      actuales.push({
        id: 'item-' + Math.random().toString(36).substr(2, 7),
        producto: '',
        cantidad: '',
        notas: ''
      });
      itemsPedido.length = 0;
      itemsPedido.push(...actuales);
      tbody.innerHTML = renderFilas();
      if (spanTotal) spanTotal.textContent = itemsPedido.length;
      rebindEliminar();
      const inputs = tbody.querySelectorAll('.item-prod-nombre');
      if (inputs.length > 0) inputs[inputs.length - 1].focus();
    });

    document.getElementById('btnCerrarModalPedido')?.addEventListener('click', () => this.close());

    document.getElementById('btnGuardarPedidoModal')?.addEventListener('click', () => {
      const finalItems = sincronizarItemsDesdeDOM();
      const nuevoPresupuesto = parseFloat(document.getElementById('inputPresupuestoAprox')?.value) || 0;
      const nuevaVentaAnterior = parseFloat(document.getElementById('inputVentaAnterior')?.value) || 0;
      const nuevasNotas = document.getElementById('inputNotasProveedor')?.value.trim() || '';

      stateManager.updateProveedorPedido(p.id, finalItems);
      stateManager.updateProveedorAgenda(p.id, {
        presupuestoAprox: nuevoPresupuesto,
        ventaAnterior: nuevaVentaAnterior,
        notas: nuevasNotas
      });

      this.close();
      if (onGuardado) onGuardado();
    });
  }

  // ==========================================
  // 19. MODAL: AGREGAR / EDITAR PROVEEDOR EN BASE DE DATOS MAESTRA
  // ==========================================
  openProveedorCatalogoModal(prov = null, onGuardado = null) {
    const isEdit = !!(prov && prov.id);
    const diasHabitualesActuales = Array.isArray(prov?.diasHabituales) && prov.diasHabituales.length > 0 
      ? prov.diasHabituales 
      : [(prov?.diaHabitual || 'lunes')];

    const p = {
      nombre: '',
      categoria: 'abarrotes',
      diaHabitual: diasHabitualesActuales[0] || 'lunes',
      diasHabituales: diasHabitualesActuales,
      tienePreventa: false,
      diasPreventa: [],
      diasEntrega: [],
      horaHabitual: '10:00',
      tipoPago: 'Efectivo',
      presupuestoHabitual: '',
      contacto: '',
      notas: '',
      ...(prov || {})
    };

    const catsOptions = Object.entries(CATEGORIAS_PROVEEDOR).map(([key, val]) => `<option value="${key}" ${p.categoria === key ? 'selected' : ''}>${val.nombre}</option>`).join('');

    const body = `
      <form id="formProvCatalogo" style="display: flex; flex-direction: column; gap: 14px;">
        
        <!-- AVISO DE SINCRONIZACIÓN -->
        <div style="background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 8px; padding: 10px 14px; font-size: 0.8rem; color: #1e3a8a;">
          <strong>Catálogo Maestro de Proveedores</strong>
          <p style="margin: 3px 0 0; color: #475569; font-size: 0.74rem;">
            Los datos aquí registrados alimentarán automáticamente el autocompletado en las 30 líneas de la <strong>Hoja Diaria</strong> y los registros de la <strong>Agenda Semanal</strong>.
          </p>
        </div>

        <!-- BLOQUE 1: IDENTIFICACIÓN Y CATEGORÍA -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px;">
          <div class="form-group" style="margin-bottom: 12px;">
            <label class="form-label" style="font-weight: 700; color: #0f172a;">Nombre del Proveedor o Empresa *</label>
            <input type="text" class="form-control font-bold" name="nombre" placeholder="Ej: Coca-Cola, Bimbo, Sabritas, Tortillería..." value="${p.nombre}" required autofocus style="font-size: 0.96rem; color: #0f172a;">
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-weight: 700;">Categoría de Producto *</label>
            <select class="form-control font-bold" name="categoria" required>
              ${catsOptions}
            </select>
          </div>
        </div>

        <!-- BLOQUE 2: FRECUENCIA SEMANAL (HASTA 3 VECES POR SEMANA) -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px;">
          <label class="form-label" style="font-weight: 700; margin-bottom: 4px; color: #0f172a;">
            Días Habituales de Visita a la Semana (hasta 3 o más días) *
          </label>
          <p style="font-size: 0.72rem; color: #64748b; margin: 0 0 8px 0;">
            Selecciona todos los días en que el proveedor asiste a la tienda (ej: Lunes, Miércoles y Viernes):
          </p>
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px;">
            ${DIAS_SEMANA.map(d => {
              const isChecked = p.diasHabituales.includes(d.id);
              return `
                <label style="display: inline-flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 700; background: ${isChecked ? '#f0f9ff' : '#ffffff'}; border: 1.5px solid ${isChecked ? '#0284c7' : '#cbd5e1'}; color: ${isChecked ? '#0369a1' : '#334155'}; padding: 4px 10px; border-radius: 6px; cursor: pointer;">
                  <input type="checkbox" name="diasHabituales" value="${d.id}" class="check-cat-dia" ${isChecked ? 'checked' : ''}>
                  <span>${d.nombre}</span>
                </label>
              `;
            }).join('')}
          </div>

          <!-- CONFIGURACIÓN DE PREVENTA -->
          <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; margin-top: 10px;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.82rem; font-weight: 700; color: #0f172a; margin: 0;">
              <input type="checkbox" id="checkTienePreventaCat" name="tienePreventa" ${p.tienePreventa ? 'checked' : ''}>
              <span>¿Este proveedor maneja preventa un día antes de la entrega?</span>
            </label>
            <p style="margin: 3px 0 0 24px; font-size: 0.72rem; color: #64748b;">
              Al marcar esta opción, la agenda sabrá que primero asiste un preventista a levantar pedido y la entrega se agenda con ese costo.
            </p>
          </div>
        </div>

        <!-- BLOQUE 3: CONDICIONES DE PAGO Y PRESUPUESTO -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px;">
          <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 12px; margin-bottom: 12px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-weight: 700;">Presupuesto Habitual ($ MXN)</label>
              <input type="number" step="10" min="0" class="form-control font-bold" name="presupuestoHabitual" placeholder="0.00" value="${p.presupuestoHabitual || ''}" style="font-size: 0.95rem;">
              <small style="color: #64748b; font-size: 0.72rem;">Gasto promedio habitual por visita</small>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-weight: 700;">Hora Estimada</label>
              <input type="time" class="form-control" name="horaHabitual" value="${p.horaHabitual || '10:00'}">
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-weight: 700; margin-bottom: 6px;">Forma de Pago Preferida *</label>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 6px 12px; border: 1.5px solid #cbd5e1; border-radius: 6px; font-weight: 600; font-size: 0.84rem; background: #ffffff;">
                <input type="radio" name="tipoPago" value="Efectivo" ${(!p.tipoPago || p.tipoPago.toLowerCase().includes('efectivo')) ? 'checked' : ''}>
                <span>Efectivo de Caja</span>
              </label>
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 6px 12px; border: 1.5px solid #cbd5e1; border-radius: 6px; font-weight: 600; font-size: 0.84rem; background: #ffffff;">
                <input type="radio" name="tipoPago" value="Transferencia" ${(p.tipoPago && p.tipoPago.toLowerCase().includes('transferencia')) ? 'checked' : ''}>
                <span>Transferencia Bancaria</span>
              </label>
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 6px 12px; border: 1.5px solid #cbd5e1; border-radius: 6px; font-weight: 600; font-size: 0.84rem; background: #ffffff;">
                <input type="radio" name="tipoPago" value="Cheque" ${(p.tipoPago && p.tipoPago.toLowerCase().includes('cheque')) ? 'checked' : ''}>
                <span>Cheque</span>
              </label>
            </div>
          </div>
        </div>

        <!-- BLOQUE 4: CONTACTO Y NOTAS -->
        <div style="display: grid; grid-template-columns: 1fr; gap: 10px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-weight: 600; font-size: 0.82rem; color: #475569;">Teléfono / Preventista</label>
            <input type="text" class="form-control" name="contacto" placeholder="Ej. Juan Pérez / 449-123-4567" value="${p.contacto || ''}" style="font-size: 0.86rem;">
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-weight: 600; font-size: 0.82rem; color: #475569;">Observaciones / Instrucciones</label>
            <textarea class="form-control" name="notas" placeholder="Requerimientos de recibo, días alternos, productos especiales..." style="font-size: 0.85rem; height: 50px;">${p.notas || ''}</textarea>
          </div>
        </div>

        <!-- OPCIÓN DE AUTO-SINCRONIZAR A LA AGENDA -->
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 8px 12px;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.8rem; font-weight: 700; color: #166534; margin: 0;">
            <input type="checkbox" id="checkSyncAgenda" ${!isEdit ? 'checked' : ''}>
            <span>Generar / sincronizar automáticamente registros en la Agenda Semanal para los días seleccionados</span>
          </label>
        </div>
      </form>
    `;

    const footer = `
      <button type="button" class="btn-secondary" id="btnCancelProvCat">Cancelar</button>
      <button type="button" class="btn-primary" id="btnSaveProvCat">${isEdit ? 'Guardar Cambios' : 'Registrar en Catálogo'}</button>
    `;

    this.open(isEdit ? `Editar Proveedor: ${p.nombre}` : 'Nuevo Proveedor en Catálogo', body, footer);

    document.getElementById('btnCancelProvCat')?.addEventListener('click', () => this.close());
    document.getElementById('btnSaveProvCat')?.addEventListener('click', () => {
      const form = document.getElementById('formProvCatalogo');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const diasSeleccionados = Array.from(document.querySelectorAll('.check-cat-dia:checked')).map(cb => cb.value);
      if (diasSeleccionados.length === 0) {
        alert('Por favor selecciona al menos un día habitual de visita.');
        return;
      }

      const formData = new FormData(form);
      const tienePrev = !!document.getElementById('checkTienePreventaCat')?.checked;
      const syncAgenda = !!document.getElementById('checkSyncAgenda')?.checked;

      const datos = {
        nombre: formData.get('nombre').trim(),
        categoria: formData.get('categoria'),
        tipoPago: formData.get('tipoPago'),
        diaHabitual: diasSeleccionados[0] || 'lunes',
        diasHabituales: diasSeleccionados,
        tienePreventa: tienePrev,
        horaHabitual: formData.get('horaHabitual') || '10:00',
        presupuestoHabitual: parseFloat(formData.get('presupuestoHabitual')) || 0,
        contacto: (formData.get('contacto') || '').trim(),
        notas: (formData.get('notas') || '').trim()
      };

      if (isEdit) {
        stateManager.updateProveedorCatalogo(prov.id, datos);
      } else {
        stateManager.addProveedorCatalogo(datos);
      }

      // Si marcó sincronizar en la agenda y es nuevo o lo solicita:
      if (syncAgenda) {
        stateManager.addProveedorMultiplesDias({
          dias: diasSeleccionados,
          proveedor: datos.nombre,
          categoria: datos.categoria,
          tipoVisita: tienePrev ? 'preventa' : 'entrega',
          hora: datos.horaHabitual,
          tipoPago: datos.tipoPago,
          presupuestoAprox: datos.presupuestoHabitual,
          preventaPresupuesto: datos.presupuestoHabitual,
          costoPreventa: tienePrev ? datos.presupuestoHabitual : 0,
          diaEntregaProgramada: stateManager.getDiaSiguiente(diasSeleccionados[0]),
          notas: datos.notas
        });
      }

      this.close();
      if (onGuardado) onGuardado();
    });
  }

  // ==========================================
  // 20. MODAL: REGISTRO DE COMPRAS Y CANTIDADES POR PROVEEDOR
  // ==========================================
  openRegistroComprasProveedorModal(nombreProveedor, onActualizado = null) {
    if (!nombreProveedor) return;

    const renderContenido = () => {
      const stats = stateManager.getEstadisticasProveedor(nombreProveedor);
      const fmt = (v) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v || 0);
      const fechaHoy = stateManager.getFechaHoy();

      return `
        <div style="display: flex; flex-direction: column; gap: 16px;">
          
          <!-- RESUMEN SUPERIOR DE CANTIDADES DE COMPRA -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px;">
              <span style="font-size: 0.72rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Cantidad de Compras</span>
              <div style="font-size: 1.3rem; font-weight: 800; color: #0f172a; margin-top: 2px;">
                ${stats ? stats.totalCompras : 0} <small style="font-size: 0.8rem; font-weight: normal; color: #64748b;">notas</small>
              </div>
            </div>

            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 12px;">
              <span style="font-size: 0.72rem; font-weight: 700; color: #166534; text-transform: uppercase;">Total Comprado</span>
              <div style="font-size: 1.3rem; font-weight: 800; color: #15803d; margin-top: 2px;">
                ${stats ? fmt(stats.totalPagado) : '$0'}
              </div>
            </div>

            <div style="background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 10px 12px;">
              <span style="font-size: 0.72rem; font-weight: 700; color: #5b21b6; text-transform: uppercase;">Promedio / Compra</span>
              <div style="font-size: 1.3rem; font-weight: 800; color: #6d28d9; margin-top: 2px;">
                ${stats ? fmt(stats.promedioPorCompra) : '$0'}
              </div>
            </div>

            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 12px;">
              <span style="font-size: 0.72rem; font-weight: 700; color: #92400e; text-transform: uppercase;">Presupuesto Base</span>
              <div style="font-size: 1.3rem; font-weight: 800; color: #b45309; margin-top: 2px;">
                ${stats && stats.presupuestoHabitual > 0 ? fmt(stats.presupuestoHabitual) : '-'}
              </div>
            </div>
          </div>

          <!-- FORMULARIO: REGISTRAR NUEVA COMPRA A ESTE PROVEEDOR -->
          <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <strong style="font-size: 0.9rem; color: #0f172a;">Registrar Nueva Compra a ${nombreProveedor}</strong>
              <span style="font-size: 0.75rem; color: #64748b;">Se añade al historial y a la hoja contable</span>
            </div>
            
            <form id="formNuevaCompraBD">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; align-items: flex-end;">
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label" style="font-size: 0.75rem;">Monto a Pagar ($ MXN) *</label>
                  <input type="number" step="1" min="1" id="inputMontoCompraBD" class="form-control" placeholder="0.00" required autofocus style="font-size: 0.95rem; font-weight: 700;">
                </div>

                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label" style="font-size: 0.75rem;">Forma de Pago *</label>
                  <select id="selectTipoPagoCompraBD" class="form-control" style="font-size: 0.85rem; font-weight: 600;">
                    <option value="Efectivo" selected>Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                  </select>
                </div>

                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label" style="font-size: 0.75rem;">Fecha *</label>
                  <input type="date" id="inputFechaCompraBD" class="form-control" value="${fechaHoy}" required style="font-size: 0.85rem;">
                </div>

                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label" style="font-size: 0.75rem;">Folio / Nota</label>
                  <input type="text" id="inputNotaFolioBD" class="form-control" placeholder="Ej. Factura 128" style="font-size: 0.85rem;">
                </div>

                <div>
                  <button type="submit" class="btn-primary" style="width: 100%; height: 38px; justify-content: center; font-size: 0.88rem;">
                    Guardar Compra
                  </button>
                </div>
              </div>
            </form>
          </div>

          <!-- TABLA HISTORIAL DE COMPRAS -->
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <strong style="font-size: 0.88rem; color: #1e293b;">Historial de Compras Realizadas (${stats ? stats.comprasHistorial.length : 0})</strong>
            </div>

            <div style="max-height: 260px; overflow-y: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 0.86rem;">
                <thead>
                  <tr style="background: #f1f5f9; text-align: left; color: #475569; font-size: 0.73rem; text-transform: uppercase;">
                    <th style="padding: 8px 12px; width: 50px; text-align: center;">NOTA</th>
                    <th style="padding: 8px 12px; width: 120px;">FECHA</th>
                    <th style="padding: 8px 12px; width: 100px;">HORA</th>
                    <th style="padding: 8px 12px; width: 130px; text-align: center;">MÉTODO</th>
                    <th style="padding: 8px 12px; text-align: right;">CANTIDAD ($)</th>
                  </tr>
                </thead>
                <tbody>
                  ${(!stats || stats.comprasHistorial.length === 0) ? `
                    <tr>
                      <td colspan="5" style="text-align: center; padding: 24px; color: #94a3b8; font-style: italic;">
                        Sin compras registradas aún para este proveedor.
                      </td>
                    </tr>
                  ` : stats.comprasHistorial.map((c, i) => {
                    const esTransf = (c.tipoPago === 'Transferencia');
                    return `
                      <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 8px 12px; text-align: center; font-weight: 700; color: #64748b;">#${c.nota || (i + 1)}</td>
                        <td style="padding: 8px 12px; font-weight: 700; color: #0f172a;">${c.fecha || '-'}</td>
                        <td style="padding: 8px 12px; color: #64748b;">${c.hora || '-'}</td>
                        <td style="padding: 8px 12px; text-align: center;">
                          <span class="badge-tipo-pago ${esTransf ? 'badge-pago-transf' : 'badge-pago-efec'}">
                            ${esTransf ? 'TR Transf' : 'EF Efectivo'}
                          </span>
                        </td>
                        <td style="padding: 8px 12px; text-align: right; font-weight: 800; color: #0f172a;">
                          ${fmt(c.monto)}
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
    };

    const attachListeners = () => {
      document.getElementById('btnCerrarModalCompras')?.addEventListener('click', () => this.close());

      document.getElementById('formNuevaCompraBD')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const monto = parseFloat(document.getElementById('inputMontoCompraBD')?.value) || 0;
        const tipoPago = document.getElementById('selectTipoPagoCompraBD')?.value || 'Efectivo';
        const fecha = document.getElementById('inputFechaCompraBD')?.value;
        const nota = document.getElementById('inputNotaFolioBD')?.value.trim();

        if (monto <= 0) {
          alert('Por favor ingresa un monto válido.');
          return;
        }

        const ok = stateManager.registrarCompraDesdeBD({
          proveedor: nombreProveedor,
          monto,
          tipoPago,
          fecha,
          notas: nota
        });

        if (ok) {
          const bodyEl = this.container.querySelector('.modal-body');
          if (bodyEl) {
            bodyEl.innerHTML = renderContenido();
            attachListeners();
          }
          if (onActualizado) onActualizado();
        }
      });
    };

    this.open(`Registro de Compras: ${nombreProveedor}`, renderContenido(), `
      <button type="button" class="btn-secondary" id="btnCerrarModalCompras">Cerrar</button>
    `);

    attachListeners();
  }

  // ==========================================
  // MODAL: CAPTURA FÁCIL DE CANTIDAD INICIAL DE CAJA
  // ==========================================
  openCapturaCantidadInicialModal(onGuardado) {
    const valActual = stateManager.data.cantidadInicial || '';
    const numActual = parseFloat(valActual) || 0;
    const fmt = (v) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v || 0);

    const body = `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #1e3a8a; border-radius: 6px; padding: 10px 14px;">
          <div style="font-weight: 700; font-size: 0.88rem; color: #0f172a;">FONDO INICIAL DE CAJA</div>
          <div style="font-size: 0.76rem; color: #64748b; margin-top: 2px;">
            Este monto representa el dinero en efectivo con el que se inicia la jornada diaria para dar cambio y controlar el arqueo.
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label" style="font-weight: 800; font-size: 0.88rem; color: #0f172a;">
            Monto de Cantidad Inicial ($ MXN) *
          </label>
          <div style="position: relative; display: flex; align-items: center;">
            <span style="position: absolute; left: 14px; font-size: 1.3rem; font-weight: 800; color: #64748b; pointer-events: none;">$</span>
            <input type="number" step="10" min="0" class="form-control" id="inputMontoInicialModal" 
              value="${numActual > 0 ? numActual : ''}" placeholder="0.00" autofocus
              style="padding-left: 32px; font-size: 1.4rem; font-weight: 800; height: 50px; text-align: right; color: #1e3a8a; border: 2px solid #94a3b8; border-radius: 6px;">
          </div>
        </div>

        <!-- Botones de Acceso Rápido Táctil para Tablet -->
        <div>
          <div style="font-size: 0.72rem; font-weight: 700; color: #64748b; margin-bottom: 6px; text-transform: uppercase;">
            Valores Frecuentes de Apertura:
          </div>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <button type="button" class="btn-secondary btn-chip-monto" data-monto="500" style="padding: 4px 10px; font-size: 0.8rem; font-weight: 700;">$500</button>
            <button type="button" class="btn-secondary btn-chip-monto" data-monto="1000" style="padding: 4px 10px; font-size: 0.8rem; font-weight: 700;">$1,000</button>
            <button type="button" class="btn-secondary btn-chip-monto" data-monto="1500" style="padding: 4px 10px; font-size: 0.8rem; font-weight: 700;">$1,500</button>
            <button type="button" class="btn-secondary btn-chip-monto" data-monto="2000" style="padding: 4px 10px; font-size: 0.8rem; font-weight: 700;">$2,000</button>
            <button type="button" class="btn-secondary btn-chip-monto" data-monto="2500" style="padding: 4px 10px; font-size: 0.8rem; font-weight: 700;">$2,500</button>
            <button type="button" class="btn-secondary btn-chip-monto" data-monto="0" style="padding: 4px 10px; font-size: 0.8rem; color: #b91c1c;">Limpiar</button>
          </div>
        </div>
      </div>
    `;

    const footer = `
      <button type="button" class="btn-secondary" id="btnCancelCantInicial">Cancelar</button>
      <button type="button" class="btn-primary" id="btnSaveCantInicial" style="min-width: 170px;">
        ✓ Guardar Cantidad Inicial
      </button>
    `;

    this.open('Cantidad Inicial de Caja', body, footer);

    const input = document.getElementById('inputMontoInicialModal');
    setTimeout(() => {
      input?.focus();
      input?.select();
    }, 80);

    // Conectar botones chips rápidos
    this.container.querySelectorAll('.btn-chip-monto').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const m = btn.getAttribute('data-monto');
        if (input) {
          input.value = m === '0' ? '' : m;
          input.focus();
        }
      });
    });

    document.getElementById('btnCancelCantInicial')?.addEventListener('click', () => this.close());

    const guardar = () => {
      const val = parseFloat(input?.value) || 0;
      stateManager.updateCantidadInicial(val);
      this.close();
      if (onGuardado) onGuardado();
    };

    document.getElementById('btnSaveCantInicial')?.addEventListener('click', guardar);
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        guardar();
      }
    });
  }

  // ==========================================
  // MODAL: CAPTURA FÁCIL DE MÁQUINA DE MUÑECOS
  // ==========================================
  openCapturaMaquinaMunecosModal(onGuardado) {
    const d = stateManager.data.maquinaMunecos || { monedas: 0, totalCorte: 0, porcentajeEllos: 60, porcentajeNosotros: 40 };
    const numMonedas = parseFloat(d.monedas) || 0;
    const pctEllos = d.porcentajeEllos || 60;
    const pctNosotros = d.porcentajeNosotros || 40;
    const fmt = (v) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v || 0);

    const body = `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #1e3a8a; border-radius: 6px; padding: 10px 14px;">
          <div style="font-weight: 700; font-size: 0.88rem; color: #0f172a;">CORTE DE MÁQUINA DE PELUCHES</div>
          <div style="font-size: 0.76rem; color: #64748b; margin-top: 2px;">
            Ingresa el importe total recaudado en monedas de la máquina de muñecos. El sistema calcula automáticamente la comisión pactada.
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label" style="font-weight: 800; font-size: 0.88rem; color: #0f172a;">
            Total Monedas Recaudadas ($ MXN) *
          </label>
          <div style="position: relative; display: flex; align-items: center;">
            <span style="position: absolute; left: 14px; font-size: 1.3rem; font-weight: 800; color: #64748b; pointer-events: none;">$</span>
            <input type="number" step="5" min="0" class="form-control" id="inputMunecosModal" 
              value="${numMonedas > 0 ? numMonedas : ''}" placeholder="0.00" autofocus
              style="padding-left: 32px; font-size: 1.4rem; font-weight: 800; height: 50px; text-align: right; color: #1e3a8a; border: 2px solid #94a3b8; border-radius: 6px;">
          </div>
        </div>

        <!-- Desglose de Reparto en Vivo -->
        <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
            <span style="font-weight: 700; font-size: 0.84rem; color: #334155;">TOTAL CORTE:</span>
            <strong style="font-size: 1.1rem; color: #0f172a;" id="displayModalMunTotal">${fmt(numMonedas)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.82rem; color: #64748b;">ELLOS (${pctEllos}%):</span>
            <strong style="font-size: 0.95rem; color: #334155;" id="displayModalMunEllos">${fmt((numMonedas * pctEllos) / 100)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 6px 10px; border-radius: 6px;">
            <span style="font-size: 0.84rem; font-weight: 700; color: #166534;">NOSOTROS (${pctNosotros}%):</span>
            <strong style="font-size: 1.05rem; font-weight: 800; color: #15803d;" id="displayModalMunNosotros">${fmt((numMonedas * pctNosotros) / 100)}</strong>
          </div>
        </div>
      </div>
    `;

    const footer = `
      <button type="button" class="btn-secondary" id="btnCancelMunecos">Cancelar</button>
      <button type="button" class="btn-primary" id="btnSaveMunecos" style="min-width: 170px;">
        ✓ Guardar Corte Muñecos
      </button>
    `;

    this.open('Corte: Máquina de Muñecos (Peluches)', body, footer);

    const input = document.getElementById('inputMunecosModal');
    const dispTotal = document.getElementById('displayModalMunTotal');
    const dispEllos = document.getElementById('displayModalMunEllos');
    const dispNosotros = document.getElementById('displayModalMunNosotros');

    const recalcular = () => {
      const v = parseFloat(input?.value) || 0;
      if (dispTotal) dispTotal.textContent = fmt(v);
      if (dispEllos) dispEllos.textContent = fmt((v * pctEllos) / 100);
      if (dispNosotros) dispNosotros.textContent = fmt((v * pctNosotros) / 100);
    };

    input?.addEventListener('input', recalcular);
    setTimeout(() => {
      input?.focus();
      input?.select();
    }, 80);

    document.getElementById('btnCancelMunecos')?.addEventListener('click', () => this.close());

    const guardar = () => {
      const v = parseFloat(input?.value) || 0;
      stateManager.updateMaquinaMunecos({
        monedas: v,
        porcentajeEllos: pctEllos,
        porcentajeNosotros: pctNosotros
      });
      this.close();
      if (onGuardado) onGuardado();
    };

    document.getElementById('btnSaveMunecos')?.addEventListener('click', guardar);
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        guardar();
      }
    });
  }

  // ==========================================
  // MODAL: CAPTURA FÁCIL DE MÁQUINAS INDIVIDUALES
  // ==========================================
  openCapturaMaquinasIndividualesModal(onGuardado) {
    const d = stateManager.data.maquinasIndividuales || { maq1_1: 0, maq2_1: 0, maq3_5: 0, total: 0, nota: '', porcentajeProveedor: 60, porcentajeNosotros: 40 };
    const q1 = parseFloat(d.maq1_1) || 0;
    const q2 = parseFloat(d.maq2_1) || 0;
    const q3 = parseFloat(d.maq3_5) || 0;
    const nota = d.nota || '';
    const pctProv = d.porcentajeProveedor || 60;
    const pctNos = d.porcentajeNosotros || 40;
    const fmt = (v) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v || 0);

    const body = `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #1e3a8a; border-radius: 6px; padding: 10px 14px;">
          <div style="font-weight: 700; font-size: 0.88rem; color: #0f172a;">CORTE DE MÁQUINAS INDIVIDUALES</div>
          <div style="font-size: 0.76rem; color: #64748b; margin-top: 2px;">
            Captura los montos de cada máquina para calcular el total acumulado y la división correspondiente.
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-weight: 700; font-size: 0.82rem; color: #0f172a;">Máquina 1 ($1 MXN)</label>
            <input type="number" step="1" min="0" class="form-control font-bold" id="inputModalMaq1" 
              value="${q1 > 0 ? q1 : ''}" placeholder="0.00" autofocus style="font-size: 1.1rem; text-align: right;">
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-weight: 700; font-size: 0.82rem; color: #0f172a;">Máquina 2 ($1 MXN)</label>
            <input type="number" step="1" min="0" class="form-control font-bold" id="inputModalMaq2" 
              value="${q2 > 0 ? q2 : ''}" placeholder="0.00" style="font-size: 1.1rem; text-align: right;">
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label" style="font-weight: 700; font-size: 0.82rem; color: #0f172a;">Máquina 3 ($5 MXN)</label>
          <input type="number" step="5" min="0" class="form-control font-bold" id="inputModalMaq3" 
            value="${q3 > 0 ? q3 : ''}" placeholder="0.00" style="font-size: 1.1rem; text-align: right;">
        </div>

        <!-- Desglose de Reparto en Vivo -->
        <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
            <span style="font-weight: 700; font-size: 0.84rem; color: #334155;">TOTAL ACUMULADO:</span>
            <strong style="font-size: 1.1rem; color: #0f172a;" id="displayModalIndivTotal">${fmt(q1 + q2 + q3)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.82rem; color: #64748b;">PROVEEDOR (${pctProv}%):</span>
            <strong style="font-size: 0.95rem; color: #334155;" id="displayModalIndivProv">${fmt(((q1 + q2 + q3) * pctProv) / 100)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 6px 10px; border-radius: 6px;">
            <span style="font-size: 0.84rem; font-weight: 700; color: #166534;">NOSOTROS (${pctNos}%):</span>
            <strong style="font-size: 1.05rem; font-weight: 800; color: #15803d;" id="displayModalIndivNosotros">${fmt(((q1 + q2 + q3) * pctNos) / 100)}</strong>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label" style="font-weight: 600; font-size: 0.8rem; color: #64748b;">Nota u Observación (Opcional)</label>
          <input type="text" class="form-control" id="inputModalNotaMaq" value="${nota}" placeholder="Ej. Vaciado regular, cambio de monedas...">
        </div>
      </div>
    `;

    const footer = `
      <button type="button" class="btn-secondary" id="btnCancelMaqIndiv">Cancelar</button>
      <button type="button" class="btn-primary" id="btnSaveMaqIndiv" style="min-width: 170px;">
        ✓ Guardar Corte de Máquinas
      </button>
    `;

    this.open('Corte: Máquinas Individuales', body, footer);

    const in1 = document.getElementById('inputModalMaq1');
    const in2 = document.getElementById('inputModalMaq2');
    const in3 = document.getElementById('inputModalMaq3');
    const inNota = document.getElementById('inputModalNotaMaq');

    const dispTot = document.getElementById('displayModalIndivTotal');
    const dispProv = document.getElementById('displayModalIndivProv');
    const dispNos = document.getElementById('displayModalIndivNosotros');

    const recalcular = () => {
      const v1 = parseFloat(in1?.value) || 0;
      const v2 = parseFloat(in2?.value) || 0;
      const v3 = parseFloat(in3?.value) || 0;
      const t = v1 + v2 + v3;
      if (dispTot) dispTot.textContent = fmt(t);
      if (dispProv) dispProv.textContent = fmt((t * pctProv) / 100);
      if (dispNos) dispNos.textContent = fmt((t * pctNos) / 100);
    };

    [in1, in2, in3].forEach(inp => inp?.addEventListener('input', recalcular));
    setTimeout(() => {
      in1?.focus();
      in1?.select();
    }, 80);

    document.getElementById('btnCancelMaqIndiv')?.addEventListener('click', () => this.close());

    const guardar = () => {
      const v1 = parseFloat(in1?.value) || 0;
      const v2 = parseFloat(in2?.value) || 0;
      const v3 = parseFloat(in3?.value) || 0;
      const n = (inNota?.value || '').trim();

      stateManager.updateMaquinasIndividuales({
        maq1_1: v1,
        maq2_1: v2,
        maq3_5: v3,
        nota: n,
        porcentajeProveedor: pctProv,
        porcentajeNosotros: pctNos
      });
      this.close();
      if (onGuardado) onGuardado();
    };

    document.getElementById('btnSaveMaqIndiv')?.addEventListener('click', guardar);

    // Navegación con tecla Enter entre casillas
    in1?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        in2?.focus();
        in2?.select();
      }
    });
    in2?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        in3?.focus();
        in3?.select();
      }
    });
    in3?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        inNota?.focus();
      }
    });
    inNota?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        guardar();
      }
    });
  }
}

