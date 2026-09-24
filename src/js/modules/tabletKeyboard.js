/**
 * Módulo de Adaptabilidad para Tablets y Teclados en Pantalla (AdminFénix)
 * Detecta la apertura/cierre del teclado virtual mediante VisualViewport API
 * y ajusta dinámicamente alturas, scroll, modales y tablas para una experiencia fluida.
 */

export class TabletKeyboardAdapter {
  constructor() {
    this.isKeyboardOpen = false;
    this.keyboardHeight = 0;
    this.lastFocusedInput = null;
    this.scrollTimeout = null;
    this.init();
  }

  init() {
    // Detectar si el dispositivo cuenta con pantalla táctil
    const esTactil = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.matchMedia('(pointer: coarse)').matches;
    if (esTactil) {
      document.documentElement.classList.add('tablet-touch-device');
    }

    this.setupVisualViewport();
    this.setupFocusListeners();
    this.setupTouchScrollAssistance();
  }

  setupVisualViewport() {
    if (!window.visualViewport) {
      // Fallback para navegadores antiguos mediante resize de window
      window.addEventListener('resize', () => this.handleFallbackResize());
      return;
    }

    const onViewportChange = () => {
      const vv = window.visualViewport;
      const currentHeight = vv.height;
      const currentTop = vv.pageTop;
      const windowH = window.innerHeight;
      const diff = windowH - currentHeight;

      // Un encogimiento vertical superior a 130px representa la salida del teclado virtual en tablets/móviles
      const keyboardActive = diff > 130;
      this.keyboardHeight = keyboardActive ? diff : 0;
      this.isKeyboardOpen = keyboardActive;

      // Actualizar variables CSS en la raíz del documento
      document.documentElement.style.setProperty('--visual-viewport-height', `${currentHeight}px`);
      document.documentElement.style.setProperty('--keyboard-height', `${this.keyboardHeight}px`);
      document.documentElement.style.setProperty('--visual-viewport-top', `${currentTop}px`);

      if (keyboardActive) {
        document.body.classList.add('keyboard-open');
        document.documentElement.classList.add('keyboard-open');

        // Detectar si la tablet está en orientación horizontal (Landscape)
        const esLandscape = window.innerWidth > currentHeight;
        if (esLandscape) {
          document.body.classList.add('keyboard-landscape');
        } else {
          document.body.classList.remove('keyboard-landscape');
        }

        // Si hay un elemento enfocado, ajustar scroll suave hacia el centro visible
        this.scrollToActiveElement();
      } else {
        document.body.classList.remove('keyboard-open', 'keyboard-landscape');
        document.documentElement.classList.remove('keyboard-open');
        document.documentElement.style.setProperty('--keyboard-height', '0px');
      }
    };

    window.visualViewport.addEventListener('resize', onViewportChange);
    window.visualViewport.addEventListener('scroll', onViewportChange);

    // Ajuste al rotar la tablet
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        onViewportChange();
      }, 250);
    });

    // Llamada inicial para fijar variables
    onViewportChange();
  }

  handleFallbackResize() {
    const windowH = window.innerHeight;
    const screenH = window.screen.availHeight || window.screen.height;
    const diff = screenH - windowH;
    const keyboardActive = diff > 180;

    this.isKeyboardOpen = keyboardActive;
    if (keyboardActive) {
      document.body.classList.add('keyboard-open');
      this.scrollToActiveElement();
    } else {
      document.body.classList.remove('keyboard-open', 'keyboard-landscape');
    }
  }

  setupFocusListeners() {
    // Al recibir foco en un campo editable (input, textarea, select)
    document.addEventListener('focusin', (e) => {
      const target = e.target;
      if (!target) return;

      if (target.matches('input, textarea, select, [contenteditable="true"]')) {
        this.lastFocusedInput = target;

        // Esperar a que el teclado de la tablet complete su animación de despliegue (~200ms)
        if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => {
          this.scrollToElement(target);
        }, 220);
      }
    });

    // Al perder el foco
    document.addEventListener('focusout', (e) => {
      // Si no hay otro campo enfocado inmediatamente después
      setTimeout(() => {
        const active = document.activeElement;
        const sigueEnCampo = active && active.matches && active.matches('input, textarea, select');
        if (!sigueEnCampo && !this.isKeyboardOpen) {
          this.lastFocusedInput = null;
        }
      }, 150);
    });
  }

  scrollToActiveElement() {
    const el = document.activeElement || this.lastFocusedInput;
    if (el && el.matches && el.matches('input, textarea, select, [contenteditable="true"]')) {
      this.scrollToElement(el);
    }
  }

  scrollToElement(el) {
    if (!el || typeof el.getBoundingClientRect !== 'function') return;

    // Caso A: El input se encuentra dentro de un modal
    const modalBody = el.closest('.modal-body');
    const modalContainer = el.closest('.modal-container');

    if (modalBody && modalContainer) {
      try {
        // Medir distancias relativas dentro del modal-body
        const bodyRect = modalBody.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();

        // Si el elemento está fuera de la zona visible del modal-body
        const offsetTop = elRect.top - bodyRect.top;
        const targetScroll = modalBody.scrollTop + offsetTop - (bodyRect.height / 3);

        modalBody.scrollTo({
          top: Math.max(0, targetScroll),
          behavior: 'smooth'
        });
      } catch (err) {
        // Fallback nativo
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
      return;
    }

    // Caso B: El input está en una tabla o vista regular de la plataforma
    try {
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    } catch (err) {
      el.scrollIntoView(true);
    }
  }

  setupTouchScrollAssistance() {
    // Permitir cerrar el teclado fácilmente pulsando fuera de los inputs cuando esté abierto
    document.addEventListener('touchstart', (e) => {
      if (!this.isKeyboardOpen) return;

      const target = e.target;
      const esInput = target && target.matches && target.matches('input, textarea, select, button, a, [role="button"]');
      
      // Si el usuario toca el fondo oscuro del modal o áreas vacías, desenfocar para ocultar teclado suavemente
      if (!esInput) {
        const active = document.activeElement;
        if (active && active.matches && active.matches('input, textarea, select')) {
          // Si pulsa una celda de navegación u overlay, desenfocar
          if (target.classList.contains('modal-overlay') || target.classList.contains('main-area') || target.classList.contains('view-container')) {
            active.blur();
          }
        }
      }
    }, { passive: true });
  }
}

// Instancia singleton y función de inicialización
let adapterInstance = null;

export function initTabletKeyboardSupport() {
  if (!adapterInstance) {
    adapterInstance = new TabletKeyboardAdapter();
  }
  return adapterInstance;
}
