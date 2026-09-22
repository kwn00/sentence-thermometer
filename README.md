# 문장 온도계

TypeSafe Jev로 메시지의 감정, 의도, 긴급할 확률을 읽는 작은 한국어 웹앱입니다. Node.js 22 이상에서 외부 패키지 없이 실행됩니다.

## 실행

```sh
cp .env.example .env
# .env의 TYPESAFE_API_KEY에 본인의 TypeSafe API 키 입력
npm start
```

http://localhost:3000 에 접속하세요. 키가 없어도 ‘예시 결과 보기’로 고정된 샘플을 확인할 수 있습니다. 예시는 실제 분석과 명확하게 구분됩니다. 키 설정 후 서버를 재시작하세요.

- 감정과 의도: Choice의 선택지별 확률과 확신도
- 긴급 여부: Noul의 ‘예’ 확률 (감정 강도나 별도 확신도가 아닙니다)
- `/api/analyze`에서 세 질문을 한 요청으로 `jev-latest`에 전송합니다.
- 입력 메시지는 분석 버튼을 눌렀을 때 TypeSafe에 전송됩니다. 앱은 메시지를 저장하거나 로그에 남기지 않습니다.
- API 키는 서버 환경변수에서만 읽습니다. `.env`는 Git에서 제외됩니다.
- 기본 서버는 로컬호스트에만 바인딩합니다. 공개 서비스 배포 시 사용자 인증 및 사용량 제한을 추가하세요.

## 확인

```sh
npm test
```

테스트는 외부 호출을 모의하여 요청 형태, 응답 검증, 오류 처리를 확인합니다. 실제 모델의 판단 품질 검증은 별도 API 키가 필요합니다.

참고: https://docs.typesafe.ai/api · https://docs.typesafe.ai/primitives/choice · https://docs.typesafe.ai/primitives/noul
