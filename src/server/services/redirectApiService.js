const axios = require('axios')
const fs = require('fs')
const util = require('util')
const URL = process.env.URL
const AUTH_TOKEN = process.env.AUTH_TOKEN
const readFile = util.promisify(fs.readFile)
const writeFile = util.promisify(fs.writeFile)
const { runCommand } = require('../utils/commandsOS')
const locks = {}

module.exports.getInvoice = async function (ipAddress) {
  try {
    const fileName = await getReceipt(ipAddress)
    return fileName
  } catch (error) {
    console.error('Error executing commands:', error.message)
    return false
  }
}


module.exports.execServiceContinued = async function (ipAddress) {
  if (process.env.PLATFORM !== 'freebsd') {
    return true
  }

  try {
    const parts = ipAddress.split('.')
    const vlanId = parts.length === 4 ? parts[2] : null

    if (!vlanId) {
      console.error(`Invalid ipAddress=${ipAddress} format. Could not extract vlanId.`)
      return false
    }

    const filePath = `/home/admin/deny_ip/vlan${vlanId}_deny_hosts`
    if (!locks[filePath]) {
      locks[filePath] = Promise.resolve();
    }
    await locks[filePath]

    const fileContent = await readFile(filePath, 'utf8')
    const updatedContent = fileContent
      .split('\n')
      .filter(line => line.trim() !== ipAddress)
      .join('\n')

    await writeFile(filePath, updatedContent)

    console.log(`${new Date()}: Removed ${ipAddress} for vlan=${vlanId} successfully.`)
    locks[filePath] = Promise.resolve()

    const addCommand = await runCommand(`/sbin/pfctl -f /etc/pf.rules`)
    console.log(`${new Date()}: pf rules uploaded for vlan=${vlanId} successfully.=>${addCommand.stdout}`)

    return true
  } catch (error) {
    console.error('Error executing commands:', error.message)
    return false
  }
}


async function getReceipt(ipAddress) {
  try {
    const response = await axios({
      method: 'post',
      url: URL,
      responseType: 'stream',
      headers: {
        Authorization: `${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        Query: `Execute;GetReceipt;${ipAddress};КОНЕЦ`,
      },
    })
    if (!response.status == 200) {
      console.log(response.status)
      return null
    } else {
      console.log('response.status', response.status)
      const TEMP_CATALOG = process.env.TEMP_CATALOG
      let fileFullName = `${TEMP_CATALOG}__${ipAddress}__.pdf`
      if (!response.status == 200) {
        console.log(`${ipAddress} data not found.`)
        return null
      }
      try {
        await response.data.pipe(fs.createWriteStream(fileFullName))
        console.log(`File ${fileFullName} saved.`)
        return fileFullName
      } catch (err) {
        console.error(err)
        console.log(`${ipAddress} File not saved!!!.`)
        return null
      }


    }
  } catch (err) {
    console.log(`${ipAddress} data not found.`)
    return null
  }
}