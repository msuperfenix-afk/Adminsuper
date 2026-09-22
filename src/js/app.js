/**
 * Orquestador Principal - Minisúper Fénix
 */

import { stateManager } from './state.js';
import { HojaDiariaModule } from './modules/hojaDiaria.js';
import { PipelineModule } from './modules/pipeline.js';
import { CajaOperacionesModule } from './modules/cajaOperaciones.js';
import { ModalManager } from './modules/modal.js';

class App {
  constructor() {
    this.currentView = 'hoja'; // 'hoja', 'pipeline' o 'operaciones'
    this.init();
  }

  init() {
    try {
      // 1. Gestor de Modales
      this.modalManager = new ModalManager('modalOverlay', 'modalContainer');
    } catch (e) {
      console.error('Error al inicializar ModalManager:', e);
    }

    try {
      // 2. Módulo de Hoja Diaria Fénix (Réplica en papel)
      this.hojaDiariaModule = new HojaDiariaModule('hojaDiariaViewContainer');
    } catch (e) {
      console.error('Error al inicializar HojaDiariaModule:', e);
    }

    try {
      // 3. Módulo de Pipeline Semanal (Lunes a Domingo)
      this.pipelineModule = new PipelineModule('pipelineViewContainer', (prov) => {
        this.modalManager.openProveedorModal(prov);
      });
    } catch (e) {
      console.error('Error al inicializar PipelineModule:', e);
    }

    try {
      // 4. Módulo de Operaciones y Arqueo Avanzado
      this.cajaModule = new CajaOperacionesModule('operationsViewContainer', {
        openNuevoArqueo: () => this.modalManager.openNuevoArqueoModal(),
        openNuevoPago: () => this.modalManager.openNuevoPagoModal(),
        openNuevoPanadero: () => this.modalManager.openNuevoPanaderoModal(),
        openNuevaTortilleria: () => this.modalManager.openNuevaTortilleriaModal(),
        openNuevoPendiente: () => this.modalManager.openNuevoPendienteModal(),
        openNuevoRetiro: () => this.modalManager.openNuevoRetiroModal(),
        openNuevaMaquina: () => this.modalManager.openNuevaMaquinaModal(),
        printArqueoTicket: (arq) => this.modalManager.openPrintTicketModal(arq)
      });
    } catch (e) {
      console.error('Error al inicializar CajaOperacionesModule:', e);
    }

    // 5. Configurar Navegación y Listeners Globales SIEMPRE
    this.setupSidebarNavigation();
    this.setupTopBarControls();
    this.updateGlobalHeaderStats();

    // 6. Suscribirse a cambios de estado
    stateManager.subscribe(() => {
      this.updateGlobalHeaderStats();
    });
  }

  setupSidebarNavigation() {
    const navButtons = document.querySelectorAll('.sidebar .nav-item[data-view]');
    
    navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const view = btn.getAttribute('data-view');
        const targetSubtab = btn.getAttribute('data-subtab');

        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        this.switchView(view);

        if (targetSubtab && this.cajaModule) {
          this.cajaModule.setSubtab(targetSubtab);
        }
      });
    });

    // Botón de Respaldo / Base de Datos
    document.getElementById('navBtnBackup')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.modalManager.openBackupModal();
    });
  }

  switchView(view) {
    this.currentView = view;
    const hojaContainer = document.getElementById('hojaDiariaViewContainer');
    const pipeContainer = document.getElementById('pipelineViewContainer');
    const opsContainer = document.getElementById('operationsViewContainer');
    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');
    const viewSwitcher = document.getElementById('viewSwitcher');
    const btnActionTop = document.getElementById('btnQuickActionTop');

    // Ocultar todos los contenedores de vista
    if (hojaContainer) hojaContainer.classList.remove('active');
    if (pipeContainer) pipeContainer.classList.remove('active');
    if (opsContainer) opsContainer.classList.remove('active');

    if (view === 'hoja') {
      if (hojaContainer) hojaContainer.classList.add('active');
      if (pageTitle) pageTitle.innerHTML = '📄 Hoja Diaria Minisúper Fénix';
      if (pageSubtitle) pageSubtitle.innerText = 'Formato físico digitalizado: Compras, Conteo Pan/Tortilla, Arqueo, Retiros y Máquinas';
      if (viewSwitcher) viewSwitcher.style.display = 'none';
      if (btnActionTop) {
        btnActionTop.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>+ Agregar Compra</span>
        `;
      }
    } else if (view === 'pipeline') {
      if (pipeContainer) pipeContainer.classList.add('active');
      if (pageTitle) pageTitle.innerHTML = '🗓️ Agenda Semanal de Proveedores';
      if (pageSubtitle) pageSubtitle.innerText = 'Organización de visitas y presupuestos de Lunes a Domingo';
      if (viewSwitcher) viewSwitcher.style.display = 'flex';
      if (btnActionTop) {
        btnActionTop.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>+ Proveedor</span>
        `;
      }
    } else {
      if (opsContainer) opsContainer.classList.add('active');
      if (pageTitle) pageTitle.innerHTML = '🏦 Centro de Cortes, Caja y Arqueo';
      if (pageSubtitle) pageSubtitle.innerText = 'Detalle de turnos, conteo de morralla total en pesos y comparativa de sistema';
      if (viewSwitcher) viewSwitcher.style.display = 'none';
      if (btnActionTop) {
        btnActionTop.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>+ Registrar Pago</span>
        `;
      }
    }
  }

  setupTopBarControls() {
    // Buscador universal
    const searchInput = document.getElementById('globalSearchInput');
    searchInput?.addEventListener('input', (e) => {
      const term = e.target.value;
      if (this.pipelineModule) this.pipelineModule.setSearchTerm(term);
    });

    // Conmutador de vista Kanban vs Lista
    const btnKanban = document.getElementById('btnViewKanban');
    const btnList = document.getElementById('btnViewList');

    btnKanban?.addEventListener('click', () => {
      btnKanban.classList.add('active');
      btnList?.classList.remove('active');
      if (this.pipelineModule) this.pipelineModule.setVistaModo('kanban');
    });

    btnList?.addEventListener('click', () => {
      btnList.classList.add('active');
      btnKanban?.classList.remove('active');
      if (this.pipelineModule) this.pipelineModule.setVistaModo('lista');
    });

    // Botón rojo de acción rápida superior
    const btnAction = document.getElementById('btnQuickActionTop');
    btnAction?.addEventListener('click', () => {
      if (this.currentView === 'pipeline') {
        this.modalManager.openProveedorModal();
      } else {
        this.modalManager.openNuevoPagoModal();
      }
    });
  }

  updateGlobalHeaderStats() {
    const statsPill = document.getElementById('headerStatsPill');
    const navBadgePendientes = document.getElementById('navBadgePendientes');
    const totales = stateManager.getTotalesHoja();

    if (statsPill) {
      const fmt = (v) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v);
      const pagadosCount = stateManager.data.comprasProveedores.filter(p => p.pagado > 0).length;
      statsPill.innerHTML = `
        <span class="highlight">${fmt(totales.totalPagadoProveedores)}</span>
        <span>•</span>
        <span>${pagadosCount} pagos hoy</span>
      `;
    }

    if (navBadgePendientes) {
      const pendCount = stateManager.data.prestamosPendientes.filter(p => (p.pendiente || 0) > 0).length;
      navBadgePendientes.textContent = pendCount;
      navBadgePendientes.style.display = pendCount > 0 ? 'flex' : 'none';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.adminFenixApp = new App();
});
