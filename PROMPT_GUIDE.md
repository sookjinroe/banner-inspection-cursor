# 프롬프트 수정 및 배포 가이드

## 📝 프롬프트 수정 방법

### 1. 프롬프트 파일 열기
```bash
code supabase/functions/process-inspection/prompt.ts
```

### 2. 프롬프트 내용 수정
- `SYSTEM_PROMPT` 상수 내의 텍스트를 수정
- 마크다운 형식으로 작성
- JSON 출력 예시도 함께 수정 가능

### 3. 파일 저장
- `Ctrl+S` (Windows/Linux) 또는 `Cmd+S` (Mac)

## 🚀 배포 방법

### 자동 배포 (권장)
```bash
./deploy-prompt.sh
```

### 수동 배포
```bash
# 1. 변경사항 커밋
git add supabase/functions/process-inspection/
git commit -m "Update inspection prompt: [변경 내용]"

# 2. Edge Function 배포
export SUPABASE_ACCESS_TOKEN=sbp_e6913d16ac90b41a2439084b3ad54e8f7e38724d
supabase functions deploy process-inspection
```

## 📊 배포 확인

### Supabase Dashboard
- https://supabase.com/dashboard/project/kfsawswzupmullhwrypa/functions
- Edge Functions → process-inspection → Logs

### 로컬 테스트
```bash
# 검수 실행 후 로그 확인
```

## 🔄 롤백 방법

### 최신 변경사항 롤백
```bash
git revert HEAD
supabase functions deploy process-inspection
```

### 특정 커밋으로 되돌리기
```bash
git log --oneline  # 커밋 히스토리 확인
git revert [커밋해시]
supabase functions deploy process-inspection
```

## ⚠️ 주의사항

1. **프롬프트 길이**: 너무 긴 프롬프트는 GPT 토큰 제한에 걸릴 수 있음
2. **JSON 형식**: 출력 형식 변경 시 프론트엔드 코드도 함께 수정 필요
3. **테스트**: 배포 후 반드시 검수 기능 테스트 권장
4. **백업**: 중요한 프롬프트 변경 전 Git 커밋으로 백업

## 📁 파일 구조

```
supabase/functions/process-inspection/
├── index.ts          # 메인 Edge Function 코드
├── prompt.ts         # 시스템 프롬프트 (수정 대상)
└── deploy-prompt.sh  # 배포 스크립트
```
