import Chart from 'chart.js/auto';

export function chartAction(node, initialData) {
  const chart = new Chart(node, {
    type: 'line',
    data: {
      labels: initialData.labels,
      datasets: [
        {
          label: 'Available Balance (₹)',
          type: 'line',
          data: initialData.balance,
          borderColor: '#3b82f6', // blue-500
          backgroundColor: '#3b82f6',
          borderWidth: 3,
          tension: 0.4,
          pointRadius: 0,
          pointHitRadius: 30,
          yAxisID: 'y',
          order: 1 // Renders on top
        },
        {
          label: 'Daily Burn (₹)',
          type: 'bar',
          data: initialData.burn,
          backgroundColor: '#ef4444', // red-500
          borderRadius: 4,
          yAxisID: 'y',
          order: 2
        },
        {
          label: 'Recharge (₹)',
          type: 'line',
          data: initialData.recharge,
          borderColor: '#10b981', // emerald-500
          backgroundColor: '#10b981',
          borderWidth: 3,
          tension: 0.4,
          pointRadius: 0,
          pointHitRadius: 30,
          yAxisID: 'y',
          order: 3
        }
      ]
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
          position: 'top',
          labels: { color: '#8b8b8b', usePointStyle: true, boxWidth: 8 }
        },
        tooltip: {
          backgroundColor: 'rgba(23, 23, 23, 0.95)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          titleFont: { size: 14 },
          bodyFont: { size: 14 },
          padding: 12,
          cornerRadius: 8,
          displayColors: true, // Re-enabled so you can see which bar is which
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#8b8b8b', maxTicksLimit: 7 }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: { color: 'rgba(139, 139, 139, 0.15)' },
          ticks: { color: '#8b8b8b' },
          min: 0,
          grace: 100
        }
      }
    }
  });

  return {
    update(newData) {
      chart.data.labels = newData.labels;
      chart.data.datasets[0].data = newData.balance;
      chart.data.datasets[1].data = newData.burn;
      chart.data.datasets[2].data = newData.recharge;
      chart.update();
    },
    destroy() {
      chart.destroy();
    }
  };
}