#!/bin/sh
docker build -t q3js-master . -f ./master/Dockerfile --platform linux/amd64 && \
docker tag q3js-master:latest git.vpn.tsal.al/yanumibaal/q3js-master:latest && \
docker push git.vpn.tsal.al/yanumibaal/q3js-master:latest
