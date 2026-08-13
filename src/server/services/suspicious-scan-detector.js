'use strict';

/**
 * suspicious-scan-detector.js
 * ----------------------------------------------------------------
 * Module for Connectivity-Master (Node.js, FreeBSD).
 *
 * What it does:
 *   1. Periodically calls `pfctl -ss` (in-memory only, never written to disk).
 *   2. Parses the state table, figures out which of the two addresses is
 *      the internal subscriber (by CIDR from INTERNAL_NETS) and which one
 *      is remote.
 *   3. For each (internal_ip, watched_port) pair, counts DISTINCT remote_ip
 *      values seen within a sliding window (WINDOW_SEC).
 *   4. If the number of distinct remote IPs exceeds a threshold (per-port or
 *      default) — sends a Telegram alert, with a per (internal_ip, port)
 *      cooldown so the chat isn't spammed.
 *   5. Optionally (AUTO_BLOCK_ENABLED=true) appends an `ipfw` deny rule for
 *      that subscriber/port to a local shell script and re-applies the
 *      script, so the subscriber's outbound traffic on that port gets
 *      blocked automatically. Disabled by default.
 *
 * Dependencies: only Node.js built-ins (child_process, https, fs, path).
 * No external npm packages required (the project's own `require('dotenv')`
 * call, if present in server.js, is harmless here — see below).
 *
 * Wiring into Connectivity-Master:
 *   const { startScanDetector } = require('./suspicious-scan-detector');
 *   startScanDetector(); // call once at process startup
 * ----------------------------------------------------------------
 */

const { execFile } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config()

// ------------------------------------------------------------------
// 1. .env loading (no dependency on the npm `dotenv` package required;
//    if the host project already calls dotenv.config() before this file
//    is required, those values are already in process.env and this loader
//    will simply skip them, since it never overwrites existing keys)
// ------------------------------------------------------------------

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // strip surrounding quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

// Walks up from startDir looking for a .env file (same approach most
// dotenv-style loaders use in nested project layouts). Stops at the first
// .env found, or at the filesystem root. An explicit path can be forced via
// ENV_FILE_PATH (an OS environment variable, exported BEFORE the process
// starts — not a line inside the .env file itself).
function findEnvFile(startDir, maxLevelsUp = 12) {
  if (process.env.ENV_FILE_PATH) return process.env.ENV_FILE_PATH;

  let dir = startDir;
  for (let i = 0; i <= maxLevelsUp; i++) {
    const candidate = path.join(dir, '.env');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }
  return path.join(startDir, '.env'); // fallback if nothing was found anywhere
}

const resolvedEnvPath = findEnvFile(__dirname);
loadEnvFile(resolvedEnvPath);

// Project root = directory where .env actually lives. Used as the default
// base directory for the generated firewall script.
const PROJECT_ROOT = path.dirname(resolvedEnvPath);

function envList(name, def = []) {
  const raw = process.env[name];
  if (!raw) return def;
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

function envInt(name, def) {
  const v = parseInt(process.env[name], 10);
  return Number.isFinite(v) ? v : def;
}

const CONFIG = {
	pollIntervalSec: envInt("POLL_INTERVAL_SEC", 30),
	windowSec: envInt("WINDOW_SEC", 600),
	notifyCooldownSec: envInt("NOTIFY_COOLDOWN_SEC", 1800),
	internalNets: envList("INTERNAL_NETS", ["192.168.0.0/16", "10.100.0.0/16"]),
	watchTcpPorts: envList("WATCH_TCP_PORTS", ["22", "23", "25", "3389"]).map(
		Number,
	),
	watchUdpPorts: envList("WATCH_UDP_PORTS", []).map(Number),
	thresholdDefault: envInt("THRESHOLD_DISTINCT_IPS_DEFAULT", 5),
	telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
	telegramChatId: process.env.TELEGRAM_CHAT_ID || "",
	pfctlPath: process.env.PFCTL_PATH || "/sbin/pfctl",
	// if true — never actually send to Telegram, just log to console
	dryRun: process.env.DRY_RUN === "1",
	// one-off Telegram message on process startup (NOT periodic/heartbeat)
	startupNotify: process.env.STARTUP_NOTIFY !== "0",
	// local JSON status file — inspect on demand, nothing periodic is pushed anywhere
	statusFilePath:
		process.env.STATUS_FILE_PATH ||
		path.join(__dirname, "detector-status.json"),
	// automatic ipfw blocking — disabled by default, opt-in only
	autoBlockEnabled: process.env.AUTO_BLOCK_ENABLED === "true",
	ipfwPath: process.env.IPFW_PATH || "/sbin/ipfw",
	blockRuleNumber: process.env.BLOCK_RULE_NUMBER || "00111",
	blockScriptPath:
		process.env.BLOCK_SCRIPT_PATH ||
		path.join(PROJECT_ROOT, "firewall", "block-suspicious.sh"),
	// UDP Flood Detector Settings
	thresholdUdpMaxStates: envInt("THRESHOLD_UDP_MAX_STATES", 100),
	enableUdpFloodDetector: process.env.ENABLE_UDP_FLOOD_DETECTOR !== "false",
}

function thresholdForPort(port) {
  const specific = process.env[`THRESHOLD_DISTINCT_IPS_PORT_${port}`];
  const v = parseInt(specific, 10);
  return Number.isFinite(v) ? v : CONFIG.thresholdDefault;
}

// ------------------------------------------------------------------
// 2. CIDR matching (IPv4 only, no dependencies required)
// ------------------------------------------------------------------

function ipToInt(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => Number.isNaN(p) || p < 0 || p > 255)) return null;
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function parseCidr(cidr) {
  const [base, bitsStr] = cidr.split('/');
  const bits = bitsStr === undefined ? 32 : parseInt(bitsStr, 10);
  const baseInt = ipToInt(base);
  if (baseInt === null) return null;
  const mask = bits === 0 ? 0 : (0xFFFFFFFF << (32 - bits)) >>> 0;
  return { net: baseInt & mask, mask };
}

const PARSED_INTERNAL_NETS = CONFIG.internalNets
  .map(parseCidr)
  .filter(Boolean);

function isInternalIp(ip) {
  const ipInt = ipToInt(ip);
  if (ipInt === null) return false;
  return PARSED_INTERNAL_NETS.some(({ net, mask }) => (ipInt & mask) === net);
}

// ------------------------------------------------------------------
// 3. `pfctl -ss` line parser
// ------------------------------------------------------------------

/*
 * Example lines this needs to parse:
 *
 * all tcp 176.124.138.78:51915 (192.168.18.196:57209) -> 17.57.146.56:5223   ESTABLISHED:ESTABLISHED
 * all tcp 192.168.18.19:46954  (176.124.138.76:46954) <- 85.217.140.22:39880 CLOSED:SYN_SENT
 * all tcp 176.124.138.76:34108 (192.168.18.19:34108) -> 84.22.107.120:22     ESTABLISHED:ESTABLISHED
 * all udp 176.124.138.78:58055 (192.168.18.199:40091) -> 157.240.224.12:443  MULTIPLE:MULTIPLE
 *
 * Format: all {proto} {addrA}:{portA} ({addrB}:{portB}) {dir} {addrC}:{portC}   {stateLocal}:{stateRemote}
 * One of addrA/addrB is the internal subscriber address (determined via
 * CIDR match), the other is the NAT/public address (not used for
 * aggregation). addrC:portC is the remote endpoint we're talking to.
 */

const LINE_RE = new RegExp(
  '^all\\s+(tcp|udp)\\s+' +               // proto
  '(\\d{1,3}(?:\\.\\d{1,3}){3}):(\\d+)\\s+' + // addrA:portA
  '\\((\\d{1,3}(?:\\.\\d{1,3}){3}):(\\d+)\\)\\s+' + // (addrB:portB)
  '(->|<-)\\s+' +                          // direction
  '(\\d{1,3}(?:\\.\\d{1,3}){3}):(\\d+)\\s+' + // addrC:portC (remote)
  '(\\S+):(\\S+)\\s*$'                     // stateLocal:stateRemote
);

function parseLine(line) {
  const m = LINE_RE.exec(line.trim());
  if (!m) return null;

  const [, proto, addrA, portA, addrB, portB, dir, remoteIp, remotePort, stLocal, stRemote] = m;

  let internalIp;
  if (isInternalIp(addrA)) internalIp = addrA;
  else if (isInternalIp(addrB)) internalIp = addrB;
  else return null; // neither address is one of ours — not interesting

  return {
    proto,
    internalIp,
    remoteIp,
    remotePort: parseInt(remotePort, 10),
    dir,               // '->' outbound (we're the initiator), '<-' inbound
    stateLocal: stLocal,
    stateRemote: stRemote,
  };
}

// ------------------------------------------------------------------
// 4. Sliding-window aggregator (fully in memory)
// ------------------------------------------------------------------

/*
 * Structure: Map<internalIp, Map<port, Map<remoteIp, { first, last, halfOpenCount, establishedCount }>>>
 */
const state = new Map();
const lastNotified = new Map(); // key "ip:proto:port" -> timestamp (seconds)

function recordSighting(internalIp, port, remoteIp, isHalfOpen) {
  const now = Date.now() / 1000;

  if (!state.has(internalIp)) state.set(internalIp, new Map());
  const byPort = state.get(internalIp);

  if (!byPort.has(port)) byPort.set(port, new Map());
  const byRemote = byPort.get(port);

  const entry = byRemote.get(remoteIp) || { first: now, last: now, halfOpenCount: 0, establishedCount: 0 };
  entry.last = now;
  if (isHalfOpen) entry.halfOpenCount += 1;
  else entry.establishedCount += 1;
  byRemote.set(remoteIp, entry);
}

function cleanupOldEntries() {
  const cutoff = Date.now() / 1000 - CONFIG.windowSec;
  for (const [internalIp, byPort] of state) {
    for (const [port, byRemote] of byPort) {
      for (const [remoteIp, entry] of byRemote) {
        if (entry.last < cutoff) byRemote.delete(remoteIp);
      }
      if (byRemote.size === 0) byPort.delete(port);
    }
    if (byPort.size === 0) state.delete(internalIp);
  }
}

// "Half-open" connection — scan heuristic: a SYN was sent, but there is no
// full ESTABLISHED on both ends (a common signature of a port scanner).
function isHalfOpenState(stateLocal, stateRemote) {
  const s = `${stateLocal}:${stateRemote}`;
  return s.includes('SYN_SENT') || (s.includes('CLOSED') && !s.includes('ESTABLISHED'));
}

// ------------------------------------------------------------------
// 4b. Counters + local status file (for on-demand checks, without
//     Telegram and without having to dig through logs)
// ------------------------------------------------------------------

const stats = {
  startedAt: new Date().toISOString(),
  pollCount: 0,
  pfctlErrorCount: 0,
  lastPfctlError: null,
  lastPollAt: null,
  linesParsedTotal: 0,      // how many pfctl -ss lines parsed at all (proto/ip/port)
  linesWatchedTotal: 0,     // of those — how many matched a watched port and dir='->'
  alertsSentTotal: 0,
  lastAlertAt: null,
  blockRulesAddedTotal: 0,  // how many new ipfw rules were appended (AUTO_BLOCK_ENABLED)
  lastBlockAt: null,
};

function writeStatusFile() {
  const trackedInternalIps = [];
  for (const [internalIp, byPort] of state) {
    const ports = {};
    for (const [port, byRemote] of byPort) {
      ports[port] = byRemote.size; // unique remote IPs currently in the window
    }
    trackedInternalIps.push({ internalIp, ports });
  }

  const payload = {
    ...stats,
    now: new Date().toISOString(),
    config: {
      pollIntervalSec: CONFIG.pollIntervalSec,
      windowSec: CONFIG.windowSec,
      watchTcpPorts: CONFIG.watchTcpPorts,
      watchUdpPorts: CONFIG.watchUdpPorts,
      dryRun: CONFIG.dryRun,
      autoBlockEnabled: CONFIG.autoBlockEnabled,
    },
    trackedInternalIps, // current picture: who hit how many distinct IPs on which port
  };

  try {
    fs.writeFileSync(CONFIG.statusFilePath, JSON.stringify(payload, null, 2));
  } catch (err) {
    console.error('[status] failed to write status file:', err.message);
  }
}

// ------------------------------------------------------------------
// 4c. Automatic ipfw blocking (opt-in via AUTO_BLOCK_ENABLED=true)
// ------------------------------------------------------------------

// Set to true only for the duration of --self-test, so synthetic test data
// never gets written into the real firewall script or applied to ipfw.
let selfTestMode = false;

function ensureBlockScript() {
  const dir = path.dirname(CONFIG.blockScriptPath);
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    console.error('[auto-block] failed to create firewall script directory:', err.message);
    return false;
  }
  if (!fs.existsSync(CONFIG.blockScriptPath)) {
    // First line always stays "delete <rule number>" — every re-run of the
    // script clears all rules under that number first, then re-adds every
    // known-bad entry below. This keeps the file and the live ipfw table in
    // sync on every run, and lets us restore all rules after a reboot
    // (ipfw's live table does not survive a restart; this file does).
    const initial = `#!/bin/sh\n${CONFIG.ipfwPath} delete ${CONFIG.blockRuleNumber}\n`;
    try {
      fs.writeFileSync(CONFIG.blockScriptPath, initial, { mode: 0o750 });
    } catch (err) {
      console.error('[auto-block] failed to create firewall script:', err.message);
      return false;
    }
  }
  return true;
}

function blockLineFor(proto, internalIp, port) {
  return `${CONFIG.ipfwPath} add ${CONFIG.blockRuleNumber} deny ${proto} from ${internalIp} to any ${port} out`;
}

function applyBlockScript() {
  execFile('/bin/sh', [CONFIG.blockScriptPath], (err, stdout, stderr) => {
    if (err) {
      console.error('[auto-block] failed to apply firewall script:', err.message, stderr ? `stderr: ${stderr}` : '');
      return;
    }
    console.log('[auto-block] firewall script applied successfully');
  });
}

// Called right after an alert fires. Appends a new deny rule for this
// (internalIp, proto, port) if it isn't already in the script, then
// re-applies the whole script. If the rule is already present, does nothing
// (no duplicate line, no re-run).
function handleAutoBlock(internalIp, proto, port) {
  if (!CONFIG.autoBlockEnabled) return;

  if (selfTestMode) {
    console.log('[self-test] skipping real ipfw block application — synthetic data is not written to the firewall script');
    return;
  }

  if (!ensureBlockScript()) return;

  const line = blockLineFor(proto, internalIp, port);

  let lines;
  try {
    lines = fs.readFileSync(CONFIG.blockScriptPath, 'utf8')
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);
  } catch (err) {
    console.error('[auto-block] failed to read firewall script:', err.message);
    return;
  }

  if (lines.includes(line)) {
    console.log(`[auto-block] rule already present, skipping: ${line}`);
    return;
  }

  lines.push(line);
  try {
    fs.writeFileSync(CONFIG.blockScriptPath, lines.join('\n') + '\n', { mode: 0o750 });
  } catch (err) {
    console.error('[auto-block] failed to write firewall script:', err.message);
    return;
  }

  stats.blockRulesAddedTotal += 1;
  stats.lastBlockAt = new Date().toISOString();

  console.log(`[auto-block] new rule added, re-applying firewall script: ${line}`);
  applyBlockScript();
}

// ------------------------------------------------------------------
// 5. Threshold detector + Telegram notifier
// ------------------------------------------------------------------

function sendTelegramMessage(text) {
  if (CONFIG.dryRun) {
    console.log('[DRY-RUN, not actually sent] ' + text);
    return;
  }
  if (!CONFIG.telegramBotToken || !CONFIG.telegramChatId) {
    console.log(
      `[not sent: missing ${!CONFIG.telegramBotToken ? 'TELEGRAM_BOT_TOKEN ' : ''}` +
      `${!CONFIG.telegramChatId ? 'TELEGRAM_CHAT_ID' : ''}] ` + text
    );
    return;
  }

  const payload = JSON.stringify({
    chat_id: CONFIG.telegramChatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  });

  const req = https.request(
    {
      hostname: 'api.telegram.org',
      path: `/bot${CONFIG.telegramBotToken}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    },
    (res) => {
      if (res.statusCode >= 300) {
        console.error(`[telegram] HTTP ${res.statusCode} while sending message`);
      }
      res.on('data', () => {});
    }
  );
  req.on('error', (err) => console.error('[telegram] send error:', err.message));
  req.write(payload);
  req.end();
}

function maybeNotify(internalIp, port, proto, distinctCount, halfOpenTotal, establishedTotal, threshold) {
  const key = `${internalIp}:${proto}:${port}`;
  const now = Date.now() / 1000;
  const last = lastNotified.get(key) || 0;
  if (now - last < CONFIG.notifyCooldownSec) return; // still within cooldown

  lastNotified.set(key, now);

  stats.alertsSentTotal += 1;
  stats.lastAlertAt = new Date().toISOString();

  const text =
    `⚠️ <b>Suspicious activity</b>\n` +
    `Subscriber: <code>${internalIp}</code>\n` +
    `Destination port: <code>${proto}/${port}</code>\n` +
    `Unique remote IPs in ${Math.round(CONFIG.windowSec / 60)} min: <b>${distinctCount}</b> ` +
    `(threshold: ${threshold})\n` +
    `Half-open (scan-like): ${halfOpenTotal}, established: ${establishedTotal}`;

  sendTelegramMessage(text);
  console.log(`[ALERT] ${internalIp} -> ${proto}/${port}: distinct=${distinctCount} threshold=${threshold}`);

  handleAutoBlock(internalIp, proto, port);
}

// ------------------------------------------------------------------
// 5b. Детектор UDP-флуда (с пачечной группировкой алертов)
// ------------------------------------------------------------------

function checkUdpFloods(activeUdpCounts) {
  const now = Date.now() / 1000;
  const flagged = [];

  for (const [internalIp, count] of activeUdpCounts.entries()) {
    if (count >= CONFIG.thresholdUdpMaxStates) {
      const key = `${internalIp}:udp:FLOOD`;
      const last = lastNotified.get(key) || 0;
      
      if (now - last >= CONFIG.notifyCooldownSec) {
        lastNotified.set(key, now);
        flagged.push({ internalIp, count });
      }
    }
  }

  if (flagged.length === 0) return;

  stats.alertsSentTotal += 1;
  stats.lastAlertAt = new Date().toISOString();

  let text;
  
  if (flagged.length === 1) {
    const { internalIp, count } = flagged[0];
    text =
      `🚨 <b>UDP Outbound Flood / DDoS Detected</b>\n` +
      `Subscriber: <code>${internalIp}</code>\n` +
      `Active UDP States: <b>${count}</b> (threshold: ${CONFIG.thresholdUdpMaxStates})\n` +
      `Warning: High outbound UDP traffic detected.`;
  } else {
    text =
      `🚨 <b>UDP Outbound Flood / DDoS (Multiple Subscribers)</b>\n` +
      `Threshold: <b>${CONFIG.thresholdUdpMaxStates}</b> active UDP states\n` +
      `Affected subscribers (${flagged.length}):\n` +
      flagged.map(f => `• <code>${f.internalIp}</code>: <b>${f.count}</b> states`).join('\n');
  }

  sendTelegramMessage(text);
  console.log(`[UDP FLOOD ALERT] Triggered for ${flagged.length} subscriber(s)`);
}

function checkUdpFloods(activeUdpCounts) {
  for (const [internalIp, count] of activeUdpCounts.entries()) {
    if (count >= CONFIG.thresholdUdpMaxStates) {
      maybeNotifyUdpFlood(internalIp, count, CONFIG.thresholdUdpMaxStates);
    }
  }
}

function runDetection() {
  for (const [internalIp, byPort] of state) {
    for (const [port, byRemote] of byPort) {
      const distinctCount = byRemote.size;
      const threshold = thresholdForPort(port);
      if (distinctCount < threshold) continue;

      let halfOpenTotal = 0;
      let establishedTotal = 0;
      for (const entry of byRemote.values()) {
        halfOpenTotal += entry.halfOpenCount;
        establishedTotal += entry.establishedCount;
      }

      // figure out proto from which watch-set this port belongs to
      const proto = TCP_WATCH_SET.has(port) ? 'tcp' : 'udp';
      maybeNotify(internalIp, port, proto, distinctCount, halfOpenTotal, establishedTotal, threshold);
    }
  }
}

// ------------------------------------------------------------------
// 6. Polling pfctl -ss and the main loop
// ------------------------------------------------------------------

const TCP_WATCH_SET = new Set(CONFIG.watchTcpPorts);
const UDP_WATCH_SET = new Set(CONFIG.watchUdpPorts);

function pollPfctl() {
	execFile(
		CONFIG.pfctlPath,
		["-ss"],
		{ maxBuffer: 16 * 1024 * 1024 },
		(err, stdout, stderr) => {
			stats.pollCount += 1
			stats.lastPollAt = new Date().toISOString()

			if (err) {
				stats.pfctlErrorCount += 1
				stats.lastPfctlError = err.message
				console.error(
					"[pfctl] failed to run:",
					err.message,
					stderr ? `stderr: ${stderr}` : "",
				)
				writeStatusFile()
				return
			}

			const activeUdpCounts = new Map()

			const lines = stdout.split("\n")
			for (const line of lines) {
				if (!line.trim()) continue
				const parsed = parseLine(line)
				if (!parsed) continue
				stats.linesParsedTotal += 1

				// Only interested in outbound connections from the subscriber to a watched port
				if (parsed.dir !== "->") continue

				if (parsed.proto === "udp") {
					const currentCount = activeUdpCounts.get(parsed.internalIp) || 0
					activeUdpCounts.set(parsed.internalIp, currentCount + 1)
				}

				const watchSet = parsed.proto === "tcp" ? TCP_WATCH_SET : UDP_WATCH_SET
				if (!watchSet.has(parsed.remotePort)) continue

				stats.linesWatchedTotal += 1
				const halfOpen = isHalfOpenState(parsed.stateLocal, parsed.stateRemote)
				recordSighting(
					parsed.internalIp,
					parsed.remotePort,
					parsed.remoteIp,
					halfOpen,
				)
			}

			cleanupOldEntries()
			runDetection()

			if (CONFIG.enableUdpFloodDetector) {
				checkUdpFloods(activeUdpCounts)
			}

			writeStatusFile()
		},
	)
}

let pollTimer = null;

function startScanDetector() {
  if (PARSED_INTERNAL_NETS.length === 0) {
    console.error('[suspicious-scan-detector] INTERNAL_NETS is missing or invalid — module not started');
    return;
  }
  console.log(
    `[suspicious-scan-detector] starting. TCP ports: [${CONFIG.watchTcpPorts.join(',')}], ` +
    `UDP ports: [${CONFIG.watchUdpPorts.join(',')}], window: ${CONFIG.windowSec}s, ` +
    `poll interval: ${CONFIG.pollIntervalSec}s, auto-block: ${CONFIG.autoBlockEnabled}`
  );

  // One-off (NOT periodic/heartbeat) message on startup — just so it's
  // visible in the same chat that the process came up, with which
  // parameters. Disable with STARTUP_NOTIFY=0.
  if (CONFIG.startupNotify) {
    sendTelegramMessage(
      `🟢 <b>Scan detector started</b>\n` +
      `TCP: <code>${CONFIG.watchTcpPorts.join(',') || '-'}</code>, ` +
      `UDP: <code>${CONFIG.watchUdpPorts.join(',') || '-'}</code>\n` +
      `Window: ${Math.round(CONFIG.windowSec / 60)} min, default threshold: ${CONFIG.thresholdDefault}\n` +
      `No further messages unless a real threshold is triggered. Check status: --status, test alert: --self-test`
    );
  }

  // Firewall rules don't survive a reboot, but the block script file does —
  // re-apply whatever is already recorded there right at startup.
  if (CONFIG.autoBlockEnabled) {
    if (ensureBlockScript()) {
      console.log('[auto-block] re-applying existing block rules on startup (ipfw state does not survive a reboot)');
      applyBlockScript();
    }
  }

  pollPfctl(); // run once immediately
  pollTimer = setInterval(pollPfctl, CONFIG.pollIntervalSec * 1000);
}

function stopScanDetector() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

// ------------------------------------------------------------------
// 7. Checking "is the algorithm working" without reading logs
// ------------------------------------------------------------------

// Prints the current status file in a human-readable form. Run any time:
//   node suspicious-scan-detector.js --status
// (reads the file the main process updates on every poll cycle — this
// itself never sends anything anywhere)
function printStatus() {
  if (!fs.existsSync(CONFIG.statusFilePath)) {
    console.log(`Status file not found: ${CONFIG.statusFilePath}`);
    console.log('The main detector process is either not running, or hasn\'t completed its first poll yet.');
    return;
  }
  const data = JSON.parse(fs.readFileSync(CONFIG.statusFilePath, 'utf8'));
  console.log('=== Detector status ===');
  console.log(`.env loaded from: ${resolvedEnvPath}${fs.existsSync(resolvedEnvPath) ? '' : '  (!! file does not exist — config was NOT picked up)'}`);
  console.log(`Started:                ${data.startedAt}`);
  console.log(`Last poll:              ${data.lastPollAt}`);
  console.log(`Total poll cycles:      ${data.pollCount}`);
  console.log(`pfctl call errors:      ${data.pfctlErrorCount}${data.lastPfctlError ? ' (last: ' + data.lastPfctlError + ')' : ''}`);
  console.log(`pfctl lines parsed:     ${data.linesParsedTotal}`);
  console.log(`  of which on watched ports: ${data.linesWatchedTotal}`);
  console.log(`Alerts sent:            ${data.alertsSentTotal}${data.lastAlertAt ? ' (last: ' + data.lastAlertAt + ')' : ''}`);
  console.log(`Auto-block enabled:     ${data.config.autoBlockEnabled}`);
  console.log(`Block rules added:      ${data.blockRulesAddedTotal}${data.lastBlockAt ? ' (last: ' + data.lastBlockAt + ')' : ''}`);
  console.log('');
  if (data.trackedInternalIps.length === 0) {
    console.log('No subscribers currently in the observation window on watched ports — normal if there is no scan.');
  } else {
    console.log('Subscribers currently in the observation window (internal_ip: {port: unique_remote_ips}):');
    for (const { internalIp, ports } of data.trackedInternalIps) {
      console.log(`  ${internalIp}: ${JSON.stringify(ports)}`);
    }
  }
  console.log('');
  console.log('If "Total poll cycles" increases on repeated --status calls — the process is alive and polling pfctl.');
  console.log('If "pfctl call errors" > 0 — the process is most likely not running as root, the algorithm sees NO traffic.');
}

// Runs a synthetic "scan" through the real detector + Telegram path, without
// touching production state (uses a separate, obviously-fake dataset).
// Confirms in one shot: parsing, distinct-IP counting, threshold logic,
// cooldown logic, and the Telegram send. Real ipfw blocking is skipped even
// if AUTO_BLOCK_ENABLED=true, so this never pollutes the real firewall script.
//   node suspicious-scan-detector.js --self-test
function runSelfTest() {
  console.log('[self-test] generating a synthetic scan on the first watched TCP port...');
  const testPort = CONFIG.watchTcpPorts[0];
  if (!testPort) {
    console.log('[self-test] WATCH_TCP_PORTS is empty — nothing to test.');
    return;
  }

  selfTestMode = true;

  const threshold = thresholdForPort(testPort);
  const fakeInternalIp = PARSED_INTERNAL_NETS.length
    ? intToIpForSelfTest(PARSED_INTERNAL_NETS[0].net + 250)
    : '192.168.0.250';
  const fakeRemotes = Array.from({ length: threshold + 2 }, (_, i) => `203.0.113.${i + 1}`); // TEST-NET-3, safe "fake" addresses

  for (const remoteIp of fakeRemotes) {
    recordSighting(fakeInternalIp, testPort, remoteIp, true);
  }

  console.log(`[self-test] fake internal IP: ${fakeInternalIp}, port: ${testPort}, ` +
    `threshold: ${threshold}, fake remote IPs generated: ${fakeRemotes.length}`);
  console.log('[self-test] this should trigger a real Telegram send (unless DRY_RUN is on) — see the label above the message.');
  console.log('[self-test] any AUTO_BLOCK_ENABLED ipfw rule will be skipped on purpose — this is synthetic data only.');

  runDetection(); // walks the whole state, including our fake IP — triggers maybeNotify -> sendTelegramMessage

  // clean up after ourselves so the fake IP doesn't linger in production state/status
  state.delete(fakeInternalIp);
  lastNotified.delete(`${fakeInternalIp}:tcp:${testPort}`);

  selfTestMode = false;

  console.log('[self-test] done. Check the Telegram chat — you should see a message with "⚠️ Suspicious activity"');
  console.log('[self-test] and an internal IP ending in *.250 from the test range — that confirms the whole chain works.');
}

function intToIpForSelfTest(intVal) {
  return [
    (intVal >>> 24) & 0xFF,
    (intVal >>> 16) & 0xFF,
    (intVal >>> 8) & 0xFF,
    intVal & 0xFF,
  ].join('.');
}

module.exports = { startScanDetector, stopScanDetector, parseLine, isInternalIp };

// Allows running the module as a standalone process: `node suspicious-scan-detector.js`
if (require.main === module) {
  const arg = process.argv[2];
  if (arg === '--status') {
    printStatus();
  } else if (arg === '--self-test') {
    runSelfTest();
  } else {
    startScanDetector();
    process.on('SIGINT', () => { stopScanDetector(); process.exit(0); });
    process.on('SIGTERM', () => { stopScanDetector(); process.exit(0); });
  }
}
