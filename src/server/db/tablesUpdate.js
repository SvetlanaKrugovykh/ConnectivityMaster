const { Pool } = require('pg')
const fs = require('fs')
const readline = require('readline')
const dotenv = require('dotenv')

dotenv.config()

const pool = new Pool({
  user: process.env.TRAFFIC_DB_USER,
  host: process.env.TRAFFIC_DB_HOST,
  database: process.env.TRAFFIC_DB_NAME,
  password: process.env.TRAFFIC_DB_PASSWORD,
  port: process.env.TRAFFIC_DB_PORT,
})

const tableQueries = {
  traffic_data: `CREATE TABLE traffic_data (
    id SERIAL PRIMARY KEY,
    timestamp DATE NOT NULL,
    hour INTEGER NOT NULL,
    source_ip VARCHAR(15) NOT NULL,
    destination_ip VARCHAR(15) NOT NULL,
    destination_port INTEGER NOT NULL
  )`,
}

module.exports.updateTables = function () {
  checkAndCreateTable('traffic_data')
    .then(() => {
      console.log('All tables created or already exist.')
    })
    .catch((err) => {
      console.error('Error in table creation sequence:', err)
    })
}

async function checkAndCreateTable(tableName) {
  try {
    const client = await pool.connect()
    const res = await client.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = $1
      )`,
      [tableName]
    )

    const tableExists = res.rows[0].exists
    if (!tableExists) {
      await createTable(tableName)
      console.log(`Table ${tableName} created successfully.`)
    } else {
      console.log(`Table ${tableName} already exists.`)
    }
    client.end()
  } catch (err) {
    client.end()
    console.error(`Error checking if table ${tableName} exists:`, err)
  }
}


async function createTable(tableName) {
  try {
    await client.query(tableQueries[tableName])
    console.log(`Table ${tableName} created successfully.`)
  } catch (err) {
    console.error(`Error creating table ${tableName}:`, err)
  }
}

module.exports.importData = async function (logFile) {
  const client = await pool.connect()
  try {
    const rl = readline.createInterface({
      input: fs.createReadStream(logFile),
      crlfDelay: Infinity,
    })

    let date, hour, firstLine = true

    for await (const line of rl) {
      const fields = line.split(/\s+/)
      const quantity = fields.length
      if (firstLine) {
        date = fields[quantity - 5]
        hour = fields[quantity - 4]
        firstLine = false
      }
      const source_ip = fields[quantity - 3]
      const destination_ip = fields[quantity - 2]
      const destination_port = fields[quantity - 1]

      const query = `
        INSERT INTO traffic_data (timestamp, hour, source_ip, destination_ip, destination_port)
        VALUES ($1, $2, $3, $4, $5)
      `
      const values = [date, parseInt(hour), source_ip, destination_ip, parseInt(destination_port)]
      await client.query(query, values)
    }

    rl.close()

    console.log('Data imported successfully')
  } catch (err) {
    console.error('Error importing data:', err)
  } finally {
    client.release()
  }
}


