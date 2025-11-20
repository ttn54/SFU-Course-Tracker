#!/bin/sh
set -e

# Start SSH daemon
echo "Starting SSH..."
/usr/sbin/sshd

# Start the Node.js application
echo "Starting Node.js application..."
exec npm start