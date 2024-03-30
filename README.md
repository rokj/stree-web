# Stree web - simple S3 browser client
Stree web client is simple web/browser client for file management on S3 endpoints, such as Amazon S3, Ceph, Minio, ... 

Currently it supports:
- [x] single bucket
- [ ] multiple buckets
- [x] upload single file
- [x] upload multiple files
- [x] upload folder
- [x] download single file
- [ ] download multiple files
- [ ] download folder
- [x] map/folder creation
- [ ] sharing
- [ ] editing

# Usage with your S3 server?
1. `git clone https://github.com/rokj/stree-web.git`
2. Download, configure, start your S3 server (e.g. minio).
3. Set `s3_endpoint` and desired `bucket` in js/settings.js.
4. Open index.html in your browser with CORS disabled (e.g. `./chrome --disable-web-security --user-data-dir="/home/user/tmp"`)

# Developer notes
KISS. 
  
It uses Javascript AWS SDK v2 from Amazon. Tried v3, but got stuck with "progress" on file upload. You can check branch `https://github.com/rokj/stree-web/tree/almost-with-v3`.

There are three files to work with:
- `js/main.js` - logic
- `css/main.css` - CSS
- `index.html` - template/design

Additionaly [jquery](https://jquery.com/) is used for element manipulation in HTML, [bootstrap](https://getbootstrap.com/) for CSS-ing. Plan is to abolish jquery in the future, ...
