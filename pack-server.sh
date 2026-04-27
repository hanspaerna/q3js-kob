#!/bin/sh
docker build -t q3js-server . -f ./server/Dockerfile --platform linux/amd64 && \
docker tag q3js-server:latest git.vpn.tsal.al/yanumibaal/q3js-server:latest && \
docker push git.vpn.tsal.al/yanumibaal/q3js-server:latest
