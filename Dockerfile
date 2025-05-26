```dockerfile
# ...existing Dockerfile content...

# Install cron and Python
RUN apt-get update && apt-get install -y cron python3

# Copy the cron job definition
COPY backend/scripts/update_data.cron /etc/cron.d/update_data

# Give execution rights on the cron job
RUN chmod 0644 /etc/cron.d/update_data

# Apply the cron job
RUN crontab /etc/cron.d/update_data

# Start the cron service
CMD ["cron", "-f"]
```