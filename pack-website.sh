#!/bin/sh
docker build -t q3js-website ./website --platform linux/amd64 && \
docker tag q3js-website:latest git.vpn.tsal.al/yanumibaal/q3js-website:latest && \
docker push git.vpn.tsal.al/yanumibaal/q3js-website:latest
