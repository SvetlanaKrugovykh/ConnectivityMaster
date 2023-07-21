#!/bin/bash

url="http://127.0.0.1:8000/api/trafficAnalyze/log-saving/"
body='{
  "srcIpAddress": "*",
  "dstIpAddress": "*",
  "startDate": "2023-07-20T12:00:00",
  "endDate": "2023-07-20T12:59:59"
}'

# Set the authorization header value
authorization='dfgdfg'

# Make the POST request using curl
curl -X POST "$url" \
     -H "Authorization: $authorization" \
     -H "Content-Type: application/json" \
     -d "$body"
