# Use the official Docker-in-Docker image as base
FROM docker:20.10.7

# Install kubectl directly using the package manager (apk)
RUN apk add --no-cache kubectl

# Set working directory
WORKDIR /

# Set entrypoint
ENTRYPOINT index.js
