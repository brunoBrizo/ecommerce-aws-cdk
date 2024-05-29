import { Context, SNSEvent, SNSMessage } from "aws-lambda";
import { DynamoDB } from "aws-sdk";
import * as AwsXRay from "aws-xray-sdk";
import {
  OrderEventDdb,
  OrderEventRepository,
} from "/opt/nodejs/orderEventsRepositoryLayer";
import { Envelope, OrderEvent } from "/opt/nodejs/orderEventsLayer";

AwsXRay.captureAWS(require("aws-sdk"));

const eventsTable = process.env.EVENTS_TABLE!;
const dbClient = new DynamoDB.DocumentClient();
const orderEventsRepository = new OrderEventRepository(dbClient, eventsTable);

export async function handler(
  event: SNSEvent,
  context: Context
): Promise<void> {
  await Promise.all(event.Records.map((record) => createEvent(record.Sns)));
}

function createEvent(body: SNSMessage) {
  const envelope = JSON.parse(body.Message) as Envelope;
  const event = JSON.parse(envelope.data) as OrderEvent;

  const tmsp = Date.now();
  const ttl = Math.round(tmsp / 1000 + 5 * 60); // 5 minutes from now

  const orderEventDdb: OrderEventDdb = {
    pk: `#order_${event.orderId}`,
    sk: `#${envelope.eventType}#${tmsp}`,
    ttl,
    email: event.email,
    createdAt: tmsp,
    requestId: event.requestId,
    eventType: envelope.eventType,
    info: {
      orderId: event.orderId,
      productCodes: event.productCodes,
      messageId: body.MessageId,
    },
  };

  console.log(`Order Event - MessageId: ${body.MessageId}`);
  return orderEventsRepository.createOrderEvent(orderEventDdb);
}
