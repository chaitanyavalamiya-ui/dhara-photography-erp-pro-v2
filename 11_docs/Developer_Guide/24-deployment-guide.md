# Deployment Guide

## Document Information

| Item | Value |
|------|-------|
| Module | Deployment Guide |
| Version | 2.0 |
| Status | Final |
| Documentation Type | Codex Ready |

---

# Purpose

This document defines the deployment process for Dhara Photography ERP Pro V2.

It covers development, staging and production deployment.

---

# Technology Stack

Frontend
- React
- Vite

Backend
- Node.js
- Express.js

Database
- PostgreSQL

Web Server
- Nginx

Operating System
- Ubuntu LTS

Version Control
- Git + GitHub

---

# Environment Types

- Local Development
- Testing
- Staging
- Production

Each environment must have separate configuration.

---

# Minimum Server Requirements

Application Server

- 4 CPU Cores
- 8 GB RAM
- 100 GB SSD

Database Server

- PostgreSQL 16+
- Daily Backup Enabled

---

# Environment Variables

Store outside source code:

- DATABASE_URL
- JWT_SECRET
- REFRESH_TOKEN_SECRET
- SMTP_SETTINGS
- STORAGE_PATH
- APP_URL

Never commit secrets to Git.

---

# Frontend Deployment

- Install dependencies
- Build production assets
- Upload build files
- Configure web server
- Verify application

---

# Backend Deployment

- Install dependencies
- Configure environment
- Run database migrations
- Start application
- Configure process manager
- Enable automatic restart

---

# Database Deployment

- Create PostgreSQL database
- Create application user
- Apply schema
- Seed master data
- Verify indexes
- Take initial backup

---

# Reverse Proxy

Configure Nginx for:

- HTTPS
- API Routing
- Static Assets
- Gzip Compression
- Security Headers

---

# SSL

- HTTPS Mandatory
- Trusted SSL Certificate
- Automatic Renewal

---

# Pre-Deployment Checklist

- Documentation Updated
- Code Reviewed
- Tests Passed
- Database Backup Taken
- Environment Variables Verified
- Version Tagged

---

# Post-Deployment Checklist

- Login Successful
- Dashboard Working
- Booking Working
- Reports Working
- Upload Working
- Backup Running
- Logs Verified

---

# Rollback Procedure

- Stop new deployment
- Restore previous release
- Restore database only if required
- Verify system
- Record incident

---

# Monitoring

Monitor:

- CPU Usage
- Memory Usage
- Disk Space
- Database Health
- Application Logs
- Backup Status

---

# Business Rules

- Always backup before deployment.
- Never deploy directly to production without testing.
- Production deployment requires owner approval.
- Every deployment must have a version tag.

---

# Future Scope

- Docker Deployment
- Kubernetes
- CI/CD Pipeline
- Blue-Green Deployment
- Zero Downtime Deployment
- Auto Scaling

END OF DOCUMENT
