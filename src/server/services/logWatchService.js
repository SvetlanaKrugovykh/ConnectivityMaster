const { checkLogsFile } = require('./logAnalyzeService.js')

async function logAnaliseStarter() {

  const ArpAttackPoolingInterval = parseInt(process.env.ARP_ATTACK_POOLING_INTERVAL) * 1000 * 60 || 600000

  setInterval(() => {
    checkLogsFile()
  }, ArpAttackPoolingInterval)

}


module.exports = {
  logAnaliseStarter
}