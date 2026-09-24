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
