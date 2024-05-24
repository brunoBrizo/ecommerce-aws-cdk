import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";

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

      return {
        statusCode: 201,
        body: JSON.stringify({}),
      };
    }
  } else if (event.resource === "/products/{id}") {
    const productId = event.pathParameters!.id;

    if (httpMethod === "PUT") {
      console.log(`PUT /products/${productId}`);

      return {
        statusCode: 200,
        body: JSON.stringify({ productId }),
      };
    } else if (httpMethod === "DELETE") {
      console.log(`DELETE /products/${productId}`);

      return {
        statusCode: 204,
        body: JSON.stringify({ productId }),
      };
    }
  }

  return {
    statusCode: 400,
    body: JSON.stringify({ message: "Bad Request" }),
  };
}
