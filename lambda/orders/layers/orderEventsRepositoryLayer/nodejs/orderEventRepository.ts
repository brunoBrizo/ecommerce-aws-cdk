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

  async getOrderEventsByEmail(email: string) {
    const data = await this.dbClient
      .query({
        TableName: this.eventsTable,
        IndexName: "emailIndex",
        KeyConditionExpression: "email = :email AND begins_with(sk, :prefix)",
        ExpressionAttributeValues: {
          ":email": email,
          ":prefix": "ORDER_",
        },
      })
      .promise();

    return data.Items as OrderEventDdb[];
  }

  async getOrderEventsByEmailAndType(email: string, eventType: string) {
    const data = await this.dbClient
      .query({
        TableName: this.eventsTable,
        IndexName: "emailIndex",
        KeyConditionExpression: "email = :email AND begins_with(sk, :prefix)",
        ExpressionAttributeValues: {
          ":email": email,
          ":prefix": eventType,
        },
      })
      .promise();

    return data.Items as OrderEventDdb[];
  }
}
