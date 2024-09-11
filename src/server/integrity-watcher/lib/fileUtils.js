const compareHashes = async (hashFile, onMismatch) => {
  const hashData = fs.readFileSync(hashFile, 'utf-8')
  const hashEntries = hashData.split('\n').filter(Boolean)

  for (const entry of hashEntries) {
    const [filePath, oldHash] = entry.split(',')

    if (fs.existsSync(filePath)) {
      try {
        const newHash = await getFileHash(filePath)

        if (newHash !== oldHash) {
          onMismatch(filePath)
        }
      } catch (err) {
        console.error(`File hash error: ${filePath}`, err)
      }
    } else {
      console.warn(`File was deleted ot not found: ${filePath}`)
    }
  }
}

const notifyMismatch = (filePath) => {
  console.log(`File hash mismatch: ${filePath}`)
}

const cron = require('node-cron')

cron.schedule('*/5 * * * *', () => {
  compareHashes('/path/to/output/hashes.txt', notifyMismatch)
    .then(() => console.log('Check complete'))
    .catch((err) => console.error('Error at check time:', err))
})
