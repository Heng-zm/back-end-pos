# Deployment Guide

## Deploying to Render.com

### Prerequisites
- GitHub account
- Render.com account
- Your code pushed to a GitHub repository

### Step 1: Prepare Your Repository

1. Ensure your `package.json` has the correct start script:
```json
"scripts": {
  "start": "node index.js",
  "dev": "nodemon index.js"
}
```

2. Create a `.gitignore` file if you haven't already:
```
node_modules/
.env
*.db
*.db-shm
*.db-wal
.DS_Store
```

### Step 2: Create a Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** and select **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:
   - **Name:** `back-end-pos` (or your preferred name)
   - **Region:** Choose closest to your users
   - **Branch:** `main` (or your default branch)
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free` (or paid plan for production)

### Step 3: Set Environment Variables

In the Render dashboard, under **Environment Variables**, add:

```
PORT=5000
NODE_ENV=production
DB_SOURCE=pos-database.db
```

### Step 4: Deploy

1. Click **"Create Web Service"**
2. Render will automatically deploy your application
3. Wait for the build to complete (usually 2-5 minutes)
4. Your API will be available at: `https://your-service-name.onrender.com`

### Step 5: Update Frontend Configuration

Update your frontend's `.env` file or environment variables:

```
REACT_APP_API_URL=https://your-service-name.onrender.com/api
REACT_APP_WS_URL=wss://your-service-name.onrender.com
```

### Step 6: Configure CORS (Important!)

Update `index.js` to allow your frontend domain:

```javascript
app.use(cors({
    origin: NODE_ENV === 'production' 
        ? ['https://your-frontend-domain.com', 'https://your-frontend-domain.netlify.app']
        : '*',
    credentials: true
}));
```

## Deploying to Other Platforms

### Heroku

1. Install Heroku CLI
2. Login: `heroku login`
3. Create app: `heroku create your-app-name`
4. Set environment variables:
```bash
heroku config:set NODE_ENV=production
heroku config:set PORT=5000
```
5. Deploy: `git push heroku main`

### Railway

1. Go to [Railway](https://railway.app/)
2. Click **"New Project"** > **"Deploy from GitHub repo"**
3. Select your repository
4. Railway auto-detects Node.js and deploys
5. Add environment variables in the **Variables** tab
6. Get your deployment URL from the **Settings** tab

### DigitalOcean App Platform

1. Go to [DigitalOcean Apps](https://cloud.digitalocean.com/apps)
2. Click **"Create App"**
3. Connect your GitHub repository
4. Configure:
   - **Run Command:** `npm start`
   - **Build Command:** `npm install`
5. Add environment variables
6. Deploy

## Database Persistence

⚠️ **Important:** On free hosting platforms like Render, the SQLite database file may be ephemeral (deleted on each deploy or restart).

### Solutions:

1. **Use a persistent volume** (Render paid plans)
2. **Use a managed database:**
   - PostgreSQL (Render, Heroku, Railway offer free tiers)
   - MongoDB (MongoDB Atlas has a free tier)
   - MySQL/MariaDB

3. **Migrate to PostgreSQL** (Recommended for production):
```bash
npm install pg
```

Replace `sqlite3` with `pg` and update database queries accordingly.

## Testing Your Deployment

### 1. Check the health endpoint:
```bash
curl https://your-service-name.onrender.com/health
```

Expected response:
```json
{"status":"OK","timestamp":"2024-01-01T00:00:00.000Z"}
```

### 2. Test API endpoints:
```bash
curl https://your-service-name.onrender.com/api/menu
curl https://your-service-name.onrender.com/api/categories
```

### 3. Test WebSocket connection:
Use a WebSocket client or your frontend application to connect to:
```
wss://your-service-name.onrender.com
```

## Monitoring and Logs

### Render
- View logs in the **Logs** tab
- Set up health checks in **Settings** > **Health Check Path:** `/health`

### Common Issues

1. **Database resets on restart:**
   - Solution: Use a persistent volume or external database

2. **WebSocket connection fails:**
   - Ensure your service supports WebSocket connections
   - Check CORS configuration
   - Use `wss://` (secure WebSocket) in production

3. **CORS errors:**
   - Update the `origin` array in `index.js` with your frontend URL
   - Ensure credentials are properly configured

4. **Port binding errors:**
   - Always use `process.env.PORT` for the port number
   - Hosting platforms assign their own port

## Security Best Practices

1. **Use HTTPS** (most platforms provide this automatically)
2. **Set proper CORS origins** (don't use `'*'` in production)
3. **Add rate limiting:**
```bash
npm install express-rate-limit
```

4. **Use environment variables** for sensitive data
5. **Keep dependencies updated:**
```bash
npm audit
npm audit fix
```

## Auto-Deploy

Most platforms support automatic deployment from GitHub:
1. Enable auto-deploy in platform settings
2. Every push to your main branch will trigger a new deployment
3. Set up GitHub Actions for automated testing before deploy

## Rollback

If something goes wrong:

### Render
- Go to **Deploys** tab
- Click **"Rollback"** on a previous successful deployment

### Heroku
```bash
heroku rollback
```

### Railway
- Click on a previous deployment in the dashboard
- Click **"Redeploy"**

## Cost Optimization

Free tier limitations:
- **Render:** 750 hours/month, sleeps after 15 min of inactivity
- **Heroku:** 550-1000 hours/month (with verification)
- **Railway:** $5 credit/month

Tips:
- Use free tier for development/testing
- Upgrade to paid tier for production
- Monitor usage to avoid unexpected charges
- Consider serverless options for low-traffic apps
