#!/bin/sh
docker build -t q3js-tgbot ./tgbot --platform linux/amd64 && \
docker tag q3js-tgbot:latest git.vpn.tsal.al/yanumibaal/q3js-tgbot:latest && \
docker push git.vpn.tsal.al/yanumibaal/q3js-tgbot:latest
