import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ssm from "aws-cdk-lib/aws-ssm";

export class ProductsAppLayerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const productsLayer = new lambda.LayerVersion(this, "ProductsLayer", {
      layerVersionName: "ProductsLayer",
      code: lambda.Code.fromAsset("lambda/products/layers/productsLayer"),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      removalPolicy: cdk.RemovalPolicy.DESTROY, // This should be RETAIN for prod
    });

    new ssm.StringParameter(this, "ProductsLayerVersionArn", {
      parameterName: "ProductsLayerVersionArn",
      stringValue: productsLayer.layerVersionArn,
    });

    const productEventsLayer = new lambda.LayerVersion(
      this,
      "ProductEventsLayer",
      {
        layerVersionName: "ProductEventsLayer",
        code: lambda.Code.fromAsset(
          "lambda/products/layers/productEventsLayer"
        ),
        compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
        removalPolicy: cdk.RemovalPolicy.DESTROY, // This should be RETAIN for prod
      }
    );

    new ssm.StringParameter(this, "ProductEventsLayerVersionArn", {
      parameterName: "ProductEventsLayerVersionArn",
      stringValue: productEventsLayer.layerVersionArn,
    });
  }
}
