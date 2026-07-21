# 漫游山东

动漫旅行手账风格的山东旅行攻略可交互的人物移动和景点打卡。

## 快速启动

```bash
pnpm install
pnpm dev
```

- 前端：http://127.0.0.1:5173
- API：http://127.0.0.1:8787/api/health

当前API默认使用演示模式，注册、登录、进度和打卡存储在API进程内存中，重启API后清空。未登录用户的打卡保存在浏览器LocalStorage。

## MySQL模式

项目已经包含完整的15表Prisma模型。安装Docker后：

```bash
Copy-Item .env.example .env
docker compose up -d
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

当前实现的HTTP接口使用演示仓库；接入生产MySQL时，按 `架构设计.md` 将认证、行程和进度模块切换为Prisma Repository。

## 检查命令

```bash
pnpm typecheck
pnpm db:generate
pnpm build
```

## 目录

- `apps/web`：React互动地图前端。
- `apps/api`：Express演示API与Prisma模型。
- `packages/shared`：共享类型、Zod Schema和旅行数据。
- `项目简介.md`：产品简介与技术栈。
- `架构设计.md`：数据库、接口、文件职责与实施步骤。

## 地图数据

山东总览使用DataV行政区划服务提供的山东省地级市GeoJSON，保存于 `apps/web/src/assets/shandong.json`，并通过D3 Geo投影到SVG画布。济南、泰安和青岛节点使用真实经纬度定位，不再使用手绘省界。
