cloudsaves server
==

Minimalistic server to store savegames in the cloud and load them from any browser.

No deltas, No conflict resolution, No migrations, No sanitization. Just raw storage.

```yaml
# docker-compose.yml
version: "2"
services:
  server:
    image: ghcr.io/danielesteban/unsatisfactory/cloudsaves:master
    restart: always
    environment:
     - ALLOWED_ORIGINS=https://unsatisfactory.gatunes.com,http://localhost:8080
     - MONGO_URI=mongodb://mongo/cloudsaves
     - SESSION_SECRET=supersecuresecret
    ports:
     - "127.0.0.1:80:80"
  mongo:
    image: mongo:7
    restart: always
    volumes:
     - "./mongo/config:/data/configdb"
     - "./mongo/data:/data/db"
```
