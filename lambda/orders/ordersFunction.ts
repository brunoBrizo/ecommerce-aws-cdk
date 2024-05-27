import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { Product, ProductRepository } from "/opt/nodejs/productsLayer";
import { DynamoDB, Lambda } from "aws-sdk";
import * as AwsXRay from "aws-xray-sdk";
import { Order, OrderRepository } from "/opt/nodejs/ordersLayer";
import {
  CarrierType,
  OrderProductResponse,
  OrderRequest,
  OrderResponse,
  PaymentType,
  ShippingType,
} from "/opt/nodejs/ordersApiLayer";

AwsXRay.captureAWS(require("aws-sdk"));

const productsTable = process.env.PRODUCTS_TABLE!;
const ordersTable = process.env.ORDERS_TABLE!;

const dbClient = new DynamoDB.DocumentClient();
const orderRepository = new OrderRepository(dbClient, ordersTable);
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

  if (httpMethod === "POST") {
    console.log("POST /orders");

    const orderRequest = JSON.parse(event.body!) as OrderRequest;
    const products = await productRepository.getProductByIds(
      orderRequest.productIds
    );

    if (products.length === orderRequest.productIds.length) {
      const order = buildOrder(orderRequest, products);
      const createdOrder = await orderRepository.create(order);

      return {
        statusCode: 201,
        body: JSON.stringify(convertToOrderResponse(createdOrder)),
      };
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "A product was not found" }),
      };
    }
  } else if (httpMethod === "GET") {
    console.log("GET /orders");
    let result = null;

    if (event.queryStringParameters) {
      const email = event.queryStringParameters.email;
      const orderId = event.queryStringParameters.orderId;

      if (email) {
        if (orderId) {
          // GET by email & orderId
          try {
            const order = await orderRepository.getOrder(email, orderId);
            result = convertToOrderResponse(order);
          } catch (error) {
            return {
              statusCode: 404,
              body: JSON.stringify({ message: "Order not found" }),
            };
          }
        } else {
          // GET by email
          const orders = await orderRepository.getOrdersByEmail(email);
          result = orders.map(convertToOrderResponse);
        }
      }
    } else {
      // GET All Orders
      const orders = await orderRepository.getAll();
      result = orders.map(convertToOrderResponse);
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } else if (httpMethod === "DELETE") {
    console.log("DELETE /orders");

    const email = event.queryStringParameters!.email!;
    const orderId = event.queryStringParameters!.orderId!;

    try {
      await orderRepository.delete(email, orderId);
      return {
        statusCode: 204,
        body: "",
      };
    } catch (error) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Order not found" }),
      };
    }
  }

  return {
    statusCode: 400,
    body: JSON.stringify({ message: "Bad Request" }),
  };
}

function buildOrder(orderRequest: OrderRequest, products: Product[]): Order {
  const orderProducts: OrderProductResponse[] = [];
  let totalPrice = 0;

  products.forEach((product) => {
    totalPrice += product.price;
    orderProducts.push({
      code: product.code,
      price: product.price,
    });
  });

  const order: Order = {
    pk: orderRequest.email,
    billing: {
      payment: orderRequest.payment,
      totalPrice,
    },
    shipping: {
      type: orderRequest.shipping.type,
      carrier: orderRequest.shipping.carrier,
    },
    products: orderProducts,
  };

  return order;
}

function convertToOrderResponse(order: Order): OrderResponse {
  const orderProducts: OrderProductResponse[] = [];

  order.products.forEach((product) => {
    orderProducts.push({
      code: product.code,
      price: product.price,
    });
  });

  const orderResponse: OrderResponse = {
    email: order.pk,
    id: order.sk!,
    createdAt: order.createdAt,
    products: orderProducts,
    billing: {
      payment: order.billing.payment as PaymentType,
      totalPrice: order.billing.totalPrice,
    },
    shipping: {
      type: order.shipping.type as ShippingType,
      carrier: order.shipping.carrier as CarrierType,
    },
  };

  return orderResponse;
}
