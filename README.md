# Unwrapped for Plex

Year-in-review statistics for Plex users. Generates personalized viewing stats from Tautulli history and distributes via email with unique access links.

## Screenshots

### User Wrapped Stats
![Stats Overview](https://i.imgur.com/yeHT8I0.jpeg)
![Top Content](https://i.imgur.com/8YsYosb.jpeg)
![Viewing Patterns](https://i.imgur.com/uigT7Qy.png)
![Fun Facts](https://i.imgur.com/dmmlkoy.png)

### Admin Panel
![Admin Dashboard](https://i.imgur.com/fSOg29m.png)

## Features

### Stats Generation
- Total watch time, plays, movies, and TV episodes
- Viewing patterns: most active month/day/hour, longest streaks
- Top content: movies, shows, episodes, genres, actors, directors
- Device and platform statistics
- Quality metrics (direct play/transcode/direct stream)
- Monthly breakdowns
- Binge tracking and memorable days
- Fun facts and achievement badges
- Optional Overseerr integration (request stats)

### Admin Panel
- User management and Tautulli sync
- Stats generation with preview mode
- Individual and batch email sending
- Email and application log viewer
- Generation history tracking
- Test mode (generate without sending)

### Email Distribution
- React Email templates with Plex branding
- Unique tokenized URLs per user (90-day expiration)
- SMTP support with rate limiting
- Delivery status tracking

### Frontend
- Public wrapped stats viewer
- Animated statistics presentation
- Responsive design
- No authentication required for viewing (tokenized access)

## Requirements

- Docker and Docker Compose
- Tautulli with API access
- SMTP server (Gmail/Google Workspace supported)
- PostgreSQL 16+ (included in compose)
- Redis 7+ (included in compose)

## Installation

### 1. Clone and Configure

```bash
git clone <repository-url>
cd plex-unwrapped
cp .env.example .env
```

### 2. Configure Environment

Edit `.env` and set required values:

**Required:**
- `POSTGRES_PASSWORD`: Database password
- `TAUTULLI_URL`: Your Tautulli server URL
- `TAUTULLI_API_KEY`: Tautulli API key (Settings > Web Interface > API)
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`: Email configuration
- `ADMIN_USERNAME`, `ADMIN_PASSWORD`: Admin credentials
- `JWT_SECRET`: Random string (generate with `openssl rand -base64 32`)

**Recommended:**
- `APP_URL`: Public URL where users access wrapped stats
- `TARGET_YEAR`: Year to generate stats for (default: 2025)
- `TEST_MODE=true`: For first run (generates stats without sending emails)
- `NEXT_PUBLIC_PLEX_URL`: Your public Plex server URL (shows "Watch More on Plex" button if set)

### 3. Start Services

```bash
docker compose up -d
```

Containers:
- `unwrapped-for-plex-frontend`: Port 3222 (default)
- `unwrapped-for-plex-backend`: Port 3221 (default)
- `unwrapped-for-plex-db`: PostgreSQL (internal)
- `unwrapped-for-plex-redis`: Redis (internal)

### 4. Access Admin Panel

Navigate to `http://localhost:3222/admin` and log in with credentials from `.env`.

## Usage

### First Run

1. **Sync Users**: Admin > Users > "Sync from Tautulli"
2. **Generate Stats**: Admin > Generations > Select year > "Generate Wrapped"
   - Use test mode first to verify data
3. **Preview**: Admin > Users > "Preview" button for any user
4. **Send Emails**:
   - Individual: Users page > "Send Email"
   - Batch: Emails page > Select generation > "Send Emails"

### Annual Workflow

1. Wait until after year ends (e.g., early January for previous year)
2. Set `TARGET_YEAR` in `.env` to previous year
3. Restart backend: `docker compose restart backend`
4. Sync users and generate stats
5. Preview a few users to verify data
6. Disable test mode if enabled
7. Send emails to all users

## Configuration

### SMTP Setup (Gmail/Google Workspace)

1. Enable 2-Step Verification in Google Account
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Configure `.env`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@example.com
   SMTP_PASSWORD=<16-char-app-password>
   ```

### Overseerr Integration (Optional)

Adds request statistics to user profiles (minimal impact if disabled).

```bash
ENABLE_OVERSEERR=true
OVERSEERR_URL=http://your-overseerr:5055
OVERSEERR_API_KEY=<api-key>
```

Note: Overseerr data is only used for badges/fun facts, not displayed in main stats.

### Performance Tuning

```bash
MAX_WORKERS=4              # Concurrent stat generation
TAUTULLI_PAGE_SIZE=1000    # Records per API call
DB_POOL_MAX=10             # Max database connections
CACHE_TTL_SECONDS=3600     # Stats cache duration
```

### Security

```bash
RATE_LIMIT_PUBLIC=10000    # Requests/hour for public endpoints
RATE_LIMIT_ADMIN=10000     # Requests/hour for admin
TOKEN_EXPIRATION_DAYS=90   # Wrapped URL validity
```

## Architecture

```
Frontend (Next.js 14)
├── Public viewer (/wrapped/[token])
└── Admin panel (/admin/*)
    ├── Dashboard
    ├── Users
    ├── Generations
    ├── Emails
    └── Logs

Backend (Node.js/Express)
├── Tautulli API integration
├── Overseerr API integration (optional)
├── Stats calculator
├── Email service
└── Admin API

Database (PostgreSQL)
├── users
├── user_wrapped_stats
├── wrapped_generations
├── email_logs
└── access_tokens

Cache (Redis)
└── Tautulli/Overseerr API responses
```

## API Endpoints

### Public
- `GET /api/wrapped/:token` - Get wrapped stats
- `POST /api/wrapped/:token/view` - Track view

### Admin (requires JWT)
- `POST /api/admin/login` - Authenticate
- `GET /api/admin/dashboard` - Overview stats
- `POST /api/admin/users/sync` - Sync from Tautulli
- `GET /api/admin/users` - List users
- `POST /api/admin/generate` - Generate stats
- `GET /api/admin/generations` - List generations
- `POST /api/admin/emails/send` - Send emails
- `GET /api/admin/logs/email` - Email logs
- `GET /api/admin/logs/application` - App logs
- `POST /api/admin/users/:id/send-email` - Send to single user

## Logs

Application logs are stored in `/app/logs` inside the backend container.

View logs:
```bash
# Application logs
docker compose logs backend -f

# Email logs
docker compose logs backend | grep -i email

# Access via admin panel
http://localhost:3222/admin/logs
```

Log files:
- `combined-YYYY-MM-DD.log`: All logs
- `error-YYYY-MM-DD.log`: Error logs only
- `exceptions.log`: Uncaught exceptions

## Troubleshooting

### Stats generation fails
- Check Tautulli API key is valid
- Verify `TARGET_YEAR` matches data availability
- Check logs: `docker compose logs backend`

### Emails not sending
- Verify SMTP credentials
- Test SMTP manually: `docker compose logs backend | grep -i smtp`
- Check email logs in admin panel
- Ensure firewall allows outbound SMTP

### Users not syncing
- Verify Tautulli URL is accessible from container
- Check Tautulli API key permissions
- View sync errors in admin panel

### Database issues
```bash
# Reset database
docker compose down -v
docker compose up -d
```

### Performance issues
- Increase `MAX_WORKERS` for faster generation
- Reduce `TAUTULLI_PAGE_SIZE` if timeouts occur
- Check Redis cache hit rate in logs

### Portainer deployment issues
If you encounter "path not found" errors when deploying via Portainer:
1. Ensure you're uploading the entire repository, not just docker-compose.yml
2. The docker-compose.yml file must be in the root directory with `backend/` and `frontend/` subdirectories
3. Portainer's "Web editor" mode may not work - use "Git" or "Upload" deployment methods
4. Build context paths are relative to docker-compose.yml location

### Windows compatibility
For development on Windows:
1. **Line endings**: Use Git's autocrlf feature or ensure `.gitattributes` is present
2. **npm install**: Run `npm install` in both `frontend/` and `backend/` directories before Docker build if building locally
3. **Docker Desktop**: Ensure Docker Desktop is running and WSL2 backend is enabled
4. **Paths**: Use forward slashes in .env file paths (e.g., `C:/path/to/logs`)

### CORS errors on login
If you see CORS errors when trying to log in:
1. Ensure `APP_URL` in .env matches your frontend URL (default: http://localhost:3222)
2. Update `CORS_ORIGINS` in .env to match your frontend URL
3. Restart backend: `docker compose restart backend`

## Development

### Local Setup

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

### Database Migrations

```sql
-- Initial schema in backend/database/init.sql
-- Applied automatically on first container start
```

### Email Template Preview

```bash
cd frontend
npm run email
# Opens preview server on http://localhost:3001
```

## Environment Variables Reference

See `.env.example` for all available options.

Critical variables:
- `POSTGRES_PASSWORD`: Database password
- `TAUTULLI_URL`, `TAUTULLI_API_KEY`: Tautulli connection
- `SMTP_*`: Email configuration
- `ADMIN_USERNAME`, `ADMIN_PASSWORD`: Admin access
- `JWT_SECRET`: Session security
- `APP_URL`: Public facing URL for wrapped links

## Tech Stack

- Next.js 14 (App Router)
- Express.js + TypeScript
- PostgreSQL 16
- Redis 7
- React Email
- shadcn/ui
- Tautulli API

## License

MIT
# unwrapped-for-plex
