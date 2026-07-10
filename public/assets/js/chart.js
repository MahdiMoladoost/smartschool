/**
 * @fileoverview توابع کمکی نمودار - سیستم مدیریت هوشمند مدارس
 * @author مدیریت هوشمند
 * @version 2.0.0
 */

// ==========================================
// تنظیمات پیش‌فرض نمودارها
// ==========================================

Chart.defaults.font.family = 'Vazir, Tahoma, sans-serif';
Chart.defaults.font.size = 12;

// ==========================================
// تابع ایجاد نمودار خطی (پیشرفت)
// ==========================================

function createLineChart(ctx, labels, datasets, options = {}) {
    if (!ctx) return null;
    
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets.map(dataset => ({
                label: dataset.label,
                data: dataset.data,
                borderColor: dataset.borderColor || '#2563eb',
                backgroundColor: dataset.backgroundColor || 'rgba(37, 99, 235, 0.1)',
                fill: dataset.fill !== false,
                tension: dataset.tension || 0.3,
                pointRadius: dataset.pointRadius || 4,
                pointHoverRadius: dataset.pointHoverRadius || 6
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: options.legendPosition || 'top',
                    rtl: true,
                    labels: { font: { family: 'Vazir' } }
                },
                tooltip: {
                    bodyFont: { family: 'Vazir' },
                    titleFont: { family: 'Vazir' }
                }
            },
            scales: {
                y: {
                    beginAtZero: options.beginAtZero !== false,
                    ...options.yAxisOptions,
                    ticks: { font: { family: 'Vazir' } }
                },
                x: {
                    ticks: { font: { family: 'Vazir' } }
                }
            },
            ...options.chartOptions
        }
    });
}

// ==========================================
// تابع ایجاد نمودار میله‌ای (Bar Chart)
// ==========================================

function createBarChart(ctx, labels, datasets, options = {}) {
    if (!ctx) return null;
    
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets.map(dataset => ({
                label: dataset.label,
                data: dataset.data,
                backgroundColor: dataset.backgroundColor || '#2563eb',
                borderRadius: dataset.borderRadius || 6,
                borderWidth: dataset.borderWidth || 0
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: options.legendPosition || 'top',
                    rtl: true,
                    labels: { font: { family: 'Vazir' } }
                },
                tooltip: {
                    bodyFont: { family: 'Vazir' },
                    titleFont: { family: 'Vazir' }
                }
            },
            scales: {
                y: {
                    beginAtZero: options.beginAtZero !== false,
                    ticks: { font: { family: 'Vazir' } }
                },
                x: {
                    ticks: { font: { family: 'Vazir' } }
                }
            },
            ...options.chartOptions
        }
    });
}

// ==========================================
// تابع ایجاد نمودار دایره‌ای (Pie/Doughnut Chart)
// ==========================================

function createPieChart(ctx, labels, data, colors, options = {}) {
    if (!ctx) return null;
    
    const defaultColors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const chartColors = colors || defaultColors.slice(0, data.length);
    
    return new Chart(ctx, {
        type: options.type || 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: chartColors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: options.legendPosition || 'bottom',
                    rtl: true,
                    labels: { font: { family: 'Vazir' } }
                },
                tooltip: {
                    bodyFont: { family: 'Vazir' },
                    titleFont: { family: 'Vazir' },
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: options.cutout || '50%',
            ...options.chartOptions
        }
    });
}

// ==========================================
// تابع ایجاد نمودار منطقه‌ای (Area Chart)
// ==========================================

function createAreaChart(ctx, labels, datasets, options = {}) {
    if (!ctx) return null;
    
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets.map(dataset => ({
                label: dataset.label,
                data: dataset.data,
                borderColor: dataset.borderColor || '#2563eb',
                backgroundColor: dataset.backgroundColor || 'rgba(37, 99, 235, 0.2)',
                fill: true,
                tension: 0.3,
                pointRadius: 0,
                pointHoverRadius: 4
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: options.legendPosition || 'top',
                    rtl: true,
                    labels: { font: { family: 'Vazir' } }
                },
                tooltip: {
                    bodyFont: { family: 'Vazir' },
                    titleFont: { family: 'Vazir' }
                }
            },
            scales: {
                y: {
                    beginAtZero: options.beginAtZero !== false,
                    grid: { display: true },
                    ticks: { font: { family: 'Vazir' } }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { family: 'Vazir' } }
                }
            },
            ...options.chartOptions
        }
    });
}

// ==========================================
// تابع ایجاد نمودار راداری (Radar Chart)
// ==========================================

function createRadarChart(ctx, labels, datasets, options = {}) {
    if (!ctx) return null;
    
    return new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: datasets.map(dataset => ({
                label: dataset.label,
                data: dataset.data,
                borderColor: dataset.borderColor || '#2563eb',
                backgroundColor: dataset.backgroundColor || 'rgba(37, 99, 235, 0.2)',
                pointBackgroundColor: dataset.pointColor || '#2563eb',
                pointBorderColor: '#fff',
                pointRadius: 4,
                pointHoverRadius: 6
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: options.legendPosition || 'top',
                    rtl: true,
                    labels: { font: { family: 'Vazir' } }
                },
                tooltip: {
                    bodyFont: { family: 'Vazir' },
                    titleFont: { family: 'Vazir' }
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    ticks: { font: { family: 'Vazir' } },
                    pointLabels: { font: { family: 'Vazir' } }
                }
            },
            ...options.chartOptions
        }
    });
}

// ==========================================
// تابع به‌روزرسانی نمودار
// ==========================================

function updateChart(chart, newLabels, newData, datasetIndex = 0) {
    if (!chart) return;
    
    if (newLabels) chart.data.labels = newLabels;
    if (newData) chart.data.datasets[datasetIndex].data = newData;
    chart.update();
}

// ==========================================
// تابع حذف نمودار
// ==========================================

function destroyChart(chart) {
    if (chart) {
        chart.destroy();
    }
}

// ==========================================
// رنگ‌های پیش‌فرض برای نمودارها
// ==========================================

const ChartColors = {
    primary: '#2563eb',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#8b5cf6',
    dark: '#1e293b',
    gray: '#94a3b8',
    
    palette: [
        '#2563eb', '#10b981', '#f59e0b', '#ef4444', 
        '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
        '#f97316', '#6366f1', '#d946ef', '#14b8a6'
    ]
};

// ==========================================
// تابع تولید گرادیانت برای نمودارها
// ==========================================

function createGradient(ctx, startColor, endColor) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, startColor);
    gradient.addColorStop(1, endColor);
    return gradient;
}

// اتصال به window
window.createLineChart = createLineChart;
window.createBarChart = createBarChart;
window.createPieChart = createPieChart;
window.createAreaChart = createAreaChart;
window.createRadarChart = createRadarChart;
window.updateChart = updateChart;
window.destroyChart = destroyChart;
window.ChartColors = ChartColors;
window.createGradient = createGradient;

console.log('✅ توابع نمودار با موفقیت بارگذاری شد');