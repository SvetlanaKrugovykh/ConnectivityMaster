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
    signature,
  })

  if (!response.status == 200) {
    return null
  }
  return response.data
}


module.exports.payment_to_db = async function (ipAddress, amount) {
  try {
    const url = process.env.DB_PAYMENT_ADD_URL
    console.log(`Making request to URL: ${url}`)

    const data = {
      ip_address: ipAddress,
      amount: amount,
      data: "Added",
      signature: "Added"
    }

    console.log('Request body:', JSON.stringify(data, null, 2))

    const response = await axios({
      method: 'post',
      url: url,
      responseType: 'json',
      headers: {
        'Content-Type': 'application/json',
      },
      data: data
    })

    if (response.status !== 200) { // Corrected condition
      console.log(`Error: Received status code ${response.status}`)
      return null
    }
    console.log('response.status 200', response.data)
    return response.data
  } catch (err) {
    if (err.response) {
      console.log(`Error: Received status code ${err.response.status}`)
      console.log(err.response.data)
      console.log(err.response.headers)
    } else if (err.request) {
      console.log('Error: No response received')
      console.log(err.request)
    } else {
      console.log('Error:', err.message)
    }
    console.log(err.config)
    return null
  }
}