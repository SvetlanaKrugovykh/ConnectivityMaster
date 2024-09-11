const { hashFilesInDirectory } = require('./lib/hash')
const { compareHashes } = require('./lib/fileUtils')

const initializeHashing = (dir, outputFile) => {
  return hashFilesInDirectory(dir, outputFile)
}

const checkIntegrity = (hashFile, onMismatch) => {
  return compareHashes(hashFile, onMismatch)
}

module.exports = {
  initializeHashing,
  checkIntegrity
}
