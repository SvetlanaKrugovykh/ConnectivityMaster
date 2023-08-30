const snmp = require('snmp-native')

const testSnmpObjectsList = [
  { ip_address: '127.0.0.1', description: 'Port24 220V Link Status', oid: '.1.3.6.1.2.1.2.2.1.8.24', min: '', max: '', value: '1', status: 'dead' },
  { ip_address: '127.0.0.1', description: 'Temperature Status Switch ', oid: '.1.3.6.1.4.1.171.12.11.1.8.1.2.1', min: '18', max: '41', value: '', status: 'dead' },
  { ip_address: '127.0.0.1', description: 'DDM Temperature Status Port25', oid: '.1.3.6.1.4.1.171.12.72.2.1.1.1.2.25', min: '15', max: '67', value: '', status: 'dead' },
  { ip_address: '127.0.0.1', description: 'Rx Power DDM_25_UP', oid: '.1.3.6.1.4.1.171.12.72.2.1.1.1.6.25', min: '-12', max: '-11.5', value: '', status: 'dead' },
  { ip_address: '127.0.0.1', description: 'Tx Power DDM_25_UP', oid: '.1.3.6.1.4.1.171.12.72.2.1.1.1.5.25', min: '2.3', max: '2.9', value: '1', status: 'dead' },
]

async function snmpGet(snmpObject, community = 'public') {
  const session = new snmp.Session({ host: snmpObject.ip_address, community: community, timeout: 5000 })

  try {
    const varbinds = await new Promise((resolve, reject) => {
      session.get({ oid: snmpObject.oid }, (error, varbinds) => {
        session.close()
        if (error) {
          reject(error)
        } else {
          resolve(varbinds)
        }
      })
    })
    if (varbinds.length > 0) {
      return snmpAnswersAnalizer(snmpObject, varbinds)
    } else {
      throw new Error('No response received')
    }
  } catch (error) {
    console.error('Error:', error)
    throw error
  }
}

function snmpAnswersAnalizer(snmpObject, varbinds) {
  try {
    if (varbinds[0].type === 2 && snmpObject.value !== '') {
      if (varbinds[0].value === Number(snmpObject.value)) {
        return 'Status OK'
      }
    }

    if (varbinds[0].type >= 2 && (snmpObject.min !== '' || snmpObject.max !== '')) {
      if (varbinds[0].value >= Number(snmpObject.min) && varbinds[0].value <= Number(snmpObject.max)) {
        return `value ${varbinds[0].value} Status OK`
      } else {
        return `value ${varbinds[0].value} Status PROBLEM`
      }
    }
    return varbinds[0].value
  } catch (error) {
    console.error('Error:', error)
    throw error
  }
}

async function main() {
  for (const snmpObject of testSnmpObjectsList) {
    try {
      const response = await snmpGet(snmpObject)
      console.log(`ip:${snmpObject.ip_address} ${snmpObject.description} response: ${response}`)
    } catch (error) {
      console.error(`Error querying ${snmpObject.ip_address}:`, error)
    }
  }
}

main()
