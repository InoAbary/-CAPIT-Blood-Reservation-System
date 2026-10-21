import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function getMockInventories() {
  try {
    const filePath = path.resolve(__dirname, 'db/collections/inventories.json')
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(data)
      return Array.isArray(parsed) ? parsed : [parsed]
    }
  } catch (e) {
    console.warn('Error reading mock inventories.json:', e)
  }
  return []
}

function getMockFacilities() {
  try {
    const filePath = path.resolve(__dirname, 'db/collections/facilities.json')
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(data)
      return Array.isArray(parsed) ? parsed : [parsed]
    }
  } catch (e) {
    console.warn('Error reading mock facilities.json:', e)
  }
  return []
}

function saveMockFacilities(facilitiesList) {
  try {
    const filePath = path.resolve(__dirname, 'db/collections/facilities.json')
    fs.writeFileSync(filePath, JSON.stringify(facilitiesList, null, 2), 'utf-8')
    return true
  } catch (e) {
    console.warn('Error writing facilities.json:', e)
    return false
  }
}

const apiMiddlewarePlugin = () => ({
  name: 'mock-api-middleware',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      // Inventories GET
      if (req.url === '/api/inventories' || req.url?.startsWith('/api/inventories?')) {
        if (req.method === 'GET') {
          const inventories = getMockInventories()
          res.setHeader('Content-Type', 'application/json')
          res.statusCode = 200
          res.end(JSON.stringify({
            success: true,
            inventories
          }))
          return
        }
      }

      // Facilities GET & POST
      if (req.url === '/api/facilities' || req.url?.startsWith('/api/facilities?')) {
        if (req.method === 'GET') {
          const facilities = getMockFacilities()
          res.setHeader('Content-Type', 'application/json')
          res.statusCode = 200
          res.end(JSON.stringify({
            success: true,
            source: 'mongodb-git-store',
            facilities
          }))
          return
        }

        if (req.method === 'POST') {
          let bodyStr = ''
          req.on('data', chunk => {
            bodyStr += chunk
          })
          req.on('end', () => {
            try {
              const body = JSON.parse(bodyStr || '{}')
              const facilityID = 'F' + String(Date.now()).slice(-5)
              const newRecord = {
                _id: { $oid: 'mongo_' + Date.now() + Math.random().toString(16).slice(2, 8) },
                facilityID,
                facilityName: body.facilityName || 'New Blood Facility',
                facilityType: body.facilityType || 'bsf',
                category: body.category || (body.facilityName?.toLowerCase().includes('red cross') ? 'PRC' : 'Hospital BSF'),
                typeLabel: body.typeLabel || (body.facilityName?.toLowerCase().includes('red cross') ? 'Philippine Red Cross' : 'Hospital Blood Service Facility'),
                address: body.address || 'Metro Manila, Philippines',
                contactNumber: body.contactNumber || '(02) 8527-2195',
                contactNuber: body.contactNumber || '(02) 8527-2195',
                phone: body.contactNumber || '(02) 8527-2195',
                lat: Number(body.lat) || 14.5995,
                lon: Number(body.lon) || 120.9842,
                hours: body.hours || '8:00 AM - 5:00 PM',
                matrix: body.matrix || {
                  'O+': { prbc: 'Available', whole: 'Available', platelet: 'Low', plasma: 'Available', cryo: 'Low' },
                  'O-': { prbc: 'Unavailable', whole: 'Unavailable', platelet: 'Unavailable', plasma: 'Unavailable', cryo: 'Unavailable' },
                  'A+': { prbc: 'Available', whole: 'Available', platelet: 'Low', plasma: 'Available', cryo: 'Available' },
                  'A-': { prbc: 'Unavailable', whole: 'Unavailable', platelet: 'Unavailable', plasma: 'Unavailable', cryo: 'Unavailable' },
                  'B+': { prbc: 'Available', whole: 'Available', platelet: 'Available', plasma: 'Available', cryo: 'Low' },
                  'B-': { prbc: 'Unavailable', whole: 'Unavailable', platelet: 'Unavailable', plasma: 'Unavailable', cryo: 'Unavailable' },
                  'AB+': { prbc: 'Available', whole: 'Available', platelet: 'Low', plasma: 'Available', cryo: 'Low' },
                  'AB-': { prbc: 'Unavailable', whole: 'Unavailable', platelet: 'Unavailable', plasma: 'Unavailable', cryo: 'Unavailable' }
                },
                isActive: true,
                createdAt: new Date().toISOString()
              }

              const currentList = getMockFacilities()
              currentList.push(newRecord)
              saveMockFacilities(currentList)

              console.log(`[Database/MongoDB] Logged new facility "${newRecord.facilityName}" (ID: ${newRecord.facilityID}) to database.`)

              res.setHeader('Content-Type', 'application/json')
              res.statusCode = 201
              res.end(JSON.stringify({
                success: true,
                message: 'Branch successfully logged to MongoDB and saved to database.',
                facility: newRecord
              }))
            } catch (err) {
              res.setHeader('Content-Type', 'application/json')
              res.statusCode = 400
              res.end(JSON.stringify({
                success: false,
                error: err.message
              }))
            }
          })
          return
        }
      }

      next()
    })
  },
  configurePreviewServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url === '/api/inventories' || req.url?.startsWith('/api/inventories?')) {
        if (req.method === 'GET') {
          const inventories = getMockInventories()
          res.setHeader('Content-Type', 'application/json')
          res.statusCode = 200
          res.end(JSON.stringify({
            success: true,
            inventories
          }))
          return
        }
      }

      if (req.url === '/api/facilities' || req.url?.startsWith('/api/facilities?')) {
        if (req.method === 'GET') {
          const facilities = getMockFacilities()
          res.setHeader('Content-Type', 'application/json')
          res.statusCode = 200
          res.end(JSON.stringify({
            success: true,
            facilities
          }))
          return
        }
      }

      next()
    })
  }
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiMiddlewarePlugin()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: 'all'
  },
  preview: {
    host: '0.0.0.0',
    port: 3000
  },
  optimizeDeps: {
    exclude: ['maplibre-gl']
  }
})
