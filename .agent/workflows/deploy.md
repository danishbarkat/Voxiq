---
description: Deploy the MB-dailer application to the DigitalOcean droplet
---

// turbo-all
1. Sync local backend to droplet:
```bash
rsync -az -e "ssh -i /tmp/codex_dialer_key -o StrictHostKeyChecking=no" --exclude node_modules --exclude dist /Volumes/Transcend/Dan-all-work/MB-dailer/backend/ root@104.236.12.248:/opt/MB-dailer/backend
```

2. Sync local frontend to droplet:
```bash
rsync -az -e "ssh -i /tmp/codex_dialer_key -o StrictHostKeyChecking=no" --exclude node_modules --exclude dist /Volumes/Transcend/Dan-all-work/MB-dailer/frontend/ root@104.236.12.248:/opt/MB-dailer/frontend
```

3. Build backend on droplet:
```bash
ssh -i /tmp/codex_dialer_key root@104.236.12.248 "cd /opt/MB-dailer/backend && npm install --silent && npm run build"
```

4. Build frontend on droplet:
```bash
ssh -i /tmp/codex_dialer_key root@104.236.12.248 "cd /opt/MB-dailer/frontend && npm install --silent && npm run build"
```

5. Deploy frontend and reload Nginx:
```bash
ssh -i /tmp/codex_dialer_key root@104.236.12.248 "rm -rf /var/www/html/* && cp -r /opt/MB-dailer/frontend/dist/* /var/www/html/ && chown -R www-data:www-data /opt/MB-dailer/frontend/dist /var/www/html && find /opt/MB-dailer/frontend/dist -type d -exec chmod 755 {} \; && find /opt/MB-dailer/frontend/dist -type f -exec chmod 644 {} \; && nginx -t && systemctl reload nginx"
```

6. Restart backend process:
```bash
ssh -i /tmp/codex_dialer_key root@104.236.12.248 "pkill -f 'node /opt/MB-dailer/backend/dist/main' || true; pkill -f 'node dist/main' || true; nohup node /opt/MB-dailer/backend/dist/main > /var/log/backend.log 2>&1 & sleep 1; ss -lntp | egrep '3000|3001'"
```
