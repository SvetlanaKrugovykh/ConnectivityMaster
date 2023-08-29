const snmp = require('snmp-native')

const testSnmpObjectsList = [
  { ip_address: '127.0.0.1', description: 'system', oid: '.1.3.6.1.2.1.1.1.0', status: 'dead' },

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
      return varbinds[0].value
    } else {
      throw new Error('No response received')
    }
  } catch (error) {
    console.error('Error:', error) // Log the error details
    throw error
  }
}

async function main() {
  for (const snmpObject of testSnmpObjectsList) {
    try {
      const response = await snmpGet(snmpObject)
      console.log(`ip:${snmpObject.ip_address} description:${snmpObject.description} response: ${response} oid:${snmpObject.oid}`)
    } catch (error) {
      console.error(`Error querying ${snmpObject.ip_address}:`, error)
    }
  }
}

main()
