import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { v4 as uuid } from "uuid";

export interface Product {
  id: string;
  productName: string;
  code: string;
  price: number;
  model: string;
}

export class ProductRepository {
  private dbClient: DocumentClient;
  private readonly tableName: string;

  constructor(dbClient: DocumentClient, tableName: string) {
    this.tableName = tableName;
    this.dbClient = dbClient;
  }

  async getProducts(): Promise<Product[]> {
    const data = await this.dbClient
      .scan({
        TableName: this.tableName,
      })
      .promise();

    return data.Items as Product[];
  }

  async getProductById(id: string): Promise<Product> {
    const data = await this.dbClient
      .get({
        TableName: this.tableName,
        Key: {
          id,
        },
      })
      .promise();

    if (!data.Item) {
      throw new Error(`Product with ID ${id} not found`);
    }

    return data.Item as Product;
  }

  async createProduct(product: Product): Promise<Product> {
    product.id = uuid();

    await this.dbClient
      .put({
        TableName: this.tableName,
        Item: product,
      })
      .promise();

    return product;
  }

  async updateProduct(id: string, product: Product): Promise<Product> {
    const data = await this.dbClient
      .update({
        TableName: this.tableName,
        Key: {
          id,
        },
        ConditionExpression: "attribute_exists(id)",
        ReturnValues: "UPDATED_NEW",
        UpdateExpression:
          "SET productName = :productName, code = :code, price = :price, model = :model",
        ExpressionAttributeValues: {
          ":productName": product.productName,
          ":code": product.code,
          ":price": product.price,
          ":model": product.model,
        },
      })
      .promise();

    data.Attributes!.id = id;
    return data.Attributes as Product;
  }

  async deleteProduct(id: string): Promise<Product> {
    const data = await this.dbClient
      .delete({
        TableName: this.tableName,
        Key: {
          id,
        },
        ReturnValues: "ALL_OLD",
      })
      .promise();

    if (!data.Attributes) {
      throw new Error(`Product with ID ${id} not found`);
    }

    return data.Attributes as Product;
  }
}
