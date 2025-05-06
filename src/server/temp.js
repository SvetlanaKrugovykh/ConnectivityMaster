const { temporarilyDisableIP } = require('./modules/temporarilyDisableIP')
const { ipCheckDelayListContainer } = require('./services/netWatchService')

const ipToExclude = '192.168.51.253'

temporarilyDisableIP(ipToExclude, ipCheckDelayListContainer.list, 300000)

console.log('ipCheckDelayList after exclude:', ipCheckDelayListContainer.list)

setTimeout(() => {
  console.log('ipCheckDelayList after 5 min:', ipCheckDelayListContainer.list)
}, 310000)