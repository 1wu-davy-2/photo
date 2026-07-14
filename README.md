# Lumen Archive

一个自托管的照片上传、预览与管理服务：React 前端、Python 3.12 + FastAPI 后端、MariaDB 元数据、MinIO 原图存储。

## 功能

- 拖拽或选择图片上传，显示上传进度
- JPG、PNG、WEBP、GIF、AVIF 校验
- 搜索文件名、按新旧排序
- 网格预览、全屏灯箱、键盘左右切换
- 下载原图、删除照片
- MinIO 凭据只存在后端，浏览器不直接访问对象存储
- Docker Compose 部署，连接已有 MariaDB/MinIO，也支持本地 MariaDB profile
- Bearer Token 登录，默认有效期 60 分钟，过期自动回到登录页

## 快速部署

1. 将项目复制到云服务器并进入目录。
2. 复制环境变量模板：

```bash
cp .env.example .env
```

3. 修改 `.env` 中的数据库、MinIO 地址和凭据。当前部署目标为 MariaDB `101.43.75.72:3306/photo`、MinIO `18.220.22.229:9000/yanshi`。密码只放 `.env`，不要提交到代码仓库。
4. 启动：

```bash
docker compose up -d --build
```

5. 打开 `http://你的服务器IP:6222`。后端健康检查地址为 `http://你的服务器IP:6555/api/health`。

首次启动时，后端会自动创建 `MINIO_BUCKET` 指定的 bucket、`users` 用户表和 `photos` 数据表。也可以先手动执行 [`backend/sql/001_initial_schema.sql`](<E:/opt/vide coding/backend/sql/001_initial_schema.sql>)；已有旧版本数据库执行 [`backend/sql/002_users_table.sql`](<E:/opt/vide coding/backend/sql/002_users_table.sql>)。MinIO 服务必须提前可用，MariaDB 用户必须有创建表的权限。

登录账号来自 MariaDB `users` 表，不再直接依赖配置密码。首次启动会幂等创建默认 `admin` 用户，密码使用 `.env` 中的 PBKDF2 哈希作为初始化值；当前密码为你提供的 `admin@123`。之后登录校验、用户禁用和权限校验都读取数据库记录。Token 默认 60 分钟有效，修改 `AUTH_TOKEN_TTL_MINUTES` 可调整。

## 使用 Compose 自带 MariaDB

已有数据库时不要启动 `mariadb` profile。需要本地数据库时：

```bash
docker compose --profile local-db up -d --build
```

同时在 `.env` 中将 `DATABASE_URL` 改为：

```env
DATABASE_URL=mysql+pymysql://photo_user:change-me@mariadb:3306/photo_gallery?charset=utf8mb4
```

## 本地开发

后端：

```bash
python -m pip install -r backend/requirements.txt
python -m uvicorn app.main:app --app-dir backend --reload --port 8000
```

前端另开终端：

```bash
cd frontend
npm install
npm run dev
```

前端 Vite 默认监听 `6222`，并将 `/api` 转发到 `http://127.0.0.1:6555`。

## 验证

```bash
python -m pytest backend/tests -q
npm --prefix frontend test
npm --prefix frontend run build
```

当前开发机没有 Docker CLI，因此 Compose 的实际构建和启动需要在已安装 Docker Engine/Compose 的云服务器执行。

## 安全边界

照片 API、预览和下载都需要 Bearer Token；浏览器不会直接携带 MinIO 密钥。`CORS_ORIGINS=0.0.0.0` 被解释为允许跨域来源，但 Token 不使用 Cookie，因此不会开启跨域凭据。

当前 MinIO bucket `yanshi` 是 public。这样即使 API 需要登录，知道对象地址的人仍可能绕过应用访问对象；要实现真正的私有照片访问，应将 bucket 改为 private，并继续通过后端授权流访问。

## 存储与备份

照片原图在 MinIO，照片索引在 MariaDB。备份时必须同时备份 MinIO bucket 和 MariaDB 数据库，否则会出现原图或索引缺失。60 GB 磁盘建议将 `MAX_UPLOAD_SIZE_MB` 保持在 25 MB，并定期清理不需要的照片。
