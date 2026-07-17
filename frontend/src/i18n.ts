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
  return (key: string) => {
    if (key === "common.viewOriginal") return locale === "zh-CN" ? "\u67e5\u770b\u539f\u56fe" : "View original";
    if (key === "common.loadingOriginal") return locale === "zh-CN" ? "\u6b63\u5728\u52a0\u8f7d\u539f\u56fe" : "Loading original";
    if (key === "common.originalLoaded") return locale === "zh-CN" ? "\u5df2\u52a0\u8f7d\u539f\u56fe" : "Original loaded";
    if (key === "common.downloadOriginal") return locale === "zh-CN" ? "\u4e0b\u8f7d\u539f\u56fe" : "Download original";
    if (key === "upload.confirmEyebrow") return locale === "zh-CN" ? "\u4e0a\u4f20\u786e\u8ba4" : "Upload confirmation";
    if (key === "upload.confirmTitle") return locale === "zh-CN" ? "\u786e\u8ba4\u4e0a\u4f20\u7167\u7247" : "Confirm photo upload";
    if (key === "upload.confirmDescription") return locale === "zh-CN" ? "\u68c0\u6d4b\u5230\u4ee5\u4e0b\u7167\u7247\uff0c\u786e\u8ba4\u540e\u5f00\u59cb\u4e0a\u4f20\u3002" : "These photos are ready to upload. Start when you are ready.";
    if (key === "upload.photosDetected") return locale === "zh-CN" ? "\u5f20\u7167\u7247\u5f85\u4e0a\u4f20" : "photos detected";
    if (key === "upload.folderSource") return locale === "zh-CN" ? "\u6765\u6e90\u6587\u4ef6\u5939\uff1a" : "Folder source:";
    if (key === "upload.start") return locale === "zh-CN" ? "\u5f00\u59cb\u4e0a\u4f20" : "Start upload";
    if (key === "upload.cancel") return locale === "zh-CN" ? "\u53d6\u6d88" : "Cancel";
    if (key === "upload.preparing") return locale === "zh-CN" ? "\u51c6\u5907\u4e2d" : "Preparing";
    if (key === "upload.uploading") return locale === "zh-CN" ? "\u6b63\u5728\u4e0a\u4f20" : "Uploading";
    if (key === "upload.paused") return locale === "zh-CN" ? "\u4e0a\u4f20\u5df2\u6682\u505c" : "Uploads paused";
    if (key === "upload.complete") return locale === "zh-CN" ? "\u4e0a\u4f20\u5b8c\u6210" : "Upload complete";
    if (key === "upload.completeDescription") return locale === "zh-CN" ? "\u6240\u6709\u7167\u7247\u5df2\u5904\u7406" : "All photos processed";
    if (key === "upload.files") return locale === "zh-CN" ? "\u4e2a\u6587\u4ef6" : "files";
    if (key === "upload.waiting") return locale === "zh-CN" ? "\u7b49\u5f85\u4e0a\u4f20" : "Waiting to upload";
    if (key === "upload.failed") return locale === "zh-CN" ? "\u4e0a\u4f20\u5931\u8d25" : "failed";
    if (key === "upload.pause") return locale === "zh-CN" ? "\u6682\u505c" : "Pause";
    if (key === "upload.resume") return locale === "zh-CN" ? "\u7ee7\u7eed" : "Resume";
    if (key === "upload.pauseAction") return locale === "zh-CN" ? "\u6682\u505c\u4e0a\u4f20" : "Pause uploads";
    if (key === "upload.resumeAction") return locale === "zh-CN" ? "\u7ee7\u7eed\u4e0a\u4f20" : "Resume uploads";
    if (key === "upload.dismiss") return locale === "zh-CN" ? "\u5173\u95ed\u4e0a\u4f20\u8fdb\u5ea6" : "Dismiss upload progress";
    if (key === "upload.retry") return locale === "zh-CN" ? "\u91cd\u8bd5\u5931\u8d25" : "Retry failed";
    if (key === "nav.theme") return locale === "zh-CN" ? "主题" : "Theme";
    if (key === "wall.shareReady") return locale === "zh-CN" ? "\u5206\u4eab\u94fe\u63a5\u5df2\u751f\u6210\uff0c\u8bf7\u590d\u5236\u540e\u5206\u4eab" : "Share link ready; copy it to share";
    if (key === "wall.shareLink") return locale === "zh-CN" ? "\u5206\u4eab\u94fe\u63a5" : "Share link";
    if (key === "wall.background") return locale === "zh-CN" ? "\u7eaf\u8272\u80cc\u666f" : "Solid background";
    if (key === "wall.backgroundColor") return locale === "zh-CN" ? "\u80cc\u666f\u989c\u8272" : "Background color";
    if (key === "wall.width") return locale === "zh-CN" ? "\u5bbd\u5ea6" : "Width";
    if (key === "wall.height") return locale === "zh-CN" ? "\u9ad8\u5ea6" : "Height";
    if (key === "wall.defaultName") return locale === "zh-CN" ? "\u6211\u7684\u7167\u7247\u5899" : "My photo wall";
    if (key === "wall.colorHint") return locale === "zh-CN" ? "\u9009\u62e9\u753b\u5e03\u5e95\u8272" : "Choose a canvas color";
    if (key === "wall.libraryEyebrow") return locale === "zh-CN" ? "\u56fe\u7247\u96c6\u5408" : "Your collection";
    if (key === "wall.libraryTitle") return locale === "zh-CN" ? "\u7167\u7247\u5899" : "Photo walls";
    if (key === "wall.libraryDescription") return locale === "zh-CN" ? "\u9009\u62e9\u4e00\u9762\u7167\u7247\u5899\uff0c\u7ee7\u7eed\u7f16\u6392\u4f60\u7684\u6545\u4e8b\u3002" : "Choose a wall, or start a new visual story.";
    if (key === "wall.emptyTitle") return locale === "zh-CN" ? "\u8fd8\u6ca1\u6709\u7167\u7247\u5899" : "No photo walls yet";
    if (key === "wall.emptyDescription") return locale === "zh-CN" ? "\u521b\u5efa\u4e00\u9762\u7167\u7247\u5899\uff0c\u5f00\u59cb\u5b89\u6392\u4f60\u7684\u7167\u7247\u3002" : "Create a wall and start arranging your photos.";
    if (key === "wall.open") return locale === "zh-CN" ? "\u6253\u5f00\u7167\u7247\u5899" : "Open photo wall";
    if (key === "wall.photos") return locale === "zh-CN" ? "\u5f20\u7167\u7247" : "photos";
    if (key === "wall.updated") return locale === "zh-CN" ? "\u6700\u540e\u66f4\u65b0" : "Updated";
    if (key === "wall.page") return locale === "zh-CN" ? "\u7b2c" : "Page";
    if (key === "wall.previousPage") return locale === "zh-CN" ? "\u4e0a\u4e00\u9875" : "Previous page";
    if (key === "wall.nextPage") return locale === "zh-CN" ? "\u4e0b\u4e00\u9875" : "Next page";
    if (key === "wall.back") return locale === "zh-CN" ? "\u8fd4\u56de\u7167\u7247\u5899" : "Back to photo walls";
    const wallLabels: Record<Locale, Record<string, string>> = {
      "zh-CN": { "nav.walls": "照片墙", "wall.eyebrow": "画布工作台", "wall.title": "照片墙", "wall.description": "把照片放进一面自由画布，保存你的故事并分享给别人。", "wall.newWall": "新建照片墙", "wall.rename": "重命名", "wall.save": "保存布局", "wall.saving": "保存中", "wall.saved": "照片墙布局已保存", "wall.share": "分享", "wall.shareCopied": "分享链接已复制", "wall.copyLink": "复制链接", "wall.selectWall": "我的照片墙", "wall.assets": "素材库", "wall.add": "点击或拖入画布", "wall.emptyAssets": "没有可添加的照片", "wall.selected": "当前照片", "wall.size": "尺寸", "wall.rotation": "旋转", "wall.remove": "移出照片墙", "wall.selectHint": "选择一张照片", "wall.selectHintDescription": "从左侧素材库拖入照片，或点击照片添加到画布。", "wall.loading": "正在打开照片墙", "wall.wallName": "照片墙名称" },
      "en-US": { "nav.walls": "Photo walls", "wall.eyebrow": "Canvas workspace", "wall.title": "Photo walls", "wall.description": "Arrange photos on a freeform canvas, save the story, and share it with others.", "wall.newWall": "New wall", "wall.rename": "Rename", "wall.save": "Save layout", "wall.saving": "Saving", "wall.saved": "Photo wall layout saved", "wall.share": "Share", "wall.shareCopied": "Share link copied", "wall.copyLink": "Copy link", "wall.selectWall": "My photo walls", "wall.assets": "Photo assets", "wall.add": "Click or drag to canvas", "wall.emptyAssets": "No photos available", "wall.selected": "Selected photo", "wall.size": "Size", "wall.rotation": "Rotation", "wall.remove": "Remove from wall", "wall.selectHint": "Select a photo", "wall.selectHintDescription": "Drag a photo from the asset shelf or click one to add it.", "wall.loading": "Opening photo wall", "wall.wallName": "Photo wall name" },
    };
    if (wallLabels[locale][key]) return wallLabels[locale][key];
    return dictionaries[locale][key] ?? dictionaries["en-US"][key] ?? key;
  };
}
