import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ssm from "aws-cdk-lib/aws-ssm";

export class AuthLayersStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const authUserInfoLayer = new lambda.LayerVersion(
      this,
      "AuthUserInfoLayer",
      {
        code: lambda.Code.fromAsset("lambda/auth/layers/authUserInfoLayer"),
        compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
        layerVersionName: "AuthUserInfo",
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      }
    );

    new ssm.StringParameter(this, "AuthUserInfoLayerVersionArn", {
      parameterName: "AuthUserInfoLayerVersionArn",
      stringValue: authUserInfoLayer.layerVersionArn,
    });
  }
}
