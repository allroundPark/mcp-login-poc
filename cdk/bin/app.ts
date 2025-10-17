#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { McpLoginPocStack } from '../lib/mcp-login-poc-stack';

const app = new cdk.App();

new McpLoginPocStack(app, 'McpLoginPocStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-2',
  },
  description: 'MCP Login POC - Cognito + API Gateway + Lambda + DynamoDB',
});

