let typeChart, locationChart, costChart;

export function initCharts() {
  const header = document.getElementById('charts-header');
  const panel = header.closest('.panel-collapsible');
  
  header.addEventListener('click', () => {
    panel.classList.toggle('collapsed');
  });

  Chart.defaults.font.family = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  Chart.defaults.font.size = 12;
  Chart.defaults.color = '#475569';
}

export function updateCharts(features) {
  if (!features || features.length === 0) {
    destroyCharts();
    return;
  }

  const typeData = {};
  const locationData = {};
  const costRanges = {
    '< $1M': 0,
    '$1M - $5M': 0,
    '$5M - $10M': 0,
    '$10M - $50M': 0,
    '> $50M': 0
  };

  features.forEach(f => {
    const p = f.properties;
    if (p.type) typeData[p.type] = (typeData[p.type] || 0) + 1;
    if (p.location) locationData[p.location] = (locationData[p.location] || 0) + 1;
    
    if (p.cost != null) {
      const cost = Number(p.cost);
      if (cost < 1000000) costRanges['< $1M']++;
      else if (cost < 5000000) costRanges['$1M - $5M']++;
      else if (cost < 10000000) costRanges['$5M - $10M']++;
      else if (cost < 50000000) costRanges['$10M - $50M']++;
      else costRanges['> $50M']++;
    }
  });

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];
  
  updateTypeChart(typeData, colors);
  updateLocationChart(locationData, colors);
  updateCostChart(costRanges);
}

function updateTypeChart(data, colors) {
  const ctx = document.getElementById('type-chart');
  if (!ctx) return;

  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const labels = entries.map(e => e[0]);
  const values = entries.map(e => e[1]);

  if (typeChart) typeChart.destroy();
  
  typeChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: colors.slice(0, labels.length),
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'right',
          labels: { padding: 10, font: { size: 11 } }
        }
      }
    }
  });
}

function updateLocationChart(data, colors) {
  const ctx = document.getElementById('location-chart');
  if (!ctx) return;

  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const labels = entries.map(e => e[0]);
  const values = entries.map(e => e[1]);

  if (locationChart) locationChart.destroy();
  
  locationChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Projects',
        data: values,
        backgroundColor: colors[0],
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#e2e8f0' } },
        x: { grid: { display: false } }
      }
    }
  });
}

function updateCostChart(data) {
  const ctx = document.getElementById('cost-chart');
  if (!ctx) return;

  const labels = Object.keys(data);
  const values = Object.values(data);

  if (costChart) costChart.destroy();
  
  costChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Projects',
        data: values,
        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'],
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#e2e8f0' } },
        y: { grid: { display: false } }
      }
    }
  });
}

function destroyCharts() {
  [typeChart, locationChart, costChart].forEach(c => c?.destroy?.());
  typeChart = locationChart = costChart = null;
}
