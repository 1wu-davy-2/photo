export type Locale = "zh-CN" | "en-US";
export type Translator = (key: string) => string;

const STORAGE_KEY = "lumen.archive.locale";

const dictionaries: Record<Locale, Record<string, string>> = {
  "zh-CN": {
    "brand.subtitle": "私密图库", "nav.home": "首页", "nav.users": "用户管理", "nav.manage": "目录管理", "nav.logout": "退出登录", "nav.upload": "上传照片", "nav.language": "语言",
    "gallery.eyebrow": "最近添加", "gallery.title": "你的照片，随时可见。", "gallery.description": "只展示你上传的照片，最近 24 张优先。", "gallery.collection": "我的图库", "gallery.count": "张照片", "gallery.loading": "正在打开图库…", "gallery.emptyTitle": "你的图库还没有照片", "gallery.emptyDescription": "上传第一张照片，开始建立你的私人影像空间。", "gallery.emptySearch": "没有匹配的照片", "gallery.emptySearchDescription": "换一个文件名，或清空搜索条件。", "gallery.uploadFirst": "上传第一张照片", "gallery.search": "搜索照片", "gallery.searchPlaceholder": "搜索你的图库", "gallery.sort": "排序照片", "gallery.newest": "最新优先", "gallery.oldest": "最早优先", "gallery.open": "打开", "gallery.deleteSuccess": "照片已从图库删除。", "gallery.uploadSuccess": "照片已加入你的图库。", "gallery.uploadHint": "拖入图片，或点击选择文件", "gallery.uploadSupport": "支持 JPG、PNG、WEBP、GIF、AVIF，单张最大 25 MB", "gallery.uploadProgress": "正在上传",
    "auth.privateAccess": "私密访问", "auth.title": "进入你的图库。", "auth.description": "你的照片正在等待一次安全登录。", "auth.username": "用户名", "auth.password": "密码", "auth.submit": "进入图库", "auth.checking": "正在验证", "auth.expiry": "令牌有效期 60 分钟",
    "users.eyebrow": "访问控制", "users.title": "用户管理", "users.description": "创建账号、调整角色和启用状态。密码只在创建或重置时提交。", "users.create": "创建用户", "users.username": "用户名", "users.password": "初始密码", "users.role": "角色", "users.admin": "管理员", "users.user": "普通用户", "users.status": "状态", "users.active": "启用", "users.disabled": "已停用", "users.actions": "操作", "users.disable": "停用", "users.enable": "启用", "users.delete": "删除", "users.noUsers": "还没有其他用户。",
    "manage.eyebrow": "资产控制台", "manage.title": "目录管理", "manage.description": "整理文件夹，移动照片，并修改照片文件名。", "manage.folderCreate": "新建目录", "manage.folderName": "目录名称", "manage.create": "创建", "manage.folders": "文件目录", "manage.assets": "照片文件", "manage.rename": "重命名", "manage.move": "移动到", "manage.delete": "删除", "manage.default": "默认", "manage.noFolders": "还没有目录。", "manage.noAssets": "还没有可管理的照片。", "manage.fileName": "文件名", "manage.owner": "所属用户", "manage.folder": "目录", "manage.date": "添加时间", "manage.confirmDelete": "确定删除吗？", "manage.error": "操作失败，请稍后重试。",
    "common.cancel": "取消", "common.retry": "重试", "common.close": "关闭", "common.previous": "上一张", "common.next": "下一张", "common.download": "下载", "common.openOriginal": "打开原图", "common.delete": "删除", "common.dismiss": "关闭提示",
  },
  "en-US": {
    "brand.subtitle": "private archive", "nav.home": "Home", "nav.users": "Users", "nav.manage": "Folders", "nav.logout": "Sign out", "nav.upload": "Upload", "nav.language": "Language",
    "gallery.eyebrow": "Recently added", "gallery.title": "Your visual archive, in motion.", "gallery.description": "Only your uploads appear here, with the latest 24 frames first.", "gallery.collection": "My gallery", "gallery.count": "photos", "gallery.loading": "Opening your archive…", "gallery.emptyTitle": "Your gallery is ready", "gallery.emptyDescription": "Add the first frame to start your private visual space.", "gallery.emptySearch": "No frames match that search", "gallery.emptySearchDescription": "Try another filename or clear the search.", "gallery.uploadFirst": "Add your first frame", "gallery.search": "Search photos", "gallery.searchPlaceholder": "Search your archive", "gallery.sort": "Sort photos", "gallery.newest": "Newest first", "gallery.oldest": "Oldest first", "gallery.open": "Open", "gallery.deleteSuccess": "Photo removed from the archive.", "gallery.uploadSuccess": "Photo added to your archive.", "gallery.uploadHint": "Drop an image or click to choose a file", "gallery.uploadSupport": "JPG, PNG, WEBP, GIF, AVIF, up to 25 MB each", "gallery.uploadProgress": "Uploading",
    "auth.privateAccess": "private access", "auth.title": "Enter your archive.", "auth.description": "Your originals are waiting behind a secure handshake.", "auth.username": "Username", "auth.password": "Password", "auth.submit": "Enter archive", "auth.checking": "Checking access", "auth.expiry": "Token access · expires after 60 minutes",
    "users.eyebrow": "Access control", "users.title": "User management", "users.description": "Create accounts, adjust roles, and control active status. Passwords are only submitted for creation or reset.", "users.create": "Create user", "users.username": "Username", "users.password": "Initial password", "users.role": "Role", "users.admin": "Administrator", "users.user": "User", "users.status": "Status", "users.active": "Active", "users.disabled": "Disabled", "users.actions": "Actions", "users.disable": "Disable", "users.enable": "Enable", "users.delete": "Delete", "users.noUsers": "No other users yet.",
    "manage.eyebrow": "Asset control", "manage.title": "Folder management", "manage.description": "Organize folders, move photos, and rename image files.", "manage.folderCreate": "New folder", "manage.folderName": "Folder name", "manage.create": "Create", "manage.folders": "Folders", "manage.assets": "Photo files", "manage.rename": "Rename", "manage.move": "Move to", "manage.delete": "Delete", "manage.default": "Default", "manage.noFolders": "No folders yet.", "manage.noAssets": "No photos to manage.", "manage.fileName": "Filename", "manage.owner": "Owner", "manage.folder": "Folder", "manage.date": "Added", "manage.confirmDelete": "Delete this item?", "manage.error": "Action failed. Please try again.",
    "common.cancel": "Cancel", "common.retry": "Retry", "common.close": "Close", "common.previous": "Previous photo", "common.next": "Next photo", "common.download": "Download", "common.openOriginal": "Open original", "common.delete": "Delete", "common.dismiss": "Dismiss",
  },
};

export function loadLocale(): Locale {
  return localStorage.getItem(STORAGE_KEY) === "en-US" ? "en-US" : "zh-CN";
}

export function saveLocale(locale: Locale): void {
  localStorage.setItem(STORAGE_KEY, locale);
}

export function translate(locale: Locale): Translator {
  return (key: string) => dictionaries[locale][key] ?? dictionaries["en-US"][key] ?? key;
}
