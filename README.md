# 剧本杀 DM 管理系统

## 项目简介

这是一个剧本杀 DM（主持人）管理系统，用于管理剧本杀店的日常运营，包括 DM 管理、剧本管理、开本记录、工资计算、报销管理和流水管理等功能。

## 技术栈

- **前端**: React + Ant Design + Axios + ECharts
- **后端**: Node.js + Express + Sequelize
- **数据库**: SQLite（轻量级，无需额外安装）

## 功能模块

1. **首页**: 数据汇总展示，包括总流水、总工资支出、热门剧本、活跃 DM 等
2. **DM 管理**: DM 信息的增删改查，支持 Excel 导入导出
3. **本单管理**: 剧本信息管理，支持按属性、类型筛选
4. **开本记录**: 记录每场开本信息，关联 DM 和剧本
5. **工资计算**: 核心模块，根据开本记录自动计算工资
6. **报销管理**: 报销记录管理，统计总报销金额
7. **流水管理**: 收入流水记录，计算实际收入

## 快速开始

### 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 启动项目

```bash
# 启动后端服务（端口 3001）
cd backend
npm start

# 在另一个终端启动前端服务（端口 3000）
cd frontend
npm start
```

### 访问地址

- 前端页面: http://localhost:3000
- 后端 API: http://localhost:3001

## 生产部署

系统已经支持账号密码登录、受保护 API、环境变量配置、SQLite 数据持久化和上传目录持久化。部署到云服务器前，请先配置 `backend/.env`：

- `JWT_SECRET`：生产环境必须设置为至少 32 位随机字符串
- `ADMIN_USERNAME` / `ADMIN_PASSWORD`：首次启动且用户表为空时创建初始管理员
- `DATABASE_PATH`：SQLite 数据库路径
- `UPLOAD_DIR`：报销截图上传目录

完整部署步骤见 [docs/deployment.md](docs/deployment.md)。

## 版本管理与回退

本项目使用 GitHub 保存完整代码版本。每一次功能更新、性能优化或问题修复，都应：

1. 修改代码并完成本地验证
2. 在 [CHANGELOG.md](CHANGELOG.md) 记录本次更新内容、影响范围和验证结果
3. 使用 Git 提交代码，提交说明写清楚本次优化内容
4. 推送到 GitHub，形成可追踪版本
5. 部署到服务器

查看历史版本：

```bash
git log --oneline
```

回退到指定历史版本：

```bash
git checkout <commit-id>
```

如果确认要让服务器也回退到该版本，在切到对应提交后重新执行部署脚本：

```bash
SERVER_PASSWORD='ssh-password' \
ADMIN_PASSWORD='initial-admin-password' \
JWT_SECRET='at-least-32-random-characters' \
./scripts/deploy-cloud-password.sh
```

如果只是要在当前分支创建一次“反向修复”提交，使用：

```bash
git revert <commit-id>
git push
```

建议使用 `git revert` 做生产回退，这样回退动作本身也会被记录在 GitHub 历史里。

### 局域网访问

要让局域网内其他电脑访问，需要：

1. 获取本机局域网 IP（Windows 执行 `ipconfig`，找到 IPv4 地址）
2. 后端服务已默认监听 `0.0.0.0:3001`
3. 前端访问时使用 `http://本机IP:3000`

## 工资计算规则

### 打野 DM
- 固定 150 元/车
- 好评工资：每条好评 5 元
- 城限车次提成：每车城限剧本加 50 元
- 总工资 = 固定工资 + 好评工资 + 城限提成 + 开本费

### 阶梯/全职 DM
- 阶梯基本工资：
  - 第 1~4 车：130 元/车
  - 第 5~9 车：160 元/车
  - 第 10 车及以上：200 元/车
- 里程碑奖励：
  - 累计达到 5 车：奖励 120 元
  - 累计达到 10 车：额外奖励 360 元
- 好评工资、城限提成、开本费与打野相同

## 项目结构

```
DM-sys/
├── backend/                 # 后端代码
│   ├── models/              # 数据库模型
│   ├── routes/              # API 路由
│   ├── package.json
│   └── server.js            # 服务器入口
├── frontend/                # 前端代码
│   ├── public/              # 静态资源
│   ├── src/
│   │   ├── api/             # API 调用
│   │   ├── components/      # 公共组件
│   │   ├── pages/           # 页面组件
│   │   ├── App.js           # 主应用
│   │   └── index.js         # 入口文件
│   └── package.json
└── README.md
```

## 使用说明

1. **Excel 导入**: 各模块均支持 Excel 导入，表头需与系统字段对应
2. **Excel 导出**: 导出当前查询结果
3. **批量删除**: 通过表格勾选多条记录后点击批量删除按钮
4. **工资结算**: 计算工资后可调整各项数值，确认无误后点击保存结算

## License

MIT
