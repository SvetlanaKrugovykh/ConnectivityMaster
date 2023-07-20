const fs = require('fs')
const readline = require('readline')
const admin = require('firebase-admin')

const logFiles = [process.env.PF_LOG_FILE168, process.env.PF_LOG_FILE10]
const serviceAccount = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS))
const serverId = process.env.SERVER_ID

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  //databaseURL: FIRESTORE_DB_URL
})
const firestore = admin.firestore()

module.exports.logSaving = async function () {

  for (const logFile of logFiles) {
    await processFile(logFile)
  }
}

async function processFile(logFile) {

  const subnet = logFile.includes('168') ? '168' : '10'
  const data = []

  try {
    const rl = readline.createInterface({
      input: fs.createReadStream(logFile),
      crlfDelay: Infinity,
    })

    let date, hour, firstLine = true

    for await (const line of rl) {
      const fields = line.split(/\s+/)
      if (firstLine) {
        date = fields[2]
        hour = fields[3]
        firstLine = false
      }
      const lineData = {
        'quantity': fields[1],
        'srcIp': fields[4],
        'dstIp': fields[5],
        'dstPort': fields[6],
      }
      data.push(lineData)
    }

    rl.close()

    processAndSaveData(serverId, subnet, data, date, hour)
  } catch (err) {
    console.error('Error processing file:', err)
  }
}


async function processAndSaveData(serverId, subnet, data, date, hour) {
  try {
    const collectionRef = firestore.collection('logs')
    const documentId = `${date}_${hour}`

    const docRef = collectionRef.doc(documentId)
    const docSnapshot = await docRef.get()

    if (docSnapshot.exists) {
      await docRef.update({
        logs: admin.firestore.FieldValue.arrayUnion(...data)
      })
    } else {
      await docRef.set({ logs: data })
    }

    console.log('Data saved to Firestore successfully.')
  } catch (err) {
    console.error('Error saving data to Firestore:', err)
  }
}

module.exports.getLogsByDestinationAddress = async function (destinationAddress, startDate, endDate) {
  try {
    const collectionRef = firestore.collection('logs')

    const startTimestamp = admin.firestore.Timestamp.fromDate(new Date(startDate))
    const endTimestamp = admin.firestore.Timestamp.fromDate(new Date(endDate))

    const querySnapshot = await collectionRef
      .where('date', '>=', startTimestamp)
      .where('date', '<=', endTimestamp)
      .get()

    const logsByDestinationAddress = []

    querySnapshot.forEach((doc) => {
      const logData = doc.data()

      const logsWithDestinationAddress = logData.logs.filter((log) => {
        return log.dstIp === destinationAddress
      })

      logsByDestinationAddress.push(...logsWithDestinationAddress)
    })

    console.log('Logs found successfully.')

    return logsByDestinationAddress
  } catch (err) {
    console.error('Error fetching logs from Firestore:', err)
    return []
  }
}
