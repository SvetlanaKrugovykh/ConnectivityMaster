const snmp = require('snmp-native')

const testSnmpObjectsList = [
  { ip_address: '127.0.0.1', description: 'ECO MARKET VLan 616 mac address', oid: '.1.3.6.1.2.1.17.7.1.2.2.1.2.616', min: '', max: '', value: '164.147.76.110.114.120', status: 'dead' },
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
    console.log('varbinds:', varbinds)
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
    console.log(`ip:${snmpObject.ip_address} ${snmpObject.description} oid: ${snmpObject.oid}`)
    try {
      const response = await snmpGet(snmpObject)
      console.log(`ip:${snmpObject.ip_address} ${snmpObject.description} response: ${response}`)
    } catch (error) {
      console.error(`Error querying ${snmpObject.ip_address}:`, error)
    }
  }
}

main()
