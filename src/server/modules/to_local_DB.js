const axios = require(`axios`);
const URL = process.env.URL;
const AUTH_TOKEN = process.env.AUTH_TOKEN;

async function sendReqToDB(reqType, data, _text) {

  let dataString = JSON.stringify(data);

  try {
    const response = await axios({
      method: 'post',
      url: URL,
      responseType: 'string',
      headers: {
        Authorization: `${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        Query: `Execute;${reqType};${dataString};КОНЕЦ`,
      }
    });
    if (!response.status == 200) {
      return null
    } else {
      if (reqType === '__GetClientPersData__' || reqType === '__GetIpAddressesForWatching__') {
        return response.data
      } else {
        let answer = response.data.toString()
        return answer;
      }
    }

  } catch (err) {
    console.log(err)
    return null
  }
}


module.exports = sendReqToDB
