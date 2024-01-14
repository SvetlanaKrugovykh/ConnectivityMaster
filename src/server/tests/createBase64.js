const fs = require('fs')
const files = fs.readdirSync('C:\\Temp\\')
console.log(files)

const fileData = fs.readFileSync('C:\\Temp\\123123.pdf')
const base64Data = fileData.toString('base64')

console.log(base64Data)
