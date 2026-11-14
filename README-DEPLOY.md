# 把网站架到公网（部署指南）

目标：让所有粉丝用手机 / 电脑打开 **https://你的域名** 就能看，后台只有你能进。

> 说明：买服务器、买域名、备案这三件事只能你本人操作（要实名、要付款）。
> 下面的命令和配置我都已经写好放在项目里，你照着做就行；卡在哪一步告诉我，我帮你查。

---

## 一、先选一条路线

| 方案 | 适合 | 优点 | 代价 |
| --- | --- | --- | --- |
| **A. 国内云服务器 + 域名** | 想长期做、粉丝主要在国内 | 国内访问最快、最稳 | 域名要 **ICP 备案**（7–20 个工作日） |
| **B. 香港 / 海外服务器** | 想立刻上线、不想备案 | 买完就能用，免备案 | 国内访问稍慢，价格略高 |
| **C. 自己电脑 + 内网穿透** | 先给朋友试看 / 临时活动 | 0 成本、5 分钟 | 电脑必须开着，不适合长期 |

**我的建议**：先按 **B** 上线（当天就能用），同时去办 **A** 的备案，备案下来再迁过去。

---

## 二、买什么

| 东西 | 推荐配置 | 大概价格 |
| --- | --- | --- |
| 云服务器 | 2 核 2G / 40G 硬盘 / 3M 带宽，Ubuntu 22.04 | 轻量应用服务器 ¥100–300/年 |
| 域名 | `.com` / `.cn` / `.top` 都行 | ¥30–80/年 |
| HTTPS 证书 | **免费**（Caddy 自动申请） | ¥0 |

3M 带宽大概能同时供 10–20 人听歌 / 看页面；活动高峰再临时升带宽就行。

---

## 三、方案 A / B：服务器部署（Docker，最省事）

### 1. 连上服务器

买好后在控制台重置 root 密码，然后本机打开 PowerShell：

```powershell
ssh root@你的服务器IP
```

### 2. 装 Docker

```bash
curl -fsSL https://get.docker.com | sh
```

### 3. 把网站传上去

在**你自己的电脑**上，进入项目文件夹的上一级，执行：

```powershell
scp -r .\lanai-huoguo root@你的服务器IP:/opt/
```

（也可以先把项目传到 GitHub，再在服务器上 `git clone`。）

### 4. 改密码（重要）

在服务器上：

```bash
cd /opt/lanai-huoguo
nano config.json
```

把 `admin.password` 改成你自己的强密码，`trustProxy` 改成 `true`。
按 `Ctrl+O` 回车保存，`Ctrl+X` 退出。

### 5. 启动

```bash
docker compose up -d
docker compose logs -f
```

看到 🍲 和端口就是成功了，按 Ctrl+C 退出日志。
此时服务器本机的 http://127.0.0.1:8787 已经能打开（还没对外）。

### 6. 装 Caddy（自动 HTTPS）

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```

把 `deploy/Caddyfile` 里的域名换成你的：

```bash
cp deploy/Caddyfile /etc/caddy/Caddyfile
nano /etc/caddy/Caddyfile
systemctl reload caddy
```

### 7. 域名解析

到买域名的控制台，加一条 **A 记录**：

- 主机记录：`@`（根域名）或 `www`
- 记录值：你的服务器 IP

等 1–10 分钟生效，然后浏览器打开 https://你的域名，证书会自动签发（第一次可能要等 10 秒）。

### 8. 备案（仅国内服务器需要）

阿里云 / 腾讯云控制台 → 备案 → 按提示提交（身份证、域名、服务器）。
**没备案的国内服务器，80/443 端口会被拦截**，所以国内机必须先备案。香港 / 海外机不用。

---

## 四、方案 C：自己电脑 + 内网穿透（5 分钟试看）

适合先在群里发个链接给大家看看。

1. 本机启动网站：双击 `start.bat`（或 `node server.js`）
2. 装 Cloudflare Tunnel 客户端，执行：

```bash
cloudflared tunnel --url http://127.0.0.1:8787
```

它会给你一个 `https://xxx.trycloudflare.com` 的临时地址，手机直接能开。
**电脑关机或关窗口就失效**，只适合临时演示。

---

## 五、手机端

网站本身是响应式 + 已适配刘海屏，手机浏览器打开就是手机版（分类在底部）。

想让它更像 App：

- **iPhone Safari**：分享 → 添加到主屏幕
- **Android Chrome**：菜单 → 添加到主屏幕

图标、名称、主题色都已经配好（`manifest.webmanifest`）。

---

## 六、上线后怎么维护

### 改内容

全部在后台 https://你的域名/admin 改：资料、月历、公告、物料、歌单、音乐、二创审核。

### 备份（建议每周一次）

```bash
bash tools/backup.sh
```

Windows 用 `powershell -File tools\\backup.ps1`。
会打包 `data/`、二创上传、音乐、物料上传到 `backups/`，只保留最近 14 份。

### 更新代码

```bash
cd /opt/lanai-huoguo
git pull
docker compose up -d --build
```

`data/` 和上传目录是挂载出来的，更新不会丢内容。

### 看日志

```bash
docker compose logs -f --tail=200
```

---

## 七、常见问题

**上传音乐报「文件太大」/ 413**
Nginx 要加 `client_max_body_size 80m;`（示例里已写）。Caddy 默认没有限制。

**后台登录一直失败**
- 确认用的是 `config.json` 里的账号密码
- 如果开了 `cookieSecure`，必须用 `https://` 访问，http 下浏览器不会存 cookie
- 忘记密码：`nano config.json` 直接看

**所有粉丝共用一次限流（登录/留言容易被误伤）**
把 `trustProxy` 设为 `true`，或启动时加 `TRUST_PROXY=1`，让服务能拿到真实 IP。

**手机复制群号没反应**
浏览器的剪贴板接口要求 `https://`，上了 HTTPS 就正常。

**歌播放很卡**
把 WAV 换成 MP3（128–192kbps），一首 3 分钟的歌从约 35MB 降到约 4MB，粉丝流量也省。

**改完 config.json 要重启**
`docker compose restart` 或 `pm2 restart lanai-site`。

---

## 八、不用 Docker 也行（PM2 方式）

```bash
apt install -y nodejs npm
npm i -g pm2
cd /opt/lanai-huoguo
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save && pm2 startup
```

---

需要我帮你做哪一步？把服务器 IP / 域名 / 报错信息发我，我按你的实际情况给具体命令。
