const { Pool } = require('pg')
const { ChartJSNodeCanvas } = require('chartjs-node-canvas')
const fs = require('fs')
const ejs = require('ejs')
const path = require('path')

const pool = new Pool({
  user: process.env.TRAFFIC_DB_USER,
  host: process.env.TRAFFIC_DB_HOST,
  database: process.env.TRAFFIC_DB_NAME,
  password: process.env.TRAFFIC_DB_PASSWORD,
  port: process.env.TRAFFIC_DB_PORT,
})

const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: 800, height: 400 })

async function generateMrtgReport() {
  try {
    // 1. Извлекаем данные за последние 24 часа
    const query = `
      SELECT ip, dev_port, object_name, object_value_in, object_value_out, timestamp
      FROM mrtg_data
      WHERE timestamp >= NOW() - INTERVAL '24 HOURS'
      ORDER BY ip, dev_port, timestamp
    `
    const { rows } = await pool.query(query)

    // 2. Группируем данные по ip и dev_port
    const groupedData = {}
    rows.forEach(row => {
      const key = `${row.ip}:${row.dev_port}`
      if (!groupedData[key]) {
        groupedData[key] = { ip: row.ip, dev_port: row.dev_port, timestamps: [], inDiffs: [], outDiffs: [] }
      }

      const last = groupedData[key]
      if (last.timestamps.length > 0) {
        // Рассчитываем разницы значений
        const inDiff = (row.object_value_in - last.inLast) * 8 / (40 * 1000000) // Mbps
        const outDiff = (row.object_value_out - last.outLast) * 8 / (40 * 1000000) // Mbps
        last.inDiffs.push(inDiff)
        last.outDiffs.push(outDiff)
      }

      last.timestamps.push(row.timestamp)
      last.inLast = row.object_value_in
      last.outLast = row.object_value_out
    })

    // 3. Генерируем графики для каждой пары ip и dev_port
    const charts = []
    for (const key in groupedData) {
      const data = groupedData[key]
      const chartConfig = {
        type: 'line',
        data: {
          labels: data.timestamps.map(ts => new Date(ts).toLocaleTimeString()),
          datasets: [
            {
              label: 'Input Traffic (Mbps)',
              data: data.inDiffs,
              borderColor: 'rgba(75, 192, 192, 1)',
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              fill: true,
            },
            {
              label: 'Output Traffic (Mbps)',
              data: data.outDiffs,
              borderColor: 'rgba(255, 99, 132, 1)',
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'top' },
          },
          scales: {
            x: { title: { display: true, text: 'Time' } },
            y: { title: { display: true, text: 'Traffic (Mbps)' } },
          },
        },
      }

      const chartImage = await chartJSNodeCanvas.renderToDataURL(chartConfig)
      charts.push({ ip: data.ip, dev_port: data.dev_port, chartImage })
    }

    // 4. Генерируем HTML-отчет
    const templatePath = path.join(__dirname, 'template.ejs')
    const html = await ejs.renderFile(templatePath, { charts })

    // 5. Сохраняем HTML-отчет
    const outputPath = path.join(__dirname, 'mrtg_report.html')
    fs.writeFileSync(outputPath, html)
    console.log(`Report generated: ${outputPath}`)
  } catch (err) {
    console.error('Error generating MRTG report:', err.message)
  }
}

module.exports = { generateMrtgReport }