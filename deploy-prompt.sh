#!/bin/bash

# 프롬프트 수정 및 배포 스크립트
# 사용법: ./deploy-prompt.sh

echo "🚀 프롬프트 수정 및 배포 시작..."

# 환경 변수 설정
export SUPABASE_ACCESS_TOKEN=sbp_e6913d16ac90b41a2439084b3ad54e8f7e38724d

# 변경사항 확인
if git diff --quiet supabase/functions/process-inspection/; then
    echo "❌ 변경사항이 없습니다. 프롬프트를 먼저 수정해주세요."
    exit 1
fi

echo "📝 변경사항 감지됨:"
git diff --name-only supabase/functions/process-inspection/

# 변경사항 커밋
echo "📝 변경사항 커밋 중..."
git add supabase/functions/process-inspection/
git commit -m "Update inspection prompt: $(date '+%Y-%m-%d %H:%M:%S')"

if [ $? -ne 0 ]; then
    echo "❌ 커밋 실패!"
    exit 1
fi

# Edge Function 배포
echo "🚀 Edge Function 배포 중..."
supabase functions deploy process-inspection

if [ $? -eq 0 ]; then
    echo "✅ 배포 완료!"
    echo ""
    echo "🔍 Supabase Dashboard에서 로그를 확인하세요:"
    echo "https://supabase.com/dashboard/project/kfsawswzupmullhwrypa/functions"
    echo ""
    echo "📊 최근 커밋:"
    git log --oneline -1
else
    echo "❌ 배포 실패!"
    echo "🔄 롤백을 원하시면 다음 명령어를 실행하세요:"
    echo "git revert HEAD && supabase functions deploy process-inspection"
    exit 1
fi