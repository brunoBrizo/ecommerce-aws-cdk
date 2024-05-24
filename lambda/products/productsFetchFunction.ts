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
    if (httpMethod === "GET") {
      console.log("GET /products");

      return {
        statusCode: 200,
        body: JSON.stringify({}),
      };
    }
  } else if (event.resource === "/products/{id}") {
    const productId = event.pathParameters!.id;

    console.log(`GET /products/${productId}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ productId }),
    };
  }

  return {
    statusCode: 400,
    body: JSON.stringify({ message: "Bad Request" }),
  };
}
