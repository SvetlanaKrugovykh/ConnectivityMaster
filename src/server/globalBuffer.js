require('dotenv').config()

const liqpayKeys = {
  kf: {
    publicKey: process.env.LIQPAY_PUBLIC_KEY_KF,
    privateKey: process.env.LIQPAY_PRIVATE_KEY_KF,
  },
  lev: {
    publicKey: process.env.LIQPAY_PUBLIC_KEY_LEV,
    privateKey: process.env.LIQPAY_PRIVATE_KEY_LEV,
  },
  pf: {
    publicKey: process.env.LIQPAY_PUBLIC_KEY_PF,
    privateKey: process.env.LIQPAY_PRIVATE_KEY_PF,
  },
  si: {
    publicKey: process.env.LIQPAY_PUBLIC_KEY_SI,
    privateKey: process.env.LIQPAY_PRIVATE_KEY_SI,
  },
}

const testLiqpayKeys = {
  kf: {
    publicKey: process.env.TEST_LIQPAY_PUBLIC_KEY_KF,
    privateKey: process.env.TEST_LIQPAY_PRIVATE_KEY_KF,
  },
  lev: {
    publicKey: process.env.TEST_LIQPAY_PUBLIC_KEY_LEV,
    privateKey: process.env.TEST_LIQPAY_PRIVATE_KEY_LEV,
  },
  pf: {
    publicKey: process.env.TEST_LIQPAY_PUBLIC_KEY_PF,
    privateKey: process.env.TEST_LIQPAY_PRIVATE_KEY_PF,
  },
  si: {
    publicKey: process.env.TEST_LIQPAY_PUBLIC_KEY_SI,
    privateKey: process.env.TEST_LIQPAY_PRIVATE_KEY_SI,
  },
}

function getLiqpayKeys(abbreviation) {
  if (process.env.LIQPAY_ENV === 'Test') {
    return testLiqpayKeys[abbreviation] || null
  }
  return liqpayKeys[abbreviation] || null
}

module.exports = { getLiqpayKeys }