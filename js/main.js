//<![CDATA[
import * as settings from "./settings.js?1";
import {set_policy} from "./vendor/s3-acl-utils.js?1";

/*
function gets template from index.html with selector and replaces search
patterns with replaced ones.
 */
function htmlFromTemplate(selector, replace = []) {
    let template = $(selector).clone();
    let html = template.html();
    for (let i in replace) {
        html = html.replaceAll(replace[i]['search'], replace[i]['replace']);
    }

    return html;
}

function parent(path) {
    if (path.endsWith('/')) {
        path = path.substring(0, path.length - 2);
    }

    if (path.lastIndexOf('/') == -1) {
        return '';
    }

    path = path.substring(0, path.lastIndexOf('/'));

    return path + '/';
}

function slash(string) {
    if (!string.endsWith('/')) {
        string = string + '/';
    }

    return string
}

function debug(msg) {
    if (settings.debug) {
        console.log(msg);
    }
}

async function fetchLanguage(lang) {
    const response = await fetch(`lang/${lang}.json`);
    return response.json();
}

function translate(...args) {
    if (args.length < 2) {
        return "";
    }

    let str = args[0];

    for (let i = 1; i < args.length; i++) {
        str = str.replace(`[${i-1}]`, args[i]);
    }

    return str;
}

export function getUrlParam(param) {
    let url_string = window.location.href;
    let url = new URL(url_string);
    let c = url.searchParams.get(param);

    return c;
}

export let getDocumentType = function (ext) {
    if (".doc.docx.docm.dot.dotx.dotm.odt.fodt.ott.rtf.txt.html.htm.mht.xml.pdf.djvu.fb2.epub.xps.oxps".indexOf(ext) != -1) return "text";
    if (".xls.xlsx.xlsm.xlsb.xlt.xltx.xltm.ods.fods.ots.csv".indexOf(ext) != -1) return "spreadsheet";
    if (".pps.ppsx.ppsm.ppt.pptx.pptm.pot.potx.potm.odp.fodp.otp".indexOf(ext) != -1) return "presentation";

    return null;
};

export let fileExtension = function (filename) {
    return filename.substring(filename.lastIndexOf(".") + 1).trim().toLowerCase();
}

export function login() {
    debug(`in login function`);

    let access_key = sessionStorage.getItem('storage-access-key');
    let secret_key = sessionStorage.getItem('storage-secret-key');
    let s3client = null;

    if (!access_key || !secret_key) {
        debug(`access or secret key empty, returning`);

        return null;
    }

    if (!s3client && access_key && secret_key) {
        try {
            s3client = new AWS.S3({
                accessKeyId: access_key,
                secretAccessKey: secret_key,
                endpoint: settings.s3_endpoint,
                s3ForcePathStyle: true, // needed with minio?
                signatureVersion: 'v4',
                httpOptions: {
                    timeout: 3600000
                }
            });

            if (settings.plugins.includes("onlyoffice")) {
                getEC();
            }

            return s3client;
        } catch (e) {
            console.log("login failed");
            console.log(e);
        }
    }

    return null;
}

export async function getEC() {
    let access_key = sessionStorage.getItem('storage-access-key');
    let secret_key = sessionStorage.getItem('storage-secret-key');

    if (!access_key || !secret_key) {
        return null;
    }

    try {
        let data = new FormData();
        data.append('access_key', access_key);
        data.append('secret_key', secret_key);

        const credentials = await $.ajax({
            url: settings.urls["get_credentials"],
            method: "POST",
            contentType: false,
            processData: false,
            data: data,
            dataType: "json",
            // contentType: 'application/json; charset=utf-8',
            success: function (data) {
                if (debug) {
                    console.log("success start");
                    console.log(data);
                    console.log("success end");
                }
            }, error: function (err) {
                console.log(err);
            }
        });

        sessionStorage.setItem('storage-ec', credentials.token);
    } catch (e) {
        console.log("error getting ec");
        console.log(e);
    }
}

(async function () {
    let s3client = null;
    let selectedFolder = "";
    let shownKey = "";
    let asyncReturn = null;
    let lang = null;

    function currentTimestamp() {
        return new Date().getTime();
    }

    function updateLanguage(language) {
        debug(`settings language to ${language}`);

        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');

            // this little hack sets language text to first inner span element or to inner text if there is no inner
            // span element to be found
            if (element.getElementsByTagName('span').length > 0) {
                element.getElementsByTagName('span')[0].textContent = lang[key];
            } else {
                element.textContent = lang[key];
            }

            if (element.tagName === "INPUT") {
                element.setAttribute('placeholder', lang[key]);
            }
        });
    }

    async function objectExists(path) {
        debug('in function objectExists');

        try {
            const params = {
                "Bucket": settings.bucket_name,
                "Key": path
            };
            const response = await s3client.headObject(command);

            debug(`object ${path} does exists`);

            return {objectExists: true, path: path};
        } catch (e) {
            if (e.name = '403') {
                debug(`object ${path} does not exists`);

                return {objectExists: false, path: path};
            }
        }

        debug(`otherwise we assume that object ${path} exists so we do not do some other unnecessary action further on`);

        return {objectExists: true, path: path};
    }

    // this creates "folder"
    async function createEmptyObject(path) {
        debug('in function createEmptyObject');
        debug(`creating empty object in bucket ${settings.bucket_name} with key ${path}`);

        if (!path || path === '') {
            throw new Error(`empty path in createEmptyObject`)
        }

        const params = {
            "Bucket": settings.bucket_name,
            "Key": path,
            "Body": ''
        };

        s3client.putObject(params, function (err, data) {
            if (err) {
                debug(err.message);
                return;
            }
        });
    }

    async function createRemotePaths(path) {
        debug(`createRemotePaths ${path}`);

        if (path == null || path === '') {
            return;
        }

        let splittedPath = path.split('/');
        if (splittedPath.length > 0 && splittedPath.at(-1) === '') {
            splittedPath = splittedPath.slice(0, -1);
        }

        while (splittedPath.length > 0) {
            path = slash(path);

            debug(`splittedPath`);
            debug(splittedPath);
            debug(path);

            objectExists(path).then(async (x) => {
                if (!x['objectExists']) {
                    await createEmptyObject(x['path']);
                }
            });

            splittedPath = splittedPath.slice(0, -1);
            path = splittedPath.join("/");
        }
    }

    async function updateVersions(path, now = null) {
        debug(`in updateVersions with path ${path}`)

        if (path == null | path == '') {
            return;
        }

        if (now == null) {
            now = currentTimestamp();
        }
        let splittedPath = path.split("/");
        let skipFirst = true;

        if (splittedPath.length > 0 && splittedPath.at(-1) === '') {
            splittedPath = splittedPath.slice(0, -1);
        }

        while (splittedPath.length > 0) {
            if (!skipFirst && !path.endsWith("/")) {
                path = path + "/";
            } else {
                skipFirst = false;
            }

            debug(`splitted_path: ${splittedPath}`);

            objectExists(path).then(async (x) => {
                if (x['objectExists']) {
                    await setObjectVersion(x['path'], now);
                }
            });

            splittedPath = splittedPath.slice(0, -1);
            path = splittedPath.join("/");
        }

        await setBucketVersion(now)
    }

    function upload(file, folder_upload = false) {
        return new Promise((resolve, reject) => {
            if (settings.debug) {
                console.log(`started uploading ${file.name} ...`);
                console.log(file);
                console.log(file.webkitRelativePath);
            }

            let key = "";
            // we could just check if there is webkitRelativePath set instead of passing folder_upload through functions,
            // but we want to be sure
            if (folder_upload) {
                key = selectedFolder + file.webkitRelativePath;
            } else {
                key = selectedFolder + file.name;
            }

            if (key == "") {
                return;
            }

            $("#progress-bar").css("width", "0%");
            $("#progress-bar-modal").show();

            let params = {
                Bucket: settings.bucket_name,
                Key: key,
                Body: file,
            };

            $("#progress-bar").css("width", "0%");
            $("#progress-bar-modal").show();

            // s3.putObject(params, function (err, data) {
            var options = {partSize: 100 * 1024 * 1024, queueSize: 1};
            s3client.upload(params, options, function (err, data) {
                if (err) {
                    console.log(err, err.stack);
                    return;
                }

                resolve();
            }).on('httpUploadProgress', ({loaded, total}) => {
                let percent = `${Math.round(100 * loaded / total)}%`;
                $("#progress-bar").css("width", percent);
                $("#percent").text(percent);
                // console.log('Progress:', loaded, '/', total, percent);
            });
        })
    }

    function syncedUpload(files, total_length, folder_upload) {
        debug(`syncedUpload ${folder_upload}`);

        const nextFile = files.shift();

        if (total_length > 1) {
            let tmp = total_length - files.length;
            let nr_files = tmp + "/" + total_length;
            $("#nr-files").text(nr_files);
        } else {
            $("#nr-files").text("");
        }

        // we do recursion soo we can break upload, when implemented in the future
        if (nextFile) {
            return upload(nextFile, folder_upload).then(_ => syncedUpload(files, total_length, folder_upload))
        } else {
            return Promise.resolve();
        }
    }

    function handleUpload(input, folder_upload = false) {
        if (!input) {
            alert("Um, couldn't find the fileinput element.");
        } else if (!input.files) {
            alert("This browser doesn't seem to support the `files` property of file inputs.");
        } else if (!input.files[0]) {
            alert("Please select a file before clicking 'Load'");
        } else {
            let files = [];

            for (let i = 0; i < input.files.length; i++) {
                debug(`in handleUpload input ${input.files[i].webkitRelativePath} folder_upload ${folder_upload}`)
                files.push(input.files[i]);
            }

            if (files.length > 0) {
                createRemotePaths(parent(files[0].webkitRelativePath));
            }

            syncedUpload(files, files.length, folder_upload)
                .then(_ => {
                    $("#progress-bar-modal").hide();
                    listObjects(selectedFolder);
                    debug("upload complete");
                });
        }
    }

    $("#file").on("change", function () {
        if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
            alert('The File APIs are not fully supported in this browser.');
            return;
        }

        let input = document.getElementById('file');
        handleUpload(input);
    });

    $("#folder").on("change", function () {
        if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
            alert('The File APIs are not fully supported in this browser.');
            return;
        }

        let input = document.getElementById('folder');
        handleUpload(input, true);
    });

    $("#file-upload").on("click", function () {
        $("#file").click();
    });

    $("#folder-upload").on("click", function () {
        $("#folder").click();
    });

    function isFolder(key) {
        if (key && key[key.length - 1] == "/") {
            return true;
        }

        return false;
    }

    function objectDepth(key) {
        return (key.split("/").length - 1);
    }

    function hasChildren(key, allObjects) {
        let ret = false;

        for (let i = 0; i < allObjects.length; i++) {
            let k = allObjects[i]['Key'];
            if (!k.includes(key)) {
                continue;
            }

            let suffix = k.replace(key, "");

            if (suffix.length > 0) {
                ret = true;
                break;
            }
        }

        return ret;
    }

    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    function monthToNumber(month) {
        if (month == "Jan") {
            return "01";
        }
        if (month == "Feb") {
            return "02";
        }
        if (month == "Mar") {
            return "03";
        }
        if (month == "Apr") {
            return "04";
        }
        if (month == "May") {
            return "05";
        }
        if (month == "Jun") {
            return "06";
        }
        if (month == "Jul") {
            return "07";
        }
        if (month == "Aug") {
            return "08";
        }
        if (month == "Sep") {
            return "09";
        }
        if (month == "Oct") {
            return "10";
        }
        if (month == "Nov") {
            return "11";
        }
        if (month == "Dec") {
            return "12";
        }

        return "";
    }

    function parseS3Date(d) {
        let tmp = d.split(" ");
        return tmp[2] + "." + monthToNumber(tmp[1]) + "." + tmp[3] + " " + tmp[4];
    }

    async function getAllObjects(params) {
        let isTruncated = true;
        let marker;
        let allObjects = [];

        while (isTruncated) {
            if (marker) params.Marker = marker;
            const response = await s3client.listObjects(params).promise();
            response.Contents.forEach(item => {
                allObjects.push(item);
            });
            isTruncated = response.IsTruncated;
            if (isTruncated) {
                marker = response.Contents.slice(-1)[0].Key;
            }
        }

        return allObjects;
    }

    function getSharedObjects() {
        return new Promise(function (resolve, reject) {
            $.ajax({
                url: settings.urls["get_user_shares"],
                method: "GET",
                data: {'access_key': sessionStorage.getItem('storage-access-key')},
                dataType: "json",
                contentType: 'application/json; charset=utf-8',
                success: function (data) {
                    resolve(data);
                }, error: function (err) {
                    reject(err);
                }
            });
        });
    }

    function listObjects(prefix = null) {
        debug('in listObjects begin');

        if (!s3client) {
            return;
        }

        debug('in listObjects begin after');

        updateNavigation();

        let params = {
            Bucket: settings.bucket_name,
            Prefix: prefix
        };

        $("#loader-modal").show();

        getAllObjects(params).then(async (allObjects) => {
            $("#loader-modal").hide();

            let html = '';
            let folders = [];
            let sharedObjects = [];

            try {
                // we send current objects so we do not traverse through all
                if (settings.plugins.includes("sharing")) {
                    sharedObjects = await getSharedObjects();
                }
            } catch (e) {
                debug(`error getting shared objects`);
                debug(e);
            }

            try {
                for (let i = 0; i < allObjects.length; i++) {
                    let key = allObjects[i]['Key'];
                    let size = allObjects[i]['Size'];
                    let last_modified = allObjects[i]['LastModified'];
                    let etag = allObjects[i]['ETag'].replaceAll('"', "");
                    // Sun Jan 09 2022 15:17:53 GMT+0100 (Central European Standard Time)
                    // let lastModified = Date.parse('ddd MMM DD YYYY HH:mm:ss ZZ');
                    last_modified = parseS3Date(last_modified.toString());

                    if (key == prefix) {
                        continue;
                    }

                    let tmp_key = key.replace(prefix, "");

                    if (isFolder(key)) {
                        if (objectDepth(tmp_key) == 1) {
                            let hc = hasChildren(key, allObjects);
                            let del_html = hc == false ? htmlFromTemplate("#action-buttons-template", [{
                                'search': '{{key}}',
                                'replace': key
                            }]) : "&nbsp;";
                            let folder_name = tmp_key.slice(0, tmp_key.length - 1);
                            let folder_html = htmlFromTemplate("#list-folder-template", [
                                {'search': '{{key}}', 'replace': key},
                                {'search': '{{folder_name}}', 'replace': folder_name},
                                {'search': '{{last_modified}}', 'replace': last_modified},
                                {'search': '{{del_html}}', 'replace': del_html}
                            ]);
                            let folder = {
                                key: key,
                                folder_name: folder_name,
                                last_modified: last_modified,
                                html: folder_html
                            }
                            folders.push(folder);
                        }
                    } else {
                        let is_shared = '';
                        let download_key = '';
                        let type = '';
                        let acl = '';

                        if (key in sharedObjects) {
                            is_shared = 'shared';
                            download_key = sharedObjects[key]['download_key'];
                            type = sharedObjects[key]['type'];
                            acl = sharedObjects[key]['acl'];
                        }

                        if (objectDepth(tmp_key) == 0) {
                            let object_name = key.replace(prefix, "");
                            let edit_object = '';
                            let share_object = '';
                            let fileType = fileExtension(key);
                            let documentType = getDocumentType(fileType);
                            let is_editable = '';

                            if (settings.plugins.includes("onlyoffice") && documentType != null) {
                                edit_object = htmlFromTemplate("#edit-object-template", [
                                    {'search': '{{key}}', 'replace': key},
                                    {'search': '{{object_name}}', 'replace': object_name},
                                    {'search': '{{etag}}', 'replace': etag}
                                ]);
                                is_editable = 'is_editable';
                            } else {
                                edit_object = htmlFromTemplate("#empty-edit-object-template", []);
                            }

                            if (settings.plugins.includes("sharing")) {
                                share_object = htmlFromTemplate("#share-object-template", [
                                    {'search': '{{key}}', 'replace': key},
                                    {'search': '{{is_shared}}', 'replace': is_shared},
                                    {'search': '{{download_key}}', 'replace': download_key},
                                    {'search': '{{acl}}', 'replace': acl},
                                    {'search': '{{type}}', 'replace': type}
                                ]);
                            }

                            html = html + htmlFromTemplate("#list-object-template", [
                                {'search': '{{key}}', 'replace': key},
                                {'search': '{{object_name}}', 'replace': object_name},
                                {'search': '{{size}}', 'replace': formatBytes(size)},
                                {'search': '{{last_modified}}', 'replace': last_modified},
                                {'search': '{{edit_object}}', 'replace': edit_object},
                                {'search': '{{share_object}}', 'replace': share_object},
                                {'search': '{{is_shared}}', 'replace': is_shared},
                                {'search': '{{is_editable}}', 'replace': is_editable},
                                {'search': '{{download_key}}', 'replace': download_key},
                                {'search': '{{acl}}', 'replace': acl},
                                {'search': '{{type}}', 'replace': type}
                            ]);
                        } else {
                            let splitted = tmp_key.split("/");
                            let folder_name = splitted[0];
                            let folder_html = htmlFromTemplate("#list-folder-template", [
                                {'search': '{{key}}', 'replace': (prefix ? prefix : "") + folder_name + "/"},
                                {'search': '{{folder_name}}', 'replace': "&nbsp;" + folder_name},
                                {'search': '{{last_modified}}', 'replace': last_modified},
                                {'search': '{{del_html}}', 'replace': '&nbsp;'}
                            ]);
                            let folder = {
                                key: key,
                                folder_name: folder_name,
                                last_modified: last_modified,
                                html: folder_html
                            }

                            let already_inside = false;
                            for (let j = 0; j < folders.length; j++) {
                                if (folders[j].folder_name == folder.folder_name) {
                                    already_inside = true;
                                    break;
                                }
                            }

                            if (!already_inside) {
                                folders.push(folder);
                            }
                        }
                    }
                }

                let folders_html = '';
                for (let i = 0; i < folders.length; i++) {
                    folders_html += folders[i].html;
                }

                $(".data").html(folders_html + html);
            } catch (e) {
                console.log(e);
            }
        });
    }

    function updateNavigation() {
        let html = '<span class="item" data-key="">' + lang["my-storage"] + '</span>';
        let folders = (selectedFolder === undefined) ? [] : selectedFolder.split("/");
        let svg = htmlFromTemplate("#right-arrow-template");
        let current_folder = '';

        for (let i = 0; i < folders.length - 1; i++) {
            current_folder += folders[i] + "/";
            html = html + svg + htmlFromTemplate("#navigation-item-template", [
                {'search': '{{current_folder}}', 'replace': current_folder},
                {'search': '{{folder_object}}', 'replace': folders[i]}
            ]);
        }

        $(".navigation").html(html);
    }

    function changeUrl(url) {
        if (!url || url === "") {
            window.history.pushState(settings.app_endpoint, settings.app_endpoint);
            return;
        }

        let encoded_param = encodeURIComponent(url);
        let url_for_history = settings.app_endpoint + "?f=" + encoded_param
        window.history.pushState(url_for_history, "", url_for_history);
    }


    function loadPage() {
        if (settings.debug) {
            console.log('in load page');
        }
        let folder = getUrlParam("f");
        if (folder && folder != "") {
            folder = decodeURIComponent(folder);
            selectedFolder = folder;
            listObjects(folder);
        } else {
            listObjects();
        }
    }

    function lsTest() {
        let test = 'test';
        try {
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    async function setObjectVersion(key, now = null) {
        debug(`in setObjectVersion`);
        debug(`updating ${settings.stree_version_key} tag of an object ${key}`);

        if (now == null) {
            now = currentTimestamp();
        }

        let params = {
            Bucket: settings.bucket_name,
            Key: key,
            Tagging: {
                TagSet: [
                    {
                        "Key": settings.stree_version_key,
                        "Value": now.toString()
                    }
                ]
            }
        };

        s3client.PutObjectTagging(params, function(err, data) {
           if (err) debug(`${err} ${err.stack}`);
        });

        debug('got object tag response');
    }

    async function setBucketVersion(key, now = null) {
        debug(`updating ${settings.stree_version_key} tag of a bucket ${settings.bucket_name}`);

        if (now == null) {
            now = currentTimestamp();
        }

        let params = {
            Bucket: settings.bucket_name,
            Tagging: {
                TagSet: [
                    {
                        "Key": settings.stree_version_key,
                        "Value": now.toString()
                    }
                ]
            }
        };

        debug(params);

        s3client.PutBucketTagging(params, function(err, data) {
           if (err) debug(`${err} ${err.stack}`);
        });

        debug('got bucket tag response');
    }

    $("body").on("click", '.download-object', async function () {
        let key = $(this).attr("data-key");
        let params = {
            Bucket: settings.bucket_name,
            Key: key
        };

        $("#progress-bar").css("width", "0%");
        $("#percent").text("");

        $("#progress-bar-modal").show();
        s3client.getObject(params, function (err, data) {
            if (err) {
                debug(err);
                debug(err.stack);
            }

            $("#progress-bar-modal").hide();
            let blob = new Blob([data.Body], {type: data.ContentType});
            let link = document.createElement('a');
            let filename = key.replace(selectedFolder, "");
            link.href = window.URL.createObjectURL(blob);
            link.download = filename;
            link.click();

            // TODO: revokeObjectURL
            window.URL.revokeObjectURL(link);
        }).on('httpDownloadProgress', ({loaded, total}) => {
            let percent = `${Math.round(100 * loaded / total)}%`;
            $("#progress-bar").css("width", percent);
            $("#percent").text(percent);

            // console.log('Progress:', loaded, '/', total, percent);
        });
    });

    $("#new-folder").on("click", function () {
        let input = prompt("Ime nove mape", "")

        if (input && input.length > 0) {
            let last_char = input[input.length - 1];
            if (last_char != "/") {
                input = input + "/";
            }

            input = selectedFolder + input;

            let params = {
                Body: "",
                Bucket: settings.bucket_name,
                Key: input
            };

            $("#progress-bar").css("width", "0%");
            $("#progress-bar-modal").show();
            s3client.putObject(params, function (err, data) {
                if (err) {
                    console.log(err, err.stack);
                    return;
                }

                $("#progress-bar-modal").hide();
                listObjects(selectedFolder);
            }).on('httpUploadProgress', ({loaded, total}) => {
                let percent = `${Math.round(100 * loaded / total)}%`;
                $("#progress-bar").css("width", percent);
                $("#percent").text(percent);
            });
        }
    });

    $("body").on("dblclick", '.folder', function () {
        let key = $(this).attr("data-key");
        selectedFolder = key;

        listObjects(key);
        changeUrl(key);
    });

    $("body").on("click", '.navigation .item', function () {
        let key = $(this).attr("data-key");
        selectedFolder = key;

        listObjects(key);
        changeUrl(key);
    });

    async function loginSuccess(access_key, secret_key) {
        sessionStorage.setItem('storage-access-key', access_key);
        sessionStorage.setItem('storage-secret-key', secret_key);

        if (settings.plugins.includes("onlyoffice")) {
            getEC();
        }

        $("#login-modal").hide();
        $("#login-modal-content .login-errors").hide();
        $("#main").show();
        loadPage();
    }

    $("#login-submit").on("click", async function () {
        let access_key = $("#access-key").val();
        let secret_key = $("#secret-access-key").val();

        s3client = new AWS.S3({
            accessKeyId: access_key,
            secretAccessKey: secret_key,
            endpoint: settings.s3_endpoint,
            s3ForcePathStyle: true, // needed with minio?
            signatureVersion: 'v4'
        });

        s3client.listBuckets(function (err, data) {
            if (err) {
                debug("login failed");
                debug(err);

                $("#login-modal-content .login-errors").show();

                return;
            }

            let bucket_exists = false;
            for (let i = 0; i < data.Buckets.length; i++) {
                let name = data.Buckets[i]['Name'];
                // let creation_date = data.Buckets[i]['CreationDate'];

                if (name === settings.bucket_name) {
                    bucket_exists = true;
                    break;
                }
            }

            if (!bucket_exists) {
                let params = {
                    Bucket: settings.bucket_name,
                    CreateBucketConfiguration: {
                        LocationConstraint: "default"
                    }
                };
                s3client.createBucket(params, function (err, data) {
                    if (err) debug(err);
                    else debug(data);
                });
            }

            loginSuccess(access_key, secret_key);
        });
    });

    $("#logout").on("click", function () {
        s3client = null;
        sessionStorage.setItem('storage-access-key', '');
        sessionStorage.setItem('storage-secret-key', '');
        sessionStorage.setItem('storage-ec', '');

        $("#main").hide();
        $("#login-modal").show();

        login();
    });

    async function setObjectPolicy(key, acl) {
        debug('start setObjectPolicy');
        let params = {
            Bucket: settings.bucket_name
        }

        let statements = {
            'Statement': []
        };
        try {
            const getBucketPolicyResponse = await s3client.getBucketPolicy(params).promise();
            statements = JSON.parse(getBucketPolicyResponse['Policy']);

            debug("---- old statements ----");
            debug(JSON.stringify(statements));
        } catch (e) {
            debug(e);

            if (e['code'] != 'NoSuchBucketPolicy') {
                throw new Error(e);
            }
        }

        let new_statements = set_policy(statements['Statement'], acl, settings.bucket_name, key);

        debug("---- new statements ----");
        debug(JSON.stringify(new_statements));

        let policy = {
            "Version": "2012-10-17",
            "Statement": new_statements
        };

        params = {
            Bucket: settings.bucket_name,
            Policy: JSON.stringify(policy)
        };

        const putBucketPolicyResponse = await s3client.putBucketPolicy(params, function (err, data) {
            if (err) {
                debug(`could not execute putBucketPolicy action for bucket ${settings.bucket_name}`);
                debug(err);
                debug(err.stack);
            } else {
                debug(`successfully set bucket policy for key ${key}`);
            }
        });

        debug('putBucketPolicyResponse');
        debug(putBucketPolicyResponse);

        debug('end setObjectPolicy');

        return putBucketPolicyResponse;
    }

    async function shareObject(key) {
        debug("clicked share object");

        let access_key = sessionStorage.getItem('storage-access-key');
        let secret_key = sessionStorage.getItem('storage-secret-key');

        if (!(access_key || secret_key)) {
            console.log("no access key, no secret key")

            return;
        }

        $("#loader-modal").show();

        const setObjectPolicyReturn = await setObjectPolicy(key, 'readonly');

        let params = {
            access_key: access_key,
            secret_key: secret_key,
            bucket: settings.bucket_name,
            key: key
        };

        $.ajax({
            url: settings.urls["share"],
            method: "POST",
            data: params,
            dataType: "json"
        }).done(function (data) {
            debug(data);
            $("#loader-modal").hide();
            $("#share-modal").show();
            $("#shared-link").val(settings.urls.download_shared_object + data.download_key);

            debug(key);
            debug(data.download_key);

            $("button[data-key='" + key + "']").addClass("shared");
            $("button[data-key='" + key + "']").attr("data-download-key", data.download_key);
        });
    }

    function shareDocumentObject(key, acl, share) {
        if (settings.debug) {
            console.log("clicked share document object");
        }

        let access_key = sessionStorage.getItem('storage-access-key');
        let secret_key = sessionStorage.getItem('storage-secret-key');

        if (!(access_key || secret_key)) {
            console.log("no access key, no secret key")

            return;
        }

        $("#loader-modal").show();

        let params = {
            access_key: access_key,
            secret_key: secret_key,
            key: key,
            acl: acl,
            share: share
        };

        $.ajax({
            url: settings.urls["share_document"],
            method: "POST",
            data: params,
            dataType: "json"
        }).done(function (data) {
            $("#loader-modal").hide();
            if (share) {
                $("#read-write-shared-link").val(settings.urls.download_shared_object + data.download_key);
                $("#read-write-shared-link").show();
                // $("button.share-object").find(`[data-key='${key}']`).attr("data-download-key", data.download_key).addClass("shared");
                $("button[data-key='" + key + "']").addClass("shared");
                $("button[data-key='" + key + "']").attr("data-download-key", data.download_key);
                $("button[data-key='" + key + "']").attr("data-acl", acl);
            } else {
                $("#read-write-shared-link").val("");
                $("#read-write-shared-link").hide();

                $("button[data-key='" + key + "']").removeClass("shared");
                $("button[data-key='" + key + "']").attr("data-acl", acl);
                $("button[data-key='" + key + "']").attr("data-download-key", "");
                $("#close-read-write-share-modal").click();
            }

            if (settings.debug) {
                console.log(data);

                console.log(key);
                console.log(data.download_key);
            }
        });
    }

    $("#unshare").on("click", async function () {
        if (settings.debug) {
            console.log("clicked unshare object");
        }

        let access_key = sessionStorage.getItem('storage-access-key');
        let secret_key = sessionStorage.getItem('storage-secret-key');
        let key = $(this).attr("data-key");

        if (!(access_key || secret_key)) {
            console.log("no access key, no secret key")

            return;
        }

        $("#loader-modal").show();

        const setObjectPolicyReturn = await setObjectPolicy(key, 'none');

        let params = {
            access_key: access_key,
            secret_key: secret_key,
            key: key
        };

        $.ajax({
            url: settings.urls["unshare"],
            method: "POST",
            data: params,
            success: function (data) {
                console.log(data);
                console.log("finishing unshare");

                $("#loader-modal").hide();
                $("#close-share-modal").click();
                $("button[data-key='" + key + "']").removeClass("shared");
                $("button[data-key='" + key + "']").attr("data-download-key", "");
            }, error: function (err) {
                console.log(err);
            }
        });
    })

    function showJustReadModal(already_shared, key, download_key) {
        if (already_shared) {
            $("#share-modal").show();
            $("#shared-link").val(settings.urls.download_shared_object + download_key);
            $("#unshare").attr("data-key", key);
        } else {
            let share = confirm(translate(lang['confirm-share-file'], key));
            if (share) {
                shareObject(key);
            }
        }
    }

    $("body").on("click", '.share-object', function () {
        let already_shared = $(this).hasClass("shared");
        let is_editable = $(this).hasClass("is_editable");
        let key = $(this).attr("data-key");
        let download_key = $(this).attr("data-download-key");
        let type = $(this).attr("data-type");
        let acl = $(this).attr("data-acl");

        if (is_editable) {
            $("#share-read").prop("checked", false);
            $("#share-read").prop("disabled", false);
            $("#share-read-write").prop("checked", false);

            if (already_shared) {
                if (acl == "readwrite") {
                    $("#share-read").prop("checked", true);
                    $("#share-read").prop("disabled", true);
                    $("#share-read-write").prop("checked", true);
                } else if (acl == "readonly") {
                    $("#share-read").prop("checked", true);
                }

                $("#read-write-shared-link").val(settings.urls.download_shared_object + download_key);
                $("#read-write-shared-link").show();
            }

            shownKey = key;
            $("#shown-key").text(key);
            $("#read-write-share-modal").show();
        } else {
            showJustReadModal(already_shared, key, download_key);
        }
    });

    $("body").on("click", '.delete-object', async function () {
        let key = $(this).attr("data-key");

        let del = confirm("Ali res želiš izbrisati datoteko " + key + "?");
        if (del) {
            let params = {
                Bucket: settings.bucket_name,
                Key: key
            };

            s3client.deleteObject(params, function (err, data) {
                if (err) {
                    debug(err);
                    debug(err.stack);

                    return;
                }

                debug(`deleted object ${key}`);

                let access_key = sessionStorage.getItem('storage-access-key');
                let secret_key = sessionStorage.getItem('storage-secret-key');

                if (!(access_key || secret_key)) {
                    console.log("no access key, no secret key")

                    return;
                }

                let params = {
                    access_key: access_key,
                    secret_key: secret_key,
                    key: key,
                    just_delete: true
                };

                if (settings.plugins.includes("sharing")) {
                    $.ajax({
                        url: settings.urls["unshare"],
                        method: "POST",
                        data: params,
                        success: function (data) {
                            listObjects(selectedFolder);
                        }, error: function (err) {
                            console.log(err);
                        }
                    });
                }

                listObjects(selectedFolder);

                if (settings.plugins.include('update_versions')) {
                    updateVersions(parent(key));
                }
            });
        }
    });

    $("body").on("click", '.edit-object', function () {
        let key = $(this).attr("data-key");
        let title = $(this).attr("data-title");
        let etag = $(this).attr("data-etag");

        window.open(settings.app_endpoint + "uredi-dokument?private=true&key=" + key + "&title=" + title + '&etag=' + etag + '&e=t', '_self').focus();
    });

    $("#close-share-modal").on("click", function () {
        $("#share-modal").hide();
        $("#shared-link").val("");
    });

    $("#close-read-write-share-modal").on("click", function () {
        $("#read-write-share-modal").hide();
    });

    $("#save-read-write-share").on("click", function () {
        if ($("#share-read-write").is(":checked")) {
            shareDocumentObject(shownKey, "readwrite", true);
        } else if ($("#share-read").is(":checked")) {
            shareDocumentObject(shownKey, "readonly", true);
        } else {
            shareDocumentObject(shownKey, "none", false);
        }
    });

    $("#share-read").on("click", function () {
        if ($(this).is(":checked")) {
            if ($("#read-write-shared-link").val() != "") {
                $("#read-write-shared-link").show();
            }
        } else {
            $("#read-write-shared-link").hide();
        }
    });

    $("#share-read-write").on("click", function () {
        if ($(this).is(":checked")) {
            $("#share-read").prop("checked", true);
            $("#share-read").prop("disabled", true);
            if ($("#read-write-shared-link").val() != "") {
                $("#read-write-shared-link").show();
            }
        } else {
            $("#share-read").prop("checked", false);
            $("#share-read").prop("disabled", false);
            $("#read-write-shared-link").hide();
        }
    });

    $("#add").on("click", function () {
        if ($("#action-buttons").is(":visible")) {
            $("#action-buttons").hide();
            $("#add").removeClass("active");
        } else {
            $("#action-buttons").show();
            $("#add").addClass("active");
        }
    });

    //Use this inside your document ready jQuery
    $(window).on('popstate', function () {
        debug('in popstate');

        let folder = getUrlParam("f");
        folder = (folder && folder != "") ? decodeURIComponent(folder) : "";
        selectedFolder = folder;

        loadPage();
    });

    lang = await fetchLanguage(settings.language);
    updateLanguage(settings.language);

    if (!lsTest()) {
        console.log("Local storage not supported. You are probably using old browser and application will not work.");
    } else {
        s3client = login();
        if (!s3client) {
            $("#login-modal").show();
        } else {
            $("#login-modal").hide();
            $("#main").show();

            loadPage();
        }
    }
}());
//]]>
