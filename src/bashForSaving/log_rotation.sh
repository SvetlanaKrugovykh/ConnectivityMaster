#!/bin/bash

# Get yesterday's date in the format YYYY-MM-DD
yesterday=$(date -v -1d +%Y-%m-%d)
# Echo the value of yesterday
echo "Yesterday's date: $yesterday"

# Define log file paths
error_log="/root/.pm2/logs/Obuhiv-CM-Server-error.log"
out_log="/root/.pm2/logs/Obuhiv-CM-Server-out.log"
old_logs_dir="/root/.pm2/logs/old_logs"

# Create the old_logs directory if it doesn't exist
mkdir -p "$old_logs_dir"
echo $error_log $out_log $ol_log_dir

# Check if logs are not empty before moving
if [ -s "$error_log" ]; then
    mv "$error_log" "$old_logs_dir/Obuhiv-CM-Server-error_$yesterday.log"
fi

if [ -s "$out_log" ]; then
    mv "$out_log" "$old_logs_dir/Obuhiv-CM-Server-out_$yesterday.log"
fi

# Create new log files
touch "$error_log"
touch "$out_log"

# Rest of your script...
