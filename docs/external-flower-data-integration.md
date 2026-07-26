# 외부 화훼 데이터 연계 설계

## 목적과 원칙

외부 공공데이터는 `판매 가능 재고`가 아니라 **시장 시세와 유통 가능성 신호**로 사용한다. 공판장 낙찰 물량이 있어도 일반 고객이 해당 장소에서 즉시 낱개 구매할 수 있다는 뜻은 아니므로, 인생내꽃 주문은 반드시 승인된 판매처의 실재고 및 제작 가능 확인을 거친다.

DIY 판매처 탐색 우선순위는 다음과 같다.

1. 리뷰가 작성된 원 판매처의 실재고
2. 반경 안 승인 판매처의 실재고
3. 부족 꽃에 대한 원 판매처 재입고 알림
4. aT·공영도매시장 데이터에 나타난 최근 거래 신호와 참고 시세
5. 판매처가 외부 조달 후 제작 가능 여부를 확정하면 주문 가능 상태로 전환

## 공식 데이터 소스

- aT 화훼유통정보시스템: 실시간 경매정보, 품목·지역별 거래현황을 시세/유통 신호로 수집한다.
- 공공데이터포털 aT 전국 공영도매시장 실시간 경매정보: 최근 낙찰 품목·품종·등급·단위·가격을 정규화한다.
- aT 농축수산물 표준코드 API: 시장, 법인, 품목, 품종, 등급, 단위, 포장 코드 매핑에 사용한다.
- aT 가격 추이 API: 당일 및 1~4주 평균가격을 고객 참고가와 판매자 조달 판단에 사용한다.
- 산지공판장·온라인 도매시장·전자송품장 예측·가격 등락·출하량 추이·지역별/월별/최근일 가격 API도 서버 수집 레지스트리에 포함한다.

각 API는 공공데이터포털 활용신청으로 받은 서버 전용 키를 사용하며 브라우저에 키를 노출하지 않는다.

## 정규화 모델

`ExternalFlowerMarketSignal`

| 필드 | 의미 |
|---|---|
| provider | `AT_FLOWER`, `PUBLIC_WHOLESALE` 등 제공자 |
| marketCode / marketName | 공판장·도매시장 |
| itemCode / varietyCode | 원천 표준 코드 |
| normalizedFlowerId | 인생내꽃 `FLOWERS.id` 매핑 |
| grade / unit | 등급과 거래 단위 |
| tradedQuantity | 거래 물량(매장 재고가 아님) |
| minPrice / avgPrice / maxPrice | 거래 단위 기준 시세 |
| observedAt | 경매·조사 시점 |
| fetchedAt | 수집 시점 |
| sourceUrl | 원문 확인 링크 |

## 처리 흐름

1. 서버 수집 작업이 제공자 어댑터를 호출한다.
2. 원천 코드를 표준코드와 내부 꽃 ID에 매핑하고 원본 응답 해시를 저장해 중복을 제거한다.
3. 품종명이 불명확한 행은 자동 노출하지 않고 관리자 매핑 대기열로 보낸다.
4. DIY 재고 조회는 내부 `SellerStock`만 주문 가능으로 판정한다.
5. 내부 재고가 없으면 최근 외부 신호를 `공판장 거래 확인됨 · 판매처 조달 확인 필요`로 표시하고 재입고/조달 문의를 받는다.
6. 판매자가 확보 수량과 가격을 확정한 뒤에만 내부 재고로 반영한다.

## API 경계

- `GET /api/diy/seller-matches`: 실제 주문 가능한 등록 판매처만 반환
- `POST /api/diy/restock-requests`: 판매처 재입고 알림 신청
- `GET /api/diy/market-signals?flowerIds=...`: 캐시된 외부 거래 신호와 참고 시세 반환(추후 구현)
- `POST /api/internal/external-flower-data/sync`: 관리자/스케줄러 전용 동기화(추후 구현)
- `GET /api/admin/external-flower-data`: 지원 소스와 키 설정 상태 조회
- `POST /api/admin/external-flower-data`: 허용된 소스·파라미터로 원천 API 호출
  - `sourceId: "all"`이면 등록된 전체 소스를 병렬 수집하며, 일부 API 실패도 나머지 결과와 함께 반환한다.

## 운영 체크리스트

- 공공데이터포털 활용신청 및 트래픽 한도 확인
- `DATA_GO_KR_SERVICE_KEY`를 서버 환경 변수/비밀 저장소에 등록
- 품목·품종 코드와 내부 꽃 ID 최초 매핑 승인
- 호출 실패 시 마지막 성공 데이터와 갱신 시각 표시
- 오래된 데이터는 주문 가능 판단에서 제외
- 가격은 `참고 시세`로 명시하고 판매가와 분리
- 제공기관 출처, 관측시각, 단위, 등급을 UI에 함께 표시

## 공공데이터포털 API 키 발급 절차

1. [공공데이터포털](https://www.data.go.kr/)에 가입하고 로그인한다.
2. 아래 데이터 페이지마다 `활용신청`을 누른다. 한 번 받은 포털 인증키를 사용하지만, **API별 활용신청은 각각 필요**하다.
   - [전국 공영도매시장 실시간 경매정보](https://www.data.go.kr/data/15141808/openapi.do)
   - [전국 공영도매시장 정산정보](https://www.data.go.kr/data/15141809/openapi.do)
   - [농축수산물 표준코드](https://www.data.go.kr/data/15141818/openapi.do)
   - [전국 산지공판장 거래정보](https://www.data.go.kr/data/15156054/openapi.do)
   - [전자송품장 출하구매물량 예측](https://www.data.go.kr/data/15141815/openapi.do)
   - [가격 추이](https://www.data.go.kr/data/15156069/openapi.do)
   - [가격 등락](https://www.data.go.kr/data/15156070/openapi.do)
   - [출하량 추이](https://www.data.go.kr/data/15156075/openapi.do)
   - [온라인 도매시장 거래정보](https://www.data.go.kr/data/15141811/openapi.do)
3. 신청 화면에서 개발계정, 활용 목적 `웹/앱 서비스 개발`, 상세 목적 `화훼 상품 시세·거래량 분석 및 판매처 조달 참고정보 제공` 등으로 작성한다. 자동승인 API는 보통 승인 후 바로 사용할 수 있다.
4. 마이페이지 → `OpenAPI` → `개발계정`에서 승인 상태를 확인한다.
5. 해당 API 상세의 `일반 인증키(Decoding)` 값을 복사한다. 이 프로젝트는 URLSearchParams가 값을 안전하게 인코딩하므로 Decoding 키 사용을 권장한다.
6. `.env.local`에 다음을 추가하고 개발 서버를 재시작한다.

```env
DATA_GO_KR_SERVICE_KEY="공공데이터포털에서_복사한_Decoding_인증키"
```

7. 관리자 로그인 후 `GET /api/admin/external-flower-data`에서 `configured: true`인지 확인한다.
8. 단일 소스는 `POST /api/admin/external-flower-data`에 `{ "sourceId": "realtime-auction", "params": { ... } }`, 전체 점검은 `{ "sourceId": "all", "params": { ... } }`로 호출한다.

개발계정의 기본 호출 한도는 API별로 관리된다. 운영 전에는 공공데이터포털에 활용사례를 등록하고 트래픽 증설을 신청하며, 전체 수집은 매 화면 요청마다 실행하지 않고 서버 스케줄러와 DB 캐시를 사용한다.
