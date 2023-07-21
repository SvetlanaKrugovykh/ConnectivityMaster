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

  let message = ''
  for (const logFile of logFiles) {
    const processMessage = await processFile(logFile)
    message += `${logFile} => ${processMessage}`
  }
  return message
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
    return ('Data saved to Firestore successfully.')
  } catch (err) {
    console.error('Error processing file:', err)
  }
}

async function processAndSaveData(serverId, subnet, data, date, hour) {
  try {
    const collectionRef = firestore.collection('logs')
    const documentId = `${serverId}-${subnet}-${date}_${hour}`
    const datedoc = admin.firestore.Timestamp.fromDate(new Date(`${date}T${hour}:59:59`))
    const newData = { datedoc, hour, subnet, serverId, logs: data }

    const docRef = collectionRef.doc(documentId)
    await docRef.set(newData)

  } catch (err) {
    console.error('Error saving data to Firestore:', err)
  }
}

module.exports.getLogs = async function (_subnet, srcIpAddress, dstIpAddress, startDate, endDate) {
  try {
    const collectionRef = firestore.collection('logs')

    const startTimestamp = admin.firestore.Timestamp.fromDate(new Date(startDate))
    const endTimestamp = admin.firestore.Timestamp.fromDate(new Date(endDate))

    const querySnapshot = await collectionRef
      .where('datedoc', '>=', startTimestamp)
      .where('datedoc', '<=', endTimestamp)
      .get()

    const selectionEntries = []

    querySnapshot.forEach((doc) => {

      const logData = doc.data()

      if (_subnet.length > 0 && _subnet !== logData.subnet) return

      const { logs, hour } = logData
      const datedoc = logData.datedoc.toDate().toISOString().slice(0, 10)

      logs.forEach((log) => {
        const { quantity, srcIp, dstIp, dstPort } = log
        if (dstIpAddress.length > 7 && dstIp.includes(dstIpAddress)) {
          selectionEntries.push({ srcIp, dstIp, dstPort, quantity, datedoc, hour })
        }
        if (srcIpAddress.length > 7 && srcIp.includes(srcIpAddress)) {
          selectionEntries.push({ srcIp, dstIp, dstPort, quantity, datedoc, hour })
        }
      })
    })
    return selectionEntries
  } catch (err) {
    console.error('Error fetching logs from Firestore:', err)
    return []
  }
}

module.exports.removeCollection = async function (rootCollectionId, docsCollectionId) {
  try {
    const collectionRef = firestore.collection(rootCollectionId)

    if (docsCollectionId.length > 0) {
      const docRef = collectionRef.doc(docsCollectionId)
      await docRef.delete()
      return ('The document was deleted successfully.')
    } else {
      const querySnapshot = await collectionRef.get()
      const deletePromises = querySnapshot.docs.map((doc) => doc.ref.delete())
      await Promise.all(deletePromises)
      return ('All documents from the collection were deleted successfully.')
    }
  } catch (error) {
    console.error('The document was not deleted: ', error)
  }
}
