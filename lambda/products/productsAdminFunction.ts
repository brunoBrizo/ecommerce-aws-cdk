import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { Product, ProductRepository } from "/opt/nodejs/productsLayer";
import { DynamoDB, Lambda } from "aws-sdk";
import { ProductEvent, ProductEventType } from "/opt/nodejs/productEventsLayer";
import * as AwsXRay from "aws-xray-sdk";

AwsXRay.captureAWS(require("aws-sdk"));

const productsTable = process.env.PRODUCTS_TABLE!;
const productEventsFuncionName = process.env.PRODUCT_EVENTS_FUNCTION_NAME!;

const dbClient = new DynamoDB.DocumentClient();
const productRepository = new ProductRepository(dbClient, productsTable);
const lambdaClient = new Lambda();

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
    if (httpMethod === "POST") {
      console.log("POST /products");

      const product = JSON.parse(event.body!) as Product;
      const createdProduct = await productRepository.createProduct(product);

      const invokationResponse = await sendProductEvent(
        createdProduct,
        ProductEventType.CREATED,
        "no-email-for-now@gmail.com",
        lambdaReqId
      );

      console.log("Product Event Invokation Response: ", invokationResponse);

      return {
        statusCode: 201,
        body: JSON.stringify(createdProduct),
      };
    }
  } else if (event.resource === "/products/{id}") {
    const productId = event.pathParameters!.id as string;

    if (httpMethod === "PUT") {
      console.log(`PUT /products/${productId}`);

      try {
        const product = JSON.parse(event.body!) as Product;

        const updatedProduct = await productRepository.updateProduct(
          productId,
          product
        );

        const invokationResponse = await sendProductEvent(
          updatedProduct,
          ProductEventType.UPDATED,
          "no-email-for-now@gmail.com",
          lambdaReqId
        );

        console.log("Product Event Invokation Response: ", invokationResponse);

        return {
          statusCode: 200,
          body: JSON.stringify(updatedProduct),
        };
      } catch (ConditionCheckFailedException) {
        return {
          statusCode: 404,
          body: "Product not found",
        };
      }
    } else if (httpMethod === "DELETE") {
      console.log(`DELETE /products/${productId}`);

      try {
        const product = await productRepository.deleteProduct(productId);

        const invocationResponse = await sendProductEvent(
          product,
          ProductEventType.DELETED,
          "no-email-for-now@gmail.com",
          lambdaReqId
        );

        console.log("Product Event Invokation Response: ", invocationResponse);

        return {
          statusCode: 204,
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
  }

  return {
    statusCode: 400,
    body: JSON.stringify({ message: "Bad Request" }),
  };
}

function sendProductEvent(
  product: Product,
  eventType: ProductEventType,
  email: string,
  lambdaRequestId: string
) {
  const productEvent: ProductEvent = {
    requestId: lambdaRequestId,
    email,
    productCode: product.code,
    productId: product.id,
    productPrice: product.price,
    eventType,
  };

  return lambdaClient
    .invoke({
      FunctionName: productEventsFuncionName,
      Payload: JSON.stringify(productEvent),
      InvocationType: "Event", // Asynch call
    })
    .promise();
}
