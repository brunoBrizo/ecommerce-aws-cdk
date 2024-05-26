import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { ProductRepository } from "/opt/nodejs/productsLayer";
import { DynamoDB } from "aws-sdk";
import * as AwsXRay from "aws-xray-sdk";

AwsXRay.captureAWS(require("aws-sdk"));
const productsTable = process.env.PRODUCTS_TABLE!;
const dbClient = new DynamoDB.DocumentClient();
const productRepository = new ProductRepository(dbClient, productsTable);

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const lambdaReqId = context.awsRequestId;
  const apiReqId = event.requestContext.requestId;
  const httpMethod = event.httpMethod;

  console.log(`Lambda Request ID: ${lambdaReqId}`);
  console.log(`APIGateway Request ID: ${apiReqId}`);

  if (event.resource === "/products") {
    if (httpMethod === "GET") {
      console.log("GET /products");

      const products = await productRepository.getProducts();

      return {
        statusCode: 200,
        body: JSON.stringify(products),
      };
    }
  } else if (event.resource === "/products/{id}") {
    const productId = event.pathParameters!.id as string;

    console.log(`GET /products/${productId}`);

    try {
      const product = await productRepository.getProductById(productId);

      return {
        statusCode: 200,
        body: JSON.stringify(product),
      };
    } catch (error) {
      const errorMsg = (<Error>error).message;
      console.error(errorMsg);
      return {
        statusCode: 400,
        body: errorMsg,
      };
    }
  }

  return {
    statusCode: 400,
    body: JSON.stringify({ message: "Bad Request" }),
  };
}
