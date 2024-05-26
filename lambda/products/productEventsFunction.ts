import { Callback, Context } from "aws-lambda";
import { ProductEvent } from "/opt/nodejs/productEventsLayer";
import { DynamoDB } from "aws-sdk";
import * as AwsXRay from "aws-xray-sdk";

AwsXRay.captureAWS(require("aws-sdk"));
const eventsTable = process.env.EVENTS_TABLE!;
const dbClient = new DynamoDB.DocumentClient();

export async function handler(
  event: ProductEvent,
  context: Context,
  callback: Callback
): Promise<void> {
  // Remove this later
  console.log("Product Event: ", event);

  console.log(`Lambda Request ID: ${context.awsRequestId}`);

  await createEvent(event);

  callback(
    null,
    JSON.stringify({
      productEventCreated: true,
      message: "Ok",
    })
  );
}

function createEvent(event: ProductEvent) {
  const tmsp = Date.now();
  const ttl = Math.round(tmsp / 1000 + 5 * 60); // 5 minutes from now

  return dbClient
    .put({
      TableName: eventsTable,
      Item: {
        pk: `#product_${event.productCode}`, // #product_123
        sk: `${event.eventType}#${tmsp}`, // PRODUCT_CREATED#123456789
        email: event.email,
        createdAt: tmsp,
        requestId: event.requestId,
        eventType: event.eventType,
        info: {
          productId: event.productId,
          price: event.productPrice,
        },
        ttl,
      },
    })
    .promise();
}
