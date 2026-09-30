/**
 * Módulo de Persistencia y Base de Datos Local de Alta Capacidad (IndexedDB)
 * Minisúper Fénix - Sistema Antiperdida de Datos y Protección de Memoria
 * 
 * Capas de Seguridad:
 * 1. navigator.storage.persist() -> Prohíbe a Android/Chrome borrar la memoria por falta de espacio
 * 2. IndexedDB (AdminFenixDB) -> Almacenamiento local de gigabytes (sin el límite de 5MB de localStorage)
 * 3. Rotación y Respaldo Diario Automático -> Snapshots de seguridad
 * 4. Purgado Inteligente de Caché localStorage -> Previene QuotaExceededError manteniendo el historial en IndexedDB y Cloud Firestore
 */

const DB_NAME = 'AdminFenixDB_v1';
const DB_VERSION = 1;

let dbPromise = null;

function abrirBaseDatos() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      console.warn('IndexedDB no soportado en este navegador. Se usará localStorage y Firestore.');
      resolve(null);
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 1. Almacén de hojas contables diarias indexadas por su fecha YYYY-MM-DD
      if (!db.objectStoreNames.contains('hojas_diarias')) {
        db.createObjectStore('hojas_diarias', { keyPath: 'fecha' });
      }

      // 2. Almacén de configuración global (catálogo de proveedores, agenda semanal, precios)
      if (!db.objectStoreNames.contains('config_global')) {
        db.createObjectStore('config_global', { keyPath: 'clave' });
      }

      // 3. Almacén de respaldos rotativos diarios automáticos (últimos 30 días)
      if (!db.objectStoreNames.contains('backups_diarios')) {
        const store = db.createObjectStore('backups_diarios', { keyPath: 'id' });
        store.createIndex('fecha', 'fecha', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error('Error al abrir IndexedDB:', event.target.error);
      resolve(null);
    };
  });

  return dbPromise;
}

/**
 * Solicita persistencia permanente al navegador y sistema operativo (Android/Windows)
 * para evitar que el navegador limpie la caché o localStorage si el disco está lleno.
 */
export async function solicitarPersistenciaPermanente() {
  if (navigator.storage && navigator.storage.persist) {
    try {
      const esPersistente = await navigator.storage.persist();
      console.log(`Persistencia de almacenamiento permanente: ${esPersistente ? 'ACTIVADA (Datos blindados)' : 'POR DEFECTO'}`);
      return esPersistente;
    } catch (e) {
      console.warn('No se pudo solicitar persistencia de almacenamiento:', e);
    }
  }
  return false;
}

/**
 * Guarda una hoja contable diaria en la base de datos de alta capacidad IndexedDB
 */
export async function guardarHojaEnIndexedDB(fecha, datosHoja) {
  if (!fecha || !datosHoja) return false;
  try {
    const db = await abrirBaseDatos();
    if (!db) return false;

    return new Promise((resolve) => {
      const transaction = db.transaction(['hojas_diarias'], 'readwrite');
      const store = transaction.objectStore('hojas_diarias');
      const payload = {
        fecha,
        ...datosHoja,
        guardadoEn: new Date().toISOString()
      };
      const req = store.put(payload);

      req.onsuccess = () => resolve(true);
      req.onerror = (err) => {
        console.warn('Error al guardar hoja en IndexedDB:', err);
        resolve(false);
      };
    });
  } catch (err) {
    console.warn('Fallo transacción IndexedDB guardarHoja:', err);
    return false;
  }
}

/**
 * Carga una hoja contable diaria desde IndexedDB
 */
export async function cargarHojaDeIndexedDB(fecha) {
  if (!fecha) return null;
  try {
    const db = await abrirBaseDatos();
    if (!db) return null;

    return new Promise((resolve) => {
      const transaction = db.transaction(['hojas_diarias'], 'readonly');
      const store = transaction.objectStore('hojas_diarias');
      const req = store.get(fecha);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Fallo transacción IndexedDB cargarHoja:', err);
    return null;
  }
}

/**
 * Carga todas las hojas históricas almacenadas en IndexedDB
 */
export async function cargarTodasLasHojasIndexedDB() {
  try {
    const db = await abrirBaseDatos();
    if (!db) return {};

    return new Promise((resolve) => {
      const transaction = db.transaction(['hojas_diarias'], 'readonly');
      const store = transaction.objectStore('hojas_diarias');
      const req = store.getAll();

      req.onsuccess = () => {
        const hojasMap = {};
        const lista = req.result || [];
        lista.forEach(h => {
          if (h && h.fecha) {
            hojasMap[h.fecha] = h;
          }
        });
        resolve(hojasMap);
      };
      req.onerror = () => resolve({});
    });
  } catch (err) {
    console.warn('Fallo transacción IndexedDB cargarTodasLasHojas:', err);
    return {};
  }
}

/**
 * Guarda los proveedores globales y catálogos en IndexedDB
 */
export async function guardarProveedoresEnIndexedDB({ catalogoProveedores, proveedoresAgenda, preciosGuardadosPan, preciosGuardadosTortilla }) {
  try {
    const db = await abrirBaseDatos();
    if (!db) return false;

    return new Promise((resolve) => {
      const transaction = db.transaction(['config_global'], 'readwrite');
      const store = transaction.objectStore('config_global');

      if (Array.isArray(catalogoProveedores) && catalogoProveedores.length > 0) {
        store.put({ clave: 'catalogoProveedores', valor: catalogoProveedores, actualizado: new Date().toISOString() });
      }
      if (Array.isArray(proveedoresAgenda) && proveedoresAgenda.length > 0) {
        store.put({ clave: 'proveedoresAgenda', valor: proveedoresAgenda, actualizado: new Date().toISOString() });
      }
      if (preciosGuardadosPan) {
        store.put({ clave: 'preciosGuardadosPan', valor: preciosGuardadosPan, actualizado: new Date().toISOString() });
      }
      if (preciosGuardadosTortilla) {
        store.put({ clave: 'preciosGuardadosTortilla', valor: preciosGuardadosTortilla, actualizado: new Date().toISOString() });
      }

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('Error al guardar proveedores en IndexedDB:', err);
    return false;
  }
}

/**
 * Carga los proveedores globales de IndexedDB si existen
 */
export async function cargarProveedoresDeIndexedDB() {
  try {
    const db = await abrirBaseDatos();
    if (!db) return null;

    return new Promise((resolve) => {
      const transaction = db.transaction(['config_global'], 'readonly');
      const store = transaction.objectStore('config_global');
      const req = store.getAll();

      req.onsuccess = () => {
        const items = req.result || [];
        const resultado = {};
        items.forEach(it => {
          if (it && it.clave) {
            resultado[it.clave] = it.valor;
          }
        });
        resolve(resultado);
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Error al cargar proveedores de IndexedDB:', err);
    return null;
  }
}

/**
 * Crea un Respaldo Automático Diario rotativo en IndexedDB (conserva los últimos 30 días)
 */
export async function guardarBackupDiarioAutomatico(estadoCompleto) {
  if (!estadoCompleto) return false;
  try {
    const db = await abrirBaseDatos();
    if (!db) return false;

    const fechaHoy = new Date().toISOString().split('T')[0];
    const timestamp = Date.now();
    const idBackup = `backup_${fechaHoy}`;

    return new Promise((resolve) => {
      const transaction = db.transaction(['backups_diarios'], 'readwrite');
      const store = transaction.objectStore('backups_diarios');

      const snapshot = {
        id: idBackup,
        fecha: fechaHoy,
        timestamp,
        fechaHoraHumana: new Date().toLocaleString('es-MX'),
        totalProveedores: (estadoCompleto.catalogoProveedores || []).length,
        totalHojasRegistradas: Object.keys(estadoCompleto.hojasPorFecha || {}).length,
        estado: JSON.parse(JSON.stringify(estadoCompleto))
      };

      store.put(snapshot);

      // Limpiar backups antiguos si hay más de 30
      const countReq = store.count();
      countReq.onsuccess = () => {
        if (countReq.result > 30) {
          const allReq = store.getAll();
          allReq.onsuccess = () => {
            const lista = allReq.result || [];
            lista.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            // Eliminar los más viejos que pasen de 30
            const eliminar = lista.slice(0, lista.length - 30);
            eliminar.forEach(b => store.delete(b.id));
          };
        }
      };

      transaction.oncomplete = () => {
        console.log(`Respaldo automático del día ${fechaHoy} guardado en IndexedDB`);
        resolve(true);
      };
      transaction.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('Error al guardar backup diario:', err);
    return false;
  }
}

/**
 * Obtiene la lista de respaldos automáticos disponibles
 */
export async function obtenerListaBackupsDiarios() {
  try {
    const db = await abrirBaseDatos();
    if (!db) return [];

    return new Promise((resolve) => {
      const transaction = db.transaction(['backups_diarios'], 'readonly');
      const store = transaction.objectStore('backups_diarios');
      const req = store.getAll();

      req.onsuccess = () => {
        const lista = (req.result || []).map(b => ({
          id: b.id,
          fecha: b.fecha,
          fechaHoraHumana: b.fechaHoraHumana,
          totalProveedores: b.totalProveedores,
          totalHojasRegistradas: b.totalHojasRegistradas
        }));
        lista.sort((a, b) => b.fecha.localeCompare(a.fecha));
        resolve(lista);
      };
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    console.warn('Error al listar backups de IndexedDB:', err);
    return [];
  }
}

/**
 * Carga un respaldo automático específico para restaurarlo
 */
export async function cargarBackupDiarioPorId(idBackup) {
  try {
    const db = await abrirBaseDatos();
    if (!db) return null;

    return new Promise((resolve) => {
      const transaction = db.transaction(['backups_diarios'], 'readonly');
      const store = transaction.objectStore('backups_diarios');
      const req = store.get(idBackup);

      req.onsuccess = () => resolve(req.result ? req.result.estado : null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Error al cargar backup de IndexedDB:', err);
    return null;
  }
}
