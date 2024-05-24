import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamoDb from "aws-cdk-lib/aws-dynamodb";

export class ProductsAppStack extends cdk.Stack {
  readonly productsFetchHandler: lambdaNodeJS.NodejsFunction;
  readonly productsTable: dynamoDb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.productsTable = new dynamoDb.Table(this, "ProductsTable", {
      tableName: "products",
      removalPolicy: cdk.RemovalPolicy.DESTROY, // This should be removed to prod
      partitionKey: {
        name: "id",
        type: dynamoDb.AttributeType.STRING,
      },
      billingMode: dynamoDb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
    });

    this.productsFetchHandler = new lambdaNodeJS.NodejsFunction(
      this,
      "ProductsFetchHandler",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        functionName: "ProductsFetchHandler",
        entry: "lambda/products/productsFetchFunctions.ts",
        handler: "handler",
        memorySize: 512,
        timeout: cdk.Duration.seconds(5),
        bundling: {
          minify: true,
          sourceMap: false,
        },
        environment: {
          PRODUCTS_TABLE: this.productsTable.tableName,
        },
      }
    );

    this.productsTable.grantReadData(this.productsFetchHandler);
  }
}
