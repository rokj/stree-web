export let app_endpoint = "https://app/";
export let s3_endpoint = "https://s3";
export let bucket_name = "storage";
export let debug = true;
export let stree_version_key = "stree_version";
export let urls = {
        get_credentials: "/get-ec/",
        get_user_shares: "/get-user-shares/",
        share: "/share/",
        unshare: "/unshare/",
        share_document: "/share-document/"
};

export let language = "en";

/*
 todo
 e.g: export let plugins = ['sharing', 'onlyoffice'];
 */
export let plugins = [];
