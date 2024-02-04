const { netWatchPingerProbe, loadipList } = require('./ipNetWatchService.js')
const { checkServiceStatus, loadServicesList } = require('./portNetWatchService.js')
const { checksnmpObjectStatus, loadSnmpObjectsList } = require('./snmpNetWatchService.js')
const { loadSnmpMrtgObjectsList, loadSnmpMrtgObjectData } = require('./snmpMrtgService')

async function netWatchStarter() {

  let ipList = await loadipList()
  let servicesList = await loadServicesList()
  let snmpObjectsList = await loadSnmpObjectsList()

  const pingPoolingInterval = parseInt(process.env.PING_POOLING_INTERVAL) * 1000
  const servicesPoolingInterval = parseInt(process.env.SERVICES_POOLING_INTERVAL) * 1000
  const snmpPoolingInterval = parseInt(process.env.SNMP_POOLING_INTERVAL) * 1000 || 320000

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

  if (process.env.SNMP_POOLING_ENABLE !== 'true') {
    return
  }

  setInterval(() => {
    try {
      snmpObjectsList.forEach(snmpObject => {
        checksnmpObjectStatus(snmpObject)
      })
    } catch (err) {
      console.log(err)
    }
  }, snmpPoolingInterval)

}

async function mrtgWatchStarter() {
  let snmpMrtgObjectsList = await loadSnmpMrtgObjectsList()
  const snmpMrtgPollingInterval = parseInt(process.env.SNMP_MRTG_POOLING_INTERVAL) * 1000 || 600000

  setInterval(() => {
    try {
      loadSnmpMrtgObjectData(snmpMrtgObjectsList)
    } catch (err) {
      console.log(err)
    }
  }, snmpMrtgPollingInterval)
}

module.exports = { netWatchStarter, mrtgWatchStarter }
