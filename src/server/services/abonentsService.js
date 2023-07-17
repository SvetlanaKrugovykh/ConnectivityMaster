const util = require('util')
const exec = util.promisify(require('child_process').exec)

module.exports.switchOff = async function (abonentId, ipAddress, vlanId) {

  const deleteCommand = `/sbin/ipfw delete ${abonentId}`
  const addCommand = `/sbin/ipfw add ${abonentId} deny ip from ${ipAddress}/32 to any via vlan${vlanId} in`

  try {
    await exec(deleteCommand)
    console.log(`Deleted rule ${abonentId} successfully.`)

    await exec(addCommand)
    console.log(`Added rule ${abonentId} successfully.`)

    return true
  } catch (error) {
    console.error('Error executing commands:', error)
    return false
  }
}