#!/bin/sh
inotifywait -q -m -e attrib,create "build/" | while read DIRECTORY EVENT FILE; do
  tmp=`stat -c '%U' "$DIRECTORY""$FILE"`
  if [[ "$tmp" = 'root' ]]; then
     chown "redis:redis" "$DIRECTORY""$FILE"
  fi
done