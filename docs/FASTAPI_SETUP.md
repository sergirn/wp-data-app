# FastAPI Backend Setup for WaterpoloStats

This document provides comprehensive information for setting up and deploying a FastAPI backend for the WaterpoloStats application on AWS.

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Local Development Setup](#local-development-setup)
4. [API Endpoints](#api-endpoints)
5. [AWS Deployment Guide](#aws-deployment-guide)
6. [Environment Variables](#environment-variables)
7. [Database Configuration](#database-configuration)

---

## Overview

The FastAPI backend serves as the REST API layer for the WaterpoloStats application, providing endpoints for managing clubs, players, matches, and statistics. It integrates with a PostgreSQL database (Supabase) and includes authentication, authorization, and role-based access control.

---

## Technology Stack

- **Framework**: FastAPI 0.104+
- **Database**: PostgreSQL (Supabase)
- **Authentication**: JWT tokens via Supabase Auth
- **ORM**: SQLAlchemy (optional) or raw SQL queries
- **ASGI Server**: Uvicorn
- **Deployment**: AWS (EC2, ECS, or Lambda with API Gateway)
- **Additional**: Pydantic for data validation

---

## Local Development Setup

### Prerequisites

- Python 3.10+
- PostgreSQL client (for database connection)
- Virtual environment tool (venv or virtualenv)

### Installation Steps

\`\`\`bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn psycopg2-binary python-dotenv pydantic pyjwt requests

# Create .env file with environment variables (see section below)
touch .env
\`\`\`

### Running Locally

\`\`\`bash
# Start the development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
\`\`\`

Access the API at: `http://localhost:8000`

Access auto-generated docs at: `http://localhost:8000/docs`

---

## API Endpoints

### Authentication Endpoints

#### POST `/api/auth/login`
Login with email and password.

**Request Body:**
\`\`\`json
{
  "email": "user@example.com",
  "password": "password123"
}
\`\`\`

**Response:**
\`\`\`json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "admin",
    "club_id": 1
  }
}
\`\`\`

#### POST `/api/auth/refresh`
Refresh the authentication token.

**Headers:**
\`\`\`
Authorization: Bearer <access_token>
\`\`\`

**Response:**
\`\`\`json
{
  "access_token": "new_token_here",
  "token_type": "bearer"
}
\`\`\`

---

### Club Endpoints

#### GET `/api/clubs`
Get all clubs (super admins only) or user's club.

**Headers:**
\`\`\`
Authorization: Bearer <access_token>
\`\`\`

**Response:**
\`\`\`json
[
  {
    "id": 1,
    "name": "Club Example",
    "short_name": "CE",
    "logo_url": "https://example.com/logo.png",
    "primary_color": "#0066cc",
    "secondary_color": "#ff6600",
    "created_at": "2025-01-01T00:00:00Z"
  }
]
\`\`\`

#### POST `/api/clubs`
Create a new club (super admins only).

**Request Body:**
\`\`\`json
{
  "name": "New Club",
  "short_name": "NC",
  "logo_url": "https://example.com/logo.png",
  "primary_color": "#0066cc",
  "secondary_color": "#ff6600"
}
\`\`\`

#### PUT `/api/clubs/{club_id}`
Update club information (admins only).

**Request Body:**
\`\`\`json
{
  "name": "Updated Club Name",
  "logo_url": "https://example.com/new-logo.png"
}
\`\`\`

#### DELETE `/api/clubs/{club_id}`
Delete a club (super admins only).

---

### Player Endpoints

#### GET `/api/players`
Get all players for the user's club.

**Query Parameters:**
- `club_id` (optional): Filter by club ID (super admins only)

**Response:**
\`\`\`json
[
  {
    "id": 1,
    "name": "John Doe",
    "number": 7,
    "is_goalkeeper": false,
    "club_id": 1,
    "created_at": "2025-01-01T00:00:00Z"
  }
]
\`\`\`

#### GET `/api/players/{player_id}`
Get detailed player information and statistics.

**Response:**
\`\`\`json
{
  "id": 1,
  "name": "John Doe",
  "number": 7,
  "is_goalkeeper": false,
  "club_id": 1,
  "total_goals": 45,
  "total_assists": 12,
  "matches_played": 15
}
\`\`\`

#### POST `/api/players`
Create a new player (admins and coaches only).

**Request Body:**
\`\`\`json
{
  "name": "John Doe",
  "number": 7,
  "is_goalkeeper": false,
  "club_id": 1
}
\`\`\`

#### PUT `/api/players/{player_id}`
Update player information (admins and coaches only).

#### DELETE `/api/players/{player_id}`
Delete a player (admins only).

---

### Match Endpoints

#### GET `/api/matches`
Get all matches for the user's club.

**Query Parameters:**
- `season` (optional): Filter by season (e.g., "2025-2026")
- `club_id` (optional): Filter by club ID (super admins only)
- `limit` (optional): Limit results (default: 50)

**Response:**
\`\`\`json
[
  {
    "id": 1,
    "match_date": "2025-10-15",
    "opponent": "Rival Team",
    "location": "Home Pool",
    "home_score": 12,
    "away_score": 8,
    "is_home": true,
    "season": "2025-2026",
    "jornada": 5,
    "club_id": 1,
    "created_at": "2025-10-15T18:00:00Z"
  }
]
\`\`\`

#### GET `/api/matches/{match_id}`
Get detailed match information including player statistics.

**Response:**
\`\`\`json
{
  "id": 1,
  "match_date": "2025-10-15",
  "opponent": "Rival Team",
  "home_score": 12,
  "away_score": 8,
  "season": "2025-2026",
  "player_stats": [
    {
      "player_id": 1,
      "player_name": "John Doe",
      "goles_totales": 3,
      "asistencias": 2,
      "tiros_totales": 5
    }
  ]
}
\`\`\`

#### POST `/api/matches`
Create a new match (admins and coaches only).

**Request Body:**
\`\`\`json
{
  "match_date": "2025-10-15",
  "opponent": "Rival Team",
  "location": "Home Pool",
  "home_score": 12,
  "away_score": 8,
  "is_home": true,
  "season": "2025-2026",
  "jornada": 5,
  "notes": "Great match!",
  "club_id": 1
}
\`\`\`

#### PUT `/api/matches/{match_id}`
Update match information (admins and coaches only).

#### DELETE `/api/matches/{match_id}`
Delete a match (admins only).

---

### Match Stats Endpoints

#### GET `/api/matches/{match_id}/stats`
Get all player statistics for a specific match.

#### POST `/api/matches/{match_id}/stats`
Add player statistics for a match (admins and coaches only).

**Request Body:**
\`\`\`json
{
  "player_id": 1,
  "goles_totales": 3,
  "goles_boya_jugada": 2,
  "asistencias": 1,
  "tiros_totales": 5,
  "tiros_eficiencia": 60
}
\`\`\`

#### PUT `/api/match-stats/{stat_id}`
Update specific player statistics (admins and coaches only).

---

### Analytics Endpoints

#### GET `/api/analytics/season/{season}`
Get aggregated statistics for a season.

**Response:**
\`\`\`json
{
  "season": "2025-2026",
  "club_id": 1,
  "total_matches": 15,
  "wins": 10,
  "losses": 5,
  "total_goals_scored": 180,
  "total_goals_conceded": 120,
  "top_scorers": [
    {
      "player_name": "John Doe",
      "goals": 45
    }
  ]
}
\`\`\`

#### GET `/api/analytics/player/{player_id}`
Get detailed analytics for a specific player.

---

### User Management Endpoints (Admin Only)

#### GET `/api/users`
Get all users (super admins only).

#### POST `/api/users`
Create a new user (admins only).

**Request Body:**
\`\`\`json
{
  "email": "newuser@example.com",
  "password": "SecurePassword123!",
  "full_name": "New User",
  "role": "coach",
  "club_id": 1
}
\`\`\`

#### PUT `/api/users/{user_id}`
Update user information (admins only).

#### DELETE `/api/users/{user_id}`
Delete a user (super admins only).

---

## AWS Deployment Guide

### Option 1: AWS EC2

1. **Launch EC2 Instance**
   - Choose Ubuntu Server 22.04 LTS
   - Instance type: t3.small or larger
   - Configure security group to allow ports 80, 443, and 8000

2. **Setup Server**
\`\`\`bash
# SSH into the instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Python and dependencies
sudo apt install python3.10 python3-pip python3-venv nginx -y

# Clone or upload your code
mkdir /var/www/waterpolostats-api
cd /var/www/waterpolostats-api

# Create virtual environment and install dependencies
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
\`\`\`

3. **Configure Systemd Service**
Create `/etc/systemd/system/waterpolostats.service`:
\`\`\`ini
[Unit]
Description=WaterpoloStats FastAPI
After=network.target

[Service]
User=ubuntu
Group=ubuntu
WorkingDirectory=/var/www/waterpolostats-api
Environment="PATH=/var/www/waterpolostats-api/venv/bin"
EnvironmentFile=/var/www/waterpolostats-api/.env
ExecStart=/var/www/waterpolostats-api/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000

[Install]
WantedBy=multi-user.target
\`\`\`

4. **Configure Nginx**
Create `/etc/nginx/sites-available/waterpolostats`:
\`\`\`nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
\`\`\`

5. **Start Services**
\`\`\`bash
sudo systemctl enable waterpolostats
sudo systemctl start waterpolostats
sudo systemctl enable nginx
sudo systemctl restart nginx
\`\`\`

### Option 2: AWS ECS (Docker)

1. **Create Dockerfile**
\`\`\`dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
\`\`\`

2. **Build and Push to ECR**
\`\`\`bash
# Build Docker image
docker build -t waterpolostats-api .

# Tag for ECR
docker tag waterpolostats-api:latest <account-id>.dkr.ecr.<region>.amazonaws.com/waterpolostats-api:latest

# Push to ECR
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/waterpolostats-api:latest
\`\`\`

3. **Create ECS Task Definition and Service**
Use AWS Console or CLI to create ECS cluster, task definition, and service.

### Option 3: AWS Lambda + API Gateway

Use **Mangum** to adapt FastAPI for Lambda:
\`\`\`python
from mangum import Mangum
from main import app

handler = Mangum(app)
\`\`\`

Deploy using AWS SAM or Serverless Framework.

---

## Environment Variables

Create a `.env` file with the following variables:

\`\`\`env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Authentication
JWT_SECRET=your-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Application
API_VERSION=v1
DEBUG=False
ALLOWED_ORIGINS=https://your-frontend.vercel.app,http://localhost:3000

# AWS (if deploying to AWS)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
\`\`\`

---

## Database Configuration

The FastAPI backend connects to the same Supabase PostgreSQL database used by the Next.js frontend. Refer to the database schema SQL file for complete table structures.

### Connection Example

\`\`\`python
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
\`\`\`

---

## Additional Notes

- **CORS**: Configure CORS middleware to allow requests from your Next.js frontend
- **Rate Limiting**: Implement rate limiting for production using libraries like `slowapi`
- **Monitoring**: Use AWS CloudWatch or third-party services for monitoring
- **Backups**: Set up automated database backups
- **SSL/TLS**: Use AWS Certificate Manager for SSL certificates
- **Logging**: Implement structured logging for debugging and auditing

---

## Support

For questions or issues, refer to the main project documentation or contact the development team.
