# 运维说明

## 服务端口

- 前端：`FRONTEND_PORT`，默认 `6222`
- 后端：`BACKEND_PORT`，默认 `6555`
- MinIO：由现有部署提供，应用只需要访问 API 端口
- MariaDB：由现有部署提供，应用使用 SQLAlchemy + PyMySQL 连接

## 常用命令

```bash
docker compose ps
docker compose logs -f backend
docker compose restart backend frontend
docker compose up -d --build
```

检查：

```bash
curl http://127.0.0.1:6555/api/health
curl http://127.0.0.1:6222/api/health
```

两个地址都应返回 `{"status":"ok","service":"lumen-archive-api"}`。

## 安全建议

- 不要将 MinIO root 密钥直接用于长期生产服务；创建一个只操作目标 bucket 的应用用户。
- 通过云安全组限制 `9000`、`9001` 和 `8000` 的公网访问，只开放前端端口或反向代理端口。
- 给前端配置 HTTPS，尤其是服务暴露在公网时。
- 修改 `.env` 中的默认数据库和 MinIO 密码。
- 生产环境必须设置随机 `AUTH_SECRET_KEY`，并使用 `ADMIN_PASSWORD_HASH`，不要使用代码默认值。
- `CORS_ORIGINS=0.0.0.0` 表示允许跨域来源；认证仍然依赖 Bearer Token。

## 数据备份

照片对象位于 MinIO bucket，索引位于 MariaDB `photos` 表。执行数据库备份和 MinIO bucket 备份时要保持同一时间点，恢复时先恢复数据库连接，再确认 bucket 名称和对象前缀 `photos/` 不变。当前 `yanshi` bucket 为 public，备份之外还要评估对象 URL 泄露风险。

## SQL 更新

按版本维护 SQL 文件：`001_initial_schema.sql` 负责新库的 `users` 和 `photos` 表，`002_users_table.sql` 负责已有旧库补建用户表。新字段或索引请新增 `003_*.sql`，不要修改已经执行过的版本文件。默认管理员用户会使用 `INSERT IGNORE` 幂等初始化，不会覆盖已有密码。

## 升级

```bash
git pull
docker compose up -d --build
```

## MinIO derivative buckets

The application uses two buckets:

- `MINIO_ORIGIN_BUCKET` keeps untouched uploads and is used by original download only.
- `MINIO_PREVIEW_BUCKET` keeps `thumbnail.webp` and `preview.webp` derivatives.
- `MINIO_BUCKET` remains a compatibility fallback for `MINIO_ORIGIN_BUCKET`.

The MinIO application account needs read, write, delete, and bucket inspection permissions on both buckets. Existing database rows require no migration. When an old photo is requested for the first time, the backend reads its original and writes both missing derivatives to the preview bucket.

Verify connectivity without exposing credentials:

```bash
curl --connect-timeout 8 http://18.221.246.24:9000/minio/health/live
docker compose run --rm backend python -c "from app.config import Settings; from app.storage import MinioStorage; s=MinioStorage(Settings()); s.ensure_buckets(); print('minio buckets ok')"
```

本项目当前没有数据库迁移工具；首版只创建表，不会主动修改已有字段。后续变更表结构时应先增加 Alembic 迁移，再升级生产服务。
