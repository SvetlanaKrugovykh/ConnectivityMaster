const { Pool } = require('pg')
const dotenv = require('dotenv')
const { sendToChat } = require('../modules/to_local_DB')
const { buildTroublersQuery } = require('../db/troublersQuery')
const { sendTgMessage } = require('./telegramService')

dotenv.config()

const pool = new Pool({
  user: process.env.TRAFFIC_DB_USER,
  host: process.env.TRAFFIC_DB_HOST,
  database: process.env.TRAFFIC_DB_NAME,
  password: process.env.TRAFFIC_DB_PASSWORD,
  port: process.env.TRAFFIC_DB_PORT,
})

function formatThreatsMessage(rows) {
  try {
    let msg = '🛡️ Traffic threats detected (last 24h) 🛡️\n\n'
    rows.forEach(r => {
      msg += `• ${r.threat_type}\n`
      msg += `  IP: ${r.source_ip}\n`
      msg += `  Unique dst IPs: ${r.uniq_dst_ips}\n`
      msg += `  Unique dst ports: ${r.uniq_dst_ports}\n`
      msg += `  Attempts: ${r.attempts}\n\n`
    })
    msg += 'Investigate these hosts.'
    return msg
  } catch (err) {
    console.error('[trafficThreats] formatThreatsMessage error:', err)
    return '⚠️ Threats detected, but failed to format details.'
  }
}

async function scanTrafficForThreats() {
  const lookbackDays = parseInt(process.env.THREAT_LOOKBACK_DAYS, 10) || 1
  const minToSend = parseInt(process.env.MIN_THREATS_TO_SEND, 10) || 1

  const thresholds = {
    uniqDstIps: parseInt(process.env.THREAT_SCAN_UNIQ_DST_IPS, 10) || undefined,
    uniqDstPorts: parseInt(process.env.THREAT_SCAN_UNIQ_DST_PORTS, 10) || undefined,
    suspiciousPortsAttempts: parseInt(process.env.THREAT_SUSPICIOUS_PORTS_ATTEMPTS, 10) || undefined,
    smtpAttempts: parseInt(process.env.THREAT_SMTP_ATTEMPTS, 10) || undefined,
    burstAttempts: parseInt(process.env.THREAT_BURST_ATTEMPTS, 10) || undefined,
  }

  const sql = buildTroublersQuery(lookbackDays, thresholds)

  let client
  try {
    const res = await pool.query(sql)
    if (!res.rows || res.rows.length === 0) {
      console.log('[trafficThreats] no threats found')
      return
    }

    console.log(`[trafficThreats] found ${res.rows.length} candidate(s)`)

    if (res.rows.length >= minToSend) {
      const message = formatThreatsMessage(res.rows)
      const sent = await sendTgMessage(message)
      console.log('[trafficThreats] telegram send status:', sent)
    } else {
      console.log('[trafficThreats] below minToSend threshold, skip telegram')
    }
  } catch (err) {
    console.error('[trafficThreats] scan error:', err)
  } finally {
    if (client) client.release()
  }
}

function startThreatScanner() {
  const intervalMinutes = parseInt(process.env.VIRUS_SCAN_INTERVAL, 10) || 60
  const ms = intervalMinutes * 60 * 1000

  // run once immediately
  scanTrafficForThreats().catch(err => console.error('[trafficThreats] initial scan failed:', err))

  setInterval(() => {
    scanTrafficForThreats().catch(e => console.error('[trafficThreats] scheduled scan failed:', e))
  }, ms)
}

module.exports = {
  startThreatScanner,
  scanTrafficForThreats,
}