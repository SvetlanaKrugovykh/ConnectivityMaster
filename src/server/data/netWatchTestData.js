const testIpList = [
  { ip_address: '127.0.0.1', description: 'ip1', status: 'dead' },
]

const testServiceList = [
  { ip_address: '127.0.0.1', description: 's1', Port: '8080', status: 'alive' },
]

const testSnmpObjectsList = [
  { ip_address: '192.168.0.1', description: 's1', oid: '.1.3.6.1.2.1.1.1.0', status: 'dead' },
]

module.exports = { testIpList, testServiceList, testSnmpObjectsList }