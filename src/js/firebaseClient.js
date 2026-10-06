import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, onSnapshot } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const STORAGE_FIREBASE_KEY = 'adminfenix_firebase_config';

// Credenciales oficiales de Firebase del proyecto adminsuper-6b6ca
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBsjWEXOJaSqd7EBfCU7l7VPoJ_wRMSnIQ",
  authDomain: "adminsuper-6b6ca.firebaseapp.com",
  projectId: "adminsuper-6b6ca",
  storageBucket: "adminsuper-6b6ca.firebasestorage.app",
  messagingSenderId: "353558558349",
  appId: "1:353558558349:web:7cb9f599457f9fbeead4c4",
  measurementId: "G-BH1DS0RR9E"
};

let firebaseConfig = DEFAULT_FIREBASE_CONFIG;

try {
  const savedConfig = localStorage.getItem(STORAGE_FIREBASE_KEY);
  if (savedConfig) {
    const parsed = JSON.parse(savedConfig);
    if (parsed && parsed.projectId) {
      firebaseConfig = parsed;
    }
  }
} catch (e) {
  console.error('Error al leer configuración de Firebase:', e);
}

let app = null;
let db = null;
let auth = null;

// Identificador único de este dispositivo para evitar bucles de eco en tiempo real
export const DISPOSITIVO_ID = 'dev_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();

export function inicializarFirebase(config = null) {
  try {
    if (config) {
      firebaseConfig = config;
      localStorage.setItem(STORAGE_FIREBASE_KEY, JSON.stringify(config));
    }

    if (!firebaseConfig || !firebaseConfig.projectId) {
      console.log('Firebase aún no está configurado con credenciales activas.');
      return false;
    }

    app = initializeApp(firebaseConfig);
    db = getFirestore(app);

    try {
      auth = getAuth(app);
      signInAnonymously(auth).catch(err => {
        console.log('Autenticación anónima omitida o no requerida:', err?.message || err);
      });
    } catch (eAuth) {
      console.warn('Auth no disponible:', eAuth);
    }

    console.log('Firebase conectado correctamente al proyecto:', firebaseConfig.projectId);
    return true;
  } catch (error) {
    console.error('Error al inicializar Firebase:', error);
    return false;
  }
}

// Intentar inicialización automática
inicializarFirebase();

export function isFirebaseConectado() {
  return db !== null;
}

export function getFirebaseConfigActual() {
  return firebaseConfig;
}

/**
 * Guarda o actualiza la hoja de un día específico en Cloud Firestore
 * @param {string} fecha Formato YYYY-MM-DD (ej: '2026-09-24')
 * @param {object} datosHoja Estructura completa de la hoja contable
 */
export async function guardarHojaEnFirestore(fecha, datosHoja) {
  if (!db) {
    return { ok: false, error: 'Firebase no inicializado' };
  }

  try {
    const docRef = doc(db, 'hojas_diarias', fecha);
    const payload = {
      ...datosHoja,
      fecha,
      actualizadoEn: new Date().toISOString(),
      actualizadoPor: DISPOSITIVO_ID
    };

    await setDoc(docRef, payload, { merge: true });
    console.log(`Hoja del día ${fecha} guardada exitosamente en Firestore`);
    return { ok: true };
  } catch (error) {
    console.error(`Error al guardar en Firestore (${fecha}):`, error);
    return { ok: false, error };
  }
}

/**
 * Carga la hoja contable de un día específico desde Cloud Firestore
 * @param {string} fecha Formato YYYY-MM-DD
 */
export async function cargarHojaDeFirestore(fecha) {
  if (!db) return null;

  try {
    const docRef = doc(db, 'hojas_diarias', fecha);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      console.log(`Hoja del día ${fecha} cargada desde Firestore`);
      return snap.data();
    }
    return null;
  } catch (error) {
    console.error(`Error al cargar hoja de Firestore (${fecha}):`, error);
    return null;
  }
}

/**
 * Suscripción en tiempo real a los cambios de la hoja diaria de una fecha
 * Permite que cualquier dispositivo conectado vea los cambios inmediatamente
 * @param {string} fecha Formato YYYY-MM-DD
 * @param {function} callback Recibe los datos actualizados de la hoja
 * @returns {function} Función para cancelar la suscripción
 */
export function escucharHojaEnFirestore(fecha, callback) {
  if (!db || !fecha) return () => {};

  try {
    const docRef = doc(db, 'hojas_diarias', fecha);
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        // Solo notificar si el cambio no provino de este mismo dispositivo local
        if (data && data.actualizadoPor !== DISPOSITIVO_ID) {
          console.log(`Actualización en tiempo real recibida para hoja ${fecha} desde otro dispositivo`);
          callback(data);
        }
      }
    }, (error) => {
      console.warn(`Error en listener de hoja ${fecha}:`, error);
    });

    return unsubscribe;
  } catch (e) {
    console.error('Error al escuchar hoja en Firestore:', e);
    return () => {};
  }
}

/**
 * Guarda los proveedores globales (catálogo maestro, agenda semanal y precios) en Firestore
 */
export async function guardarProveedoresGlobalFirestore({ catalogoProveedores, proveedoresAgenda, preciosGuardadosPan, preciosGuardadosTortilla }) {
  if (!db) return { ok: false, error: 'Firebase no inicializado' };

  try {
    const docRef = doc(db, 'sistema_global', 'proveedores_datos');
    const payload = {
      catalogoProveedores: catalogoProveedores || [],
      proveedoresAgenda: proveedoresAgenda || [],
      preciosGuardadosPan: preciosGuardadosPan || {},
      preciosGuardadosTortilla: preciosGuardadosTortilla || {},
      actualizadoEn: new Date().toISOString(),
      actualizadoPor: DISPOSITIVO_ID
    };

    await setDoc(docRef, payload, { merge: true });
    console.log('Proveedores globales guardados exitosamente en Firestore');
    return { ok: true };
  } catch (error) {
    console.error('Error al guardar proveedores globales en Firestore:', error);
    return { ok: false, error };
  }
}

/**
 * Carga los proveedores globales desde Firestore
 */
export async function cargarProveedoresGlobalFirestore() {
  if (!db) return null;

  try {
    const docRef = doc(db, 'sistema_global', 'proveedores_datos');
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      console.log('Proveedores globales cargados desde Firestore');
      return snap.data();
    }
    return null;
  } catch (error) {
    console.error('Error al cargar proveedores globales de Firestore:', error);
    return null;
  }
}

/**
 * Suscripción en tiempo real a los cambios de proveedores globales
 * @param {function} callback Recibe los datos actualizados de proveedores
 * @returns {function} Función para cancelar la suscripción
 */
export function escucharProveedoresGlobalFirestore(callback) {
  if (!db) return () => {};

  try {
    const docRef = doc(db, 'sistema_global', 'proveedores_datos');
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.actualizadoPor !== DISPOSITIVO_ID) {
          console.log('Actualización en tiempo real de proveedores recibida desde otro dispositivo');
          callback(data);
        }
      }
    }, (error) => {
      console.warn('Error en listener de proveedores globales:', error);
    });

    return unsubscribe;
  } catch (e) {
    console.error('Error al escuchar proveedores en Firestore:', e);
    return () => {};
  }
}

/**
 * Obtiene la lista de fechas disponibles registradas en Firestore
 */
export async function listarFechasGuardadasFirestore() {
  if (!db) return [];

  try {
    const colRef = collection(db, 'hojas_diarias');
    const snap = await getDocs(colRef);
    const fechas = [];
    snap.forEach(d => fechas.push(d.id));
    return fechas.sort().reverse();
  } catch (error) {
    console.error('Error al listar fechas en Firestore:', error);
    return [];
  }
}

// Límite de almacenamiento gratuito de Firebase Firestore (Plan Spark: 1 GiB = 1,024 MB)
export const LIMITE_FIRESTORE_BYTES = 1024 * 1024 * 1024; // 1,073,741,824 bytes
const STORAGE_STATS_CACHE_KEY = 'adminfenix_firebase_storage_stats';

/**
 * Mide el tamaño exacto en bytes de un texto UTF-8
 */
function calcularBytesTexto(str) {
  if (!str) return 0;
  try {
    return new Blob([str]).size;
  } catch (e) {
    return (new TextEncoder().encode(str)).length;
  }
}

/**
 * Calcula el uso actual de memoria en la base de datos de Firebase Firestore y cuánto le falta para llenarse.
 * @param {boolean} forzarRecalculo Si es true, consulta Firestore en vivo ignorando el caché
 * @returns {Promise<object>} Estadísticas detalladas de memoria
 */
export async function obtenerEstadisticasMemoriaFirestore(forzarRecalculo = false) {
  // 1. Verificar si hay un resultado reciente en caché (3 minutos)
  if (!forzarRecalculo) {
    try {
      const cacheStr = localStorage.getItem(STORAGE_STATS_CACHE_KEY);
      if (cacheStr) {
        const cache = JSON.parse(cacheStr);
        if (cache && cache.timestamp && (Date.now() - cache.timestamp < 180000)) {
          return cache;
        }
      }
    } catch (e) {
      console.warn('Error al leer caché de memoria Firebase:', e);
    }
  }

  // 2. Si Firebase no está activo, estimar con base en almacenamiento local
  if (!db) {
    return estimarMemoriaFirestoreLocal();
  }

  try {
    // 3. Consultar colección hojas_diarias en Firestore
    const colRef = collection(db, 'hojas_diarias');
    const snap = await getDocs(colRef);
    let totalBytesHojas = 0;
    const cantidadHojas = snap.size;

    snap.forEach(docSnap => {
      const data = docSnap.data();
      const jsonStr = JSON.stringify(data);
      // Tamaño JSON + id de documento + 32 bytes de metadatos Firestore
      const bytesDoc = calcularBytesTexto(jsonStr) + (docSnap.id.length + 32);
      totalBytesHojas += bytesDoc;
    });

    // 4. Consultar colección sistema_global
    let bytesGlobal = 0;
    try {
      const globalDocRef = doc(db, 'sistema_global', 'proveedores_datos');
      const snapGlobal = await getDoc(globalDocRef);
      if (snapGlobal.exists()) {
        const dataGlobal = snapGlobal.data();
        bytesGlobal = calcularBytesTexto(JSON.stringify(dataGlobal)) + 64;
      }
    } catch (eG) {
      console.warn('No se pudo leer sistema_global para estadísticas:', eG);
    }

    const bytesUsados = totalBytesHojas + bytesGlobal;
    const bytesTotales = LIMITE_FIRESTORE_BYTES;
    const bytesRestantes = Math.max(0, bytesTotales - bytesUsados);
    const porcentajeUsado = (bytesUsados / bytesTotales) * 100;
    const porcentajeRestante = Math.max(0, 100 - porcentajeUsado);

    const stats = {
      conectado: true,
      esEstimacion: false,
      bytesUsados,
      bytesRestantes,
      bytesTotales,
      mbUsados: (bytesUsados / (1024 * 1024)).toFixed(2),
      mbRestantes: (bytesRestantes / (1024 * 1024)).toFixed(2),
      mbTotales: 1024,
      kbUsados: (bytesUsados / 1024).toFixed(1),
      kbRestantes: (bytesRestantes / 1024).toFixed(1),
      porcentajeUsado: porcentajeUsado < 0.01 && bytesUsados > 0 ? 0.01 : parseFloat(porcentajeUsado.toFixed(2)),
      porcentajeRestante: parseFloat(porcentajeRestante.toFixed(2)),
      cantidadHojas,
      bytesHojas: totalBytesHojas,
      bytesGlobal,
      timestamp: Date.now(),
      horaActualizacion: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    };

    try {
      localStorage.setItem(STORAGE_STATS_CACHE_KEY, JSON.stringify(stats));
    } catch (e) {}

    return stats;
  } catch (error) {
    console.error('Error al calcular uso de memoria en Firestore:', error);
    return estimarMemoriaFirestoreLocal();
  }
}

/**
 * Estimación defensiva en base a datos locales
 */
function estimarMemoriaFirestoreLocal() {
  let bytesLocales = 0;
  let cantHojas = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('adminfenix_hoja_') || k.includes('hoja') || k.includes('adminfenix_'))) {
        const v = localStorage.getItem(k);
        bytesLocales += calcularBytesTexto(v);
        if (k.includes('hoja_')) cantHojas++;
      }
    }
  } catch (e) {}

  const bytesUsados = Math.max(bytesLocales, 25000);
  const bytesTotales = LIMITE_FIRESTORE_BYTES;
  const bytesRestantes = Math.max(0, bytesTotales - bytesUsados);
  const porcentajeUsado = (bytesUsados / bytesTotales) * 100;

  return {
    conectado: isFirebaseConectado(),
    esEstimacion: true,
    bytesUsados,
    bytesRestantes,
    bytesTotales,
    mbUsados: (bytesUsados / (1024 * 1024)).toFixed(2),
    mbRestantes: (bytesRestantes / (1024 * 1024)).toFixed(2),
    mbTotales: 1024,
    kbUsados: (bytesUsados / 1024).toFixed(1),
    kbRestantes: (bytesRestantes / 1024).toFixed(1),
    porcentajeUsado: porcentajeUsado < 0.01 ? 0.01 : parseFloat(porcentajeUsado.toFixed(2)),
    porcentajeRestante: parseFloat((100 - porcentajeUsado).toFixed(2)),
    cantidadHojas: Math.max(cantHojas, 1),
    bytesHojas: bytesUsados,
    bytesGlobal: 0,
    timestamp: Date.now(),
    horaActualizacion: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  };
}

