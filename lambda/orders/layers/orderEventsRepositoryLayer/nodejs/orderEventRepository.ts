import { DocumentClient } from "aws-sdk/clients/dynamodb";

export interface OrderEventDdb {
  pk: string;
  sk: string;
  ttl: number;
  email: string;
  createdAt: number;
  requestId: string;
  eventType: string;
  info: {
    orderId: string;
    productCodes: string[];
    messageId: string; // MessageId from SNS
  };
}

export class OrderEventRepository {
  private dbClient: DocumentClient;
  private eventsTable: string;

  constructor(dbClient: DocumentClient, eventsTable: string) {
    this.dbClient = dbClient;
    this.eventsTable = eventsTable;
  }

  createOrderEvent(orderEvent: OrderEventDdb) {
    return this.dbClient
      .put({
        TableName: this.eventsTable,
        Item: orderEvent,
      })
      .promise();
  }
}
