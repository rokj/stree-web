export let s3_endpoint = "https://s3_endpoint";
export let app_endpoint = "https://app_endpoint/";
export let bucket_name = "storage";

export let debug = true;
export let stree_version_key = "stree_version";
export let urls = {
        get_user_shares: `${app_endpoint}get-user-shares/`,
        share: `${app_endpoint}share/`,
        unshare: `${app_endpoint}unshare/`,
        download_shared_object: `${app_endpoint}download/?k=`,
        get_credentials: `${app_endpoint}get-ec/`,
        share_document: `${app_endpoint}share-document/`
};

export let language = "en";

/*
  e.g: export let plugins = ['sharing', 'update_versions', 'onlyoffice'];
 */
export let plugins = [];
