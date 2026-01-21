import { loadScript } from './utils.js';

let chartInstance = null;
let isChartLoading = false;

/**
 * Actualiza o crea el gráfico de distribución de costos
 * @param {Array} breakdownItems - Items del desglose [{label, value}]
 */
export async function updateChart(breakdownItems) {
    const canvas = document.getElementById('cost-chart');
    if (!canvas) return;

    // Lazy load Chart.js
    if (typeof Chart === 'undefined') {
        if (isChartLoading) return; // Evitar cargas duplicadas

        try {
            isChartLoading = true;
            // Mostrar estado de carga si es visible el contenedor
            const container = document.getElementById('chart-container');
            if (container && container.style.display !== 'none') {
                // Opcional: mostrar loader visual
            }

            await loadScript('https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js');
            isChartLoading = false;
        } catch (error) {
            console.error('Error cargando Chart.js:', error);
            isChartLoading = false;
            return;
        }
    }

    const ctx = canvas.getContext('2d');

    // Filtrar solo valores positivos para el gráfico
    const validItems = breakdownItems.filter(item => item && item.value > 0);

    if (validItems.length === 0) {
        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }
        return;
    }

    const labels = validItems.map(item => item.label);
    const data = validItems.map(item => item.value);

    // Colores para las categorías
    const colors = [
        'rgba(211, 47, 47, 0.8)',   // Rojo primario
        'rgba(255, 87, 34, 0.8)',   // Naranja
        'rgba(255, 152, 0, 0.8)',   // Ámbar
        'rgba(76, 175, 80, 0.8)',   // Verde
        'rgba(33, 150, 243, 0.8)',  // Azul
        'rgba(156, 39, 176, 0.8)',  // Púrpura
        'rgba(0, 150, 136, 0.8)',   // Teal
        'rgba(121, 85, 72, 0.8)'    // Marrón
    ];

    const borderColors = colors.map(c => c.replace('0.8', '1'));

    // Si ya existe el gráfico, actualizarlo
    if (chartInstance) {
        chartInstance.data.labels = labels;
        chartInstance.data.datasets[0].data = data;
        chartInstance.data.datasets[0].backgroundColor = colors.slice(0, data.length);
        chartInstance.data.datasets[0].borderColor = borderColors.slice(0, data.length);
        chartInstance.update('none');
        return;
    }

    // Crear nuevo gráfico
    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, data.length),
                borderColor: borderColors.slice(0, data.length),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#333333',
                        padding: 12,
                        usePointStyle: true,
                        font: {
                            size: 11,
                            weight: '500'
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${context.label}: $${value.toLocaleString('es-AR')} (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '55%'
        }
    });
}

/**
 * Muestra u oculta el contenedor del gráfico
 * @param {boolean} show - True para mostrar, false para ocultar
 */
export function toggleChartVisibility(show) {
    const container = document.getElementById('chart-container');
    if (container) {
        container.style.display = show ? 'block' : 'none';
    }
}

/**
 * Destruye el gráfico actual
 */
export function destroyChart() {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
}
