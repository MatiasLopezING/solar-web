// ============================================================
// API_URL vacío = URL relativa.
// Funciona automáticamente en localhost Y a través de cualquier
// túnel Cloudflare sin necesidad de actualizar este archivo.
// ============================================================
const API_URL = "";

// ============================================================

let mainChart = null;
let currentData = null;
let activeModel = null;
let currentMode = 'ghi'; // 'ghi' o 'kt'

function resetZoom() {
    if (mainChart) mainChart.resetZoom();
}

function setStatus(state, msg) {
    const el = document.getElementById('apiStatus');
    el.className = `api-status api-status--${state}`;
    el.textContent = msg;
}

function setMode(mode) {
    currentMode = mode;

    // Actualizar estado activo en los botones de modo
    document.getElementById('btnModeGHI').classList.toggle('active', mode === 'ghi');
    document.getElementById('btnModeKt').classList.toggle('active', mode === 'kt');

    // Actualizar títulos dinámicos en la cabecera
    const titleEl = document.getElementById('mainTitle');
    const subtitleEl = document.getElementById('mainSubtitle');
    if (mode === 'ghi') {
        titleEl.innerText = "Comparativa de Modelos (GHI)";
        subtitleEl.innerText = "Irradiancia Solar Global Horizontal — Predicción vs Datos Reales";
    } else {
        titleEl.innerText = "Comparativa de Modelos (Kt)";
        subtitleEl.innerText = "Índice de Claridad de Cielo Claro — Predicción vs Datos Reales";
    }

    updateView();
}

async function fetchData() {
    try {
        setStatus('connecting', '⏳ Actualizando datos...');
        const response = await fetch(`${API_URL}/api/data`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        if (data.error) {
            setStatus('error', `⚠️ Error del backend: ${data.error}`);
            return;
        }

        currentData = data;
        setStatus('ok', `✅ Datos actualizados — ${new Date().toLocaleTimeString('es-AR')}`);

        // Extraer modelos únicos (ej: 'RF (now)' → 'RF')
        const models = new Set();
        if (data.series) {
            Object.keys(data.series).forEach(key => {
                const baseName = key.split(' ')[0];
                models.add(baseName);
            });
        }

        const modelsArray = Array.from(models);

        if (modelsArray.length > 0 && !activeModel) {
            activeModel = modelsArray[0];
        }

        renderModelButtons(modelsArray);
        updateView();

    } catch (error) {
        setStatus('error', `❌ Sin conexión con el backend (${error.message})`);
        console.error('Error fetching data:', error);
    }
}

function renderModelButtons(models) {
    const container = document.getElementById('modelSelectors');
    container.innerHTML = '';

    if (models.length === 0) {
        container.innerHTML = '<span style="color:#64748b">No hay modelos disponibles</span>';
        return;
    }

    models.forEach(model => {
        const btn = document.createElement('button');
        btn.className = `btn-model ${model === activeModel ? 'active' : ''}`;
        btn.innerText = model;
        btn.onclick = () => {
            activeModel = model;
            renderModelButtons(models);
            updateView();
        };
        container.appendChild(btn);
    });
}

function updateView() {
    if (!currentData || !activeModel) return;

    const maeNowEl = document.getElementById('maeNow');
    const maeNowGlobEl = document.getElementById('maeNowGlobal');
    const maeForeEl = document.getElementById('maeFore');
    const maeForeGlobEl = document.getElementById('maeForeGlobal');

    const keyNow = `${activeModel} (now)`;
    const keyFore = `${activeModel} (fore)`;

    const metricsNow = currentData.metrics[keyNow];
    const metricsFore = currentData.metrics[keyFore];

    if (currentMode === 'ghi') {
        // Modo GHI: mostrar métricas en W/m² y wMAPE
        if (metricsNow) {
            const maeOp = metricsNow.mae_operacional_ghi != null ? `${metricsNow.mae_operacional_ghi.toFixed(2)} W/m²` : 'N/A';
            const wmapeOp = metricsNow.wmape_operacional_ghi != null ? ` (wMAPE: ${metricsNow.wmape_operacional_ghi.toFixed(1)}%)` : '';
            maeNowEl.innerText = maeOp + wmapeOp;

            const maeGl = metricsNow.mae_global_ghi != null ? `Global: ${metricsNow.mae_global_ghi.toFixed(2)} W/m²` : '';
            const wmapeGl = metricsNow.wmape_global_ghi != null ? ` (wMAPE: ${metricsNow.wmape_global_ghi.toFixed(1)}%)` : '';
            maeNowGlobEl.innerText = maeGl + wmapeGl;
        } else {
            maeNowEl.innerText = 'N/A';
            maeNowGlobEl.innerText = '';
        }

        if (metricsFore) {
            const maeOp = metricsFore.mae_operacional_ghi != null ? `${metricsFore.mae_operacional_ghi.toFixed(2)} W/m²` : 'N/A';
            const wmapeOp = metricsFore.wmape_operacional_ghi != null ? ` (wMAPE: ${metricsFore.wmape_operacional_ghi.toFixed(1)}%)` : '';
            maeForeEl.innerText = maeOp + wmapeOp;

            const maeGl = metricsFore.mae_global_ghi != null ? `Global: ${metricsFore.mae_global_ghi.toFixed(2)} W/m²` : '';
            const wmapeGl = metricsFore.wmape_global_ghi != null ? ` (wMAPE: ${metricsFore.wmape_global_ghi.toFixed(1)}%)` : '';
            maeForeGlobEl.innerText = maeGl + wmapeGl;
        } else {
            maeForeEl.innerText = 'N/A';
            maeForeGlobEl.innerText = '';
        }
    } else {
        // Modo Kt: mostrar métricas originales de Kt
        if (metricsNow) {
            maeNowEl.innerText = metricsNow.mae_operacional != null
                ? metricsNow.mae_operacional.toFixed(4) : 'N/A';
            maeNowGlobEl.innerText = metricsNow.mae_global != null
                ? `Global: ${metricsNow.mae_global.toFixed(4)}` : '';
        } else {
            maeNowEl.innerText = 'N/A';
            maeNowGlobEl.innerText = '';
        }

        if (metricsFore) {
            maeForeEl.innerText = metricsFore.mae_operacional != null
                ? metricsFore.mae_operacional.toFixed(4) : 'N/A';
            maeForeGlobEl.innerText = metricsFore.mae_global != null
                ? `Global: ${metricsFore.mae_global.toFixed(4)}` : '';
        } else {
            maeForeEl.innerText = 'N/A';
            maeForeGlobEl.innerText = '';
        }
    }

    renderChart();
}

function renderChart() {
    const ctx = document.getElementById('mainChart').getContext('2d');

    if (mainChart) mainChart.destroy();

    const keyNow = `${activeModel} (now)`;
    const keyFore = `${activeModel} (fore)`;

    let datasets = [];

    if (currentMode === 'ghi') {
        // GHI Mode: calcular real_ghi y pred_ghi multiplicando por clearsky
        const realGhi = currentData.real_kt.map((kt, i) => {
            const cs = currentData.clearsky_ghi[i];
            return (kt !== null && cs !== null) ? (kt * cs) : null;
        });

        const clearskyGhi = currentData.clearsky_ghi;

        datasets.push({
            label: 'Real GHI',
            data: realGhi,
            borderColor: '#10b981',
            borderWidth: 2,
            pointRadius: (ctx) => {
                const d = ctx.dataset.data;
                const i = ctx.dataIndex;
                const prev = i > 0 ? d[i - 1] : null;
                const next = i < d.length - 1 ? d[i + 1] : null;
                return (prev === null || next === null) ? 3 : 0;
            },
            pointHitRadius: 10,
            tension: 0.2
        });

        // Curva del cielo claro como referencia estética y física
        datasets.push({
            label: 'Teórico Clear Sky',
            data: clearskyGhi,
            borderColor: '#94a3b8',
            borderWidth: 1.5,
            borderDash: [4, 4],
            pointRadius: 0,
            pointHitRadius: 0,
            tension: 0.2,
            fill: false
        });

        if (currentData.series[keyNow]) {
            const predGhiNow = currentData.series[keyNow].map((kt, i) => {
                const cs = currentData.clearsky_ghi[i];
                return (kt !== null && cs !== null) ? (kt * cs) : null;
            });
            datasets.push({
                label: `Nowcasting (${activeModel}) GHI`,
                data: predGhiNow,
                borderColor: '#f59e0b',
                borderWidth: 2,
                pointRadius: 1,
                tension: 0.2
            });
        }

        if (currentData.series[keyFore]) {
            const predGhiFore = currentData.series[keyFore].map((kt, i) => {
                const cs = currentData.clearsky_ghi[i];
                return (kt !== null && cs !== null) ? (kt * cs) : null;
            });
            datasets.push({
                label: `Forecasting (${activeModel}) GHI`,
                data: predGhiFore,
                borderColor: '#8b5cf6',
                borderDash: [5, 5],
                borderWidth: 2,
                pointRadius: 1,
                tension: 0.2
            });
        }
    } else {
        // Kt Mode: graficar el Kt directo
        datasets.push({
            label: 'Real (Kt)',
            data: currentData.real_kt,
            borderColor: '#10b981',
            borderWidth: 2,
            pointRadius: (ctx) => {
                const d = ctx.dataset.data;
                const i = ctx.dataIndex;
                const prev = i > 0 ? d[i - 1] : null;
                const next = i < d.length - 1 ? d[i + 1] : null;
                return (prev === null || next === null) ? 3 : 0;
            },
            pointHitRadius: 10,
            tension: 0.2
        });

        if (currentData.series[keyNow]) {
            datasets.push({
                label: `Nowcasting (${activeModel})`,
                data: currentData.series[keyNow],
                borderColor: '#f59e0b',
                borderWidth: 2,
                pointRadius: 1,
                tension: 0.2
            });
        }

        if (currentData.series[keyFore]) {
            datasets.push({
                label: `Forecasting (${activeModel})`,
                data: currentData.series[keyFore],
                borderColor: '#8b5cf6',
                borderDash: [5, 5],
                borderWidth: 2,
                pointRadius: 1,
                tension: 0.2
            });
        }
    }

    Chart.defaults.color = '#64748b';
    Chart.defaults.font.family = "'Inter', sans-serif";

    mainChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: currentData.timestamps,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 12, usePointStyle: true }
                },
                tooltip: {
                    backgroundColor: '#f8fafc',
                    titleColor: '#0f172a',
                    bodyColor: '#334155',
                    borderColor: '#e2e8f0',
                    borderWidth: 1,
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                if (currentMode === 'ghi') {
                                    label += context.parsed.y.toFixed(1) + ' W/m²';
                                } else {
                                    label += context.parsed.y.toFixed(4);
                                }
                            }
                            return label;
                        }
                    }
                },
                zoom: {
                    pan: {
                        enabled: true,
                        mode: 'x',
                        cursor: 'grab'
                    },
                    zoom: {
                        wheel: { enabled: true },
                        pinch: { enabled: true },
                        mode: 'x'
                    },
                    limits: {
                        x: { minRange: 6 }  // mínimo 1 hora visible
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: '#e2e8f0' },
                    ticks: { maxTicksLimit: 12 }
                },
                y: {
                    beginAtZero: true,
                    suggestedMax: currentMode === 'ghi' ? undefined : 1.0,
                    grid: { color: '#e2e8f0' },
                    title: {
                        display: true,
                        text: currentMode === 'ghi' ? 'Irradiancia (W/m²)' : 'Índice de Claridad (Kt)',
                        font: { size: 12, weight: 'bold' }
                    }
                }
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    setInterval(fetchData, 600000); // Auto-refresh cada 10 minutos
});
