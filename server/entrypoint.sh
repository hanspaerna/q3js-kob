#!/usr/bin/env bash
set -Eeuo pipefail

args=("$@")
has_fs_game_arg=false

for ((i = 0; i < ${#args[@]} - 1; i++)); do
  if [[ "${args[$i]}" == "+set" && "${args[$((i + 1))]}" == "fs_game" ]]; then
    has_fs_game_arg=true
    break
  fi
done

if [[ "$has_fs_game_arg" == false ]]; then
  args=("+set" "fs_game" "${FS_GAME:-baseq3}" "${args[@]}")
fi

# Export server arguments for the proxy to use
export SERVER_BINARY_PATH="./ioq3ded"
export SERVER_ARGS="${args[*]}"

# The proxy will now spawn and manage the server process
exec node ../proxy/index.js
