/**
 * Módulo de Exportación y Respaldo Inteligente - Minisúper Fénix
 * Exportación filtrada por período (Día o Mes) a JSON, Excel (CSV con UTF-8 BOM) y PDF Imprimible.
 */

import { stateManager } from '../state.js';

export class ExportManager {
  /**
   * Obtiene los datos correspondientes al período seleccionado (día o mes)
   */
  static getDatosPeriodo(tipo, fecha = null, ano = null, mes = null) {
    const dataActual = stateManager.data;
    const hoyStr = stateManager.getFechaHoy();
    const targetFecha = fecha || dataActual.fecha || hoyStr;

    if (tipo === 'dia') {
      // Si la fecha solicitada es la fecha actual activa en memoria
      const esFechaActiva = targetFecha === (dataActual.fecha || hoyStr);
      let hojaDia = null;

      if (esFechaActiva) {
        hojaDia = {
          fecha: targetFecha,
          diaSemana: dataActual.diaSemana || 'Hoy',
          cajeroActual: dataActual.cajeroActual || 'Don Manuel',
          montoInicialCaja: dataActual.montoInicialCaja || 0,
          comprasProveedores: dataActual.comprasProveedores || [],
          conteoPan: dataActual.conteoPan || [],
          conteoTortilla: dataActual.conteoTortilla || [],
          arqueoColumnas: dataActual.arqueoColumnas || [],
          retiros: dataActual.retiros || [],
          prestamosPendientes: dataActual.prestamosPendientes || [],
          cascada: dataActual.cascada || {},
          totales: stateManager.getTotalesHoja()
        };
      } else {
        // Consultar historial local
        const historial = dataActual.historialDias || {};
        if (historial[targetFecha]) {
          hojaDia = {
            ...historial[targetFecha],
            fecha: targetFecha
          };
        } else {
          hojaDia = {
            fecha: targetFecha,
            mensaje: 'Sin registros para esta fecha',
            comprasProveedores: [],
            retiros: [],
            arqueoColumnas: []
          };
        }
      }

      return {
        tipo: 'dia',
        periodoTexto: `Día ${targetFecha}`,
        fecha: targetFecha,
        hoja: hojaDia
      };
    }

    if (tipo === 'mes') {
      const targetAno = parseInt(ano) || new Date().getFullYear();
      const targetMes = parseInt(mes) || (new Date().getMonth() + 1);
      const prefijoMes = `${targetAno}-${String(targetMes).padStart(2, '0')}`;

      const diasDelMes = [];
      const historial = dataActual.historialDias || {};

      // Si el día actual cae en este mes, incluirlo
      if (targetFecha.startsWith(prefijoMes)) {
        diasDelMes.push({
          fecha: targetFecha,
          comprasProveedores: dataActual.comprasProveedores || [],
          retiros: dataActual.retiros || [],
          totales: stateManager.getTotalesHoja()
        });
      }

      // Buscar en el historial
      Object.keys(historial).forEach(f => {
        if (f.startsWith(prefijoMes) && f !== targetFecha) {
          diasDelMes.push({
            fecha: f,
            ...historial[f]
          });
        }
      });

      return {
        tipo: 'mes',
        periodoTexto: `Mes ${prefijoMes}`,
        ano: targetAno,
        mes: targetMes,
        dias: diasDelMes
      };
    }

    if (tipo === 'proveedores') {
      return {
        tipo: 'proveedores',
        periodoTexto: 'Catálogo de Proveedores',
        proveedores: dataActual.catalogoProveedores || [],
        fechaExportacion: targetFecha
      };
    }

    return null;
  }

  /**
   * 1. Exportar a JSON de forma interna y directa (sin volcar en pantalla)
   */
  static exportarJSON(tipo, fecha = null, ano = null, mes = null) {
    const payload = this.getDatosPeriodo(tipo, fecha, ano, mes);
    if (!payload) return;

    const exportData = {
      sistema: 'Minisúper Fénix - Sistema Administrativo',
      version: '4.0',
      fechaGeneracion: new Date().toISOString(),
      filtroPeriodo: payload.tipo,
      periodo: payload.periodoTexto,
      contenido: payload
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const filename = `Fenix_${payload.periodoTexto.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
    
    this.descargarArchivo(blob, filename);
  }

  /**
   * 2. Exportar a Excel (.csv con UTF-8 BOM compatible al 100% con Microsoft Excel y Sheets)
   */
  static exportarExcel(tipo, fecha = null, ano = null, mes = null) {
    const datos = this.getDatosPeriodo(tipo, fecha, ano, mes);
    if (!datos) return;

    let csvContent = '\uFEFF'; // BOM para que Excel respete acentos y caracteres latinos

    // Encabezado institucional
    csvContent += `"MINISÚPER FÉNIX - REPORTE CONTABLE Y ADMINISTRATIVO"\n`;
    csvContent += `"Período:","${datos.periodoTexto}"\n`;
    csvContent += `"Fecha de Emisión:","${new Date().toLocaleString('es-MX')}"\n\n`;

    if (datos.tipo === 'dia') {
      const h = datos.hoja;

      // Sección 1: Resumen General
      csvContent += `"=== RESUMEN GENERAL DE CAJA ==="\n`;
      csvContent += `"Concepto","Monto ($ MXN)"\n`;
      csvContent += `"Cantidad Inicial de Caja","${h.montoInicialCaja || 0}"\n`;
      if (h.totales) {
        csvContent += `"Total Compras a Proveedores","${h.totales.totalPagadoProveedores || 0}"\n`;
        csvContent += `"Total Pagado en Efectivo","${h.totales.totalPagadoEfectivo || 0}"\n`;
        csvContent += `"Total Pagado en Transferencia","${h.totales.totalPagadoTransferencia || 0}"\n`;
        csvContent += `"Total Retiros de Caja","${h.totales.totalRetiros || 0}"\n`;
      }
      csvContent += `\n`;

      // Sección 2: Compras a Proveedores
      csvContent += `"=== COMPRAS A PROVEEDORES ==="\n`;
      csvContent += `"Proveedor","Categoría","Hora","Forma de Pago","Presupuesto","Monto Pagado","Estado","Notas"\n`;
      const compras = h.comprasProveedores || [];
      if (compras.length === 0) {
        csvContent += `"Sin compras registradas","","","","0","0","",""\n`;
      } else {
        compras.forEach(c => {
          const prov = (c.proveedor || '').replace(/"/g, '""');
          const cat = (c.categoria || '').replace(/"/g, '""');
          const hora = c.hora || '-';
          const forma = c.formaPago || 'Efectivo';
          const pres = parseFloat(c.presupuesto) || 0;
          const pagado = parseFloat(c.pagado) || 0;
          const estado = pagado > 0 ? 'Pagado' : 'Pendiente';
          const notas = (c.notas || '').replace(/"/g, '""');
          csvContent += `"${prov}","${cat}","${hora}","${forma}","${pres}","${pagado}","${estado}","${notas}"\n`;
        });
      }
      csvContent += `\n`;

      // Sección 3: Retiros de Caja
      csvContent += `"=== RETIROS DE EFECTIVO ==="\n`;
      csvContent += `"Número","Retiró / Responsable","Concepto","Monto ($ MXN)"\n`;
      const retiros = (h.retiros || []).filter(r => (parseFloat(r.monto) > 0) || (r.nombre && r.nombre.trim() !== ''));
      if (retiros.length === 0) {
        csvContent += `"1","Sin retiros registrados","","0"\n`;
      } else {
        retiros.forEach((r, idx) => {
          const nom = (r.nombre || '').replace(/"/g, '""');
          const conc = (r.concepto || '').replace(/"/g, '""');
          const monto = parseFloat(r.monto) || 0;
          csvContent += `"${idx + 1}","${nom}","${conc}","${monto}"\n`;
        });
      }
      csvContent += `\n`;

      // Sección 4: Corte y Arqueo
      csvContent += `"=== CORTE Y ARQUEO ==="\n`;
      csvContent += `"Concepto","Cantidad 1","Cantidad 2","Cantidad 3"\n`;
      const arq = h.arqueoColumnas || [];
      const col0 = arq[0] || {};
      const col1 = arq[1] || {};
      const col2 = arq[2] || {};

      csvContent += `"TARJETAS","${col0.tarjetas || 0}","${col1.tarjetas || 0}","${col2.tarjetas || 0}"\n`;
      csvContent += `"TARJETA YOMP","${col0.tarjetaYomp || 0}","${col1.tarjetaYomp || 0}","${col2.tarjetaYomp || 0}"\n`;
      csvContent += `"SISTEMA (POS)","${col0.sistema || 0}","${col1.sistema || 0}","${col2.sistema || 0}"\n`;
      csvContent += `"BILLETES","${col0.billetes || 0}","${col1.billetes || 0}","${col2.billetes || 0}"\n`;
      csvContent += `"MON. 1","${col0.mon1 || 0}","${col1.mon1 || 0}","${col2.mon1 || 0}"\n`;
      csvContent += `"MON. 2","${col0.mon2 || 0}","${col1.mon2 || 0}","${col2.mon2 || 0}"\n`;
      csvContent += `"MON. 5","${col0.mon5 || 0}","${col1.mon5 || 0}","${col2.mon5 || 0}"\n`;
      csvContent += `"MON. 10","${col0.mon10 || 0}","${col1.mon10 || 0}","${col2.mon10 || 0}"\n`;
      csvContent += `"MORRALLA (Suma)","${col0.morralla || 0}","${col1.morralla || 0}","${col2.morralla || 0}"\n`;

    } else if (datos.tipo === 'mes') {
      csvContent += `"=== REPORTE MENSUAL DE COMPRAS Y RETIROS ==="\n`;
      csvContent += `"Fecha","Proveedor","Forma de Pago","Monto Pagado","Retiros del Día"\n`;

      const dias = datos.dias || [];
      if (dias.length === 0) {
        csvContent += `"Sin datos registrados para este mes","","","0","0"\n`;
      } else {
        dias.forEach(d => {
          const compras = d.comprasProveedores || [];
          const totalRetDia = (d.retiros || []).reduce((acc, r) => acc + (parseFloat(r.monto) || 0), 0);

          if (compras.length === 0) {
            csvContent += `"${d.fecha}","Sin proveedores","","0","${totalRetDia}"\n`;
          } else {
            compras.forEach((c, idx) => {
              const prov = (c.proveedor || '').replace(/"/g, '""');
              const forma = c.formaPago || 'Efectivo';
              const pagado = parseFloat(c.pagado) || 0;
              const retiroPrint = idx === 0 ? totalRetDia : '';
              csvContent += `"${d.fecha}","${prov}","${forma}","${pagado}","${retiroPrint}"\n`;
            });
          }
        });
      }
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const filename = `Reporte_Fenix_${datos.periodoTexto.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`;
    this.descargarArchivo(blob, filename);
  }

  /**
   * 3. Exportar a PDF / Vista de Impresión Ejecutiva Minimalista
   */
  static exportarPDF(tipo, fecha = null, ano = null, mes = null) {
    const datos = this.getDatosPeriodo(tipo, fecha, ano, mes);
    if (!datos) return;

    const fmt = (v) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(parseFloat(v) || 0);

    let htmlContenido = '';

    if (datos.tipo === 'dia') {
      const h = datos.hoja;
      const compras = h.comprasProveedores || [];
      const retiros = (h.retiros || []).filter(r => (parseFloat(r.monto) > 0) || (r.nombre && r.nombre.trim() !== ''));
      const arq = h.arqueoColumnas || [];

      htmlContenido = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; max-width: 800px; margin: 0 auto; padding: 20px;">
          <!-- Encabezado Institucional Sobrio -->
          <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-end;">
            <div>
              <h1 style="margin: 0; font-size: 1.4rem; color: #0f172a; font-weight: 800; letter-spacing: -0.5px;">MINISÚPER FÉNIX</h1>
              <p style="margin: 2px 0 0; font-size: 0.85rem; color: #475569;">Reporte Contable Diario de Operaciones</p>
            </div>
            <div style="text-align: right; font-size: 0.8rem; color: #64748b;">
              <div><strong>Fecha:</strong> ${datos.fecha}</div>
              <div><strong>Emitido:</strong> ${new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>

          <!-- Resumen de Totales -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
            <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; background: #f8fafc;">
              <span style="font-size: 0.7rem; color: #64748b; text-transform: uppercase; font-weight: 700;">Inicial Caja</span>
              <div style="font-size: 1rem; font-weight: 800; color: #0f172a;">${fmt(h.montoInicialCaja)}</div>
            </div>
            <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; background: #f8fafc;">
              <span style="font-size: 0.7rem; color: #64748b; text-transform: uppercase; font-weight: 700;">Compras Pagadas</span>
              <div style="font-size: 1rem; font-weight: 800; color: #0f172a;">${fmt(h.totales?.totalPagadoProveedores || 0)}</div>
            </div>
            <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; background: #f8fafc;">
              <span style="font-size: 0.7rem; color: #64748b; text-transform: uppercase; font-weight: 700;">Pago Efectivo</span>
              <div style="font-size: 1rem; font-weight: 800; color: #0f172a;">${fmt(h.totales?.totalPagadoEfectivo || 0)}</div>
            </div>
            <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; background: #f8fafc;">
              <span style="font-size: 0.7rem; color: #64748b; text-transform: uppercase; font-weight: 700;">Total Retiros</span>
              <div style="font-size: 1rem; font-weight: 800; color: #0f172a;">${fmt(h.totales?.totalRetiros || 0)}</div>
            </div>
          </div>

          <!-- Tabla de Compras -->
          <h3 style="font-size: 0.92rem; color: #0f172a; margin: 16px 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
            COMPRAS A PROVEEDORES
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem; margin-bottom: 20px;">
            <thead>
              <tr style="background: #f1f5f9; text-align: left; color: #475569;">
                <th style="padding: 6px 8px; border: 1px solid #cbd5e1;">Proveedor</th>
                <th style="padding: 6px 8px; border: 1px solid #cbd5e1;">Categoría</th>
                <th style="padding: 6px 8px; border: 1px solid #cbd5e1;">Hora</th>
                <th style="padding: 6px 8px; border: 1px solid #cbd5e1;">Pago</th>
                <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">Presupuesto</th>
                <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">Pagado</th>
              </tr>
            </thead>
            <tbody>
              ${compras.length === 0 ? `
                <tr><td colspan="6" style="padding: 10px; text-align: center; color: #94a3b8; border: 1px solid #e2e8f0;">Sin registros</td></tr>
              ` : compras.map(c => `
                <tr>
                  <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-weight: 700;">${c.proveedor || '-'}</td>
                  <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-transform: capitalize;">${c.categoria || '-'}</td>
                  <td style="padding: 6px 8px; border: 1px solid #e2e8f0;">${c.hora || '-'}</td>
                  <td style="padding: 6px 8px; border: 1px solid #e2e8f0;">${c.formaPago || 'Efectivo'}</td>
                  <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: right;">${fmt(c.presupuesto)}</td>
                  <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: 700;">${fmt(c.pagado)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Tablas Arqueo y Retiros en dos columnas -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
            <div>
              <h3 style="font-size: 0.92rem; color: #0f172a; margin: 0 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
                CORTE Y ARQUEO
              </h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 0.78rem;">
                <thead>
                  <tr style="background: #f1f5f9; color: #475569;">
                    <th style="padding: 5px; border: 1px solid #cbd5e1; text-align: left;">Concepto</th>
                    <th style="padding: 5px; border: 1px solid #cbd5e1; text-align: right;">Cant. 1</th>
                    <th style="padding: 5px; border: 1px solid #cbd5e1; text-align: right;">Cant. 2</th>
                    <th style="padding: 5px; border: 1px solid #cbd5e1; text-align: right;">Cant. 3</th>
                  </tr>
                </thead>
                <tbody>
                  ${['tarjetas', 'tarjetaYomp', 'sistema', 'billetes', 'morralla'].map(k => `
                    <tr>
                      <td style="padding: 4px 6px; border: 1px solid #e2e8f0; text-transform: uppercase; font-weight: 600;">${k.replace('tarjetaYomp', 'T. Yomp')}</td>
                      <td style="padding: 4px 6px; border: 1px solid #e2e8f0; text-align: right;">${fmt(arq[0]?.[k])}</td>
                      <td style="padding: 4px 6px; border: 1px solid #e2e8f0; text-align: right;">${fmt(arq[1]?.[k])}</td>
                      <td style="padding: 4px 6px; border: 1px solid #e2e8f0; text-align: right;">${fmt(arq[2]?.[k])}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <div>
              <h3 style="font-size: 0.92rem; color: #0f172a; margin: 0 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
                RETIROS DE EFECTIVO
              </h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 0.78rem;">
                <thead>
                  <tr style="background: #f1f5f9; color: #475569;">
                    <th style="padding: 5px; border: 1px solid #cbd5e1; text-align: left;">Retiró</th>
                    <th style="padding: 5px; border: 1px solid #cbd5e1; text-align: left;">Concepto</th>
                    <th style="padding: 5px; border: 1px solid #cbd5e1; text-align: right;">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  ${retiros.length === 0 ? `
                    <tr><td colspan="3" style="padding: 8px; text-align: center; color: #94a3b8; border: 1px solid #e2e8f0;">Sin retiros</td></tr>
                  ` : retiros.map(r => `
                    <tr>
                      <td style="padding: 4px 6px; border: 1px solid #e2e8f0; font-weight: 600;">${r.nombre || '-'}</td>
                      <td style="padding: 4px 6px; border: 1px solid #e2e8f0;">${r.concepto || '-'}</td>
                      <td style="padding: 4px 6px; border: 1px solid #e2e8f0; text-align: right; font-weight: 700;">${fmt(r.monto)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Pie de Firma -->
          <div style="margin-top: 36px; padding-top: 14px; border-top: 1px dashed #94a3b8; display: flex; justify-content: space-around; text-align: center; font-size: 0.78rem; color: #475569;">
            <div>
              <div style="width: 180px; border-bottom: 1px solid #0f172a; margin-bottom: 4px;"></div>
              Firma Don Manuel / Encargado
            </div>
            <div>
              <div style="width: 180px; border-bottom: 1px solid #0f172a; margin-bottom: 4px;"></div>
              Firma Cajero(a)
            </div>
          </div>
        </div>
      `;
    } else {
      // Vista mensual
      const dias = datos.dias || [];
      htmlContenido = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; max-width: 800px; margin: 0 auto; padding: 20px;">
          <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-end;">
            <div>
              <h1 style="margin: 0; font-size: 1.4rem; color: #0f172a; font-weight: 800;">MINISÚPER FÉNIX</h1>
              <p style="margin: 2px 0 0; font-size: 0.85rem; color: #475569;">Consolidado Mensual de Compras y Proveedores</p>
            </div>
            <div style="text-align: right; font-size: 0.8rem; color: #64748b;">
              <div><strong>Período:</strong> ${datos.periodoTexto}</div>
              <div><strong>Generado:</strong> ${new Date().toLocaleDateString('es-MX')}</div>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem; margin-top: 12px;">
            <thead>
              <tr style="background: #f1f5f9; color: #475569; text-align: left;">
                <th style="padding: 7px 10px; border: 1px solid #cbd5e1;">Fecha</th>
                <th style="padding: 7px 10px; border: 1px solid #cbd5e1;">Compras Realizadas</th>
                <th style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: right;">Total Compras</th>
                <th style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: right;">Total Retiros</th>
              </tr>
            </thead>
            <tbody>
              ${dias.length === 0 ? `
                <tr><td colspan="4" style="padding: 12px; text-align: center; color: #94a3b8; border: 1px solid #e2e8f0;">Sin registros este mes</td></tr>
              ` : dias.map(d => {
                const totalComp = (d.comprasProveedores || []).reduce((acc, c) => acc + (parseFloat(c.pagado) || 0), 0);
                const totalRet = (d.retiros || []).reduce((acc, r) => acc + (parseFloat(r.monto) || 0), 0);
                const count = (d.comprasProveedores || []).filter(c => parseFloat(c.pagado) > 0).length;
                return `
                  <tr>
                    <td style="padding: 6px 10px; border: 1px solid #e2e8f0; font-weight: 700;">${d.fecha}</td>
                    <td style="padding: 6px 10px; border: 1px solid #e2e8f0;">${count} proveedores pagados</td>
                    <td style="padding: 6px 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: 700;">${fmt(totalComp)}</td>
                    <td style="padding: 6px 10px; border: 1px solid #e2e8f0; text-align: right;">${fmt(totalRet)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // Abrir ventana limpia de impresión
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Reporte Minisúper Fénix - ${datos.periodoTexto}</title>
          <style>
            @page { size: letter portrait; margin: 12mm; }
            body { margin: 0; padding: 0; background: #ffffff; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${htmlContenido}
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  }

  static descargarArchivo(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }
}
