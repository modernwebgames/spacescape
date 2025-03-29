# Dockerizing and Deploying Spacescape Application on Ubuntu 22

This guide provides detailed instructions for dockerizing your Spacescape application and deploying it on an Ubuntu 22 server.

## Dockerization Files

The following files have been created in your project:

- `Dockerfile`: Defines how to build your application container
- `docker-compose.yml`: Orchestrates your application and Nginx containers
- `.dockerignore`: Excludes unnecessary files from the Docker build
- `nginx/conf.d/default.conf`: Nginx configuration for proxying requests to your app

## Deployment Steps

### Step 1: Prepare Your Ubuntu Server

```bash
# Update the system
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.18.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add your user to the docker group (to run docker without sudo)
sudo usermod -aG docker $USER
# Log out and log back in for this to take effect
```

### Step 2: Transfer Your Project Files to the Server

You have several options to transfer your project files:

**Option 1: Using Git (recommended)**
```bash
# On your server
mkdir -p /var/www
cd /var/www
git clone <your-repository-url> spacescape
cd spacescape
```

**Option 2: Using SCP**
```bash
# From your local machine
scp -r /path/to/your/local/spacescape user@your-server-ip:/var/www/
```

**Option 3: Using rsync (more efficient for large projects)**
```bash
# From your local machine
rsync -avz --exclude 'node_modules' --exclude '.git' /path/to/your/local/spacescape/ user@your-server-ip:/var/www/spacescape/
```

### Step 3: Build and Run Your Docker Containers

```bash
# Navigate to your project directory
cd /var/www/spacescape

# Build and start the containers in detached mode
docker-compose up -d --build
```

### Step 4: Set Up SSL with Let's Encrypt (Optional but Recommended)

For a production environment, you should set up SSL certificates. You can use Certbot with the Docker Nginx container:

```bash
# Install Certbot
sudo apt install -y certbot

# Obtain certificates (replace example.com with your domain)
sudo certbot certonly --standalone -d example.com -d www.example.com

# Copy certificates to your Nginx SSL directory
sudo cp /etc/letsencrypt/live/example.com/fullchain.pem /var/www/spacescape/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/example.com/privkey.pem /var/www/spacescape/nginx/ssl/key.pem

# Set proper permissions
sudo chmod 644 /var/www/spacescape/nginx/ssl/cert.pem
sudo chmod 600 /var/www/spacescape/nginx/ssl/key.pem
```

Then, uncomment the SSL server block in your `nginx/conf.d/default.conf` file and restart your containers:

```bash
docker-compose restart nginx
```

### Step 5: Set Up Automatic SSL Renewal

Create a script to renew certificates and update Docker:

```bash
# Create renewal script
cat > /var/www/spacescape/renew-ssl.sh << 'EOF'
#!/bin/bash
certbot renew --quiet
cp /etc/letsencrypt/live/example.com/fullchain.pem /var/www/spacescape/nginx/ssl/cert.pem
cp /etc/letsencrypt/live/example.com/privkey.pem /var/www/spacescape/nginx/ssl/key.pem
chmod 644 /var/www/spacescape/nginx/ssl/cert.pem
chmod 600 /var/www/spacescape/nginx/ssl/key.pem
cd /var/www/spacescape && docker-compose restart nginx
EOF

# Make it executable
chmod +x /var/www/spacescape/renew-ssl.sh

# Add to crontab to run twice a day
(crontab -l 2>/dev/null; echo "0 0,12 * * * /var/www/spacescape/renew-ssl.sh") | crontab -
```

### Step 6: Set Up Firewall Rules

```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https

# Enable the firewall
sudo ufw enable
```

### Step 7: Monitor Your Containers

```bash
# View running containers
docker ps

# View container logs
docker logs spacescape-app
docker logs spacescape-nginx

# View resource usage
docker stats
```

### Step 8: Set Up Container Auto-Restart

Ensure your containers restart automatically when the server reboots:

```bash
# Check if your containers are configured to restart
docker inspect --format="{{.HostConfig.RestartPolicy.Name}}" spacescape-app

# If not set to "always" or "unless-stopped", update your docker-compose.yml
# and restart the containers
docker-compose up -d
```

### Step 9: Set Up Backup Strategy

```bash
# Create a backup script
cat > /var/www/spacescape/backup.sh << 'EOF'
#!/bin/bash
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/spacescape"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Backup the application files
tar -czf $BACKUP_DIR/spacescape_files_$TIMESTAMP.tar.gz -C /var/www spacescape

# Keep only the last 7 backups
ls -tp $BACKUP_DIR/spacescape_files_*.tar.gz | grep -v '/$' | tail -n +8 | xargs -I {} rm -- {}
EOF

# Make it executable
chmod +x /var/www/spacescape/backup.sh

# Add to crontab to run daily
(crontab -l 2>/dev/null; echo "0 2 * * * /var/www/spacescape/backup.sh") | crontab -
```

### Step 10: Update Your Application

When you need to update your application:

```bash
# Pull the latest changes (if using Git)
cd /var/www/spacescape
git pull

# Rebuild and restart the containers
docker-compose up -d --build
```

## Additional Tips

1. **Environment Variables**: For sensitive information, create a `.env` file in your project root and reference it in your `docker-compose.yml`:

```yaml
# In docker-compose.yml
services:
  spacescape:
    environment:
      - NODE_ENV=production
    env_file:
      - .env
```

2. **Container Health Checks**: Consider adding health checks to your Docker Compose file to ensure your application is running correctly:

```yaml
# In docker-compose.yml
services:
  spacescape:
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
```

3. **Docker Volumes**: For persistent data, use Docker volumes:

```yaml
# In docker-compose.yml
services:
  spacescape:
    volumes:
      - spacescape_data:/app/data

volumes:
  spacescape_data:
```

4. **Logging**: Configure proper logging for your containers:

```yaml
# In docker-compose.yml
services:
  spacescape:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```
