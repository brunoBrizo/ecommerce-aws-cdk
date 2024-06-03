import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamoDb from "aws-cdk-lib/aws-dynamodb";

export class EventsDdbStack extends cdk.Stack {
  readonly eventsTable: dynamoDb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.eventsTable = new dynamoDb.Table(this, "EventsDdb", {
      tableName: "events",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      partitionKey: {
        name: "pk",
        type: dynamoDb.AttributeType.STRING,
      },
      sortKey: {
        name: "sk",
        type: dynamoDb.AttributeType.STRING,
      },
      timeToLiveAttribute: "ttl",
      billingMode: dynamoDb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
    });

    const readScale = this.eventsTable.autoScaleReadCapacity({
      maxCapacity: 2,
      minCapacity: 1,
    });

    readScale.scaleOnUtilization({
      targetUtilizationPercent: 50,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    const writeScale = this.eventsTable.autoScaleWriteCapacity({
      maxCapacity: 2,
      minCapacity: 1,
    });

    writeScale.scaleOnUtilization({
      targetUtilizationPercent: 30,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });
  }
}
