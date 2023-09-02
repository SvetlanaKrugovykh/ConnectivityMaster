const testIpList = [
  { ip_address: '127.0.0.1', description: 'ip1', status: 'dead' },
]

const testServiceList = [
  { ip_address: '127.0.0.1', description: 's1', Port: '8080', status: 'dead' },
  { ip_address: '91.220.106.16', description: 's1', Port: '3389', status: 'dead' },
]

const testSnmpObjectsList = [
  { ip_address: '192.168.0.1', description: 's1', oid: '.1.3.6.1.2.1.1.1.0', status: 'dead' },
]

module.exports = { testIpList, testServiceList, testSnmpObjectsList }