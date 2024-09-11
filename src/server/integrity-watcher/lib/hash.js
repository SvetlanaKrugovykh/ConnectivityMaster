const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const getFileHash = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const stream = fs.createReadStream(filePath)

    stream.on('data', (data) => hash.update(data))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', (err) => reject(err))
  })
}

const hashFilesInDirectory = async (dir, outputFile) => {
  const files = await fs.promises.readdir(dir, { withFileTypes: true })
  const outputStream = fs.createWriteStream(outputFile)

  for (const file of files) {
    const filePath = path.join(dir, file.name)

    if (file.isDirectory()) {
      await hashFilesInDirectory(filePath, outputFile)
    } else {
      const ext = path.extname(file.name).toLowerCase()
      if (!['.png', '.jpg', '.jpeg', '.gif'].includes(ext)) {
        try {
          const hash = await getFileHash(filePath)
          outputStream.write(`${filePath},${hash}\n`)
        } catch (err) {
          console.error(`Ошибка чтения файла: ${filePath}`, err)
        }
      }
    }
  }

  outputStream.end()
}

// Пример вызова функции
hashFilesInDirectory('/path/to/directory', '/path/to/output/hashes.txt')
  .then(() => console.log('Хеши файлов записаны'))
  .catch((err) => console.error('Ошибка:', err))
