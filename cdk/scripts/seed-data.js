const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-2' });
const docClient = DynamoDBDocumentClient.from(client);

const CONTENTS_TABLE = 'mcp-poc-contents';
const PAYMENTS_TABLE = 'mcp-poc-payments';

// 샘플 컨텐츠 데이터
const contents = [
  {
    contentId: 'card-001',
    type: 'card',
    title: '루나카드 스타',
    teaser: '별처럼 빛나는 혜택',
    body: '영화, 음악, 공연 등 문화생활 혜택이 가득한 카드입니다.',
  },
  {
    contentId: 'card-002',
    type: 'card',
    title: '루나카드 오로라',
    teaser: '일상을 빛내는 카드',
    body: '카페, 배달, 구독 서비스 할인 혜택이 있는 카드입니다.',
  },
  {
    contentId: 'card-003',
    type: 'card',
    title: '루나카드 프리미엄',
    teaser: '프리미엄 라이프스타일',
    body: '공항 라운지, 호텔, 골프 등 프리미엄 혜택이 제공됩니다.',
  },
  {
    contentId: 'product-001',
    type: 'product',
    name: '할부금융 상품',
    apr: '5.9%',
    benefits: '최대 60개월 무이자 할부',
  },
  {
    contentId: 'product-002',
    type: 'product',
    name: '카드론',
    apr: '7.5%',
    benefits: '최대 5천만원 한도, 신용등급에 따라 우대금리',
  },
];

// 샘플 결제내역 데이터 (테스트용 userId 사용)
const payments = [
  {
    userId: 'test-user-001',
    paymentId: 'pay-001',
    amount: 45000,
    currency: 'KRW',
    paidAt: '2025-10-15T10:30:00Z',
    merchant: '스타벅스',
  },
  {
    userId: 'test-user-001',
    paymentId: 'pay-002',
    amount: 128000,
    currency: 'KRW',
    paidAt: '2025-10-14T15:20:00Z',
    merchant: '쿠팡',
  },
  {
    userId: 'test-user-001',
    paymentId: 'pay-003',
    amount: 89000,
    currency: 'KRW',
    paidAt: '2025-10-13T09:15:00Z',
    merchant: 'CGV',
  },
];

async function seedData() {
  console.log('🌱 데이터 시드 시작...\n');

  // Contents 테이블 시드
  console.log('📝 Contents 테이블 시드 중...');
  for (const content of contents) {
    try {
      await docClient.send(
        new PutCommand({
          TableName: CONTENTS_TABLE,
          Item: content,
        })
      );
      console.log(`✅ ${content.contentId} 추가 완료`);
    } catch (error) {
      console.error(`❌ ${content.contentId} 추가 실패:`, error.message);
    }
  }

  console.log('\n💳 Payments 테이블 시드 중...');
  for (const payment of payments) {
    try {
      await docClient.send(
        new PutCommand({
          TableName: PAYMENTS_TABLE,
          Item: payment,
        })
      );
      console.log(`✅ ${payment.paymentId} 추가 완료`);
    } catch (error) {
      console.error(`❌ ${payment.paymentId} 추가 실패:`, error.message);
    }
  }

  console.log('\n🎉 데이터 시드 완료!');
  console.log('\n📋 테스트 계정 정보:');
  console.log('   userId: test-user-001');
  console.log('   ※ Cognito에서 사용자 생성 후, DynamoDB의 userId를 Cognito sub로 변경하세요.');
}

seedData().catch(console.error);

