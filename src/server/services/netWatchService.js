const { netWatchPingerProbe, loadipList } = require('./ipNetWatchService.js')
const { checkServiceStatus, loadServicesList } = require('./portNetWatchService.js')
const { checksnmpObjectStatus, loadSnmpObjectsList } = require('./snmpNetWatchService.js')

async function netWatchStarter() {

  let ipList = await loadipList()
  let servicesList = await loadServicesList()
  let snmpObjectsList = await loadSnmpObjectsList()

  const pingPoolingInterval = parseInt(process.env.PING_POOLING_INTERVAL) * 1000
  const servicesPoolingInterval = parseInt(process.env.SERVICES_POOLING_INTERVAL) * 1000
  const snmpPoolingInterval = parseInt(process.env.SNMP_POOLING_INTERVAL) * 1000

  if (process.env.NETWATCHING_TEST_MODE === 'true') {
    console.log('NETWATCHING_TEST_MODE is true')
    const { testIpList, testServiceList, testSnmpObjectsList } = require('../data/netWatchTestData.js')
    ipList = testIpList
    servicesList = testServiceList
    snmpObjectsList = testSnmpObjectsList
  }

  setInterval(() => {
    try {
      ipList.forEach(ip_address => {
        netWatchPingerProbe(ip_address)
      })
    } catch (err) {
      console.log(err)
    }
  }, pingPoolingInterval)

  setInterval(() => {
    try {
      servicesList.forEach(service => {
        checkServiceStatus(service)
      })
    } catch (err) {
      console.log(err)
    }
  }, servicesPoolingInterval)

  setInterval(() => {
    try {
      snmpObjectsList.forEach(snmpObject => {
        // checksnmpObjectStatus(snmpObject)
      })
    } catch (err) {
      console.log(err)
    }
  }, snmpPoolingInterval)

}


module.exports = { netWatchStarter }
