// Module that returns the SQL text for finding suspicious hosts ("troublers")
module.exports.buildTroublersQuery = function buildTroublersQuery(lookbackDays = 1, thresholds = {}) {
  const uniqDstIpThreshold = thresholds.uniqDstIps || 500
  const uniqDstPortThreshold = thresholds.uniqDstPorts || 100
  const suspiciousPortsThreshold = thresholds.suspiciousPortsAttempts || 50
  const smtpAttemptsThreshold = thresholds.smtpAttempts || 20
  const burstAttemptsThreshold = thresholds.burstAttempts || 5000

  return `
    (
      SELECT
        'SCAN_PORTS' AS threat_type,
        source_ip,
        COUNT(DISTINCT destination_ip) AS uniq_dst_ips,
        COUNT(DISTINCT destination_port) AS uniq_dst_ports,
        MIN(destination_port) AS min_dst_port,
        MAX(destination_port) AS max_dst_port,
        COUNT(*) AS attempts
      FROM traffic_data
      WHERE timestamp >= NOW() - INTERVAL '${lookbackDays} day'
      GROUP BY source_ip
      HAVING COUNT(DISTINCT destination_ip) > ${uniqDstIpThreshold}
          OR COUNT(DISTINCT destination_port) > ${uniqDstPortThreshold}
    )
    UNION ALL
    (
      SELECT
        'SUSPICIOUS_PORTS' AS threat_type,
        source_ip,
        COUNT(DISTINCT destination_ip) AS uniq_dst_ips,
        COUNT(DISTINCT destination_port) AS uniq_dst_ports,
        MIN(destination_port) AS min_dst_port,
        MAX(destination_port) AS max_dst_port,
        COUNT(*) AS attempts
      FROM traffic_data
      WHERE timestamp >= NOW() - INTERVAL '${lookbackDays} day'
        AND destination_port IN (135, 139, 445, 1433, 3389, 5900)
      GROUP BY source_ip
      HAVING COUNT(*) > ${suspiciousPortsThreshold}
    )
    UNION ALL
    (
      SELECT
        'SMTP_SPAM' AS threat_type,
        source_ip,
        COUNT(DISTINCT destination_ip) AS uniq_dst_ips,
        COUNT(DISTINCT destination_port) AS uniq_dst_ports,
        MIN(destination_port) AS min_dst_port,
        MAX(destination_port) AS max_dst_port,
        COUNT(*) AS attempts
      FROM traffic_data
      WHERE timestamp >= NOW() - INTERVAL '${lookbackDays} day'
        AND destination_port IN (25, 465, 587)
      GROUP BY source_ip
      HAVING COUNT(*) > ${smtpAttemptsThreshold}
    )
    UNION ALL
    (
      SELECT
        'BURST_TRAFFIC' AS threat_type,
        source_ip,
        COUNT(DISTINCT destination_ip) AS uniq_dst_ips,
        COUNT(DISTINCT destination_port) AS uniq_dst_ports,
        MIN(destination_port) AS min_dst_port,
        MAX(destination_port) AS max_dst_port,
        COUNT(*) AS attempts
      FROM traffic_data
      WHERE timestamp >= NOW() - INTERVAL '${lookbackDays} day'
      GROUP BY source_ip
      HAVING COUNT(*) > ${burstAttemptsThreshold}
    )
    ORDER BY attempts DESC;
  `
}