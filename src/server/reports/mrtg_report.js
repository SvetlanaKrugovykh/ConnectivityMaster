const { Pool } = require('pg')
const { ChartJSNodeCanvas } = require('chartjs-node-canvas')
const fs = require('fs')
const ejs = require('ejs')
const path = require('path')
const axios = require('axios')
const FormData = require('form-data')

const pool = new Pool({
  user: process.env.TRAFFIC_DB_USER,
  host: process.env.TRAFFIC_DB_HOST,
  database: process.env.TRAFFIC_DB_NAME,
  password: process.env.TRAFFIC_DB_PASSWORD,
  port: process.env.TRAFFIC_DB_PORT,
})


module.exports.generateMrtgReport = async function (chatID) {
  try {
    console.log('Initializing ChartJSNodeCanvas...')
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: 800, height: 400 })
    console.log('ChartJSNodeCanvas initialized successfully')

    const query = `
      SELECT ip, dev_port, object_name, object_value_in, object_value_out, timestamp
      FROM mrtg_data
      WHERE timestamp >= NOW() - INTERVAL '24 HOURS'
      ORDER BY ip, dev_port, timestamp
    `
    const { rows } = await pool.query(query)

    const groupedData = {}
    rows.forEach(row => {
      const key = `${row.ip}:${row.dev_port}`
      if (!groupedData[key]) {
        groupedData[key] = { ip: row.ip, dev_port: row.dev_port, timestamps: [], inDiffs: [], outDiffs: [] }
      }

      const last = groupedData[key]
      if (last.timestamps.length > 0) {
        const inDiff = (row.object_value_in - last.inLast) * 8 / (40 * 1000000) // Mbps
        const outDiff = (row.object_value_out - last.outLast) * 8 / (40 * 1000000) // Mbps
        last.inDiffs.push(inDiff > 0 ? inDiff : 0)
        last.outDiffs.push(outDiff > 0 ? outDiff : 0)
      }

      last.timestamps.push(row.timestamp)
      last.inLast = row.object_value_in
      last.outLast = row.object_value_out
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
              label: 'Input Traffic (Mbps)',
              data: data.inDiffs,
              borderColor: 'rgba(75, 192, 192, 1)',
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              fill: true,
            },
            {
              label: 'Output Traffic (Mbps)',
              data: data.outDiffs,
              borderColor: 'rgba(0, 76, 153, 1)',
              backgroundColor: 'rgba(0, 76, 153, 0.2)',
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

    const TEMP_CATALOG = process.env.TEMP_CATALOG || './'
    const outputPath = `${TEMP_CATALOG}mrtg_report.html`

    fs.writeFileSync(outputPath, html)
    console.log(`Report generated: ${outputPath}`)

    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
    const telegramChatId = chatID
    const url = `https://api.telegram.org/bot${telegramBotToken}/sendDocument`
    const formData = new FormData()
    formData.append('chat_id', telegramChatId)
    formData.append('document', fs.createReadStream(outputPath))

    const response = await axios.post(url, formData, {
      headers: formData.getHeaders(),
    })

    return { success: true, data: response.data }
  } catch (err) {
    console.error('Error generating MRTG report:', err.message)
    return { success: false, error: err.message }
  }
}