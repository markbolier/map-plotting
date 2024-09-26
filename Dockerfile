# Use the official Docker-in-Docker image as base
FROM docker:20.10.7

# Install curl to download kubectl
RUN apk add --no-cache curl

# Download the kubectl binary and install it
RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" \
    && chmod +x ./kubectl \
    && mv ./kubectl /usr/local/bin/kubectl

# Set working directory
WORKDIR /

# Set entrypoint
ENTRYPOINT index.js
