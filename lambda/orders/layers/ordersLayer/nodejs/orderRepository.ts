import { DocumentClient } from "aws-sdk/clients/dynamodb";

export interface OrderProduct {
  code: string;
  price: number;
}

export interface Order {
  pk: string;
  sk: string;
  createdAt: number;
  shipping: {
    type: "URGENT" | "ECONOMIC";
    carrier: "UPS" | "FEDEX" | "DHL";
  };
  billing: {
    payment: "CREDIT_CARD" | "DEBIT_CARD" | "CASH";
    totalPrice: number;
  };
  products?: OrderProduct[];
}

export class OrderRepository {
  private dbClient: DocumentClient;
  private tableName: string;

  constructor(dbClient: DocumentClient, tableName: string) {
    this.dbClient = dbClient;
    this.tableName = tableName;
  }

  async create(order: Order): Promise<Order> {
    await this.dbClient
      .put({
        TableName: this.tableName,
        Item: order,
      })
      .promise();

    return order;
  }

  async getAll(): Promise<Order[]> {
    // Should never scan a table in production
    const result = await this.dbClient
      .scan({
        TableName: this.tableName,
        ProjectionExpression: "pk, sk, createdAt, shipping, billing",
      })
      .promise();

    return result.Items as Order[];
  }

  async getOrdersByEmail(email: string): Promise<Order[]> {
    const result = await this.dbClient
      .query({
        TableName: this.tableName,
        KeyConditionExpression: "pk = :email",
        ExpressionAttributeValues: {
          ":email": email,
        },
        ProjectionExpression: "pk, sk, createdAt, shipping, billing",
      })
      .promise();

    return result.Items as Order[];
  }

  async getOrder(email: string, orderId: string): Promise<Order> {
    const result = await this.dbClient
      .get({
        TableName: this.tableName,
        Key: {
          pk: email,
          sk: orderId,
        },
      })
      .promise();

    if (!result.Item) {
      throw new Error("Order not found");
    }

    return result.Item as Order;
  }

  async delete(email: string, orderId: string): Promise<Order> {
    const result = await this.dbClient
      .delete({
        TableName: this.tableName,
        Key: {
          pk: email,
          sk: orderId,
        },
        ReturnValues: "ALL_OLD",
      })
      .promise();

    if (!result.Attributes) {
      throw new Error("Order not found");
    }

    return result.Attributes as Order;
  }
}
