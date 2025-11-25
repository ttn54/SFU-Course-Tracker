#!/bin/sh
set -e

# Generate SSH host keys if they don't exist
echo "Generating SSH host keys..."
ssh-keygen -A

# Start SSH daemon
echo "Starting SSH..."
/usr/sbin/sshd

# Start the Node.js application
echo "Starting Node.js application..."
exec npm start