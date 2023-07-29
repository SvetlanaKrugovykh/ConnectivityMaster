cd /intelligence/CM-SERVER/ConnectivityMaster/
pwd
### npm install -g pm2
pm2 start ./src/server/server.js --watch --name "Obuhiv-CM-Server"
pm2 save
