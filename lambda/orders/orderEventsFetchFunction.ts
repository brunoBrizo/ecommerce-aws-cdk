import * as AwsXRay from "aws-xray-sdk";
import { DynamoDB } from "aws-sdk";
import {
  OrderEventDdb,
  OrderEventRepository,
} from "/opt/nodejs/orderEventsRepositoryLayer";
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";

AwsXRay.captureAWS(require("aws-sdk"));

const eventsTable = process.env.EVENTS_TABLE!;
const dbClient = new DynamoDB.DocumentClient();
const orderEventsRepository = new OrderEventRepository(dbClient, eventsTable);

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const email = event.queryStringParameters!.email!;
  const eventType = event.queryStringParameters!.eventType;

  let result: OrderEventDdb[];

  if (eventType) {
    result = await orderEventsRepository.getOrderEventsByEmailAndType(
      email,
      eventType
    );
  } else {
    result = await orderEventsRepository.getOrderEventsByEmail(email);
  }

  if (result) {
    const data = convertOrderEvents(result);

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  }

  return {
    statusCode: 400,
    body: JSON.stringify({ message: "Bad Request" }),
  };
}

function convertOrderEvents(orderEvents: OrderEventDdb[]) {
  return orderEvents.map((orderEvent) => {
    return {
      email: orderEvent.email,
      createdAt: orderEvent.createdAt,
      eventType: orderEvent.eventType,
      requestId: orderEvent.requestId,
      orderId: orderEvent.info.orderId,
      productCodes: orderEvent.info.productCodes,
    };
  });
}
