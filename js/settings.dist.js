import * as settings from "./settings";

export let s3_endpoint = "https://s3_endpoint";
export let bucket_name = "storage";
export let app_endpoint = "https://app_endpoint/";

export let debug = true;
export let stree_version_key = "stree_version";
export let urls = {
        get_user_shares: "/get-user-shares/",
        share: "/share/",
        unshare: "/unshare/",
        download_shared_object: `${settings.app_endpoint}download/?k=`,
        get_credentials: "/get-ec/",
        share_document: "/share-document/"
};

export let language = "en";

/*
  e.g: export let plugins = ['sharing', 'update_versions', 'onlyoffice'];
 */
export let plugins = [];
