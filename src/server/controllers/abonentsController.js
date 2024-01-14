const HttpError = require('http-errors')
const abonentsService = require('../services/abonentsService')
const clientCommunicationsService = require('../services/clientCommunicationsService')
const redirectApiService = require('../services/redirectApiService')
const addTag = process.env.PLATFORM !== 'freebsd' ? '( Test mode )' : ''

module.exports.abonentSwitchOff = async function (request, _reply) {
  const { abonentId, ipAddress, vlanId } = request.body
  const message = await abonentsService.switchOff(abonentId, ipAddress, vlanId)

  if (!message) {
    throw new HttpError[501]('Command execution failed')
  }

  return {
    message: `Abonent switched off ${addTag}`
  }
}

module.exports.abonentSwitchRedir = async function (request, _reply) {
  const { ipAddresses, vlanId } = request.body
  const message = await abonentsService.switchRedir(ipAddresses, vlanId)

  if (!message) {
    throw new HttpError[501](`Command execution rules for vlan=${vlanId} failed`)
  }

  return {
    message: `Abonent redirect rules for vlan=${vlanId}`
  }
}

module.exports.abonentSwitchOn = async function (request, _reply) {
  const { abonentId, ipAddress } = request.body
  const message = await abonentsService.switchOn(abonentId, ipAddress)

  if (!message) {
    throw new HttpError[501]('Command execution failed')
  }

  return {
    message: `Abonent switched on ${addTag}`
  }
}

module.exports.abonentSwitchRedirectedOn = async function (request, _reply) {
  const { ipAddress } = request.body
  const message = await redirectApiService.execServiceContinued(ipAddress)

  if (!message) {
    throw new HttpError[501]('Command execution failed')
  }

  return {
    message: `Redirected abonent switched on ${message}`
  }
}

module.exports.getArpMac = async function (request, _reply) {
  const { ipAddress } = request.body
  const message = await abonentsService.getArpMac(ipAddress)
  if (!message) {
    throw new HttpError[501]('Command execution failed')
  }

  return {
    message: `Mac address for ${ipAddress} is ${message}`
  }
}




module.exports.abonentFwdOff = async function (request, _reply) {
  const { abonentId, ipAddress, vlanId } = request.body
  const message = await abonentsService.fwdOff(abonentId, ipAddress, vlanId)

  if (!message) {
    throw new HttpError[501]('Command execution failed')
  }

  return {
    message: `Abonent forwarded off ${addTag}`
  }
}

module.exports.abonentFwdOn = async function (request, _reply) {
  const { abonentId, ipAddress } = request.body
  const message = await abonentsService.fwdOn(abonentId, ipAddress)

  if (!message) {
    throw new HttpError[501]('Command execution failed')
  }

  return {
    message: `Abonent forwarded on ${addTag}`
  }
}

module.exports.abonentSendMessage = async function (request, _reply) {
  const body = request.body
  const messageResult = await clientCommunicationsService.sendMessage(body)

  if (!messageResult) {
    throw new HttpError[501]('Command execution failed')
  }

  return {
    message: `Message sent to ${addresses}`
  }
}