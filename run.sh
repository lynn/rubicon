#!/usr/bin/env bash
# Run Rubicon locally as a desktop Java application.
# Requires a JDK with the java.applet API: JDK 8-25 (removed in JDK 26, see README).
set -euo pipefail
cd "$(dirname "$0")"
exec java -cp original/rubicon.jar:original/core.jar rubicon "$@"
