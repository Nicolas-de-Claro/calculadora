/**
 * Módulo de exportación a PDF
 * Usa jsPDF cargado desde CDN
 */

import { formatCurrency } from './utils.js';

/**
 * Genera y descarga un PDF con la cotización actual
 */
export function exportToPdf() {
    const { jsPDF } = window.jspdf;

    if (!jsPDF) {
        console.error('jsPDF no está cargado');
        alert('Error: No se pudo cargar la biblioteca de PDF');
        return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Configuración de colores
    const primaryColor = [211, 47, 47]; // Rojo Claro
    const textColor = [33, 33, 33];
    const lightGray = [200, 200, 200];

    let yPos = 20;

    // ========== Header ==========
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Cotización de Servicios', pageWidth / 2, 18, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const fecha = new Date().toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    doc.text(`Generado: ${fecha}`, pageWidth / 2, 28, { align: 'center' });

    yPos = 50;

    // ========== Desglose de Precios ==========
    doc.setTextColor(...textColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalle de Servicios', 20, yPos);
    yPos += 10;

    // Línea separadora
    doc.setDrawColor(...lightGray);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 8;

    // Obtener items del breakdown
    const breakdownItems = document.querySelectorAll('#price-breakdown .breakdown-item');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    breakdownItems.forEach(item => {
        const label = item.querySelector('.label').textContent;
        const value = item.querySelector('.value').textContent;

        // Determinar si es descuento (valor negativo)
        const isDiscount = value.includes('-');

        if (isDiscount) {
            doc.setTextColor(76, 175, 80); // Verde para descuentos
        } else {
            doc.setTextColor(...textColor);
        }

        doc.text(label, 25, yPos);
        doc.text(value, pageWidth - 25, yPos, { align: 'right' });
        yPos += 8;
    });

    // ========== Total ==========
    yPos += 5;
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 12;

    const total = document.getElementById('total-price').textContent;

    doc.setFillColor(...primaryColor);
    doc.roundedRect(20, yPos - 8, pageWidth - 40, 20, 3, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL MENSUAL', 30, yPos + 5);
    doc.setFontSize(16);
    doc.text(total, pageWidth - 30, yPos + 5, { align: 'right' });

    // ========== Footer ==========
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Calculadora de Precios - Los precios pueden variar sin previo aviso', pageWidth / 2, pageHeight - 10, { align: 'center' });

    // ========== Descargar PDF ==========
    doc.save(`cotizacion_${new Date().toISOString().split('T')[0]}.pdf`);
}
