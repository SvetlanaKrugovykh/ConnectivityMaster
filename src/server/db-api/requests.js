const axios = require('axios')

module.exports.updatePayment = async function (paymentData) {
  const DB_UPDATE_URL = process.env.DB_UPDATE_URL
  const signature = process.env.DB_UPDATE_SIGNATURE || ''

  const response = await axios({
    method: 'post',
    url: DB_UPDATE_URL,
    responseType: 'string',
    headers: {
      'Content-Type': 'application/json',
    },
    data: {
      ...paymentData,
    },
    signature: "Added",
  })

  if (!response.status == 200) {
    return null
  }
  return response.data
}