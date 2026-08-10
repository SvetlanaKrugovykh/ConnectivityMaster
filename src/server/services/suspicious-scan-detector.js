'use strict';

/**
 * suspicious-scan-detector.js
 * ----------------------------------------------------------------
 * Модуль для Connectivity-Master (Node.js, FreeBSD).
 *
 * Что делает:
 *   1. Периодически вызывает `pfctl -ss` (без записи на диск, только в память).
 *   2. Парсит state-таблицу, определяет какой из двух адресов внутренний
 *      (по CIDR из INTERNAL_NETS), а какой — remote.
 *   3. Считает по каждому (internal_ip, watched_port) количество РАЗНЫХ
 *      remote_ip за скользящее окно WINDOW_SEC.
 *   4. Если число уникальных remote_ip превышает порог (per-port или
 *      дефолтный) — шлёт сообщение в Telegram, с cooldown на пару
 *      (internal_ip, port), чтобы не спамить.
 *
 * Что НЕ делает (сознательно, это этап 2):
 *   - не блокирует трафик, не генерирует ipfw-команды.
 *
 * Зависимости: только встроенные модули Node.js (child_process, https).
 * Внешние npm-пакеты не требуются.
 *
 * Встраивание в Connectivity-Master:
 *   const { startScanDetector } = require('./suspicious-scan-detector');
 *   startScanDetector(); // достаточно вызвать один раз при старте процесса
 * ----------------------------------------------------------------
 */

const { execFile } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');
require("dotenv").config()

// ------------------------------------------------------------------
// 1. Загрузка .env (без зависимости от npm-пакета dotenv)
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
    // снимаем обрамляющие кавычки, если есть
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.join(__dirname, '.env'));

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
  pollIntervalSec: envInt('POLL_INTERVAL_SEC', 30),
  windowSec: envInt('WINDOW_SEC', 600),
  notifyCooldownSec: envInt('NOTIFY_COOLDOWN_SEC', 1800),
  internalNets: envList('INTERNAL_NETS', ['192.168.0.0/16', '10.100.0.0/16']),
  watchTcpPorts: envList('WATCH_TCP_PORTS', ['22', '23', '25', '3389']).map(Number),
  watchUdpPorts: envList('WATCH_UDP_PORTS', []).map(Number),
  thresholdDefault: envInt('THRESHOLD_DISTINCT_IPS_DEFAULT', 5),
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
  pfctlPath: process.env.PFCTL_PATH || '/sbin/pfctl',
  // если true — не шлём реально в Telegram, только логируем в консоль
  dryRun: process.env.DRY_RUN === '1',
  // одноразовое сообщение в Telegram при старте процесса (не периодическое!)
  startupNotify: process.env.STARTUP_NOTIFY !== '0',
  // путь к локальному JSON-файлу со статусом — смотрите его по требованию,
  // никакого спама никуда это не создаёт
  statusFilePath: process.env.STATUS_FILE_PATH || path.join(__dirname, 'detector-status.json'),
};

function thresholdForPort(port) {
  const specific = process.env[`THRESHOLD_DISTINCT_IPS_PORT_${port}`];
  const v = parseInt(specific, 10);
  return Number.isFinite(v) ? v : CONFIG.thresholdDefault;
}

// ------------------------------------------------------------------
// 2. CIDR-матчинг (IPv4 only, зависимостей не требует)
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
// 3. Парсер строк `pfctl -ss`
// ------------------------------------------------------------------

/*
 * Примеры строк, которые нужно разбирать:
 *
 * all tcp 176.124.138.78:51915 (192.168.18.196:57209) -> 17.57.146.56:5223   ESTABLISHED:ESTABLISHED
 * all tcp 192.168.18.19:46954  (176.124.138.76:46954) <- 85.217.140.22:39880 CLOSED:SYN_SENT
 * all tcp 176.124.138.76:34108 (192.168.18.19:34108) -> 84.22.107.120:22     ESTABLISHED:ESTABLISHED
 * all udp 176.124.138.78:58055 (192.168.18.199:40091) -> 157.240.224.12:443  MULTIPLE:MULTIPLE
 *
 * Формат: all {proto} {addrA}:{portA} ({addrB}:{portB}) {dir} {addrC}:{portC}   {stateLocal}:{stateRemote}
 * Одно из addrA/addrB — внутренний адрес абонента (определяем по CIDR),
 * второе — NAT/публичный адрес (не используется для агрегации).
 * addrC:portC — remote (внешний узел, с которым идёт связь).
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
  else return null; // ни один из адресов не наш внутренний — не интересно

  return {
    proto,
    internalIp,
    remoteIp,
    remotePort: parseInt(remotePort, 10),
    dir,               // '->' исходящее (инициатор — наша сторона), '<-' входящее
    stateLocal: stLocal,
    stateRemote: stRemote,
  };
}

// ------------------------------------------------------------------
// 4. Агрегатор со скользящим окном (полностью в памяти)
// ------------------------------------------------------------------

/*
 * Структура: Map<internalIp, Map<port, Map<remoteIp, { first, last, halfOpenCount, establishedCount }>>>
 */
const state = new Map();
const lastNotified = new Map(); // key "ip:port" -> timestamp сек

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

// "Полу-открытое" соединение — эвристика скана: SYN отправлен, полноценного
// ESTABLISHED с обеих сторон нет (частый признак сканера портов).
function isHalfOpenState(stateLocal, stateRemote) {
  const s = `${stateLocal}:${stateRemote}`;
  return s.includes('SYN_SENT') || (s.includes('CLOSED') && !s.includes('ESTABLISHED'));
}

// ------------------------------------------------------------------
// 4b. Счётчики + локальный статус-файл (для проверки "по требованию",
//     без Telegram и без необходимости выискивать что-то в логах)
// ------------------------------------------------------------------

const stats = {
  startedAt: new Date().toISOString(),
  pollCount: 0,
  pfctlErrorCount: 0,
  lastPfctlError: null,
  lastPollAt: null,
  linesParsedTotal: 0,      // сколько строк pfctl -ss вообще распарсилось (proto/ip/port)
  linesWatchedTotal: 0,     // из них — сколько попало под watched-порты и dir='->'
  alertsSentTotal: 0,
  lastAlertAt: null,
};

function writeStatusFile() {
  const trackedInternalIps = [];
  for (const [internalIp, byPort] of state) {
    const ports = {};
    for (const [port, byRemote] of byPort) {
      ports[port] = byRemote.size; // сколько уникальных remote IP сейчас в окне
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
    },
    trackedInternalIps, // текущая картина "кто на каком порту сколько адресов набрал"
  };

  try {
    fs.writeFileSync(CONFIG.statusFilePath, JSON.stringify(payload, null, 2));
  } catch (err) {
    console.error('[status] не удалось записать статус-файл:', err.message);
  }
}



function sendTelegramMessage(text) {
  if (CONFIG.dryRun || !CONFIG.telegramBotToken || !CONFIG.telegramChatId) {
    console.log('[DRY-RUN / no telegram config] ' + text);
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
        console.error(`[telegram] HTTP ${res.statusCode} при отправке сообщения`);
      }
      res.on('data', () => {});
    }
  );
  req.on('error', (err) => console.error('[telegram] ошибка отправки:', err.message));
  req.write(payload);
  req.end();
}

function maybeNotify(internalIp, port, proto, distinctCount, halfOpenTotal, establishedTotal, threshold) {
  const key = `${internalIp}:${proto}:${port}`;
  const now = Date.now() / 1000;
  const last = lastNotified.get(key) || 0;
  if (now - last < CONFIG.notifyCooldownSec) return; // cooldown ещё не истёк

  lastNotified.set(key, now);

  stats.alertsSentTotal += 1;
  stats.lastAlertAt = new Date().toISOString();

  const text =
    `⚠️ <b>Подозрительная активность</b>\n` +
    `Абонент: <code>${internalIp}</code>\n` +
    `Порт назначения: <code>${proto}/${port}</code>\n` +
    `Уникальных удалённых IP за ${Math.round(CONFIG.windowSec / 60)} мин: <b>${distinctCount}</b> ` +
    `(порог: ${threshold})\n` +
    `Полуоткрытых (похоже на скан): ${halfOpenTotal}, установленных: ${establishedTotal}`;

  sendTelegramMessage(text);
  console.log(`[ALERT] ${internalIp} -> ${proto}/${port}: distinct=${distinctCount} threshold=${threshold}`);
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

      // proto узнаём по тому, в каком списке лежит port (см. buildWatchSet)
      const proto = TCP_WATCH_SET.has(port) ? 'tcp' : 'udp';
      maybeNotify(internalIp, port, proto, distinctCount, halfOpenTotal, establishedTotal, threshold);
    }
  }
}

// ------------------------------------------------------------------
// 6. Опрос pfctl -ss и основной цикл
// ------------------------------------------------------------------

const TCP_WATCH_SET = new Set(CONFIG.watchTcpPorts);
const UDP_WATCH_SET = new Set(CONFIG.watchUdpPorts);

function pollPfctl() {
  execFile(CONFIG.pfctlPath, ['-ss'], { maxBuffer: 16 * 1024 * 1024 }, (err, stdout, stderr) => {
    stats.pollCount += 1;
    stats.lastPollAt = new Date().toISOString();

    if (err) {
      // Частая причина — запуск не от root. Не роняем процесс, просто логируем.
      stats.pfctlErrorCount += 1;
      stats.lastPfctlError = err.message;
      console.error('[pfctl] ошибка запуска:', err.message, stderr ? `stderr: ${stderr}` : '');
      writeStatusFile();
      return;
    }

    const lines = stdout.split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      const parsed = parseLine(line);
      if (!parsed) continue;
      stats.linesParsedTotal += 1;

      // Интересует только исходящее от абонента соединение на watched-порт
      if (parsed.dir !== '->') continue;

      const watchSet = parsed.proto === 'tcp' ? TCP_WATCH_SET : UDP_WATCH_SET;
      if (!watchSet.has(parsed.remotePort)) continue;

      stats.linesWatchedTotal += 1;
      const halfOpen = isHalfOpenState(parsed.stateLocal, parsed.stateRemote);
      recordSighting(parsed.internalIp, parsed.remotePort, parsed.remoteIp, halfOpen);
    }

    cleanupOldEntries();
    runDetection();
    writeStatusFile();
  });
}

let pollTimer = null;

function startScanDetector() {
  if (PARSED_INTERNAL_NETS.length === 0) {
    console.error('[suspicious-scan-detector] INTERNAL_NETS не задан или невалиден — модуль не запущен');
    return;
  }
  console.log(
    `[suspicious-scan-detector] старт. TCP-порты: [${CONFIG.watchTcpPorts.join(',')}], ` +
    `UDP-порты: [${CONFIG.watchUdpPorts.join(',')}], окно: ${CONFIG.windowSec}s, ` +
    `интервал опроса: ${CONFIG.pollIntervalSec}s`
  );

  // Разовое (не периодическое!) сообщение о старте — чтобы сразу увидеть в том
  // же чате, что процесс поднялся и с какими параметрами. Отключается STARTUP_NOTIFY=0.
  if (CONFIG.startupNotify) {
    sendTelegramMessage(
      `🟢 <b>Детектор сканов запущен</b>\n` +
      `TCP: <code>${CONFIG.watchTcpPorts.join(',') || '-'}</code>, ` +
      `UDP: <code>${CONFIG.watchUdpPorts.join(',') || '-'}</code>\n` +
      `Окно: ${Math.round(CONFIG.windowSec / 60)} мин, порог по умолчанию: ${CONFIG.thresholdDefault}\n` +
      `Дальше — тишина, если нет реальных срабатываний. Проверить статус: --status, тест алерта: --self-test`
    );
  }

  pollPfctl(); // сразу первый прогон
  pollTimer = setInterval(pollPfctl, CONFIG.pollIntervalSec * 1000);
}

function stopScanDetector() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

// ------------------------------------------------------------------
// 7. Проверка "работает ли алгоритм" без чтения логов
// ------------------------------------------------------------------

// Печатает текущий статус-файл человекочитаемо. Запуск в любой момент:
//   node suspicious-scan-detector.js --status
// (читает файл, который основной процесс обновляет на каждом цикле опроса —
// сам ничего никуда не шлёт)
function printStatus() {
  if (!fs.existsSync(CONFIG.statusFilePath)) {
    console.log(`Файл статуса не найден: ${CONFIG.statusFilePath}`);
    console.log('Похоже, основной процесс детектора либо не запущен, либо ещё не сделал первый опрос.');
    return;
  }
  const data = JSON.parse(fs.readFileSync(CONFIG.statusFilePath, 'utf8'));
  console.log('=== Статус детектора ===');
  console.log(`Запущен:                ${data.startedAt}`);
  console.log(`Последний опрос:        ${data.lastPollAt}`);
  console.log(`Циклов опроса всего:    ${data.pollCount}`);
  console.log(`Ошибок вызова pfctl:    ${data.pfctlErrorCount}${data.lastPfctlError ? ' (последняя: ' + data.lastPfctlError + ')' : ''}`);
  console.log(`Строк pfctl разобрано:  ${data.linesParsedTotal}`);
  console.log(`Из них по watched-порту: ${data.linesWatchedTotal}`);
  console.log(`Алертов отправлено:     ${data.alertsSentTotal}${data.lastAlertAt ? ' (последний: ' + data.lastAlertAt + ')' : ''}`);
  console.log('');
  if (data.trackedInternalIps.length === 0) {
    console.log('Сейчас в окне наблюдения нет абонентов с трафиком на watched-порты — это нормально, если скана нет.');
  } else {
    console.log('Абоненты в окне наблюдения сейчас (internal_ip: {port: уникальных_remote_ip}):');
    for (const { internalIp, ports } of data.trackedInternalIps) {
      console.log(`  ${internalIp}: ${JSON.stringify(ports)}`);
    }
  }
  console.log('');
  console.log('Если "Циклов опроса всего" растёт при повторном вызове --status — процесс жив и опрашивает pfctl.');
  console.log('Если "Ошибок вызова pfctl" > 0 — скорее всего процесс запущен не от root, алгоритм НЕ видит трафик.');
}

// Прогоняет синтетический "скан" через реальный детектор+Telegram, не трогая
// боевое состояние (использует отдельный набор данных). Подтверждает разом:
// парсинг, подсчёт уникальных IP, порог, cooldown-логику, отправку в Telegram.
//   node suspicious-scan-detector.js --self-test
function runSelfTest() {
  console.log('[self-test] генерирую синтетический скан на первый watched TCP-порт...');
  const testPort = CONFIG.watchTcpPorts[0];
  if (!testPort) {
    console.log('[self-test] в WATCH_TCP_PORTS нет ни одного порта — нечего тестировать.');
    return;
  }
  const threshold = thresholdForPort(testPort);
  const fakeInternalIp = PARSED_INTERNAL_NETS.length
    ? intToIpForSelfTest(PARSED_INTERNAL_NETS[0].net + 250)
    : '192.168.0.250';
  const fakeRemotes = Array.from({ length: threshold + 2 }, (_, i) => `203.0.113.${i + 1}`); // TEST-NET-3, безопасные "фейковые" адреса

  for (const remoteIp of fakeRemotes) {
    recordSighting(fakeInternalIp, testPort, remoteIp, true);
  }

  console.log(`[self-test] внутренний IP (фиктивный): ${fakeInternalIp}, порт: ${testPort}, ` +
    `порог: ${threshold}, сгенерировано remote IP: ${fakeRemotes.length}`);
  console.log('[self-test] это должно вызвать реальную отправку в Telegram (если DRY_RUN не включён) с пометкой ниже.');

  runDetection(); // пойдёт по всему state, включая наш фиктивный IP — вызовет maybeNotify -> sendTelegramMessage

  // подчищаем за собой, чтобы фиктивный IP не остался в боевом состоянии/статусе
  state.delete(fakeInternalIp);
  lastNotified.delete(`${fakeInternalIp}:tcp:${testPort}`);

  console.log('[self-test] готово. Проверьте Telegram-чат — там должно появиться сообщение с "⚠️ Подозрительная активность"');
  console.log('[self-test] и внутренним IP вида *.250 из тестовой сети — это подтверждает, что вся цепочка работает.');
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

// Позволяет запускать модуль отдельным процессом: `node suspicious-scan-detector.js`
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
