# Stree web - simple S3 client
Stree web client is simple web client for file management on S3 endpoints, such as Amazon S3, Ceph, Minio, ... 

# Usage with your S3 server?
1. `git clone https://github.com/rokj/stree-web.git`
2. Download, start your S3 server (e.g. minio).
3. Set s3_endpoint in js/settings.js.
4. Open index.html in your browser with CORS disabled (e.g. `./chrome --disable-web-security --user-data-dir="/home/user/tmp"`)

# Developer notes
KISS. 
  
It uses AWS SDK v2 from Amazon. Tried v3, but got stuck with "progress" on file upload. You can check branch `https://github.com/rokj/stree-web/tree/almost-with-v3`.

Work is being done in `js/main.js`. It uses Jquery for element manipulation in HTML. Plan is to abolish Jquery in the future, ...
