import { Context, SNSMessage, SQSEvent } from "aws-lambda";
import * as AwsXRay from "aws-xray-sdk";
import { Envelope, OrderEvent } from "/opt/nodejs/orderEventsLayer";
import { SES } from "aws-sdk";

AwsXRay.captureAWS(require("aws-sdk"));

const sesClient = new SES();

export async function handler(event: SQSEvent, context: Context) {
  const promises = event.Records.map((record) => {
    console.log(JSON.stringify(record.body));
    const body = JSON.parse(record.body) as SNSMessage;
    return sendOrderEmail(body);
  });

  await Promise.all(promises);
}

async function sendOrderEmail(body: SNSMessage) {
  const envelope = JSON.parse(body.Message) as Envelope;
  const event = JSON.parse(envelope.data) as OrderEvent;

  return sesClient.sendEmail({
    Destination: {
      ToAddresses: [event.email],
    },
    Message: {
      Body: {
        Text: {
          Charset: "UTF-8",
          Data: `Received order ${event.orderId} with total amount of ${event.billing.totalPrice}`,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: "Order Received",
      },
    },
    Source: "bbrizolara7@gmail.com",
    ReplyToAddresses: ["bbrizolara7@gmail.com"],
  });
}
