// ============================================================
// CONFIGURACIÓN — Actualizar con la URL del túnel Cloudflare
// cuando arranques cloudflared en tu PC.
// Ejemplo: "https://abc123.trycloudflare.com"
// ============================================================
const API_URL = "https://alt-parameter-ward-inclusion.trycloudflare.com";

// ============================================================

let mainChart = null;
let currentData = null;
let activeModel = null;

function resetZoom() {
    if (mainChart) mainChart.resetZoom();
}

function setStatus(state, msg) {
    const el = document.getElementById('apiStatus');
    el.className = `api-status api-status--${state}`;
    el.textContent = msg;
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
    const maeForeEl = document.getElementById('maeFore');

    const keyNow = `${activeModel} (now)`;
    const keyFore = `${activeModel} (fore)`;

    const metricsNow = currentData.metrics[keyNow];
    const metricsFore = currentData.metrics[keyFore];

    maeNowEl.innerText = (metricsNow && metricsNow.mae_total !== null)
        ? metricsNow.mae_total.toFixed(4) : 'N/A';
    maeForeEl.innerText = (metricsFore && metricsFore.mae_total !== null)
        ? metricsFore.mae_total.toFixed(4) : 'N/A';

    renderChart();
}

function renderChart() {
    const ctx = document.getElementById('mainChart').getContext('2d');

    if (mainChart) mainChart.destroy();

    const datasets = [
        {
            label: 'Real (Kt)',
            data: currentData.real_kt,
            borderColor: '#10b981',
            borderWidth: 2,
            pointRadius: 0,
            pointHitRadius: 10,
            tension: 0.2
        }
    ];

    const keyNow = `${activeModel} (now)`;
    const keyFore = `${activeModel} (fore)`;

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
                    borderWidth: 1
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
                    suggestedMax: 1.0,
                    grid: { color: '#e2e8f0' }
                }
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    setInterval(fetchData, 600000); // Auto-refresh cada 10 minutos
});
