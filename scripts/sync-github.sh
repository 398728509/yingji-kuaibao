#!/bin/bash
cd $HOME/yingji-kuaibao

# 检查是否有变动
if git status --porcelain | grep -q .; then
  git add -A
  git commit -m "$(date "+%Y-%m-%d") 每日自动同步"
  git push origin main 2>&1
  echo "✅ Synced to GitHub"
else
  echo "✅ No changes to sync"
fi
