# Stree web - simple S3 browser client
Stree web client is simple web/browser client for file management on S3 endpoints, such as Amazon S3, Ceph, Minio, ...  

This is not a node app. Download, configure settings and open it in browser.

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

# Install
1. `git clone https://github.com/rokj/stree-web.git`
2. Download, configure, start your S3 server (e.g. minio) or set Amazon S3 endpoint.
3. Set `s3_endpoint` and desired `bucket` in js/settings.js.
4. Open index.html in your browser with CORS disabled (e.g. `./chrome --disable-web-security --user-data-dir="/home/user/tmp"`)

# Developer notes
KISS. 
  
It uses Javascript AWS SDK v2 from Amazon. Tried v3, but got stuck with "progress" on file upload. You can check out branch `https://github.com/rokj/stree-web/tree/almost-with-v3`.

There are three files to work with:
- `js/main.js` - logic
- `css/main.css` - CSS
- `index.html` - template/design

Additionaly [jquery](https://jquery.com/) is used for element manipulation in HTML, [bootstrap](https://getbootstrap.com/) for CSS-ing. Plan is to abolish jquery in the future, ...

## Sharing

For sharing to work, you have to implement service with 4 endpoints (customizable and set in settings.js):
- `/get-user-shares/`
- `/share/`
- `/unshare/`
- `/download/`

### `/get-user-shares/` 

Following json request payload is sent to `/get-user-shares/` endpoint:
```json
{
  'access_key': 'XYZ'
}
```

Based on `access_key` you can get differentiate users shared objects/files.

`/get-user-shares/` should return following response:
```json
{
  "object_key1": {
    "download_key": "unique key which is appended to download url for download operation",
    "type": "empty string or 'document'", 
    "acl": "empty string or 'none' or 'readonly' or 'readwrite' or 'writeonly'"
  },
  "object_key2": {
    "download_key": "url_from_where_object_can_be_downloaded",
    "type": "empty string or 'document'", 
    "acl": "empty string or 'none' or 'readonly' or 'readwrite' or 'writeonly'"
  },
  ...
}
```

`object_key` is usually S3 object key.  
`download_key` is usually random unique key from which app endpoint can then "resolve" to object.   
`type`: is `""` or `"document"`. `"document"` is used only for an onlyoffice integration.  
`acl`: is `""` or `"none"` or `"readonly"` or `"readwrite"` or `"writeonly"`.

### `/share/`

todo ...

### `/unshare/`

todo ...

### `/download/`
GET request example to `/download/` endpoint:
```
https://app_endpoint/download/?k=UNIQE_DOWNLOAD_KEY
```

Based on `k` GET argument, `/download/` endpoint will redirect to a file which can be downloaded.

This is usually redirect to S3 download URL, which in case of CEPH with multi tenant support is constructed something like this:
```
1. download_url = "{settings.s3_endpoint}/{tenant}:{bucket}/{object_key}"
2. redirect to download URL
 
e.g.:
1. object_key = get_object_key_from_database(GET['k'])
2. download_url = "https://s3.internet.com/user1:mybucket/{object_key}"
3. redirect to download_url
```

## Onlyoffice

...
## Sharing onlyoffice documents

...
