import { guardarHojaEnFirestore, cargarHojaDeFirestore, isFirebaseConectado } from './firebaseClient.js';

const STORAGE_KEY = 'adminfenix_data_v4';

// Nombres de días en español
export const NOMBRES_DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const NOMBRES_MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sept', 'Oct', 'Nov', 'Dic'];

// Obtener fecha actual en formato YYYY-MM-DD local
export function getFechaHoyLocal() {
  const ahora = new Date();
  const ano = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

// Catálogo predeterminado de proveedores de Minisúper Fénix
export const CATALOGO_PROVEEDORES_PREDETERMINADOS = [
  'Bimbo',
  'Bonafont',
  'Botanas Leo',
  'Cerveza Corona',
  'Cerveza Modelo',
  'Coca-Cola',
  'Cremería Ags',
  'Flan de Elote',
  'Frijoles de Bote',
  'Gamesa',
  'Hielo y Extras',
  'Huevo San Juan',
  'Lala',
  'Marinela',
  'Pan Celia',
  'Pan Espacio',
  'Pan Mirella',
  'Pepsi',
  'Sabritas',
  'San Marcos',
  'Sr Combi',
  'Tortilla Amarilla',
  'Tortilla La Ideal',
  'Tortilla Monreal',
  'Tostadas Mission',
  'Totopos Riko',
  'Yakult'
];

// Nombres fijos oficiales de proveedores de pan y tortilla (no se deben de cambiar)
export const PROVEEDORES_PAN_OFICIALES = [
  'PAN CELIA',
  'PAN MIRELLA',
  'PAN ESPACIO',
  'PAN CELIA (Turno 2)',
  'PAN MIRELLA (Turno 2)',
  'PAN ESPACIO (Turno 2)'
];

export const PROVEEDORES_TORTILLA_OFICIALES = [
  'TORTILLA IDEAL',
  'TORTILLA AMARILLA',
  'TORT. MONREAL',
  'TORTILLA IDEAL'
];

// Datos iniciales con los datos reales de la hoja en papel física
const SEED_DATA = {
  dia: 'Martes',
  fecha: '2026-09-15',
  diaNum: 15,
  mes: 'Sept',
  ano: 2026,
  cantidadInicial: 1500,
  cajeroActual: 'Don Manuel (Encargado)',

  // Catálogos recordatorios de precio por pieza y kilo
  preciosGuardadosPan: {
    'PAN CELIA': 4.05,
    'PAN MIRELLA': 5.50,
    'PAN ESPACIO': 5.50
  },
  preciosGuardadosTortilla: {
    'TORTILLA IDEAL': 22.00,
    'TORTILLA AMARILLA': 22.00,
    'TORT. MONREAL': 23.00
  },

  // 1. Conteo Pan y Tortilla (Hoja Física)
  conteoPan: [
    { id: 'cp-1', proveedor: 'PAN CELIA', bol: 70, dul: 50, camb: 5, total: 115, precioPieza: 4.05, costo: 465.75 },
    { id: 'cp-2', proveedor: 'PAN MIRELLA', bol: 40, dul: 25, camb: 15, total: 50, precioPieza: 5.50, costo: 275 },
    { id: 'cp-3', proveedor: 'PAN ESPACIO', bol: 30, dul: 50, camb: 11, total: 69, precioPieza: 5.50, costo: 379.5 },
    { id: 'cp-4', proveedor: 'PAN CELIA (Turno 2)', bol: '', dul: '', camb: '', total: '', precioPieza: 4.05, costo: '' },
    { id: 'cp-5', proveedor: 'PAN MIRELLA (Turno 2)', bol: '', dul: '', camb: '', total: '', precioPieza: 5.50, costo: '' },
    { id: 'cp-6', proveedor: 'PAN ESPACIO (Turno 2)', bol: '', dul: '', camb: '', total: '', precioPieza: 5.50, costo: '' }
  ],

  conteoTortilla: [
    { id: 'ct-1', proveedor: 'TORTILLA IDEAL', camb: '', nuev: 20, total: 20, precioKilo: 22.00, costo: 440 },
    { id: 'ct-2', proveedor: 'TORTILLA AMARILLA', camb: '', nuev: 5, total: 5, precioKilo: 22.00, costo: 110 },
    { id: 'ct-3', proveedor: 'TORT. MONREAL', camb: '', nuev: 10, total: 10, precioKilo: 23.00, costo: 230 },
    { id: 'ct-4', proveedor: 'TORTILLA IDEAL', camb: '', nuev: 3, total: 3, precioKilo: 22.00, costo: 66 }
  ],

  // 2. Compras y Proveedores Pagados (Renglones 1 al 30 de la hoja física con horas de registro)
  comprasProveedores: [
    { nota: 1, proveedor: 'Tortilla La Ideal', pagado: 440, tipoPago: 'Efectivo', hora: '08:00 a. m.', fechaRegistro: '2026-09-15', bloqueado: true },
    { nota: 2, proveedor: 'Pan Mirella', pagado: 275, tipoPago: 'Efectivo', hora: '08:15 a. m.', fechaRegistro: '2026-09-15', bloqueado: true },
    { nota: 3, proveedor: 'Pan Espacio', pagado: 380, tipoPago: 'Efectivo', hora: '08:30 a. m.', fechaRegistro: '2026-09-15', bloqueado: true },
    { nota: 4, proveedor: 'Pan Celia', pagado: 467, tipoPago: 'Efectivo', hora: '08:45 a. m.', fechaRegistro: '2026-09-15', bloqueado: true },
    { nota: 5, proveedor: 'Tortilla Monreal', pagado: 230, tipoPago: 'Efectivo', hora: '09:00 a. m.', fechaRegistro: '2026-09-15', bloqueado: true },
    { nota: 6, proveedor: 'Tostadas Mission', pagado: 236, tipoPago: 'Efectivo', hora: '09:15 a. m.', fechaRegistro: '2026-09-15', bloqueado: true },
    { nota: 7, proveedor: 'Cerveza', pagado: 15775, tipoPago: 'Transferencia', hora: '09:30 a. m.', fechaRegistro: '2026-09-15', bloqueado: true },
    { nota: 8, proveedor: 'Flan de Elote', pagado: 330, tipoPago: 'Efectivo', hora: '09:45 a. m.', fechaRegistro: '2026-09-15', bloqueado: true },
    { nota: 9, proveedor: 'Totopos Riko', pagado: 294, tipoPago: 'Efectivo', hora: '10:00 a. m.', fechaRegistro: '2026-09-15', bloqueado: true },
    { nota: 10, proveedor: 'Yakult', pagado: 195, tipoPago: 'Efectivo', hora: '10:15 a. m.', fechaRegistro: '2026-09-15', bloqueado: true },
    { nota: 11, proveedor: 'Pepsi', pagado: 2611, tipoPago: 'Efectivo', hora: '10:30 a. m.', fechaRegistro: '2026-09-15', bloqueado: true },
    { nota: 12, proveedor: 'Cremería Ags', pagado: 222, tipoPago: 'Efectivo', hora: '10:45 a. m.', fechaRegistro: '2026-09-15', bloqueado: true },
    { nota: 13, proveedor: 'San Marcos', pagado: 222, tipoPago: 'Efectivo', hora: '11:00 a. m.', fechaRegistro: '2026-09-15', bloqueado: true },
    { nota: 14, proveedor: 'Botanas Leo', pagado: 240, tipoPago: 'Efectivo', hora: '11:15 a. m.', fechaRegistro: '2026-09-15', bloqueado: true },
    { nota: 15, proveedor: 'Gamesa', pagado: 1017, tipoPago: 'Efectivo', hora: '11:30 a. m.', fechaRegistro: '2026-09-15', bloqueado: true },
    { nota: 16, proveedor: 'Frijoles de Bote', pagado: 376, tipoPago: 'Efectivo', hora: '11:45 a. m.', fechaRegistro: '2026-09-15', bloqueado: true },
    { nota: 17, proveedor: 'Bonafont', pagado: 599, tipoPago: 'Efectivo', hora: '12:00 p. m.', fechaRegistro: '2026-09-15', bloqueado: true },
    { nota: 18, proveedor: 'Huevo San Juan', pagado: 1036, tipoPago: 'Efectivo', hora: '12:15 p. m.', fechaRegistro: '2026-09-15', bloqueado: true },
    { nota: 19, proveedor: 'Tortilla Ideal', pagado: 66, tipoPago: 'Efectivo', hora: '12:30 p. m.', fechaRegistro: '2026-09-15', bloqueado: true },
    { nota: 20, proveedor: 'Lala', pagado: 1180, tipoPago: 'Efectivo', hora: '12:45 p. m.', fechaRegistro: '2026-09-15', bloqueado: true }
  ],

  // 3. Préstamos o Pendientes de Pago
  prestamosPendientes: [
    { id: 'pres-1', proveedor: 'Sr Combi', pendiente: 3000, pagado: 0, nota: 'Préstamo acordado', liquidado: false, bloqueado: true },
    { id: 'pres-2', proveedor: 'Grupo Modelo', pendiente: 8500, pagado: 0, nota: 'Pago de fin de semana', liquidado: false, bloqueado: true }
  ],

  // 4. Corte y Arqueo (Columnas de Turnos: Cantidad 1, Cantidad 2, Cantidad 3)
  // LAS MONEDAS SE REGISTRAN POR MONTO TOTAL EN PESOS
  arqueoColumnas: [
    {
      id: 'col-1',
      nombre: 'Arqueo 1 (Turno 1)',
      tarjetas: 2450,
      sistema: 29500,
      billetes: 8500,
      mon1: 180,
      mon2: 240,
      mon5: 450,
      mon10: 890,
      morralla: 1760
    },
    {
      id: 'col-2',
      nombre: 'Arqueo 2 (Turno 2)',
      tarjetas: 3800,
      sistema: 15400,
      billetes: 11200,
      mon1: 95,
      mon2: 160,
      mon5: 350,
      mon10: 600,
      morralla: 1205
    },
    {
      id: 'col-3',
      nombre: 'Arqueo 3 (Cierre)',
      tarjetas: 0,
      sistema: 0,
      billetes: 0,
      mon1: 0,
      mon2: 0,
      mon5: 0,
      mon10: 0,
      morralla: 0
    }
  ],

  // 5. Retiros de Efectivo
  retiros: [
    { id: 'ret-1', monto: 1500, nombre: 'Don Manuel', concepto: 'Caja Fuerte', hora: '10:15', autorizo: 'Gerencia', responsable: 'Don Manuel' },
    { id: 'ret-2', monto: 3000, nombre: 'Supervisor Roberto', concepto: 'Depósito Bancario', hora: '14:20', autorizo: 'Don Manuel', responsable: 'Supervisor Roberto' }
  ],

  // 6. Cascada (Máquinas)
  cascada: {
    monedas: 1850,
    premios: 450,
    total: 1400,
    totalCorte: 1400,
    porcentajeEllos: 60,
    porcentajeNosotros: 40,
    ellosTotal: 840,
    nosotrosTotal: 560
  },

  // 7. Máquina Muñecos (Peluches)
  maquinaMunecos: {
    monedas: 2200,
    total: 2200,
    totalCorte: 2200,
    porcentajeEllos: 60,
    porcentajeNosotros: 40,
    ellosTotal: 1320,
    nosotrosTotal: 880
  },

  // 8. Máquinas Monto Individual
  maquinasIndividuales: {
    maq1_1: 420,
    maq2_1: 380,
    maq3_5: 950,
    total: 1750,
    porcentajeProveedor: 60,
    porcentajeNosotros: 40,
    proveedorTotal: 1050,
    nosotrosTotal: 700,
    nota: 'Corte de máquinas'
  },

  // 9. Agenda Semanal (Pipeline Lunes a Domingo)
  proveedores: [
    {
      id: 'p-1',
      dia: 'lunes',
      proveedor: 'Coca-Cola',
      hora: '09:00',
      tipoPago: 'Transferencia',
      presupuestoAprox: 6500,
      preventaPresupuesto: 6500,
      ventaAnterior: 6320,
      compra: 6320,
      estado: 'programado',
      yaVino: false,
      horaVino: '',
      montoPagadoReal: 0,
      categoria: 'refrescos',
      listaPedido: [
        { id: 'item-1', producto: 'Coca-Cola 600ml No Retornable', cantidad: '3 cajas', notas: 'Alta rotación' },
        { id: 'item-2', producto: 'Coca-Cola 2.5L Retornable', cantidad: '4 cajas', notas: 'Tener envases listos' },
        { id: 'item-3', producto: 'Sprite 600ml', cantidad: '1 caja', notas: '' },
        { id: 'item-4', producto: 'Agua Ciel 1L', cantidad: '2 paquetes', notas: '' }
      ]
    },
    {
      id: 'p-2',
      dia: 'lunes',
      proveedor: 'Bimbo',
      hora: '10:30',
      tipoPago: 'Efectivo',
      presupuestoAprox: 2800,
      preventaPresupuesto: 2800,
      ventaAnterior: 2650,
      compra: 0,
      estado: 'programado',
      yaVino: false,
      horaVino: '',
      montoPagadoReal: 0,
      categoria: 'panaderia',
      listaPedido: [
        { id: 'item-1', producto: 'Pan Blanco Grande', cantidad: '15 pzas', notas: '' },
        { id: 'item-2', producto: 'Pan Integral Grande', cantidad: '10 pzas', notas: '' },
        { id: 'item-3', producto: 'Medias Noches Bimbo', cantidad: '8 paq', notas: '' },
        { id: 'item-4', producto: 'Donas Glaseadas / Espolvoreadas', cantidad: '12 pzas', notas: 'Revisar fecha caducidad' }
      ]
    },
    {
      id: 'p-3',
      dia: 'martes',
      proveedor: 'Tortilla La Ideal',
      hora: '08:00',
      tipoPago: 'Efectivo',
      presupuestoAprox: 440,
      preventaPresupuesto: 440,
      ventaAnterior: 440,
      compra: 0,
      estado: 'programado',
      yaVino: false,
      horaVino: '',
      montoPagadoReal: 0,
      categoria: 'abarrotes',
      listaPedido: [
        { id: 'item-1', producto: 'Kilos de Tortilla Caliente', cantidad: '20 kg', notas: 'Entrega temprana 8:00 am' }
      ]
    },
    {
      id: 'p-4',
      dia: 'martes',
      proveedor: 'Pan Mirella',
      hora: '08:30',
      tipoPago: 'Efectivo',
      presupuestoAprox: 275,
      preventaPresupuesto: 275,
      ventaAnterior: 275,
      compra: 0,
      estado: 'programado',
      yaVino: false,
      horaVino: '',
      montoPagadoReal: 0,
      categoria: 'panaderia',
      listaPedido: [
        { id: 'item-1', producto: 'Bolillo Tradicional', cantidad: '40 pzas', notas: '' },
        { id: 'item-2', producto: 'Pan Dulce Surtido', cantidad: '25 pzas', notas: 'Conchas y cuernos' }
      ]
    },
    {
      id: 'p-5',
      dia: 'martes',
      proveedor: 'Pepsi',
      hora: '11:00',
      tipoPago: 'Efectivo',
      presupuestoAprox: 2600,
      preventaPresupuesto: 2600,
      ventaAnterior: 2611,
      compra: 0,
      estado: 'programado',
      yaVino: false,
      horaVino: '',
      montoPagadoReal: 0,
      categoria: 'refrescos',
      listaPedido: [
        { id: 'item-1', producto: 'Pepsi 600ml Desechable', cantidad: '2 cajas', notas: '' },
        { id: 'item-2', producto: 'Manzanita Sol 600ml', cantidad: '2 cajas', notas: '' },
        { id: 'item-3', producto: 'Mirinda 600ml', cantidad: '1 caja', notas: '' },
        { id: 'item-4', producto: 'Electrolit / Gatorade', cantidad: '12 pzas', notas: 'Sabores uva y naranja' }
      ]
    },
    {
      id: 'p-6',
      dia: 'martes',
      proveedor: 'Lala',
      hora: '12:30',
      tipoPago: 'Efectivo',
      presupuestoAprox: 1200,
      preventaPresupuesto: 1200,
      ventaAnterior: 1180,
      compra: 0,
      estado: 'programado',
      yaVino: false,
      horaVino: '',
      montoPagadoReal: 0,
      categoria: 'lacteos',
      listaPedido: [
        { id: 'item-1', producto: 'Leche Entera Lala 1L', cantidad: '24 pzas', notas: '' },
        { id: 'item-2', producto: 'Leche Deslactosada Lala 1L', cantidad: '18 pzas', notas: '' },
        { id: 'item-3', producto: 'Yoghurt Bebible Surtido', cantidad: '12 pzas', notas: 'Fresa y durazno' }
      ]
    },
    {
      id: 'p-7',
      dia: 'miercoles',
      proveedor: 'Cerveza Corona',
      hora: '10:00',
      tipoPago: 'Transferencia',
      presupuestoAprox: 15775,
      preventaPresupuesto: 15775,
      ventaAnterior: 14800,
      compra: 0,
      estado: 'programado',
      yaVino: false,
      horaVino: '',
      montoPagadoReal: 0,
      categoria: 'cerveza',
      listaPedido: [
        { id: 'item-1', producto: 'Corona Extra 355ml Mega / Cuartito', cantidad: '10 cartones', notas: 'Revisar envases retornables' },
        { id: 'item-2', producto: 'Victoria 355ml', cantidad: '8 cartones', notas: '' },
        { id: 'item-3', producto: 'Modelo Especial Lata 355ml', cantidad: '5 planchas', notas: '' }
      ]
    },
    {
      id: 'p-8',
      dia: 'miercoles',
      proveedor: 'Bimbo',
      hora: '10:30',
      tipoPago: 'Efectivo',
      presupuestoAprox: 2800,
      preventaPresupuesto: 2800,
      ventaAnterior: 2750,
      compra: 0,
      estado: 'programado',
      yaVino: false,
      horaVino: '',
      montoPagadoReal: 0,
      categoria: 'panaderia',
      listaPedido: [
        { id: 'item-1', producto: 'Pan Blanco Grande', cantidad: '12 pzas', notas: '' },
        { id: 'item-2', producto: 'Bimbollos 8 pzas', cantidad: '6 paq', notas: '' },
        { id: 'item-3', producto: 'Pan Tostado Clásico', cantidad: '8 paq', notas: '' }
      ]
    },
    {
      id: 'p-9',
      dia: 'jueves',
      proveedor: 'Gamesa / Sabritas',
      hora: '11:30',
      tipoPago: 'Efectivo',
      presupuestoAprox: 1200,
      preventaPresupuesto: 1200,
      ventaAnterior: 1017,
      compra: 0,
      estado: 'programado',
      yaVino: false,
      horaVino: '',
      montoPagadoReal: 0,
      categoria: 'botanas',
      listaPedido: [
        { id: 'item-1', producto: 'Sabritas Sal Clásicas', cantidad: '15 pzas', notas: 'Tamaño botana' },
        { id: 'item-2', producto: 'Doritos Nacho', cantidad: '15 pzas', notas: '' },
        { id: 'item-3', producto: 'Galletas Marías Gamesa', cantidad: '10 rollos', notas: '' },
        { id: 'item-4', producto: 'Emperador Chocolate', cantidad: '12 paq', notas: '' }
      ]
    },
    {
      id: 'p-10',
      dia: 'viernes',
      proveedor: 'Huevo San Juan',
      hora: '10:00',
      tipoPago: 'Efectivo',
      presupuestoAprox: 1100,
      preventaPresupuesto: 1100,
      ventaAnterior: 1036,
      compra: 0,
      estado: 'programado',
      yaVino: false,
      horaVino: '',
      montoPagadoReal: 0,
      categoria: 'abarrotes',
      listaPedido: [
        { id: 'item-1', producto: 'Caja Huevo Blanco San Juan 360 pzas', cantidad: '1 caja grande', notas: 'Revisar que no venga roto' }
      ]
    },
    {
      id: 'p-11',
      dia: 'sabado',
      proveedor: 'Bonafont',
      hora: '09:30',
      tipoPago: 'Efectivo',
      presupuestoAprox: 600,
      preventaPresupuesto: 600,
      ventaAnterior: 599,
      compra: 0,
      estado: 'programado',
      yaVino: false,
      horaVino: '',
      montoPagadoReal: 0,
      categoria: 'refrescos',
      listaPedido: [
        { id: 'item-1', producto: 'Garrafones de Agua 20L', cantidad: '15 garrafones', notas: 'Cambio de envases limpios' },
        { id: 'item-2', producto: 'Botellas Agua 1.5L', cantidad: '2 paquetes', notas: '' }
      ]
    },
    {
      id: 'p-12',
      dia: 'domingo',
      proveedor: 'Hielo y Extras',
      hora: '08:00',
      tipoPago: 'Efectivo',
      presupuestoAprox: 800,
      preventaPresupuesto: 800,
      ventaAnterior: 750,
      compra: 0,
      estado: 'programado',
      yaVino: false,
      horaVino: '',
      montoPagadoReal: 0,
      categoria: 'abarrotes',
      listaPedido: [
        { id: 'item-1', producto: 'Bolsas de Hielo en Cubo 5kg', cantidad: '15 bolsas', notas: 'Para el conservador principal' }
      ]
    }
  ],

  // 10. Compatibilidad con el módulo de operaciones analíticas (CajaOperaciones)
  pagosDia: [
    { id: 'pago-1', proveedor: 'Tortilla La Ideal', monto: 440, metodo: 'Efectivo de Caja', hora: '08:00', comprobante: 'Nota #1', cajero: 'Don Manuel', notas: 'Entrega matutina' },
    { id: 'pago-2', proveedor: 'Pan Mirella', monto: 275, metodo: 'Efectivo de Caja', hora: '08:30', comprobante: 'Nota #2', cajero: 'Don Manuel', notas: 'Bolillo y dulce' },
    { id: 'pago-3', proveedor: 'Pan Espacio', monto: 380, metodo: 'Efectivo de Caja', hora: '09:00', comprobante: 'Nota #3', cajero: 'Don Manuel', notas: 'Entrega dulce' },
    { id: 'pago-4', proveedor: 'Pan Celia', monto: 467, metodo: 'Efectivo de Caja', hora: '09:15', comprobante: 'Nota #4', cajero: 'Don Manuel', notas: 'Surtido completo' },
    { id: 'pago-5', proveedor: 'Cerveza', monto: 15775, metodo: 'Transferencia', hora: '10:00', comprobante: 'Factura F-982', cajero: 'Don Manuel', notas: 'Surtido de cerveza' },
    { id: 'pago-6', proveedor: 'Pepsi', monto: 2611, metodo: 'Efectivo de Caja', hora: '11:00', comprobante: 'Nota #11', cajero: 'Don Manuel', notas: 'Refresco retornable' }
  ],

  panaderos: [
    { id: 'pan-1', proveedor: 'PAN CELIA', cambios: 5, dulces: 50, bolillo: 70, total: 85, pagado: true, hora: '09:15' },
    { id: 'pan-2', proveedor: 'PAN MIRELLA', cambios: 15, dulces: 25, bolillo: 40, total: 50, pagado: true, hora: '08:30' },
    { id: 'pan-3', proveedor: 'PAN ESPACIO', cambios: 11, dulces: 50, bolillo: 30, total: 69, pagado: true, hora: '09:00' }
  ],

  tortillerias: [
    { id: 'tort-1', proveedor: 'TORTILLA IDEAL', cambio: 0, nuevo: 15, total: 20, pagado: true, hora: '08:00' },
    { id: 'tort-2', proveedor: 'TORTILLA AMARILLA', cambio: 0, nuevo: 5, total: 5, pagado: true, hora: '08:15' },
    { id: 'tort-3', proveedor: 'TORT. MONREAL', cambio: 0, nuevo: 7.5, total: 12, pagado: true, hora: '08:45' }
  ],

  pendientesPago: [
    { id: 'pend-1', proveedor: 'Sr Combi', monto: 3000, fechaVencimiento: '2026-09-18', concepto: 'Préstamo acordado', estado: 'pendiente', notas: 'Liquidación en próximos días' },
    { id: 'pend-2', proveedor: 'Grupo Modelo', monto: 8500, fechaVencimiento: '2026-09-19', concepto: 'Factura F-99432 (Cerveza)', estado: 'programado', notas: 'Pago de fin de semana' }
  ],

  arqueos: [
    {
      id: 'arq-1',
      turno: 'Arqueo 1 (Turno Mañana)',
      fecha: '2026-09-15',
      cajero: 'Don Manuel',
      tarjetas: 2450,
      yompTarjetas: 0,
      sistema: 29500,
      billetes: 8500,
      monedas1: 180, // pesos totales
      monedas2: 240, // pesos totales
      monedas5: 450, // pesos totales
      monedas10: 890, // pesos totales
      morralla: 1760,
      totalEfectivo: 10260,
      retirosTurno: 1500,
      pagosTurno: 26191,
      totalDeclarado: 38901,
      diferencia: 0,
      notas: 'Arqueo matutino'
    },
    {
      id: 'arq-2',
      turno: 'Arqueo 2 (Turno Tarde)',
      fecha: '2026-09-15',
      cajero: 'Don Manuel',
      tarjetas: 3800,
      yompTarjetas: 0,
      sistema: 15400,
      billetes: 11200,
      monedas1: 95,
      monedas2: 160,
      monedas5: 350,
      monedas10: 600,
      morralla: 1205,
      totalEfectivo: 12405,
      retirosTurno: 3000,
      pagosTurno: 0,
      totalDeclarado: 19205,
      diferencia: 0,
      notas: 'Arqueo vespertino'
    }
  ],

  maquinas: [
    { id: 'maq-1', fecha: '2026-09-15', nombreMaquina: 'Cascada', montoTotal: 1400, porcentajeTienda: 40, gananciaTienda: 560, pagoProveedor: 840, contadorAnterior: 0, contadorActual: 0, responsable: 'Don Manuel' },
    { id: 'maq-2', fecha: '2026-09-15', nombreMaquina: 'Máquina Muñecos (Peluches)', montoTotal: 2200, porcentajeTienda: 40, gananciaTienda: 880, pagoProveedor: 1320, contadorAnterior: 0, contadorActual: 0, responsable: 'Don Manuel' },
    { id: 'maq-3', fecha: '2026-09-15', nombreMaquina: 'Máquinas Individuales ($1, $1, $5)', montoTotal: 1750, porcentajeTienda: 40, gananciaTienda: 700, pagoProveedor: 1050, contadorAnterior: 0, contadorActual: 0, responsable: 'Don Manuel' }
  ]
};

class StateManager {
  constructor() {
    this.data = this.loadState();
    this.listeners = [];
    this.sincronizarProveedoresDesdeHoja();
  }

  loadState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const merged = { ...SEED_DATA, ...parsed };
        
        // Migración automática: cambiar TORT. SAN JOSE por TORTILLA AMARILLA si existe en datos guardados
        if (Array.isArray(merged.conteoTortilla)) {
          merged.conteoTortilla.forEach(t => {
            if (t.proveedor === 'TORT. SAN JOSE') t.proveedor = 'TORTILLA AMARILLA';
          });
        }
        if (Array.isArray(merged.tortillerias)) {
          merged.tortillerias.forEach(t => {
            if (t.proveedor === 'TORT. SAN JOSE') t.proveedor = 'TORTILLA AMARILLA';
          });
        }
        // Limpieza y normalización de comprasProveedores (sin campos vacíos predeterminados)
        if (Array.isArray(merged.comprasProveedores)) {
          merged.comprasProveedores = merged.comprasProveedores.filter(c => (c.proveedor && c.proveedor.trim() !== '') || (parseFloat(c.pagado) > 0));
          merged.comprasProveedores.forEach((c, idx) => {
            c.nota = idx + 1;
            if (!c.tipoPago) c.tipoPago = 'Efectivo';
            if (!c.hora && c.proveedor) {
              const baseHour = 8 + Math.floor(idx / 4);
              const baseMin = (idx % 4) * 15;
              const ampm = baseHour >= 12 ? 'p. m.' : 'a. m.';
              const displayHour = baseHour > 12 ? baseHour - 12 : baseHour;
              c.hora = `${String(displayHour).padStart(2, '0')}:${String(baseMin).padStart(2, '0')} ${ampm}`;
            }
            if (c.bloqueado === undefined) {
              c.bloqueado = !!(c.proveedor && (c.pagado > 0 || c.pagado));
            }
          });
        }
        // Limpieza de préstamos y retiros
        if (Array.isArray(merged.prestamosPendientes)) {
          merged.prestamosPendientes = merged.prestamosPendientes.filter(p => (p.proveedor && p.proveedor.trim() !== '') || (parseFloat(p.pendiente) > 0));
          merged.prestamosPendientes.forEach(p => {
            if (p.liquidado === undefined) p.liquidado = false;
            if (p.bloqueado === undefined) p.bloqueado = true;
          });
        }
        if (Array.isArray(merged.retiros)) {
          merged.retiros = merged.retiros.filter(r => (parseFloat(r.monto) > 0) || (r.nombre && r.nombre.trim() !== ''));
          merged.retiros.forEach(r => {
            if (r.bloqueado === undefined) r.bloqueado = true;
          });
        }

        // Catálogos recordatorios de precios
        if (!merged.preciosGuardadosPan) merged.preciosGuardadosPan = { ...SEED_DATA.preciosGuardadosPan };
        if (!merged.preciosGuardadosTortilla) merged.preciosGuardadosTortilla = { ...SEED_DATA.preciosGuardadosTortilla };

        // Limpieza y cálculo de conteoPan y conteoTortilla con nombres oficiales fijos
        if (Array.isArray(merged.conteoPan)) {
          merged.conteoPan.forEach((p, idx) => {
            p.proveedor = PROVEEDORES_PAN_OFICIALES[idx] || p.proveedor;
            if (p.bol === 0 || p.bol === '0') p.bol = '';
            if (p.dul === 0 || p.dul === '0') p.dul = '';
            if (p.camb === 0 || p.camb === '0') p.camb = '';
            const bol = parseFloat(p.bol) || 0;
            const dul = parseFloat(p.dul) || 0;
            const camb = parseFloat(p.camb) || 0;
            const tot = Math.max(0, bol + dul - camb);
            p.total = (bol > 0 || dul > 0 || camb > 0) ? tot : '';
            if (p.precioPieza === undefined || p.precioPieza === '') {
              p.precioPieza = merged.preciosGuardadosPan[p.proveedor] || '';
            }
            const precio = parseFloat(p.precioPieza) || 0;
            p.costo = (tot > 0 && precio > 0) ? (tot * precio) : (precio > 0 && (bol > 0 || dul > 0) ? 0 : '');
          });
        }
        if (Array.isArray(merged.conteoTortilla)) {
          merged.conteoTortilla.forEach((t, idx) => {
            t.proveedor = PROVEEDORES_TORTILLA_OFICIALES[idx] || t.proveedor;
            if (t.camb === 0 || t.camb === '0') t.camb = '';
            if (t.nuev === 0 || t.nuev === '0') t.nuev = '';
            const camb = parseFloat(t.camb) || 0;
            const nuev = parseFloat(t.nuev) || 0;
            const tot = Math.max(0, nuev - camb);
            t.total = (nuev > 0 || camb > 0) ? tot : '';
            if (t.precioKilo === undefined || t.precioKilo === '') {
              t.precioKilo = merged.preciosGuardadosTortilla[t.proveedor] || '';
            }
            const precio = parseFloat(t.precioKilo) || 0;
            t.costo = (tot > 0 && precio > 0) ? (tot * precio) : (precio > 0 && nuev > 0 ? 0 : '');
          });
        }

        if (!merged.hojasPorFecha) merged.hojasPorFecha = {};
        // Guardar la hoja original del 15 de Septiembre en el historial si aún no existe
        if (!merged.hojasPorFecha['2026-09-15']) {
          merged.hojasPorFecha['2026-09-15'] = JSON.parse(JSON.stringify(SEED_DATA));
        }

        if (merged.hojasPorFecha) {
          Object.values(merged.hojasPorFecha).forEach(h => {
            if (Array.isArray(h.comprasProveedores)) {
              h.comprasProveedores = h.comprasProveedores.filter(c => (c.proveedor && c.proveedor.trim() !== '') || (parseFloat(c.pagado) > 0));
              h.comprasProveedores.forEach((c, idx) => {
                c.nota = idx + 1;
                if (!c.tipoPago) c.tipoPago = 'Efectivo';
                if (!c.hora && c.proveedor) {
                  const baseHour = 8 + Math.floor(idx / 4);
                  const baseMin = (idx % 4) * 15;
                  const ampm = baseHour >= 12 ? 'p. m.' : 'a. m.';
                  const displayHour = baseHour > 12 ? baseHour - 12 : baseHour;
                  c.hora = `${String(displayHour).padStart(2, '0')}:${String(baseMin).padStart(2, '0')} ${ampm}`;
                }
                if (c.bloqueado === undefined) {
                  c.bloqueado = !!(c.proveedor && (c.pagado > 0 || c.pagado));
                }
              });
            }
            if (Array.isArray(h.prestamosPendientes)) {
              h.prestamosPendientes = h.prestamosPendientes.filter(p => (p.proveedor && p.proveedor.trim() !== '') || (parseFloat(p.pendiente) > 0));
              h.prestamosPendientes.forEach(p => {
                if (p.liquidado === undefined) p.liquidado = false;
                if (p.bloqueado === undefined) p.bloqueado = true;
              });
            }
            if (Array.isArray(h.retiros)) {
              h.retiros = h.retiros.filter(r => (parseFloat(r.monto) > 0) || (r.nombre && r.nombre.trim() !== ''));
              h.retiros.forEach(r => {
                if (r.bloqueado === undefined) r.bloqueado = true;
              });
            }
            if (Array.isArray(h.conteoPan)) {
              h.conteoPan.forEach((p, idx) => {
                p.proveedor = PROVEEDORES_PAN_OFICIALES[idx] || p.proveedor;
                if (p.bol === 0 || p.bol === '0') p.bol = '';
                if (p.dul === 0 || p.dul === '0') p.dul = '';
                if (p.camb === 0 || p.camb === '0') p.camb = '';
                const bol = parseFloat(p.bol) || 0;
                const dul = parseFloat(p.dul) || 0;
                const camb = parseFloat(p.camb) || 0;
                const tot = Math.max(0, bol + dul - camb);
                p.total = (bol > 0 || dul > 0 || camb > 0) ? tot : '';
                if (p.precioPieza === undefined || p.precioPieza === '') {
                  p.precioPieza = merged.preciosGuardadosPan[p.proveedor] || '';
                }
                const precio = parseFloat(p.precioPieza) || 0;
                p.costo = (tot > 0 && precio > 0) ? (tot * precio) : (precio > 0 && (bol > 0 || dul > 0) ? 0 : '');
              });
            }
            if (Array.isArray(h.conteoTortilla)) {
              h.conteoTortilla.forEach((t, idx) => {
                t.proveedor = PROVEEDORES_TORTILLA_OFICIALES[idx] || t.proveedor;
                if (t.camb === 0 || t.camb === '0') t.camb = '';
                if (t.nuev === 0 || t.nuev === '0') t.nuev = '';
                const camb = parseFloat(t.camb) || 0;
                const nuev = parseFloat(t.nuev) || 0;
                const tot = Math.max(0, nuev - camb);
                t.total = (nuev > 0 || camb > 0) ? tot : '';
                if (t.precioKilo === undefined || t.precioKilo === '') {
                  t.precioKilo = merged.preciosGuardadosTortilla[t.proveedor] || '';
                }
                const precio = parseFloat(t.precioKilo) || 0;
                t.costo = (tot > 0 && precio > 0) ? (tot * precio) : (precio > 0 && nuev > 0 ? 0 : '');
              });
            }
          });
        }

        if (Array.isArray(merged.proveedores)) {
          merged.proveedores.forEach(p => {
            if (p.presupuestoAprox === undefined) p.presupuestoAprox = p.preventaPresupuesto || 0;
            if (p.ventaAnterior === undefined) p.ventaAnterior = p.compra || p.presupuestoAprox || 0;
            if (!Array.isArray(p.listaPedido)) {
              const seedMatch = SEED_DATA.proveedores.find(sp => sp.id === p.id || sp.proveedor === p.proveedor);
              p.listaPedido = seedMatch && Array.isArray(seedMatch.listaPedido) ? JSON.parse(JSON.stringify(seedMatch.listaPedido)) : [];
            }
            if (p.yaVino === undefined) p.yaVino = false;
            if (p.horaVino === undefined) p.horaVino = '';
            if (p.montoPagadoReal === undefined) p.montoPagadoReal = 0;
          });
        }
        return merged;
      }
    } catch (e) {
      console.error('Error al cargar datos locales:', e);
    }
    this.saveState(SEED_DATA);
    return JSON.parse(JSON.stringify(SEED_DATA));
  }

  actualizarIndicadorGuardado(estado) {
    const label = document.getElementById('textoGuardadoLabel');
    const badge = document.getElementById('btnGuardadoIndicador');
    if (!label || !badge) return;

    if (estado === 'guardando') {
      badge.classList.add('guardando');
      label.textContent = 'Guardando...';
    } else {
      setTimeout(() => {
        badge.classList.remove('guardando');
        label.textContent = 'Guardado';
      }, 350);
    }
  }

  saveState(data = this.data) {
    try {
      this.actualizarIndicadorGuardado('guardando');

      // Guardar snapshot de la hoja actual indexada por su fecha
      if (!data.hojasPorFecha) data.hojasPorFecha = {};
      if (data.fecha) {
        data.hojasPorFecha[data.fecha] = this.extraerDatosHojaActual(data);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      this.notify();

      // Sincronización en segundo plano con Firestore
      if (isFirebaseConectado() && data.fecha) {
        guardarHojaEnFirestore(data.fecha, data.hojasPorFecha[data.fecha])
          .then(() => {
            this.actualizarIndicadorGuardado('guardado');
          })
          .catch(err => {
            console.warn('Sincronización en segundo plano con Firestore pendiente:', err);
            this.actualizarIndicadorGuardado('guardado');
          });
      } else {
        this.actualizarIndicadorGuardado('guardado');
      }
    } catch (e) {
      console.error('Error al guardar datos:', e);
      this.actualizarIndicadorGuardado('guardado');
    }
  }

  extraerDatosHojaActual(data = this.data) {
    return {
      fecha: data.fecha,
      dia: data.dia,
      diaNum: data.diaNum,
      mes: data.mes,
      ano: data.ano,
      cantidadInicial: data.cantidadInicial,
      conteoPan: JSON.parse(JSON.stringify(data.conteoPan || [])),
      conteoTortilla: JSON.parse(JSON.stringify(data.conteoTortilla || [])),
      comprasProveedores: JSON.parse(JSON.stringify(data.comprasProveedores || [])),
      prestamosPendientes: JSON.parse(JSON.stringify(data.prestamosPendientes || [])),
      arqueoColumnas: JSON.parse(JSON.stringify(data.arqueoColumnas || [])),
      retiros: JSON.parse(JSON.stringify(data.retiros || [])),
      cascada: JSON.parse(JSON.stringify(data.cascada || {})),
      maquinaMunecos: JSON.parse(JSON.stringify(data.maquinaMunecos || {})),
      maquinasIndividuales: JSON.parse(JSON.stringify(data.maquinasIndividuales || {}))
    };
  }

  crearPlantillaLimpia(fechaStr) {
    const d = new Date(fechaStr + 'T12:00:00');
    const diaNombre = NOMBRES_DIAS[d.getDay()] || 'Lunes';
    const diaNum = d.getDate();
    const mesNombre = NOMBRES_MESES[d.getMonth()] || 'Ene';
    const anoNum = d.getFullYear();

    return {
      fecha: fechaStr,
      dia: diaNombre,
      diaNum,
      mes: mesNombre,
      ano: anoNum,
      cantidadInicial: 0,
      conteoPan: [
        { id: 'cp-1', proveedor: 'PAN CELIA', bol: '', dul: '', camb: '', total: '', precioPieza: this.data.preciosGuardadosPan?.['PAN CELIA'] || '', costo: '' },
        { id: 'cp-2', proveedor: 'PAN MIRELLA', bol: '', dul: '', camb: '', total: '', precioPieza: this.data.preciosGuardadosPan?.['PAN MIRELLA'] || '', costo: '' },
        { id: 'cp-3', proveedor: 'PAN ESPACIO', bol: '', dul: '', camb: '', total: '', precioPieza: this.data.preciosGuardadosPan?.['PAN ESPACIO'] || '', costo: '' },
        { id: 'cp-4', proveedor: 'PAN CELIA (Turno 2)', bol: '', dul: '', camb: '', total: '', precioPieza: this.data.preciosGuardadosPan?.['PAN CELIA (Turno 2)'] || this.data.preciosGuardadosPan?.['PAN CELIA'] || '', costo: '' },
        { id: 'cp-5', proveedor: 'PAN MIRELLA (Turno 2)', bol: '', dul: '', camb: '', total: '', precioPieza: this.data.preciosGuardadosPan?.['PAN MIRELLA (Turno 2)'] || this.data.preciosGuardadosPan?.['PAN MIRELLA'] || '', costo: '' },
        { id: 'cp-6', proveedor: 'PAN ESPACIO (Turno 2)', bol: '', dul: '', camb: '', total: '', precioPieza: this.data.preciosGuardadosPan?.['PAN ESPACIO (Turno 2)'] || this.data.preciosGuardadosPan?.['PAN ESPACIO'] || '', costo: '' }
      ],
      conteoTortilla: [
        { id: 'ct-1', proveedor: 'TORTILLA IDEAL', camb: '', nuev: '', total: '', precioKilo: this.data.preciosGuardadosTortilla?.['TORTILLA IDEAL'] || '', costo: '' },
        { id: 'ct-2', proveedor: 'TORTILLA AMARILLA', camb: '', nuev: '', total: '', precioKilo: this.data.preciosGuardadosTortilla?.['TORTILLA AMARILLA'] || '', costo: '' },
        { id: 'ct-3', proveedor: 'TORT. MONREAL', camb: '', nuev: '', total: '', precioKilo: this.data.preciosGuardadosTortilla?.['TORT. MONREAL'] || '', costo: '' },
        { id: 'ct-4', proveedor: 'TORTILLA IDEAL', camb: '', nuev: '', total: '', precioKilo: this.data.preciosGuardadosTortilla?.['TORTILLA IDEAL'] || '', costo: '' }
      ],
      comprasProveedores: [],
      prestamosPendientes: [],
      arqueoColumnas: [
        { id: 'col-1', nombre: 'Arqueo 1 (Turno 1)', tarjetas: 0, sistema: 0, billetes: 0, mon1: 0, mon2: 0, mon5: 0, mon10: 0, morralla: 0 },
        { id: 'col-2', nombre: 'Arqueo 2 (Turno 2)', tarjetas: 0, sistema: 0, billetes: 0, mon1: 0, mon2: 0, mon5: 0, mon10: 0, morralla: 0 },
        { id: 'col-3', nombre: 'Arqueo 3 (Cierre)', tarjetas: 0, sistema: 0, billetes: 0, mon1: 0, mon2: 0, mon5: 0, mon10: 0, morralla: 0 }
      ],
      retiros: [],
      cascada: { monedas: 0, premios: 0, total: 0, totalCorte: 0, porcentajeEllos: 60, porcentajeNosotros: 40, ellosTotal: 0, nosotrosTotal: 0 },
      maquinaMunecos: { monedas: 0, total: 0, totalCorte: 0, porcentajeEllos: 60, porcentajeNosotros: 40, ellosTotal: 0, nosotrosTotal: 0 },
      maquinasIndividuales: { maq1_1: 0, maq2_1: 0, maq3_5: 0, total: 0, porcentajeProveedor: 60, porcentajeNosotros: 40, proveedorTotal: 0, nosotrosTotal: 0, nota: '' }
    };
  }

  async cambiarFechaHoja(nuevaFecha) {
    if (!nuevaFecha) return;
    
    // 1. Guardar la hoja actual en su fecha
    if (this.data.fecha) {
      if (!this.data.hojasPorFecha) this.data.hojasPorFecha = {};
      this.data.hojasPorFecha[this.data.fecha] = this.extraerDatosHojaActual();
    }

    // 2. Verificar si ya existe en memoria o LocalStorage
    let hojaDestino = this.data.hojasPorFecha ? this.data.hojasPorFecha[nuevaFecha] : null;

    // 3. Si no existe localmente y Firebase está conectado, consultar la nube
    if (!hojaDestino && isFirebaseConectado()) {
      try {
        const hojaNube = await cargarHojaDeFirestore(nuevaFecha);
        if (hojaNube) {
          hojaDestino = hojaNube;
        }
      } catch (e) {
        console.warn('No se pudo obtener la hoja de Firestore:', e);
      }
    }

    // 4. Si aún no existe, generar plantilla limpia
    if (!hojaDestino) {
      hojaDestino = this.crearPlantillaLimpia(nuevaFecha);
    }

    // 5. Cargar datos en la hoja activa
    Object.assign(this.data, hojaDestino);
    this.data.fecha = nuevaFecha;

    this.sincronizarProveedoresDesdeHoja(nuevaFecha);

    this.saveState();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(fn => fn(this.data));
  }

  // Métodos de Control de Fechas e Historial
  getFechaHoy() {
    return getFechaHoyLocal();
  }

  esHojaEditable(fecha = this.data.fecha) {
    return fecha === getFechaHoyLocal();
  }

  tieneCantidadInicial() {
    return (parseFloat(this.data.cantidadInicial) || 0) > 0;
  }

  puedeEditarCamposGenerales(fecha = this.data.fecha) {
    return this.esHojaEditable(fecha) && this.tieneCantidadInicial();
  }

  getResumenFechasHistorial() {
    const resumen = {};
    const hoy = this.getFechaHoy();
    
    // 1. Recorrer hojasPorFecha
    if (this.data.hojasPorFecha) {
      Object.entries(this.data.hojasPorFecha).forEach(([fStr, hoja]) => {
        if (!hoja) return;
        const totalPagado = (hoja.comprasProveedores || []).reduce((acc, c) => acc + (parseFloat(c.pagado) || 0), 0);
        const comprasCount = (hoja.comprasProveedores || []).filter(c => c.proveedor && (c.pagado > 0 || c.pagado)).length;
        const totalRetiros = (hoja.retiros || []).reduce((acc, r) => acc + (parseFloat(r.monto) || 0), 0);
        const totalPendientes = (hoja.prestamosPendientes || []).reduce((acc, p) => acc + (!p.liquidado ? (parseFloat(p.pendiente) || 0) : 0), 0);
        
        resumen[fStr] = {
          fecha: fStr,
          dia: hoja.dia || '',
          diaNum: hoja.diaNum || '',
          mes: hoja.mes || '',
          ano: hoja.ano || '',
          totalPagado,
          comprasCount,
          totalRetiros,
          totalPendientes,
          esHoy: fStr === hoy,
          tieneRegistros: comprasCount > 0 || totalRetiros > 0 || totalPagado > 0
        };
      });
    }

    // 2. Incluir también la hoja actualmente en memoria
    if (this.data.fecha) {
      const totalesHoja = this.getTotalesHoja();
      const comprasCount = (this.data.comprasProveedores || []).filter(c => c.proveedor && (c.pagado > 0 || c.pagado)).length;
      resumen[this.data.fecha] = {
        fecha: this.data.fecha,
        dia: this.data.dia,
        diaNum: this.data.diaNum,
        mes: this.data.mes,
        ano: this.data.ano,
        totalPagado: totalesHoja.totalPagadoProveedores,
        comprasCount,
        totalRetiros: totalesHoja.totalRetiros,
        totalPendientes: totalesHoja.totalPendientes,
        esHoy: this.data.fecha === hoy,
        tieneRegistros: comprasCount > 0 || totalesHoja.totalRetiros > 0 || totalesHoja.totalPagadoProveedores > 0
      };
    }

    return resumen;
  }

  // 1. Información General de la Hoja
  updateInfoGeneral(dia, diaNum, mes, ano, cantidadInicial) {
    if (!this.esHojaEditable()) return;
    this.data.dia = dia;
    this.data.diaNum = parseInt(diaNum) || 15;
    this.data.mes = mes;
    this.data.ano = parseInt(ano) || 2026;
    this.data.cantidadInicial = parseFloat(cantidadInicial) || 0;
    this.saveState();
  }

  updateCantidadInicial(cantidadInicial) {
    if (!this.esHojaEditable()) return;
    this.data.cantidadInicial = parseFloat(cantidadInicial) || 0;
    this.saveState();
  }

  // 2. Conteo Pan y Tortilla
  updateConteoPan(index, campos) {
    if (!this.puedeEditarCamposGenerales()) return;
    if (this.data.conteoPan && this.data.conteoPan[index]) {
      this.data.conteoPan[index] = { ...this.data.conteoPan[index], ...campos };
      const p = this.data.conteoPan[index];
      p.proveedor = PROVEEDORES_PAN_OFICIALES[index] || p.proveedor;

      const bol = parseFloat(p.bol) || 0;
      const dul = parseFloat(p.dul) || 0;
      const camb = parseFloat(p.camb) || 0;
      const tot = Math.max(0, bol + dul - camb);
      p.total = (bol > 0 || dul > 0 || camb > 0) ? tot : '';

      const precio = parseFloat(p.precioPieza) || 0;
      p.costo = (tot > 0 && precio > 0) ? (tot * precio) : (precio > 0 && (bol > 0 || dul > 0) ? 0 : '');
      this.saveState();
    }
  }

  updateConteoTortilla(index, campos) {
    if (!this.puedeEditarCamposGenerales()) return;
    if (this.data.conteoTortilla && this.data.conteoTortilla[index]) {
      this.data.conteoTortilla[index] = { ...this.data.conteoTortilla[index], ...campos };
      const t = this.data.conteoTortilla[index];
      t.proveedor = PROVEEDORES_TORTILLA_OFICIALES[index] || t.proveedor;

      const camb = parseFloat(t.camb) || 0;
      const nuev = parseFloat(t.nuev) || 0;
      const tot = Math.max(0, nuev - camb);
      t.total = (nuev > 0 || camb > 0) ? tot : '';

      const precio = parseFloat(t.precioKilo) || 0;
      t.costo = (tot > 0 && precio > 0) ? (tot * precio) : (precio > 0 && nuev > 0 ? 0 : '');
      this.saveState();
    }
  }

  guardarPrecioConteoPan(index, precioPieza) {
    if (!this.esHojaEditable()) return;
    if (this.data.conteoPan && this.data.conteoPan[index]) {
      const p = this.data.conteoPan[index];
      const precio = parseFloat(precioPieza) || 0;
      p.precioPieza = precio > 0 ? precio : '';
      p.proveedor = PROVEEDORES_PAN_OFICIALES[index] || p.proveedor;

      const bol = parseFloat(p.bol) || 0;
      const dul = parseFloat(p.dul) || 0;
      const camb = parseFloat(p.camb) || 0;
      const tot = Math.max(0, bol + dul - camb);
      p.costo = (tot > 0 && precio > 0) ? (tot * precio) : (precio > 0 && (bol > 0 || dul > 0) ? 0 : '');

      if (!this.data.preciosGuardadosPan) this.data.preciosGuardadosPan = {};
      if (p.proveedor && precio > 0) {
        this.data.preciosGuardadosPan[p.proveedor] = precio;
      }
      this.saveState();
    }
  }

  guardarPrecioConteoTortilla(index, precioKilo) {
    if (!this.esHojaEditable()) return;
    if (this.data.conteoTortilla && this.data.conteoTortilla[index]) {
      const t = this.data.conteoTortilla[index];
      const precio = parseFloat(precioKilo) || 0;
      t.precioKilo = precio > 0 ? precio : '';
      t.proveedor = PROVEEDORES_TORTILLA_OFICIALES[index] || t.proveedor;

      const camb = parseFloat(t.camb) || 0;
      const nuev = parseFloat(t.nuev) || 0;
      const tot = Math.max(0, nuev - camb);
      t.costo = (tot > 0 && precio > 0) ? (tot * precio) : (precio > 0 && nuev > 0 ? 0 : '');

      if (!this.data.preciosGuardadosTortilla) this.data.preciosGuardadosTortilla = {};
      if (t.proveedor && precio > 0) {
        this.data.preciosGuardadosTortilla[t.proveedor] = precio;
      }
      this.saveState();
    }
  }

  guardarCapturaPan(index, { bol, dul, camb, precioPieza }) {
    if (!this.puedeEditarCamposGenerales()) return false;
    if (this.data.conteoPan && this.data.conteoPan[index]) {
      const p = this.data.conteoPan[index];
      p.proveedor = PROVEEDORES_PAN_OFICIALES[index] || p.proveedor;

      const numBol = (bol !== '' && bol !== null && bol !== undefined) ? (parseFloat(bol) || 0) : '';
      const numDul = (dul !== '' && dul !== null && dul !== undefined) ? (parseFloat(dul) || 0) : '';
      const numCamb = (camb !== '' && camb !== null && camb !== undefined) ? (parseFloat(camb) || 0) : '';
      const precio = parseFloat(precioPieza) || 0;

      p.bol = numBol > 0 ? numBol : '';
      p.dul = numDul > 0 ? numDul : '';
      p.camb = numCamb > 0 ? numCamb : '';
      p.precioPieza = precio > 0 ? precio : '';

      const bVal = parseFloat(p.bol) || 0;
      const dVal = parseFloat(p.dul) || 0;
      const cVal = parseFloat(p.camb) || 0;
      const tot = Math.max(0, bVal + dVal - cVal);
      p.total = (bVal > 0 || dVal > 0 || cVal > 0) ? tot : '';
      p.costo = (tot > 0 && precio > 0) ? (tot * precio) : (precio > 0 && (bVal > 0 || dVal > 0) ? 0 : '');

      if (!this.data.preciosGuardadosPan) this.data.preciosGuardadosPan = {};
      if (p.proveedor && precio > 0) {
        this.data.preciosGuardadosPan[p.proveedor] = precio;
      }

      // Pasar automáticamente el costo a la tabla de proveedores
      if (p.costo > 0) {
        this.sincronizarProveedorConteo(p.proveedor, p.costo);
      }

      this.saveState();
      return true;
    }
    return false;
  }

  guardarCapturaTortilla(index, { nuev, camb, precioKilo }) {
    if (!this.puedeEditarCamposGenerales()) return false;
    if (this.data.conteoTortilla && this.data.conteoTortilla[index]) {
      const t = this.data.conteoTortilla[index];
      t.proveedor = PROVEEDORES_TORTILLA_OFICIALES[index] || t.proveedor;

      const numNuev = (nuev !== '' && nuev !== null && nuev !== undefined) ? (parseFloat(nuev) || 0) : '';
      const numCamb = (camb !== '' && camb !== null && camb !== undefined) ? (parseFloat(camb) || 0) : '';
      const precio = parseFloat(precioKilo) || 0;

      t.nuev = numNuev > 0 ? numNuev : '';
      t.camb = numCamb > 0 ? numCamb : '';
      t.precioKilo = precio > 0 ? precio : '';

      const nVal = parseFloat(t.nuev) || 0;
      const cVal = parseFloat(t.camb) || 0;
      const tot = Math.max(0, nVal - cVal);
      t.total = (nVal > 0 || cVal > 0) ? tot : '';
      t.costo = (tot > 0 && precio > 0) ? (tot * precio) : (precio > 0 && nVal > 0 ? 0 : '');

      if (!this.data.preciosGuardadosTortilla) this.data.preciosGuardadosTortilla = {};
      if (t.proveedor && precio > 0) {
        this.data.preciosGuardadosTortilla[t.proveedor] = precio;
      }

      // Pasar automáticamente el costo a la tabla de proveedores
      if (t.costo > 0) {
        this.sincronizarProveedorConteo(t.proveedor, t.costo);
      }

      this.saveState();
      return true;
    }
    return false;
  }

  // Sincronizar / Trasladar costo de pan o tortilla a la tabla de proveedores pagados
  sincronizarProveedorConteo(nombreProveedorConteo, costoTotal) {
    if (!this.data.comprasProveedores) this.data.comprasProveedores = [];
    const costo = parseFloat(costoTotal) || 0;
    if (costo <= 0) return;

    // Normalizar texto para comparación sin acentos ni puntos
    const norm = (s) => (s || '')
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\./g, '')
      .trim();

    const provNorm = norm(nombreProveedorConteo);

    // Buscar si ya existe un renglón en comprasProveedores que corresponda a este proveedor
    let indexEncontrado = this.data.comprasProveedores.findIndex(c => {
      const cNorm = norm(c.proveedor);
      if (cNorm === provNorm) return true;
      
      const pT2 = provNorm.includes('2') || provNorm.includes('turno');
      const cT2 = cNorm.includes('2') || cNorm.includes('turno');
      if (pT2 !== cT2) return false;

      if (provNorm.includes('monreal') && cNorm.includes('monreal')) return true;
      if (provNorm.includes('ideal') && cNorm.includes('ideal')) return true;
      if (provNorm.includes('celia') && cNorm.includes('celia')) return true;
      if (provNorm.includes('mirella') && cNorm.includes('mirella')) return true;
      if (provNorm.includes('espacio') && cNorm.includes('espacio')) return true;
      if (provNorm.includes('amarilla') && cNorm.includes('amarilla')) return true;
      return false;
    });

    const ahora = new Date();
    const horaActual = ahora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });

    if (indexEncontrado >= 0) {
      // Actualizar monto pagado del renglón existente
      const reg = this.data.comprasProveedores[indexEncontrado];
      reg.pagado = costo;
      reg.bloqueado = true;
      if (!reg.hora) reg.hora = horaActual;
    } else {
      // Agregar nuevo renglón a la relación de proveedores pagados
      const notaNum = this.data.comprasProveedores.length + 1;
      this.data.comprasProveedores.push({
        nota: notaNum,
        proveedor: nombreProveedorConteo,
        pagado: costo,
        tipoPago: 'Efectivo',
        hora: horaActual,
        fechaRegistro: this.data.fecha,
        bloqueado: true
      });
    }

    // Renumerar notas consecutivas
    this.data.comprasProveedores.forEach((r, i) => { r.nota = i + 1; });
    this.sincronizarLlegadaProveedor(nombreProveedorConteo, horaActual, costo, this.data.fecha);
  }

  // 3. Compras y Proveedores Pagados (Hoja Diaria)
  updateCompraProveedor(index, campoOVal, valor) {
    if (!this.puedeEditarCamposGenerales()) return;
    if (this.data.comprasProveedores && this.data.comprasProveedores[index]) {
      const row = this.data.comprasProveedores[index];
      if (typeof campoOVal === 'object') {
        Object.assign(row, campoOVal);
      } else if (typeof campoOVal === 'string' && valor !== undefined) {
        row[campoOVal] = (campoOVal === 'pagado') ? (parseFloat(valor) || 0) : valor;
      } else if (typeof campoOVal === 'string' && valor === undefined) {
        row.proveedor = campoOVal;
      }
      this.saveState();
    }
  }

  addFilaCompraProveedor(proveedor = '', pagado = 0, tipoPago = 'Efectivo') {
    if (!this.puedeEditarCamposGenerales()) return;
    const nota = this.data.comprasProveedores.length + 1;
    this.data.comprasProveedores.push({
      nota,
      proveedor,
      pagado: parseFloat(pagado) || 0,
      tipoPago,
      hora: '',
      fechaRegistro: this.data.fecha,
      bloqueado: false
    });
    this.saveState();
  }

  guardarCompraProveedorSegura({ index, proveedor, pagado, tipoPago, hora }) {
    if (!this.puedeEditarCamposGenerales()) {
      console.warn('Solo se puede editar la hoja del día actual y habiendo registrado el monto inicial.');
      return false;
    }
    const pNom = (proveedor || '').trim();
    const pMonto = parseFloat(pagado) || 0;
    const pTipo = tipoPago || 'Efectivo';
    const ahora = new Date();
    const pHora = hora || ahora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });

    // Filtrar registros vacíos residuales
    this.data.comprasProveedores = (this.data.comprasProveedores || []).filter(r => 
      (r.proveedor && r.proveedor.trim() !== '') || (parseFloat(r.pagado) > 0)
    );

    const obj = {
      nota: (index !== undefined && index !== null && index >= 0 && index < this.data.comprasProveedores.length) ? index + 1 : this.data.comprasProveedores.length + 1,
      proveedor: pNom,
      pagado: pMonto,
      tipoPago: pTipo,
      hora: pHora,
      fechaRegistro: this.data.fecha,
      bloqueado: true
    };

    if (index !== undefined && index !== null && index >= 0 && index < this.data.comprasProveedores.length) {
      this.data.comprasProveedores[index] = obj;
    } else {
      this.data.comprasProveedores.push(obj);
    }

    this.data.comprasProveedores.forEach((r, i) => { r.nota = i + 1; });

    // Sincronizar con la Agenda Semanal (marcar que ya vino, hora y monto)
    this.sincronizarLlegadaProveedor(pNom, pHora, pMonto, this.data.fecha);

    // Agregar también a pagosDia para registro histórico
    this.addPagoDia({
      proveedor: pNom,
      monto: pMonto,
      metodo: pTipo === 'Transferencia' ? 'Transferencia' : 'Efectivo de Caja',
      comprobante: 'Nota #' + obj.nota,
      hora: pHora,
      cajero: this.data.cajeroActual,
      notas: 'Registro seguro desde Hoja Diaria'
    });

    this.saveState();
    return true;
  }

  deleteFilaCompraProveedor(index) {
    if (this.data.comprasProveedores && this.data.comprasProveedores[index]) {
      this.data.comprasProveedores.splice(index, 1);
      this.data.comprasProveedores.forEach((r, i) => { r.nota = i + 1; });
      this.sincronizarProveedoresDesdeHoja(this.data.fecha);
      this.saveState();
    }
  }

  agregarCompraProveedor(proveedor, pagado, tipoPago = 'Efectivo') {
    this.guardarCompraProveedorSegura({ proveedor, pagado, tipoPago });
  }

  // 4. Préstamos o Pendientes de Pago
  updatePrestamo(index, campos) {
    if (!this.puedeEditarCamposGenerales()) return;
    if (this.data.prestamosPendientes && this.data.prestamosPendientes[index]) {
      this.data.prestamosPendientes[index] = { ...this.data.prestamosPendientes[index], ...campos };
      this.saveState();
    }
  }

  addFilaPrestamo(proveedor = '', pendiente = 0, pagado = 0, nota = '') {
    if (!this.puedeEditarCamposGenerales()) return;
    this.data.prestamosPendientes.push({
      id: 'pres-' + Date.now(),
      proveedor,
      pendiente: parseFloat(pendiente) || 0,
      pagado: parseFloat(pagado) || 0,
      nota,
      liquidado: false,
      bloqueado: false
    });
    this.saveState();
  }

  guardarPrestamoSeguro({ index, proveedor, pendiente, nota }) {
    if (!this.puedeEditarCamposGenerales()) {
      console.warn('Solo se puede editar la hoja del día actual y habiendo registrado el monto inicial.');
      return false;
    }
    const pNom = (proveedor || '').trim();
    const pMonto = parseFloat(pendiente) || 0;
    const pNota = (nota || '').trim();

    // Filtrar registros vacíos residuales
    this.data.prestamosPendientes = (this.data.prestamosPendientes || []).filter(p => 
      (p.proveedor && p.proveedor.trim() !== '') || (parseFloat(p.pendiente) > 0)
    );

    const nuevoObj = {
      id: 'pres-' + Date.now(),
      proveedor: pNom,
      pendiente: pMonto,
      pagado: 0,
      nota: pNota,
      liquidado: false,
      bloqueado: true
    };

    if (index !== undefined && index !== null && index >= 0 && index < this.data.prestamosPendientes.length) {
      this.data.prestamosPendientes[index] = {
        ...this.data.prestamosPendientes[index],
        ...nuevoObj
      };
    } else {
      this.data.prestamosPendientes.push(nuevoObj);
    }

    this.saveState();
    return true;
  }

  togglePrestamoLiquidado(index) {
    if (!this.puedeEditarCamposGenerales()) return;
    if (this.data.prestamosPendientes && this.data.prestamosPendientes[index]) {
      const p = this.data.prestamosPendientes[index];
      p.liquidado = !p.liquidado;
      if (p.liquidado) {
        p.pagado = p.pendiente;
      } else {
        p.pagado = 0;
      }
      this.saveState();
    }
  }

  deleteFilaPrestamo(index) {
    if (!this.puedeEditarCamposGenerales()) return;
    if (this.data.prestamosPendientes && this.data.prestamosPendientes[index]) {
      this.data.prestamosPendientes.splice(index, 1);
      this.saveState();
    }
  }

  addPrestamo(proveedor, pendiente, pagado = 0, nota = '') {
    if (!this.puedeEditarCamposGenerales()) return;
    this.guardarPrestamoSeguro({ proveedor, pendiente, nota });
  }

  // 5. Arqueos de Caja (LAS MONEDAS SE APUNTAN POR MONTO TOTAL EN PESOS)
  calcularMorralla(m1 = 0, m2 = 0, m5 = 0, m10 = 0) {
    return (parseFloat(m1) || 0) + (parseFloat(m2) || 0) + (parseFloat(m5) || 0) + (parseFloat(m10) || 0);
  }

  updateArqueoColumna(colIndex, campos) {
    // Corte y Arqueo SIEMPRE desbloqueado aunque no sea del día o no haya monto inicial
    if (this.data.arqueoColumnas && this.data.arqueoColumnas[colIndex]) {
      const col = this.data.arqueoColumnas[colIndex];
      Object.assign(col, campos);
      col.morralla = this.calcularMorralla(col.mon1, col.mon2, col.mon5, col.mon10);
      this.saveState();
    }
  }

  // Métodos de compatibilidad con CajaOperacionesModule
  addArqueo(datos) {
    const m1 = parseFloat(datos.monedas1) || 0;
    const m2 = parseFloat(datos.monedas2) || 0;
    const m5 = parseFloat(datos.monedas5) || 0;
    const m10 = parseFloat(datos.monedas10) || 0;
    const morralla = this.calcularMorralla(m1, m2, m5, m10);
    const billetes = parseFloat(datos.billetes) || 0;
    const totalEfectivo = billetes + morralla;
    const tarjetas = parseFloat(datos.tarjetas) || 0;
    const yompTarjetas = parseFloat(datos.yompTarjetas) || 0;
    const sistema = parseFloat(datos.sistema) || 0;
    const retirosTurno = parseFloat(datos.retirosTurno) || 0;
    const pagosTurno = parseFloat(datos.pagosTurno) || 0;

    const totalDeclarado = totalEfectivo + tarjetas + yompTarjetas + retirosTurno + pagosTurno;
    const diferencia = totalDeclarado - sistema;

    const nuevo = {
      id: 'arq-' + Date.now(),
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      turno: datos.turno || `Arqueo ${this.data.arqueos.length + 1}`,
      cajero: datos.cajero || this.data.cajeroActual,
      tarjetas,
      yompTarjetas,
      sistema,
      billetes,
      monedas1: m1,
      monedas2: m2,
      monedas5: m5,
      monedas10: m10,
      morralla,
      totalEfectivo,
      retirosTurno,
      pagosTurno,
      totalDeclarado,
      diferencia,
      notas: datos.notas || ''
    };

    this.data.arqueos.push(nuevo);
    this.saveState();
    return nuevo;
  }

  updateArqueo(id, datos) {
    const idx = this.data.arqueos.findIndex(a => a.id === id);
    if (idx === -1) return null;

    const actual = this.data.arqueos[idx];
    const m1 = datos.monedas1 !== undefined ? parseFloat(datos.monedas1) || 0 : actual.monedas1;
    const m2 = datos.monedas2 !== undefined ? parseFloat(datos.monedas2) || 0 : actual.monedas2;
    const m5 = datos.monedas5 !== undefined ? parseFloat(datos.monedas5) || 0 : actual.monedas5;
    const m10 = datos.monedas10 !== undefined ? parseFloat(datos.monedas10) || 0 : actual.monedas10;
    const morralla = this.calcularMorralla(m1, m2, m5, m10);
    const billetes = datos.billetes !== undefined ? parseFloat(datos.billetes) || 0 : actual.billetes;
    const totalEfectivo = billetes + morralla;
    const tarjetas = datos.tarjetas !== undefined ? parseFloat(datos.tarjetas) || 0 : actual.tarjetas;
    const yompTarjetas = datos.yompTarjetas !== undefined ? parseFloat(datos.yompTarjetas) || 0 : actual.yompTarjetas;
    const sistema = datos.sistema !== undefined ? parseFloat(datos.sistema) || 0 : actual.sistema;
    const retirosTurno = datos.retirosTurno !== undefined ? parseFloat(datos.retirosTurno) || 0 : actual.retirosTurno;
    const pagosTurno = datos.pagosTurno !== undefined ? parseFloat(datos.pagosTurno) || 0 : actual.pagosTurno;

    const totalDeclarado = totalEfectivo + tarjetas + yompTarjetas + retirosTurno + pagosTurno;
    const diferencia = totalDeclarado - sistema;

    this.data.arqueos[idx] = {
      ...actual,
      ...datos,
      monedas1: m1,
      monedas2: m2,
      monedas5: m5,
      monedas10: m10,
      morralla,
      billetes,
      totalEfectivo,
      tarjetas,
      yompTarjetas,
      sistema,
      retirosTurno,
      pagosTurno,
      totalDeclarado,
      diferencia
    };

    this.saveState();
    return this.data.arqueos[idx];
  }

  deleteArqueo(id) {
    this.data.arqueos = this.data.arqueos.filter(a => a.id !== id);
    this.saveState();
  }

  // 6. Retiros
  updateRetiro(index, campos) {
    if (!this.puedeEditarCamposGenerales()) return;
    if (this.data.retiros && this.data.retiros[index]) {
      this.data.retiros[index] = { ...this.data.retiros[index], ...campos };
      this.saveState();
    }
  }

  addFilaRetiro(monto = 0, nombre = '', concepto = '') {
    if (!this.puedeEditarCamposGenerales()) return;
    this.data.retiros.push({
      id: 'ret-' + Date.now(),
      monto: parseFloat(monto) || 0,
      nombre,
      concepto,
      bloqueado: false
    });
    this.saveState();
  }

  guardarRetiroSeguro({ index, monto, nombre, concepto }) {
    if (!this.puedeEditarCamposGenerales()) {
      console.warn('Solo se puede editar la hoja del día actual y habiendo registrado el monto inicial.');
      return false;
    }
    const rMonto = parseFloat(monto) || 0;
    const rNom = (nombre || this.data.cajeroActual || 'Don Manuel').trim();
    const rConc = (concepto || 'Retiro de caja').trim();

    // Filtrar registros vacíos residuales
    this.data.retiros = (this.data.retiros || []).filter(r => 
      (parseFloat(r.monto) > 0) || (r.nombre && r.nombre.trim() !== '')
    );

    const nuevoObj = {
      id: 'ret-' + Date.now(),
      fecha: this.data.fecha,
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      monto: rMonto,
      nombre: rNom,
      responsable: rNom,
      concepto: rConc,
      motivo: rConc,
      autorizo: 'Gerencia',
      bloqueado: true
    };

    if (index !== undefined && index !== null && index >= 0 && index < this.data.retiros.length) {
      this.data.retiros[index] = {
        ...this.data.retiros[index],
        ...nuevoObj
      };
    } else {
      this.data.retiros.push(nuevoObj);
    }

    this.saveState();
    return true;
  }

  deleteFilaRetiro(index) {
    if (!this.puedeEditarCamposGenerales()) return;
    if (this.data.retiros && this.data.retiros[index]) {
      this.data.retiros.splice(index, 1);
      this.saveState();
    }
  }

  addRetiro(monto, responsable, motivo = '', autorizo = 'Gerencia') {
    const nuevo = {
      id: 'ret-' + Date.now(),
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      monto: parseFloat(monto) || 0,
      nombre: responsable || this.data.cajeroActual,
      responsable: responsable || this.data.cajeroActual,
      motivo: motivo || 'Retiro de caja',
      concepto: motivo || 'Retiro de caja',
      autorizo
    };
    this.data.retiros.push(nuevo);
    this.saveState();
    return nuevo;
  }

  deleteRetiro(id) {
    this.data.retiros = this.data.retiros.filter(r => r.id !== id);
    this.saveState();
  }

  // 7. Máquinas Cascada y Muñecos
  updateCascada(campos) {
    if (!this.puedeEditarCamposGenerales()) return;
    Object.assign(this.data.cascada, campos);
    const m = parseFloat(this.data.cascada.monedas) || 0;
    const p = parseFloat(this.data.cascada.premios) || 0;
    const tot = Math.max(0, m - p);
    this.data.cascada.total = tot;
    this.data.cascada.totalCorte = tot;
    this.data.cascada.ellosTotal = (tot * (this.data.cascada.porcentajeEllos || 60)) / 100;
    this.data.cascada.nosotrosTotal = (tot * (this.data.cascada.porcentajeNosotros || 40)) / 100;
    this.saveState();
  }

  updateMaquinaMunecos(campos) {
    if (!this.puedeEditarCamposGenerales()) return;
    Object.assign(this.data.maquinaMunecos, campos);
    const m = parseFloat(this.data.maquinaMunecos.monedas) || 0;
    this.data.maquinaMunecos.total = m;
    this.data.maquinaMunecos.totalCorte = m;
    this.data.maquinaMunecos.ellosTotal = (m * (this.data.maquinaMunecos.porcentajeEllos || 60)) / 100;
    this.data.maquinaMunecos.nosotrosTotal = (m * (this.data.maquinaMunecos.porcentajeNosotros || 40)) / 100;
    this.saveState();
  }

  updateMaquinasIndividuales(campos) {
    if (!this.puedeEditarCamposGenerales()) return;
    Object.assign(this.data.maquinasIndividuales, campos);
    const q1 = parseFloat(this.data.maquinasIndividuales.maq1_1) || 0;
    const q2 = parseFloat(this.data.maquinasIndividuales.maq2_1) || 0;
    const q3 = parseFloat(this.data.maquinasIndividuales.maq3_5) || 0;
    const tot = q1 + q2 + q3;
    this.data.maquinasIndividuales.total = tot;
    this.data.maquinasIndividuales.proveedorTotal = (tot * (this.data.maquinasIndividuales.porcentajeProveedor || 60)) / 100;
    this.data.maquinasIndividuales.nosotrosTotal = (tot * (this.data.maquinasIndividuales.porcentajeNosotros || 40)) / 100;
    this.saveState();
  }

  addMaquina(registro) {
    const montoTotal = parseFloat(registro.montoTotal) || 0;
    const porcentajeTienda = parseFloat(registro.porcentajeTienda) || 40;
    const gananciaTienda = (montoTotal * porcentajeTienda) / 100;
    const pagoProveedor = montoTotal - gananciaTienda;

    const nuevo = {
      id: 'maq-' + Date.now(),
      fecha: new Date().toISOString().split('T')[0],
      nombreMaquina: registro.nombreMaquina || 'Máquina Recreativa',
      montoTotal,
      porcentajeTienda,
      gananciaTienda,
      pagoProveedor,
      contadorAnterior: parseInt(registro.contadorAnterior) || 0,
      contadorActual: parseInt(registro.contadorActual) || 0,
      responsable: registro.responsable || this.data.cajeroActual
    };
    this.data.maquinas.push(nuevo);
    this.saveState();
    return nuevo;
  }

  deleteMaquina(id) {
    this.data.maquinas = this.data.maquinas.filter(m => m.id !== id);
    this.saveState();
  }

  // 8. Pagos a Proveedores (compatibilidad)
  addPagoDia(pago) {
    const nuevo = {
      id: 'pago-' + Date.now(),
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cajero: this.data.cajeroActual,
      ...pago
    };
    this.data.pagosDia.unshift(nuevo);
    this.saveState();
    return nuevo;
  }

  deletePagoDia(id) {
    this.data.pagosDia = this.data.pagosDia.filter(p => p.id !== id);
    this.saveState();
  }

  // 9. Panaderos y Tortillas (compatibilidad)
  addPanadero(pan) {
    const cambios = parseFloat(pan.cambios) || 0;
    const dulces = parseFloat(pan.dulces) || 0;
    const bolillo = parseFloat(pan.bolillo) || 0;
    const total = Math.max(0, (dulces + bolillo) - cambios);

    const nuevo = {
      id: 'pan-' + Date.now(),
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cambios,
      dulces,
      bolillo,
      total,
      pagado: !!pan.pagado,
      proveedor: pan.proveedor || 'Panadería',
      notas: pan.notas || ''
    };
    this.data.panaderos.push(nuevo);
    this.saveState();
    return nuevo;
  }

  togglePanaderoPagado(id) {
    const item = this.data.panaderos.find(p => p.id === id);
    if (item) {
      item.pagado = !item.pagado;
      this.saveState();
    }
  }

  deletePanadero(id) {
    this.data.panaderos = this.data.panaderos.filter(p => p.id !== id);
    this.saveState();
  }

  addTortilleria(tort) {
    const cambio = parseFloat(tort.cambio) || 0;
    const nuevo = parseFloat(tort.nuevo) || 0;
    const total = Math.max(0, nuevo - cambio);

    const item = {
      id: 'tort-' + Date.now(),
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cambio,
      nuevo,
      total,
      pagado: !!tort.pagado,
      proveedor: tort.proveedor || 'Tortillería',
      notas: tort.notas || ''
    };
    this.data.tortillerias.push(item);
    this.saveState();
    return item;
  }

  toggleTortilleriaPagada(id) {
    const item = this.data.tortillerias.find(t => t.id === id);
    if (item) {
      item.pagado = !item.pagado;
      this.saveState();
    }
  }

  deleteTortilleria(id) {
    this.data.tortillerias = this.data.tortillerias.filter(t => t.id !== id);
    this.saveState();
  }

  // 10. Pendientes de Pago (compatibilidad)
  addPendientePago(pend) {
    const nuevo = {
      id: 'pend-' + Date.now(),
      estado: 'pendiente',
      monto: parseFloat(pend.monto) || 0,
      fechaVencimiento: pend.fechaVencimiento || new Date().toISOString().split('T')[0],
      ...pend
    };
    this.data.pendientesPago.push(nuevo);
    this.saveState();
    return nuevo;
  }

  liquidarPendientePago(id) {
    const pend = this.data.pendientesPago.find(p => p.id === id);
    if (pend) {
      pend.estado = 'liquidado';
      this.agregarCompraProveedor(pend.proveedor, pend.monto);
      this.saveState();
    }
  }

  deletePendientePago(id) {
    this.data.pendientesPago = this.data.pendientesPago.filter(p => p.id !== id);
    this.saveState();
  }

  // 11. Pipeline Semanal
  addProveedor(p) {
    const nuevo = {
      id: 'p-' + Date.now(),
      compra: 0,
      presupuestoAprox: parseFloat(p.preventaPresupuesto || p.presupuestoAprox) || 0,
      ventaAnterior: parseFloat(p.ventaAnterior) || 0,
      listaPedido: Array.isArray(p.listaPedido) ? p.listaPedido : [],
      yaVino: false,
      horaVino: '',
      montoPagadoReal: 0,
      estado: 'programado',
      ...p
    };
    if (nuevo.presupuestoAprox && !nuevo.preventaPresupuesto) {
      nuevo.preventaPresupuesto = nuevo.presupuestoAprox;
    }
    this.data.proveedores.push(nuevo);
    this.saveState();
    return nuevo;
  }

  updateProveedor(id, campos) {
    const idx = this.data.proveedores.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.data.proveedores[idx] = { ...this.data.proveedores[idx], ...campos };
      this.saveState();
      return this.data.proveedores[idx];
    }
    return null;
  }

  deleteProveedor(id) {
    this.data.proveedores = this.data.proveedores.filter(p => p.id !== id);
    this.saveState();
  }

  moverProveedorDia(id, nuevoDia) {
    return this.updateProveedor(id, { dia: nuevoDia });
  }

  marcarProveedorPagado(id, montoReal = null) {
    const prov = this.data.proveedores.find(p => p.id === id);
    if (!prov) return null;
    const monto = montoReal !== null ? parseFloat(montoReal) : (prov.compra > 0 ? prov.compra : (prov.presupuestoAprox || prov.preventaPresupuesto));
    this.updateProveedor(id, { estado: 'pagado', yaVino: true, horaVino: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true }), montoPagadoReal: monto });
    this.agregarCompraProveedor(prov.proveedor, monto);
    return prov;
  }

  sincronizarProveedoresDesdeHoja(fecha = this.data?.fecha) {
    if (!this.data || !this.data.proveedores) return;
    const fStr = fecha || this.getFechaHoy();
    const dObj = new Date(fStr + 'T12:00:00');
    const diasSemanaIds = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const diaHoyId = diasSemanaIds[dObj.getDay()];

    const comprasHoy = (this.data.comprasProveedores || []).filter(c => 
      c.proveedor && c.proveedor.trim() !== '' && (parseFloat(c.pagado) > 0 || c.pagado !== '')
    );

    const norm = (s) => (s || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    this.data.proveedores.forEach(p => {
      // Buscar coincidencia en compras
      const coincidencia = comprasHoy.find(c => {
        const np = norm(p.proveedor);
        const nc = norm(c.proveedor);
        return np === nc || (np.length >= 4 && nc.includes(np)) || (nc.length >= 4 && np.includes(nc));
      });

      if (coincidencia) {
        p.yaVino = true;
        p.horaVino = coincidencia.hora || '';
        p.montoPagadoReal = parseFloat(coincidencia.pagado) || 0;
        p.estado = 'pagado';
      } else {
        if (p.dia === diaHoyId) {
          p.yaVino = false;
          p.horaVino = '';
          p.montoPagadoReal = 0;
          p.estado = 'programado';
        }
      }
    });
  }

  sincronizarLlegadaProveedor(nombreProveedor, hora, monto, fecha = this.data?.fecha) {
    if (!this.data || !this.data.proveedores || !nombreProveedor) return;
    const fStr = fecha || this.getFechaHoy();
    const dObj = new Date(fStr + 'T12:00:00');
    const diasSemanaIds = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const diaHoyId = diasSemanaIds[dObj.getDay()];

    const norm = (s) => (s || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const nc = norm(nombreProveedor);

    let prov = this.data.proveedores.find(p => p.dia === diaHoyId && (norm(p.proveedor) === nc || (nc.length >= 4 && norm(p.proveedor).includes(nc)) || (norm(p.proveedor).length >= 4 && nc.includes(norm(p.proveedor)))));

    if (!prov) {
      prov = this.data.proveedores.find(p => norm(p.proveedor) === nc || (nc.length >= 4 && norm(p.proveedor).includes(nc)) || (norm(p.proveedor).length >= 4 && nc.includes(norm(p.proveedor))));
    }

    if (prov) {
      prov.yaVino = true;
      prov.horaVino = hora || new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
      prov.montoPagadoReal = parseFloat(monto) || 0;
      prov.estado = 'pagado';
      this.saveState();
    }
  }

  updateProveedorPedido(id, listaPedido) {
    const prov = this.data.proveedores.find(p => p.id === id);
    if (prov) {
      prov.listaPedido = Array.isArray(listaPedido) ? listaPedido : [];
      this.saveState();
      return prov;
    }
    return null;
  }

  updateProveedorAgenda(id, campos) {
    const prov = this.data.proveedores.find(p => p.id === id);
    if (prov) {
      Object.assign(prov, campos);
      if (campos.presupuestoAprox !== undefined) {
        prov.presupuestoAprox = parseFloat(campos.presupuestoAprox) || 0;
        prov.preventaPresupuesto = prov.presupuestoAprox;
      }
      if (campos.ventaAnterior !== undefined) {
        prov.ventaAnterior = parseFloat(campos.ventaAnterior) || 0;
      }
      this.saveState();
      return prov;
    }
    return null;
  }

  // 12. Métricas y Totales Globales
  getTotalesHoja() {
    const totalPagadoProveedores = this.data.comprasProveedores.reduce((acc, p) => acc + (parseFloat(p.pagado) || 0), 0);
    const totalEfectivoProveedores = this.data.comprasProveedores.reduce((acc, p) => acc + ((p.tipoPago || 'Efectivo') !== 'Transferencia' ? (parseFloat(p.pagado) || 0) : 0), 0);
    const totalTransferenciaProveedores = this.data.comprasProveedores.reduce((acc, p) => acc + (p.tipoPago === 'Transferencia' ? (parseFloat(p.pagado) || 0) : 0), 0);
    const totalRetiros = this.data.retiros.reduce((acc, r) => acc + (parseFloat(r.monto) || 0), 0);
    const totalPendientes = this.data.prestamosPendientes.reduce((acc, p) => acc + (!p.liquidado ? (parseFloat(p.pendiente) || 0) : 0), 0);
    const gananciaTotalMaquinas = (this.data.cascada.nosotrosTotal || 0) + (this.data.maquinaMunecos.nosotrosTotal || 0) + (this.data.maquinasIndividuales.nosotrosTotal || 0);

    return {
      totalPagadoProveedores,
      totalEfectivoProveedores,
      totalTransferenciaProveedores,
      totalRetiros,
      totalPendientes,
      gananciaTotalMaquinas
    };
  }

  getMetricasGlobales() {
    const totalesHoja = this.getTotalesHoja();
    const totalPresupuestoSemanal = this.data.proveedores.reduce((acc, p) => acc + (parseFloat(p.preventaPresupuesto) || 0), 0);
    const totalCompraRealSemanal = this.data.proveedores.reduce((acc, p) => acc + (parseFloat(p.compra) || 0), 0);

    return {
      totalPresupuestoSemanal,
      totalCompraRealSemanal,
      totalPagosHoy: totalesHoja.totalPagadoProveedores,
      totalRetirosHoy: totalesHoja.totalRetiros,
      totalGananciaMaquinas: totalesHoja.gananciaTotalMaquinas,
      totalPendientes: totalesHoja.totalPendientes,
      totalProveedoresActivos: this.data.proveedores.length
    };
  }

  exportarJSON() {
    return JSON.stringify(this.data, null, 2);
  }

  importarJSON(jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed) {
        this.data = { ...SEED_DATA, ...parsed };
        this.saveState();
        return true;
      }
    } catch (e) {
      console.error('Error al importar:', e);
    }
    return false;
  }

  resetearDatosDemo() {
    this.data = JSON.parse(JSON.stringify(SEED_DATA));
    this.saveState();
  }
}

export const stateManager = new StateManager();
