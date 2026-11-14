# 用 GitHub 管代码 + 自动部署

先说结论：**GitHub Pages 放不了这个站**。Pages 只能放纯静态文件，而你的站有后台登录、二创上传、留言、音乐上传，这些都需要 Node 服务在跑。

但 GitHub 依然是最好的代码仓库 + 自动部署入口。两条路：

| 路线 | 需要什么 | 花费 | 适合 |
| --- | --- | --- | --- |
| **A. GitHub + 自己的服务器 + 自动部署**（推荐） | 一台轻量服务器 + 域名 | ¥100–300/年 | 长期做、数据都在自己手里 |
| **B. GitHub + Render** | 什么都不用买 | 免费版没持久磁盘，重启数据会丢；带磁盘 $7/月起 | 先看效果 |

下面主要写 A，B 放在最后。

---

## 一、把代码放进 GitHub

### 方式 1：GitHub Desktop（不用敲命令，推荐）

1. 下载安装 [GitHub Desktop](https://desktop.github.com/)，登录你的 GitHub 账号
2. 菜单 **File → Add local repository**，选到 `lanai-huoguo` 这个文件夹
3. 提示「这不是一个 Git 仓库」时点 **create a repository** → 直接 Create
4. 右上角 **Publish repository**
   - Name 填 `lanai-site`
   - **建议勾上 Keep this code private**（其实密码已经排除在仓库外，私有更放心）
   - 点 Publish

完成。以后改完代码，在 Desktop 里写一句说明 → **Commit to main** → **Push origin** 就传上去了。

### 方式 2：命令行

```bash
cd lanai-huoguo
git init
git add .
git commit -m "init: 辣奶火锅官方小站"
git branch -M main
git remote add origin https://github.com/你的用户名/lanai-site.git
git push -u origin main
```

> `config.json` 已经在 `.gitignore` 里，**不会**被提交（里面有你的后台密码）。
> 仓库里只有 `config.example.json` 模板。

---

## 二、服务器准备（一次性）

### 1. 买服务器 + 装 Docker

Ubuntu 22.04，然后：

```bash
curl -fsSL https://get.docker.com | sh
git clone https://github.com/你的用户名/lanai-site.git /opt/lanai-huoguo
cd /opt/lanai-huoguo
```

> 仓库是私有的就先在服务器上配一个 Deploy Key，或者用 `git clone https://用户名:令牌@github.com/...`。

### 2. 创建配置文件（密码只留在服务器上）

```bash
cp config.example.json config.json
nano config.json
```

改这几项：

```json
{
  "host": "127.0.0.1",
  "admin": { "username": "lanai", "password": "换成你的强密码" },
  "trustProxy": true,
  "cookieSecure": true
}
```

`trustProxy` 和 `cookieSecure` 都要开（因为要走 HTTPS 反代）。

### 3. 启动

```bash
docker compose up -d
```

---

## 三、配置自动部署（push 就上线）

### 1. 在服务器上生成一把专用钥匙

```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/gh_actions -N ""
cat ~/.ssh/gh_actions.pub >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys
cat ~/.ssh/gh_actions        # 把这一整段复制下来，下一步用
```

### 2. 到 GitHub 仓库 → Settings → Secrets and variables → Actions

新建三个 **Repository secret**：

| 名称 | 值 |
| --- | --- |
| `SERVER_HOST` | 服务器 IP |
| `SERVER_USER` | `root`（或你的登录名） |
| `SERVER_SSH_KEY` | 上一步 `cat` 出来的**私钥全文**（从 `-----BEGIN` 到 `-----END`） |

### 3. 推送一次试试

随便改个文件提交推送，打开仓库的 **Actions** 页面，能看到「Deploy」跑完变绿就成功了。
以后你在 GitHub Desktop 点 Push，服务器会自动拉取 + 重启。

---

## 四、域名 + HTTPS

按 [README-DEPLOY.md](README-DEPLOY.md) 里的「装 Caddy」「域名解析」两步做，把 `deploy/Caddyfile` 的域名改成你的即可。

国内服务器记得先备案；香港/海外不用。

---

## 五、路线 B：GitHub + Render（不想买服务器）

1. [render.com](https://render.com) 注册，用 GitHub 登录
2. **New → Web Service**，选你的仓库
3. Runtime 选 **Node**，Build Command 留空，Start Command 填 `node server.js`
4. 环境变量加：
   - `HOST=0.0.0.0`
   - `TRUST_PROXY=1`
   - `COOKIE_SECURE=1`
   - `ADMIN_USER=lanai`
   - `ADMIN_PASSWORD=你的强密码`
5. 部署完成后会给你 `https://xxx.onrender.com`

**重要限制**：免费版没有持久磁盘，每次重新部署 / 重启，后台改的内容、上传的二创和音乐都会回到仓库里的版本。想长期用需要加一块 Disk（$7/月起），或者直接走路线 A。

---

## 六、注意

- **不要把 `config.json` 提交到仓库**（已自动忽略），后台密码只留在服务器
- 仓库如果是公开的也没关系：`data/comments.json`、`data/fanart.json`、`uploads/` 这些带粉丝信息的文件同样被忽略了
- 换服务器 / 迁移：把服务器上的 `config.json`、`data/`、`uploads/`、`public/music/` 拷走就行，代码重新 clone 即可
- 定期备份：`bash tools/backup.sh`


---

## 七、没有服务器怎么办？

这个站需要能长期写文件的 Node 环境，三选一：

### 选择 1：Render 免费版（10 分钟，先看效果）

1. [render.com](https://render.com) 用 GitHub 登录 → **New → Blueprint** → 选你的仓库
2. 它会读到 `render.yaml`，提示你填 `ADMIN_PASSWORD`（后台密码），填一个强密码
3. 等 2–3 分钟，给你一个 `https://xxx.onrender.com` 地址，手机也能开

**代价**：免费版**没有持久磁盘**，而且 15 分钟没人访问会休眠。休眠醒来 / 重新部署后，后台改的内容、粉丝上传的二创和音乐都会恢复成仓库里的版本。
所以它适合「先给粉丝看看样子」，不适合正式运营。

### 选择 2：Oracle Cloud 永久免费服务器（真免费，推荐试试）

Oracle 的 **Always Free** 送一台永久免费的虚拟机（1 核 1G 的 AMD 实例够用），有独立公网 IP 和硬盘，和我们需要的 VPS 完全一样。

1. 注册 [cloud.oracle.com](https://cloud.oracle.com)（要信用卡验证，**不会扣费**，选 Always Free 区域）
2. Create Instance → 系统选 **Ubuntu 22.04** → Shape 选 `VM.Standard.E2.1.Micro`（Always Free 标签）
3. 下载保存 SSH 私钥，开机后拿到公网 IP
4. 在 **VCN → Security List** 里放行 80 和 443 端口
5. 然后按 [README-DEPLOY.md](README-DEPLOY.md) 的「装 Docker → 传代码 → 改配置 → 启动 → Caddy」走一遍
6. 之后接 GitHub Actions，push 就自动更新

> 注册偶尔会被风控拒，多试一次或换个邮箱；实在不行用选择 3。

### 选择 3：¥100/年 轻量服务器（最省心）

腾讯云 / 阿里云 / 雨云等都有百元级轻量服务器，香港节点免备案，当天能用。
买完按 [README-DEPLOY.md](README-DEPLOY.md) 操作即可。

---

## 八、没有服务器时，数据怎么保底

不管用哪种方案，**`data/`、`uploads/`、`public/music/` 是全部内容**（留言、投稿、音乐、物料、后台改的文案）。
没有持久磁盘时，建议按这个节奏用：

1. 在**自己电脑**上跑 `node server.js`（本地后台改内容、传音乐）
2. 改完把 `data/site.json`、`public/music/` 提交推送到 GitHub
3. 线上重新部署，内容就是最新的

这样线上始终是「只读展示 + 少量留言」，不会因为重启丢东西。
