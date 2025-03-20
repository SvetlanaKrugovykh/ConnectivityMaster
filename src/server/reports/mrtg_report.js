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
    const query = `
      SELECT ip, dev_port, object_name, object_value_in, object_value_out, timestamp
      FROM mrtg_data
      WHERE timestamp >= NOW() - INTERVAL '24 HOURS'
      ORDER BY ip, dev_port, timestamp
    `
    const { rows } = await pool.query(query)

    const groupedData = {}
    rows.forEach(row => {
      const key = `${row.ip}:${row.dev_port}:${row.object_name}`
      if (!groupedData[key]) {
        groupedData[key] = { ip: row.ip, dev_port: row.dev_port, object_name: row.object_name, timestamps: [], diffs: [] }
      }

      const last = groupedData[key]
      if (last.timestamps.length > 0) {
        // Рассчитываем разницу значений (только для текущего object_name)
        const diff =
          row.object_name === 'ifInOctets'
            ? (row.object_value_in - last.lastValue) * 8 / (40 * 1000000) // Mbps
            : (row.object_value_out - last.lastValue) * 8 / (40 * 1000000) // Mbps
        last.diffs.push(diff > 0 ? diff : 0) // Исключаем отрицательные значения
      }

      last.timestamps.push(row.timestamp)
      last.lastValue = row.object_name === 'ifInOctets' ? row.object_value_in : row.object_value_out
    })

    const charts = []
    for (const key in groupedData) {
      const data = groupedData[key]
      const chartConfig = {
        type: 'line',
        data: {
          labels: data.timestamps.map(ts => new Date(ts).toLocaleTimeString()),
          datasets: [
            {
              label: `${data.object_name} Traffic (Mbps)`,
              data: data.diffs,
              borderColor: data.object_name === 'ifInOctets' ? 'rgba(75, 192, 192, 1)' : 'rgba(255, 99, 132, 1)',
              backgroundColor: data.object_name === 'ifInOctets' ? 'rgba(75, 192, 192, 0.2)' : 'rgba(255, 99, 132, 0.2)',
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

    const templatePath = path.join(__dirname, 'template.ejs')

    const html = await ejs.renderFile(templatePath, { charts })

    const TEMP_CATALOG = process.env.TEMP_CATALOG
    let outputPath = `${TEMP_CATALOG}__.html`

    fs.writeFileSync(outputPath, html)
    console.log(`Report generated: ${outputPath}`)
  } catch (err) {
    console.error('Error generating MRTG report:', err.message)
  }
}

module.exports = { generateMrtgReport }