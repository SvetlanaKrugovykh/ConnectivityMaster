module.exports.temporarilyDisableIP = (ip_address, ipCheckDelayList, timeout = 300000) => {
  const index = ipCheckDelayList.indexOf(ip_address)
  if (index !== -1) {
    ipCheckDelayList.splice(index, 1)
    console.log(`IP ${ip_address} temporary exclude  from ipCheckDelayList.`)

    setTimeout(() => {
      ipCheckDelayList.push(ip_address)
      console.log(`IP ${ip_address} return в ipCheckDelayList.`)
    }, timeout);
  } else {
    console.log(`IP ${ip_address} not found в ipCheckDelayList.`)
  }
}