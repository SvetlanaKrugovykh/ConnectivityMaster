const axios = require('axios')
require('dotenv').config()

module.exports.sendPaymentData = async function (paymentData) {
  try {
    const response = await axios.post(`${process.env.LG_PL_URL}/get-pay`, paymentData, {
      headers: {
        Authorization: process.env.LG_SERVER_AUTHORIZATION,
      },
    })
    console.log('Payment data successfully sent to external service:', response.data)
    return response.data
  } catch (error) {
    console.error('Error sending payment data to external service:', error.message)
    throw error
  }
}