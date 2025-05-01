(async () => {
  const { loadSnmpMrtgObjectsList } = require('../services/snmpMrtgService')
  let snmpMrtgObjectsList = await loadSnmpMrtgObjectsList()

  console.log(snmpMrtgObjectsList)
  console.log(snmpMrtgObjectsList.length)
  console.log(snmpMrtgObjectsList[0].name)
})()