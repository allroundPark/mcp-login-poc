const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const CONTENTS_TABLE = process.env.CONTENTS_TABLE;

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  const path = event.rawPath || event.path;
  const pathParts = path.split('/').filter(Boolean);

  try {
    // GET /public/cards
    if (pathParts[1] === 'cards') {
      const result = await docClient.send(
        new QueryCommand({
          TableName: CONTENTS_TABLE,
          IndexName: 'type-index',
          KeyConditionExpression: '#type = :type',
          ExpressionAttributeNames: {
            '#type': 'type',
          },
          ExpressionAttributeValues: {
            ':type': 'card',
          },
        })
      );

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(result.Items || []),
      };
    }

    // GET /public/products
    if (pathParts[1] === 'products') {
      const result = await docClient.send(
        new QueryCommand({
          TableName: CONTENTS_TABLE,
          IndexName: 'type-index',
          KeyConditionExpression: '#type = :type',
          ExpressionAttributeNames: {
            '#type': 'type',
          },
          ExpressionAttributeValues: {
            ':type': 'product',
          },
        })
      );

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(result.Items || []),
      };
    }

    // 기타 경로
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Not Found' }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Internal Server Error', message: error.message }),
    };
  }
};

