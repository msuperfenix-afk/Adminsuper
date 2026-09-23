/**
 * Orquestador Principal - Minisúper Fénix
 * Administrador de Vistas: Hoja Diaria, Agenda Semanal, Base de Datos de Proveedores y Estadísticas
 */

import { stateManager } from './state.js';
import { HojaDiariaModule } from './modules/hojaDiaria.js';
import { PipelineModule } from './modules/pipeline.js';
import { ProveedoresDbModule } from './modules/proveedoresDb.js';
import { EstadisticasModule } from './modules/estadisticas.js';
import { ModalManager } from './modules/modal.js';

class App {
  constructor() {
    this.currentView = 'hoja'; // 'hoja', 'pipeline', 'proveedores' o 'estadisticas'
    this.init();
  }

  init() {
    try {
      // 1. Gestor de Modales Global
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
      this.pipelineModule = new PipelineModule(
        'pipelineViewContainer', 
        (prov) => {
          this.modalManager.openProveedorModal(prov, () => {
            this.pipelineModule.render();
          });
        },
        (prov) => {
          this.modalManager.openListaPedidoModal(prov, () => {
            this.pipelineModule.render();
          });
        },
        (prov) => {
          this.modalManager.openVinoPreventaModal(prov, () => {
            this.pipelineModule.render();
          });
        }
      );
    } catch (e) {
      console.error('Error al inicializar PipelineModule:', e);
    }

    try {
      // 4. Módulo de Base de Datos Maestra de Proveedores (Catálogo Central)
      this.proveedoresDbModule = new ProveedoresDbModule('proveedoresViewContainer');
    } catch (e) {
      console.error('Error al inicializar ProveedoresDbModule:', e);
    }

    try {
      // 5. Módulo de Estadísticas Generales y por Proveedor
      this.estadisticasModule = new EstadisticasModule('estadisticasViewContainer');
    } catch (e) {
      console.error('Error al inicializar EstadisticasModule:', e);
    }

    // 6. Configurar Navegación y Listeners Globales
    this.setupSidebarNavigation();
    this.setupTopBarControls();
    this.updateGlobalHeaderStats();

    // 7. Suscribirse a cambios de estado
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

        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        this.switchView(view);
      });
    });

    // Botón de Respaldo / Exportación en barra lateral
    document.getElementById('navBtnBackup')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.modalManager.openBackupModal();
    });

    // Botón de Respaldo / Exportación en barra superior (móvil y tablet)
    document.getElementById('btnTopBarBackup')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.modalManager.openBackupModal();
    });
  }

  switchView(view) {
    this.currentView = view;
    const hojaContainer = document.getElementById('hojaDiariaViewContainer');
    const pipeContainer = document.getElementById('pipelineViewContainer');
    const provDbContainer = document.getElementById('proveedoresViewContainer');
    const statsContainer = document.getElementById('estadisticasViewContainer');
    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');
    const viewSwitcher = document.getElementById('viewSwitcher');

    // Ocultar todos los contenedores de vista
    if (hojaContainer) hojaContainer.classList.remove('active');
    if (pipeContainer) pipeContainer.classList.remove('active');
    if (provDbContainer) provDbContainer.classList.remove('active');
    if (statsContainer) statsContainer.classList.remove('active');

    if (view === 'hoja') {
      if (hojaContainer) hojaContainer.classList.add('active');
      if (pageTitle) pageTitle.innerHTML = 'Hoja Diaria - Minisúper Fénix';
      if (pageSubtitle) pageSubtitle.innerText = 'Formato contable digitalizado: Compras, Conteo Pan/Tortilla, Arqueo, Retiros y Máquinas';
      if (viewSwitcher) viewSwitcher.style.display = 'none';
      if (this.hojaDiariaModule) this.hojaDiariaModule.render();
    } else if (view === 'pipeline') {
      if (pipeContainer) pipeContainer.classList.add('active');
      if (pageTitle) pageTitle.innerHTML = 'Agenda Semanal de Proveedores';
      if (pageSubtitle) pageSubtitle.innerText = 'Organización de visitas y presupuestos de Lunes a Domingo';
      if (viewSwitcher) viewSwitcher.style.display = 'flex';
      if (this.pipelineModule) this.pipelineModule.render();
    } else if (view === 'proveedores') {
      if (provDbContainer) provDbContainer.classList.add('active');
      if (pageTitle) pageTitle.innerHTML = 'Base de Datos de Proveedores';
      if (pageSubtitle) pageSubtitle.innerText = 'Catálogo maestro oficial: Gestión de proveedores, visitas, formas de pago y presupuestos';
      if (viewSwitcher) viewSwitcher.style.display = 'none';
      if (this.proveedoresDbModule) this.proveedoresDbModule.render();
    } else if (view === 'estadisticas') {
      if (statsContainer) statsContainer.classList.add('active');
      if (pageTitle) pageTitle.innerHTML = 'Estadísticas y Reportes Generales';
      if (pageSubtitle) pageSubtitle.innerText = 'Desglose de compras, análisis por proveedor, proporciones de efectivo vs transferencia y promedios';
      if (viewSwitcher) viewSwitcher.style.display = 'none';
      if (this.estadisticasModule) this.estadisticasModule.render();
    }
  }

  setupTopBarControls() {
    // Buscador universal
    const searchInput = document.getElementById('globalSearchInput');
    searchInput?.addEventListener('input', (e) => {
      const term = e.target.value;
      if (this.currentView === 'pipeline' && this.pipelineModule) {
        this.pipelineModule.setSearchTerm(term);
      } else if (this.currentView === 'proveedores' && this.proveedoresDbModule) {
        this.proveedoresDbModule.filtroTexto = term;
        this.proveedoresDbModule.render();
      }
    });

    // Conmutador de vista Kanban vs Lista para Agenda Semanal
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
  }

  updateGlobalHeaderStats() {
    const statsPill = document.getElementById('headerStatsPill');
    const totales = stateManager.getTotalesHoja();

    if (statsPill) {
      const fmt = (v) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v);
      const pagadosCount = (stateManager.data.comprasProveedores || []).filter(p => p.pagado > 0).length;
      statsPill.innerHTML = `
        <span class="highlight">${fmt(totales.totalPagadoProveedores)}</span>
        <span>•</span>
        <span>${pagadosCount} pagos hoy</span>
      `;
    }
  }
}

// Inicialización segura con verificación de estado para compatibilidad total en Android
function inicializarAppFenix() {
  if (!window.adminFenixApp) {
    try {
      window.adminFenixApp = new App();
    } catch (err) {
      console.error('Error crítico al inicializar AdminFénix:', err);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarAppFenix);
} else {
  inicializarAppFenix();
}

