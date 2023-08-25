const testIpList = [
  { ip_address: '127.0.0.1', description: 'ip1', status: 'alive' },
  { ip_address: '8.8.8.8.8', description: 'ip2', status: 'alive' },
]

const testServiceList = [
  { ip_address: '127.0.0.1', description: 's1', Port: '8080', status: 'alive' },
  { ip_address: '192.168.1.1', description: 's2', Port: '7575', status: 'alive' },
]

module.exports = { testIpList, testServiceList }