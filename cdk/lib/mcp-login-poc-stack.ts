import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as apigatewayv2Authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

export class McpLoginPocStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ========== DynamoDB Tables ==========
    const contentsTable = new dynamodb.Table(this, 'ContentsTable', {
      tableName: 'mcp-poc-contents',
      partitionKey: { name: 'contentId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    contentsTable.addGlobalSecondaryIndex({
      indexName: 'type-index',
      partitionKey: { name: 'type', type: dynamodb.AttributeType.STRING },
    });

    const paymentsTable = new dynamodb.Table(this, 'PaymentsTable', {
      tableName: 'mcp-poc-payments',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'paymentId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ========== Cognito User Pool ==========
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'mcp-poc-user-pool',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        username: true,
      },
      autoVerify: { email: true },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Hosted UI Domain
    const userPoolDomain = userPool.addDomain('UserPoolDomain', {
      cognitoDomain: {
        domainPrefix: `mcp-poc-${cdk.Aws.ACCOUNT_ID}`,
      },
    });

    // App Client for Frontend (Vercel)
    const frontendClient = userPool.addClient('FrontendClient', {
      userPoolClientName: 'mcp-poc-frontend',
      authFlows: {
        userPassword: false,
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: [
          'http://localhost:3000/auth/callback',
          // Vercel 배포 후 추가: 'https://your-vercel-domain.vercel.app/auth/callback'
        ],
        logoutUrls: [
          'http://localhost:3000',
          // Vercel 배포 후 추가: 'https://your-vercel-domain.vercel.app'
        ],
      },
      generateSecret: false,
      preventUserExistenceErrors: true,
    });

    // App Client for MCP Server
    const mcpClient = userPool.addClient('McpClient', {
      userPoolClientName: 'mcp-poc-mcp',
      authFlows: {
        userPassword: false,
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: [
          'http://localhost:4000/oauth/callback',
        ],
        logoutUrls: [
          'http://localhost:4000',
        ],
      },
      generateSecret: false,
      preventUserExistenceErrors: true,
    });

    // ========== Lambda Functions ==========
    
    // Public Lambda (무인증)
    const publicLambda = new lambda.Function(this, 'PublicLambda', {
      functionName: 'mcp-poc-public-handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/public')),
      environment: {
        CONTENTS_TABLE: contentsTable.tableName,
      },
      timeout: cdk.Duration.seconds(10),
    });

    contentsTable.grantReadData(publicLambda);

    // Protected Lambda (JWT 인증 필요)
    const protectedLambda = new lambda.Function(this, 'ProtectedLambda', {
      functionName: 'mcp-poc-protected-handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/protected')),
      environment: {
        PAYMENTS_TABLE: paymentsTable.tableName,
      },
      timeout: cdk.Duration.seconds(10),
    });

    paymentsTable.grantReadData(protectedLambda);

    // ========== API Gateway (HTTP API) ==========
    const httpApi = new apigatewayv2.HttpApi(this, 'HttpApi', {
      apiName: 'mcp-poc-api',
      description: 'MCP Login POC API',
      corsPreflight: {
        allowOrigins: ['*'], // 모든 오리진 허용 (POC용)
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ['Content-Type', 'Authorization'],
        allowCredentials: false, // * 오리진 사용 시 false 필요
      },
    });

    // JWT Authorizer
    const jwtAuthorizer = new apigatewayv2Authorizers.HttpJwtAuthorizer(
      'JwtAuthorizer',
      `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
      {
        jwtAudience: [frontendClient.userPoolClientId, mcpClient.userPoolClientId],
      }
    );

    // Public Routes
    const publicIntegration = new apigatewayv2Integrations.HttpLambdaIntegration(
      'PublicIntegration',
      publicLambda
    );

    httpApi.addRoutes({
      path: '/public/{proxy+}',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: publicIntegration,
    });

    // Protected Routes
    const protectedIntegration = new apigatewayv2Integrations.HttpLambdaIntegration(
      'ProtectedIntegration',
      protectedLambda
    );

    httpApi.addRoutes({
      path: '/me/{proxy+}',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: protectedIntegration,
      authorizer: jwtAuthorizer,
    });

    // ========== Outputs ==========
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: 'McpPocUserPoolId',
    });

    new cdk.CfnOutput(this, 'UserPoolArn', {
      value: userPool.userPoolArn,
      description: 'Cognito User Pool ARN',
    });

    new cdk.CfnOutput(this, 'FrontendClientId', {
      value: frontendClient.userPoolClientId,
      description: 'Frontend App Client ID',
      exportName: 'McpPocFrontendClientId',
    });

    new cdk.CfnOutput(this, 'McpClientId', {
      value: mcpClient.userPoolClientId,
      description: 'MCP Server App Client ID',
      exportName: 'McpPocMcpClientId',
    });

    new cdk.CfnOutput(this, 'CognitoDomain', {
      value: userPoolDomain.domainName,
      description: 'Cognito Hosted UI Domain',
      exportName: 'McpPocCognitoDomain',
    });

    new cdk.CfnOutput(this, 'CognitoHostedUIUrl', {
      value: `https://${userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com`,
      description: 'Cognito Hosted UI URL',
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: httpApi.apiEndpoint,
      description: 'API Gateway Endpoint',
      exportName: 'McpPocApiEndpoint',
    });

    new cdk.CfnOutput(this, 'ContentsTableName', {
      value: contentsTable.tableName,
      description: 'Contents DynamoDB Table',
    });

    new cdk.CfnOutput(this, 'PaymentsTableName', {
      value: paymentsTable.tableName,
      description: 'Payments DynamoDB Table',
    });
  }
}

