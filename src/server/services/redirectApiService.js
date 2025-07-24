const axios = require('axios')
const fs = require('fs')
const util = require('util')
const readFile = util.promisify(fs.readFile)
const writeFile = util.promisify(fs.writeFile)
const { runCommand } = require('../utils/commandsOS')
const locks = {}
const paymentService = require('./paymentService')
const payment_to_db = require('../db-api/requests').payment_to_db

const URL = process.env.URL
const AUTH_TOKEN = process.env.AUTH_TOKEN

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

    let modifiedVlanId = vlanId
    if (ipAddress.startsWith('10.100.')) modifiedVlanId = '91'
    if (ipAddress.startsWith('192.168.111.')) modifiedVlanId = '411'


    const filePath = `/home/admin/deny_ip/vlan${modifiedVlanId}_deny_hosts`
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

    console.log(`${new Date()}: Removed ${ipAddress} for vlan=${modifiedVlanId} successfully.`)
    locks[filePath] = Promise.resolve()

    const addCommand = await runCommand(`/sbin/pfctl -f /etc/pf.rules`)
    console.log(`${new Date()}: pf rules uploaded for vlan=${modifiedVlanId} successfully.=>${addCommand.stdout}`)

    return true
  } catch (error) {
    console.error('Error executing commands:', error.message)
    return false
  }
}

module.exports.execGetPayLink = async function (ipAddress, amount) {
  console.log(`web Request for execGetPayLink from ipAddress: ${ipAddress} amount: ${amount}`)
  console.log(`DB_USER_ADD_URL: ${process.env.DB_USER_ADD_URL}`)

  try {
    console.log('Making request to:', process.env.DB_USER_ADD_URL)
    console.log('Request data:', {
      "ip_address": ipAddress,
      "data": "Added",
      "signature": "Added"
    })

    const response = await axios({
      method: 'post',
      url: process.env.DB_USER_ADD_URL,
      responseType: 'application/json',
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        "ip_address": ipAddress,
        "data": "Added",
        "signature": "Added"
      },
    })
    console.log('Response status:', response.status)
    console.log('Response data:', response.data)

    if (response.status !== 200) {
      console.log('Non-200 status:', response.status)
      return null
    } else {
      console.log('response.status 200', response.data)
      try {
        const responseData = JSON.parse(response.data)
        console.log('Parsed response:', responseData)
        const user_info = `Ви отримали посилання для сплати за договором ${responseData.contract_name}, що зареєстрований з email (${responseData.email} та номером телефону ${responseData.phone_number}) на суму ${amount} грн. Перейдіть за посиланням для сплати.`
        const { organization_abbreviation, payment_code } = responseData
        console.log(organization_abbreviation, payment_code)
        const linkURI = await paymentService.formPaymentLink(ipAddress, organization_abbreviation, payment_code, amount)
        await payment_to_db(ipAddress, amount)
        const message = {
          linkURI,
          user_info
        }
        return message
      } catch (error) {
        console.error('Error executing commands:', error.message)
        return false
      }
    }
  } catch (err) {
    console.log(`${ipAddress} data not found.`)
    return null
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

