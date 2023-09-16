const axios = require('axios')
const fs = require('fs')
const URL = process.env.URL
const AUTH_TOKEN = process.env.AUTH_TOKEN
const { runCommand } = require('../utils/commandsOS')

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
    // const deleteCommand = await runCommand('/sbin/ipfw', ['delete', abonentId])

    // if (deleteCommand.stdout) {
    //   console.log(`${new Date()}: Added rule ${abonentId} -> ${ipAddress} successfully.`)
    // }
    return true
  } catch (error) {
    console.error(`${new Date()}: Error executing commands:-> ${ipAddress} `, error.message)
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
      } else {
        try {
          response.data.pipe(fs.createWriteStream(fileFullName))
          console.log(`File ${fileFullName} saved.`)
          return fileFullName
        } catch (err) {
          console.log(err)
          console.log('File not saved!!!')
          return null
        }
      }
    }
  } catch (err) {
    console.log(`${ipAddress} data not found.`)
    return null
  }
}