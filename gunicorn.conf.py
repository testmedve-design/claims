# Gunicorn configuration for Hospital Claims Management System
import os

# Server socket
bind = f"0.0.0.0:{os.environ.get('PORT', '10000')}"
backlog = 2048

# Worker processes
workers = 2
worker_class = "sync"
worker_connections = 1000
timeout = 30
keepalive = 2

# Restart workers after this many requests, to help prevent memory leaks
max_requests = 1000
max_requests_jitter = 50

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

# Process naming
proc_name = "hospital-claims-backend"

# Server mechanics
daemon = False
pidfile = None
user = None
group = None
tmp_upload_dir = None

# SSL (if needed)
# keyfile = None
# certfile = None

# Preload app for better performance
preload_app = True

# Environment variables
raw_env = [
    f"FLASK_ENV={os.environ.get('FLASK_ENV', 'production')}",
    f"DEBUG={os.environ.get('DEBUG', 'false')}",
    f"HOST={os.environ.get('HOST', '0.0.0.0')}",
    f"PORT={os.environ.get('PORT', '10000')}",
]
