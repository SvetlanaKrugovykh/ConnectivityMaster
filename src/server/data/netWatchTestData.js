const testIpList = [
  { ip_address: '127.0.0.1', description: 'ip1', status: 'alive' },
  { ip_address: '8.8.8.8', description: 'ip2', status: 'alive' },
]

const testServiceList = [
  { ip_address: '127.0.0.1', description: 's1', Port: '8080', status: 'dead' },
]

module.exports = { testIpList, testServiceList }